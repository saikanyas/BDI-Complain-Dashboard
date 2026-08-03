import os
import uuid
import hashlib
import hmac
import time
from urllib.parse import unquote
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from model import (
    load_data, train_models, train_priority_model,
    build_predictions, append_complaint,
    get_complaint_status, get_recent_complaints,
    get_leaderboard, get_hotspot_forecast, build_data_digest,
    get_year_over_year, complete_complaint,
    get_known_taxonomy, get_recent_open_in_district, ai_smart_intake,
    get_map_data, get_audit_log, update_department,
)
from routing_engine import calculate_route

_UPLOAD_DIR = Path(__file__).parent / "uploads"
_UPLOAD_DIR.mkdir(exist_ok=True)

# === Rate limiting แบบง่าย กัน spam ยื่นคำร้องถี่เกินไป ===
# เก็บใน memory พอสำหรับ prototype รันเครื่องเดียว — ถ้า deploy หลาย instance ต้องเปลี่ยนไปใช้ Redis
_RATE_LIMIT_WINDOW   = 60   # วินาที
_RATE_LIMIT_MAX_REQS = 5    # ยื่นคำร้องได้ไม่เกิน 5 ครั้งต่อ 60 วินาทีต่อ 1 IP
_submission_log: dict[str, list] = {}


def check_rate_limit(client_ip: str) -> None:
    now = time.time()
    history = [t for t in _submission_log.get(client_ip, []) if now - t < _RATE_LIMIT_WINDOW]
    if len(history) >= _RATE_LIMIT_MAX_REQS:
        raise HTTPException(
            status_code=429,
            detail=f"ยื่นคำร้องถี่เกินไป กรุณารอสักครู่ก่อนยื่นใหม่ (ไม่เกิน {_RATE_LIMIT_MAX_REQS} ครั้งต่อ {_RATE_LIMIT_WINDOW} วินาที)",
        )
    history.append(now)
    _submission_log[client_ip] = history

# === Admin auth (เบสิค ไม่มีต้นทุน ไม่พึ่งบริการภายนอก) ===
# ตั้งรายชื่อเจ้าหน้าที่ผ่าน env var ADMIN_USERS รูปแบบ "ชื่อ1:รหัส1,ชื่อ2:รหัส2"
# ถ้าไม่ตั้งค่า ระบบจะปิดการ login ของ admin ไว้เพื่อไม่ให้มี credential เริ่มต้นใน source code
def _parse_admin_users() -> dict:
    raw = os.environ.get("ADMIN_USERS", "").strip()
    users = {}
    for pair in raw.split(","):
        if ":" in pair:
            name, pw = pair.split(":", 1)
            if name.strip() and pw.strip():
                users[name.strip()] = pw.strip()
    return users


_ADMIN_USERS  = _parse_admin_users()
_ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "").strip()


def _cors_origins() -> list[str]:
    raw = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _ensure_admin_auth_configured() -> None:
    if not _ADMIN_USERS or not _ADMIN_SECRET:
        raise HTTPException(status_code=503, detail="Admin authentication is not configured")


def _make_token(username: str, password: str) -> str:
    """Token ผูกกับ username — stateless (ไม่ต้องเก็บ session ฝั่ง server) แต่รู้ว่าเป็นใคร"""
    return hashlib.sha256(f"{username}:{password}:{_ADMIN_SECRET}".encode()).hexdigest()


def require_admin(
    x_admin_user: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
) -> str:
    """Dependency เช็ค username+token ก่อนเข้าถึง endpoint ที่ต้องเป็นเจ้าหน้าที่ — คืนชื่อผู้ใช้ที่ login อยู่
    หมายเหตุ: HTTP header ไม่รองรับ UTF-8 ตรงๆ (encode เป็น latin-1 เท่านั้น) ฝั่ง frontend จึงต้อง
    encodeURIComponent ชื่อผู้ใช้ก่อนส่งมาเป็น header เสมอ — ที่นี่จึง unquote กลับก่อนเทียบ
    """
    _ensure_admin_auth_configured()
    if not x_admin_user or not x_admin_token:
        raise HTTPException(status_code=401, detail="ต้อง login ก่อนใช้งานส่วนนี้")

    username = unquote(x_admin_user)
    password = _ADMIN_USERS.get(username)
    if not password:
        raise HTTPException(status_code=401, detail="ไม่พบผู้ใช้นี้")

    expected = _make_token(username, password)
    if not hmac.compare_digest(x_admin_token.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="token ไม่ถูกต้อง หรือ session หมดอายุ")

    return username


_state: dict = {}


class ComplaintOut(BaseModel):
    cid: str
    status: str = "รอดำเนินการ"
    photo_url: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    priority: Optional[str] = None
    ai_mode: Optional[str] = None          # "ai" หรือ "fallback"
    ack_message: Optional[str] = None
    duplicate_warning: Optional[str] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    df = load_data()
    cat_model, dept_model, tok_fn = train_models(df[df["done"]].copy())
    priority_model = train_priority_model(df[df["done"]].copy(), tok_fn)
    _state["df"]             = df
    _state["cat_model"]      = cat_model
    _state["dept_model"]     = dept_model
    _state["tok_fn"]         = tok_fn
    _state["priority_model"] = priority_model
    _refresh_predictions()
    yield


def _refresh_predictions() -> None:
    """
    คำนวณ predictions ของคำร้องที่ยังไม่เสร็จทั้งหมดแล้ว cache ไว้ใน _state
    เรียกครั้งเดียวตอน data เปลี่ยน (ยื่นคำร้องใหม่/ปิดงาน) แทนการคำนวณ ML ใหม่ทุกครั้งที่มีคน
    เปิดหน้า /predict หรือ /admin — สำคัญมากเมื่อข้อมูลมีหลักหมื่นแถว ไม่งั้นทุกการเปิดหน้าจะช้า
    """
    _state["predictions"] = build_predictions(
        _state["df"], _state["cat_model"], _state["dept_model"],
        _state["tok_fn"], _state["priority_model"],
    )


app = FastAPI(title="BDI Predict API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=_UPLOAD_DIR), name="uploads")


@app.get("/health")
def health():
    total   = len(_state.get("df", []))
    pending = int((~_state["df"]["done"]).sum()) if "df" in _state else 0
    return {"status": "ok", "total": total, "pending": pending}


@app.get("/taxonomy")
def taxonomy():
    """รายชื่อเขต/ประเภทคำร้องที่มีอยู่จริงในข้อมูล ใช้ทำ filter dropdown ฝั่ง frontend"""
    df = _state["df"]
    districts = sorted(d for d in df["district"].dropna().unique() if str(d).strip())
    t = get_known_taxonomy(df)
    return {"districts": districts, "categories": t["categories"], "departments": t["departments"]}


@app.get("/pending-predictions")
def pending_predictions(
    page: int = 1,
    limit: int = 20,
    search: str = "",
    district: str = "",
    category: str = "",
    overdue_only: bool = False,
):
    """
    คืนรายการคำร้องที่ยังไม่เสร็จ พร้อม pagination + filter
    สำคัญตอนข้อมูลมีจำนวนมาก (หลักหมื่นแถว) — ไม่ส่งทั้งหมดทีเดียวเพราะจะช้าและ frontend เลื่อนหายาก
    """
    rows = _state.get("predictions", [])

    if search:
        q = search.strip().lower()
        rows = [r for r in rows if q in r["text"].lower() or q in r["cid"].lower()]
    if district:
        rows = [r for r in rows if r["district"] == district]
    if category:
        rows = [r for r in rows if r["category"] == category]
    if overdue_only:
        rows = [r for r in rows if r["overdue"]]

    total = len(rows)
    page  = max(1, page)
    limit = max(1, min(limit, 200))  # กันใส่ limit เยอะเกินจนช้า
    start = (page - 1) * limit
    items = rows[start:start + limit]

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total + limit - 1) // limit),
    }


@app.post("/complaints", response_model=ComplaintOut)
async def create_complaint(
    request: Request,
    text: str = Form(..., min_length=1),
    category: str = Form(..., min_length=1),
    district: str = Form(..., min_length=1),
    department: str = Form(""),
    community: str = Form(""),
    division: str = Form(""),
    line_token: str = Form(""),
    photo: Optional[UploadFile] = File(None),
):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(client_ip)

    photo_filename = ""
    if photo is not None and photo.filename:
        ext = Path(photo.filename).suffix.lower() or ".jpg"
        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
            raise HTTPException(status_code=400, detail="รองรับไฟล์รูปภาพ jpg/png/webp เท่านั้น")
        photo_filename = f"{uuid.uuid4().hex}{ext}"
        content = await photo.read()
        if len(content) > 8 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="ไฟล์รูปต้องไม่เกิน 8MB")
        (_UPLOAD_DIR / photo_filename).write_bytes(content)

    # === AI Smart Intake ===
    # ให้ Claude วิเคราะห์ประเภท/หน่วยงาน/ความเร่งด่วนจริง + เช็คคำร้องซ้ำ ก่อนบันทึก
    # ถ้าไม่มี ANTHROPIC_API_KEY หรือเรียกไม่สำเร็จ จะ fallback ไป keyword-based เงียบๆ ไม่ทำให้ยื่นคำร้องล้มเหลว
    taxonomy    = get_known_taxonomy(_state["df"])
    recent_open = get_recent_open_in_district(_state["df"], district)
    api_key     = os.environ.get("ANTHROPIC_API_KEY", "")

    intake = ai_smart_intake(
        text=text, district=district, user_category=category, user_department=department,
        taxonomy=taxonomy, recent_open=recent_open, api_key=api_key,
    )

    duplicate_warning = None
    if intake.get("is_duplicate") and intake.get("duplicate_cid"):
        duplicate_warning = f"AI ตรวจพบว่าอาจเป็นเรื่องเดียวกับคำร้อง #{intake['duplicate_cid']} ที่ยังไม่เสร็จในเขตนี้"

    try:
        cid = append_complaint(
            division=division, department=intake["department"], text=text,
            category=intake["category"], district=district, community=community,
            photo_filename=photo_filename, priority_override=intake["priority"],
            line_token=line_token,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # โหลดข้อมูลใหม่จาก CSV เพื่อให้ endpoint อื่นเห็นคำร้องนี้ทันที
    _state["df"] = load_data()
    _refresh_predictions()

    return ComplaintOut(
        cid=cid,
        photo_url=f"/uploads/{photo_filename}" if photo_filename else None,
        category=intake["category"],
        department=intake["department"],
        priority=intake["priority"],
        ai_mode=intake["mode"],
        ack_message=intake["ack_message"],
        duplicate_warning=duplicate_warning,
    )


@app.get("/complaints/{cid:path}")
def track_complaint(cid: str):
    result = get_complaint_status(_state["df"], cid)
    if result is None:
        raise HTTPException(status_code=404, detail=f"ไม่พบคำร้องเลขที่ {cid}")
    if result.get("photo"):
        result["photo"] = f"/uploads/{result['photo']}"
    return result


@app.get("/admin/audit-log")
def audit_log(
    x_admin_user: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    """ดูประวัติการปิดงานทั้งหมด — ต้อง login ก่อน"""
    require_admin(x_admin_user, x_admin_token)
    return get_audit_log(limit=200)


@app.get("/map-data")
def map_data():
    return get_map_data(_state["df"])

class RoutingRequest(BaseModel):
    cids: list[str]
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None

@app.post("/routing")
def get_routing(
    payload: RoutingRequest,
    x_admin_user: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    """คำนวณเส้นทาง OSRM สำหรับคำร้องที่เลือก — ต้อง login ก่อน"""
    require_admin(x_admin_user, x_admin_token)
    
    # ดึงข้อมูล community จาก cid
    df = _state["df"]
    tasks = []
    
    for cid in payload.cids:
        # หา row ที่มี cid ตรงกัน
        row = df[df["cid"] == cid]
        if not row.empty:
            community = row.iloc[0]["community"]
            if community and str(community).strip() and str(community).lower() != "nan":
                tasks.append({"cid": cid, "community": str(community)})
                
    start_point = None
    if payload.start_lat is not None and payload.start_lng is not None:
        start_point = {"lat": payload.start_lat, "lng": payload.start_lng}
        
    result = calculate_route(tasks, start_point)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result

@app.get("/yoy")
def year_over_year():
    return get_year_over_year(_state["df"])


class CompleteOut(BaseModel):
    cid: str
    status: str = "ประเมินผลเสร็จสิ้น"
    after_photo_url: Optional[str] = None
    closed_by: Optional[str] = None


class LoginIn(BaseModel):
    username: str
    password: str


class LoginOut(BaseModel):
    token: str
    username: str


@app.post("/admin/login", response_model=LoginOut)
def admin_login(payload: LoginIn):
    _ensure_admin_auth_configured()
    expected_password = _ADMIN_USERS.get(payload.username)
    if not expected_password or not hmac.compare_digest(payload.password.encode(), expected_password.encode()):
        raise HTTPException(status_code=401, detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
    return LoginOut(token=_make_token(payload.username, expected_password), username=payload.username)


@app.post("/complaints/{cid:path}/complete", response_model=CompleteOut)
async def mark_complete(
    cid: str,
    after_photo: Optional[UploadFile] = File(None),
    x_admin_user: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    """ปิดงานคำร้อง — ต้อง login ก่อน (ดู /admin/login) บันทึกชื่อผู้ปิดงานลง audit log ด้วย"""
    username = require_admin(x_admin_user, x_admin_token)

    photo_filename = ""
    if after_photo is not None and after_photo.filename:
        ext = Path(after_photo.filename).suffix.lower() or ".jpg"
        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
            raise HTTPException(status_code=400, detail="รองรับไฟล์รูปภาพ jpg/png/webp เท่านั้น")
        photo_filename = f"{uuid.uuid4().hex}{ext}"
        content = await after_photo.read()
        if len(content) > 8 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="ไฟล์รูปต้องไม่เกิน 8MB")
        (_UPLOAD_DIR / photo_filename).write_bytes(content)

    existing = get_complaint_status(_state["df"], cid)
    if existing is None:
        raise HTTPException(status_code=404, detail=f"ไม่พบคำร้องเลขที่ {cid}")
    if existing["done"]:
        raise HTTPException(status_code=409, detail=f"คำร้องเลขที่ {cid} ถูกปิดงานไปแล้ว")

    ok = complete_complaint(cid, after_photo_filename=photo_filename, closed_by=username)
    if not ok:
        raise HTTPException(status_code=409, detail=f"ปิดงานคำร้องเลขที่ {cid} ไม่สำเร็จ อาจถูกปิดไปแล้วโดยคนอื่นพร้อมกัน")

    _state["df"] = load_data()
    _refresh_predictions()

    return CompleteOut(
        cid=cid,
        closed_by=username,
        after_photo_url=f"/uploads/{photo_filename}" if photo_filename else None,
    )


class DeptUpdateIn(BaseModel):
    department: str


@app.patch("/complaints/{cid:path}/department")
def change_department(
    cid: str,
    payload: DeptUpdateIn,
    x_admin_user: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    """เปลี่ยนหน่วยงาน/ฝ่ายที่รับผิดชอบคำร้อง — Auto-save ทันทีเมื่อ Admin เปลี่ยน dropdown"""
    username = require_admin(x_admin_user, x_admin_token)
    if not payload.department.strip():
        raise HTTPException(status_code=400, detail="ชื่อหน่วยงานไม่ควรว่าง")
    ok = update_department(cid, payload.department.strip(), username)
    if not ok:
        raise HTTPException(status_code=404, detail=f"ไม่พบคำร้องเลขที่ {cid}")
    _state["df"] = load_data()
    _refresh_predictions()
    return {"cid": cid, "department": payload.department.strip(), "changed_by": username}


@app.get("/recent")
def recent_complaints(limit: int = 8):
    limit = max(1, min(limit, 50))  # กัน limit ติดลบ (pandas .head(-N) จะคืนเกือบทั้งหมด) หรือเยอะเกินจำเป็น
    return get_recent_complaints(_state["df"], limit=limit)


@app.get("/leaderboard")
def leaderboard():
    return get_leaderboard(_state["df"])


class AskIn(BaseModel):
    question: str


class AskOut(BaseModel):
    answer: str
    mode: str  # "ai" หรือ "fallback"


@app.get("/hotspot-forecast")
def hotspot_forecast():
    return get_hotspot_forecast(_state["df"])


@app.post("/ask", response_model=AskOut)
def ask_question(payload: AskIn):
    """
    ตอบคำถามเกี่ยวกับข้อมูลคำร้องเป็นภาษาธรรมดา
    ถ้ามี ANTHROPIC_API_KEY ใน environment จะใช้ Claude วิเคราะห์จริง
    ถ้าไม่มี จะคืนสรุปสถิติพื้นฐานให้ดูแทน (ไม่ได้ตอบคำถามแบบ free-form)
    """
    digest = build_data_digest(_state["df"])
    api_key = os.environ.get("ANTHROPIC_API_KEY")

    if not api_key:
        return AskOut(
            mode="fallback",
            answer=(
                "ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY จึงตอบคำถามแบบอิสระไม่ได้ "
                "นี่คือสรุปข้อมูลภาพรวมแทน:\n\n" + digest +
                "\n\n(ตั้งค่า ANTHROPIC_API_KEY เป็น environment variable แล้ว restart "
                "server เพื่อเปิดใช้ AI ตอบคำถามแบบอิสระ)"
            ),
        )

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            system=(
                "คุณเป็นผู้ช่วยวิเคราะห์ข้อมูลคำร้องเรียนของเทศบาลนครขอนแก่น "
                "ตอบเป็นภาษาไทย กระชับ ตรงประเด็น โดยอ้างอิงจากข้อมูลสรุปที่ให้มาเท่านั้น "
                "ถ้าข้อมูลไม่พอจะตอบ ให้บอกตรงๆ ว่าข้อมูลที่มีไม่ครอบคลุมพอ"
            ),
            messages=[{
                "role": "user",
                "content": f"ข้อมูลสรุป:\n{digest}\n\nคำถาม: {payload.question}",
            }],
        )
        text = "".join(b.text for b in msg.content if b.type == "text")
        return AskOut(mode="ai", answer=text or "ไม่สามารถสร้างคำตอบได้")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"เรียก AI ไม่สำเร็จ: {e}")

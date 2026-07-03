from pathlib import Path
from datetime import date, timedelta, datetime
from typing import Optional

import numpy as np
import pandas as pd

_HERE = Path(__file__).parent
_STOPWORDS = {
    "ของ","ใน","ที่","และ","มี","ให้","กับ","ได้","จาก","เป็น",
    "ไม่","มา","แล้ว","จะ","ก็","นั้น","อยู่","ต้อง","ว่า","ไป",
    "ๆ","nan","","บน","ตาม","โดย","กา","การ","ราย","นะ","ครับ","ค่ะ",
}

# CSV รองรับข้อมูลขนาดใหญ่ได้ดีกว่า xlsx (10-100x เร็วกว่า)
_DATA_PATHS = [
    _HERE / "data" / "data.csv",
    _HERE / "data" / "data.xlsx",
    _HERE.parent / "ap1" / "ข้อมูลคำร้อง_sampled (1).xlsx",
    _HERE.parent / "ap1" / "ข้อมูลคำร้อง_sampled.xlsx",
]

_RENAME = {
    "ส่วนงาน":         "division",
    "ฝ่าย":            "department",
    "เลขคำร้อง":       "cid",
    "เรื่องร้องทุกข์": "text",
    "ประเภทคำร้อง":    "category",
    "เขต":             "district",
    "ชุมชน":           "community",
    "วันที่รับเรื่อง": "received",
    "วันที่เสร็จ":     "completed",
    "สถานะ":           "status",
    "รูปภาพ":          "photo",
    "รูปภาพหลังแก้ไข": "after_photo",
    "ความสำคัญ":       "priority_override",
    "ปิดงานโดย":       "closed_by",
    "LINE Token":      "line_token",
}

_CORRECTIONS = {
    "ถ.": "ถนน", "ซ.": "ซอย", "ต.": "ตำบล",
    "อ.": "อำเภอ", "จ.": "จังหวัด",
    "ไฟฝ้า": "ไฟฟ้า", "ทอ": "ท่อ",
}

# Training data cap — ป้องกัน memory explosion บนข้อมูลล้านแถว
_TRAIN_CAP = 200_000
_UNKNOWN   = "ไม่ระบุ"

_HI  = frozenset(["ไฟดับ","น้ำท่วม","ถนนพัง","ท่อแตก","อุบัติเหตุ","ฉุกเฉิน","ชำรุด","แตก","พัง"])
_MED = frozenset(["ซ่อม","ท่อระบาย","กิ่งไม้","ไฟฟ้า","จราจร","อุดตัน"])


def _keyword_priority(text: str) -> str:
    t = str(text).lower()
    if any(k in t for k in _HI):  return "สูง"
    if any(k in t for k in _MED): return "กลาง"
    return "ต่ำ"


def _parse_date(s) -> pd.Timestamp:
    if pd.isna(s) or str(s).strip() in ("", "nan"):
        return pd.NaT
    try:
        p = str(s).strip().split("/")
        d, m, y = int(p[0]), int(p[1]), int(p[2])
        if y > 2500:
            y -= 543
        return pd.Timestamp(y, m, d)
    except Exception:
        return pd.NaT


def _correct_text(series: pd.Series) -> pd.Series:
    """Vectorized text correction — เร็วกว่า apply() row-by-row"""
    s = series.astype(str)
    for abbr, full in _CORRECTIONS.items():
        s = s.str.replace(abbr, full, regex=False)
    return s


def load_data() -> pd.DataFrame:
    raw = None
    for p in _DATA_PATHS:
        if p.exists():
            raw = pd.read_csv(p, low_memory=False) if p.suffix == ".csv" else pd.read_excel(p)
            print(f"  loaded {len(raw):,} rows from {p.name}")
            break
    if raw is None:
        raise FileNotFoundError("No data file — place data.csv (or data.xlsx) in api/data/")

    df = raw.rename(columns=_RENAME)
    if "photo" not in df.columns:
        df["photo"] = ""
    df["photo"]      = df["photo"].fillna("")
    if "after_photo" not in df.columns:
        df["after_photo"] = ""
    df["after_photo"] = df["after_photo"].fillna("")
    if "priority_override" not in df.columns:
        df["priority_override"] = ""
    df["priority_override"] = df["priority_override"].fillna("")
    if "closed_by" not in df.columns:
        df["closed_by"] = ""
    df["closed_by"] = df["closed_by"].fillna("")
    if "line_token" not in df.columns:
        df["line_token"] = ""
    df["line_token"] = df["line_token"].fillna("")
    df["received"]   = df["received"].apply(_parse_date)
    df["completed"]  = df["completed"].apply(_parse_date)
    df["days"]       = (df["completed"] - df["received"]).dt.days.clip(lower=0)
    df["done"]       = df["status"].str.contains("เสร็จ", na=False)
    df["district"]   = df["district"].replace({"ไม่ระบุ": "ไม่ระบุเขต", "อาคารเขต 7": "เขต 7"})
    df["text_clean"] = _correct_text(df["text"])
    df["priority"]   = df["text_clean"].apply(_keyword_priority)
    return df


def _today_thai_date() -> str:
    """วันนี้ในรูปแบบ d/m/พ.ศ. ให้ตรงกับ format เดิมในไฟล์ข้อมูล (เช่น 17/02/2563)"""
    today = date.today()
    return f"{today.day}/{today.month}/{today.year + 543}"


_TEXT_COLUMNS = [
    "ส่วนงาน", "ฝ่าย", "เลขคำร้อง", "เรื่องร้องทุกข์", "ประเภทคำร้อง", "เขต", "ชุมชน",
    "วันที่รับเรื่อง", "วันที่เสร็จ", "สถานะ", "รูปภาพ", "ความสำคัญ", "รูปภาพหลังแก้ไข",
    "ปิดงานโดย", "LINE Token",
]


def _read_csv_for_write(csv_path: Path) -> pd.DataFrame:
    """
    อ่าน data.csv สำหรับเตรียมเขียนกลับ (append/update)
    ปัญหาที่ป้องกันไว้: ถ้าคอลัมน์ใหม่ (เช่น 'ปิดงานโดย') ว่างทั้งคอลัมน์ pandas จะเดา dtype
    เป็น float64 (NaN ทั้งคอลัมน์) แล้วพอจะใส่ค่าข้อความ (เช่นชื่อคนปิดงาน) ภายหลัง จะ error
    'Invalid value for dtype float64' — ฟังก์ชันนี้บังคับคอลัมน์ข้อความที่รู้จักให้เป็น object/string
    เสมอ ไม่ว่าตอนอ่านจะว่างทั้งคอลัมน์หรือไม่ก็ตาม
    """
    df = pd.read_csv(csv_path, low_memory=False)
    for col in _TEXT_COLUMNS:
        if col not in df.columns:
            df[col] = ""
        else:
            df[col] = df[col].astype(object).where(df[col].notna(), "")
    return df


def append_complaint(division: str, department: str, text: str, category: str,
                      district: str, community: str, photo_filename: str = "",
                      priority_override: str = "", line_token: str = "") -> str:
    """
    เพิ่มคำร้องใหม่ลง data.csv แล้วคืนเลขคำร้องที่สร้างขึ้น
    เขียนคอลัมน์ภาษาไทยให้ตรงกับไฟล์ข้อมูลต้นฉบับ เพื่อให้ load_data() อ่านไฟล์เดิมได้ปกติ
    photo_filename: ชื่อไฟล์รูปที่บันทึกไว้แล้วใน api/uploads/ (ถ้ามี)
    priority_override: ความสำคัญที่ AI วิเคราะห์ไว้แล้วตอนรับเรื่อง (ถ้ามี) — กันไม่ให้ค่าเปลี่ยนไปมาทุกครั้งที่ดึงข้อมูล
    line_token: LINE Notify personal token ของผู้แจ้ง (ถ้าให้ไว้) — ใช้แจ้งเตือนตอนปิดงาน

    หมายเหตุการ implement: เขียนทับทั้งไฟล์ใหม่ทุกครั้ง (ไม่ใช่ append แบบ mode='a')
    เพราะการ append บรรทัดเดียวเข้าไปเสี่ยงคอลัมน์ไม่ตรงตำแหน่งกับ header เดิมเมื่อคอลัมน์
    ถูกเพิ่มมาคนละรอบกัน (เจอบั๊กนี้จริงตอนพัฒนา) — ที่ขนาดข้อมูลหลักหมื่นแถวยังเร็วพอ (<1 วินาที)
    """
    csv_path = _HERE / "data" / "data.csv"
    if not csv_path.exists():
        raise FileNotFoundError("ไม่พบ data.csv — ต้องมีไฟล์นี้ก่อนจึงจะเพิ่มคำร้องได้")

    existing = _read_csv_for_write(csv_path)

    seq = len(existing) + 1
    yy  = str(date.today().year + 543)[-2:]
    cid = f"{seq:04d}/{yy}"

    new_row = {
        "ส่วนงาน":         division or _UNKNOWN,
        "ฝ่าย":            department,
        "เลขคำร้อง":       cid,
        "เรื่องร้องทุกข์": text,
        "ประเภทคำร้อง":    category,
        "เขต":             district,
        "ชุมชน":           community or "",
        "วันที่รับเรื่อง": _today_thai_date(),
        "วันที่เสร็จ":     "",          # ยังไม่เสร็จ
        "สถานะ":           "รอดำเนินการ",
        "รูปภาพ":          photo_filename,
        "ความสำคัญ":       priority_override,
        "รูปภาพหลังแก้ไข": "",
        "ปิดงานโดย":       "",
        "LINE Token":      line_token,
    }

    updated = pd.concat([existing, pd.DataFrame([new_row])], ignore_index=True)
    updated.to_csv(csv_path, index=False, encoding="utf-8-sig")
    return cid


def get_tokenizer():
    try:
        from pythainlp.tokenize import word_tokenize
        def _tok(text: str) -> str:
            tokens = word_tokenize(str(text), engine="newmm", keep_whitespace=False)
            return " ".join(t.strip() for t in tokens
                           if t.strip() and len(t) > 1 and t.strip() not in _STOPWORDS)
        return _tok
    except ImportError:
        return None


def train_models(df: pd.DataFrame):
    tok_fn = get_tokenizer()
    if tok_fn is None:
        return None, None, lambda t: t

    from sklearn.pipeline import Pipeline
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split

    df2 = df.dropna(subset=["text_clean", "category", "department"]).copy()
    df2 = df2[df2["category"].map(df2["category"].value_counts()) >= 3]

    # Cap training data เพื่อป้องกัน memory/time explosion
    if len(df2) > _TRAIN_CAP:
        print(f"  sampling {_TRAIN_CAP:,} from {len(df2):,} rows for training")
        df2 = df2.sample(_TRAIN_CAP, random_state=42)

    X  = df2["text_clean"].apply(tok_fn)
    yc = df2["category"]
    yd = df2["department"]

    def _pipe():
        return Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=8000,
                                      sublinear_tf=True, min_df=2)),
            ("clf",   LogisticRegression(max_iter=600, C=1.5,
                                         class_weight="balanced", solver="lbfgs",
                                         random_state=42)),
        ], memory=None)

    cp = _pipe(); cp.fit(X, yc)
    dp = _pipe(); dp.fit(X, yd)
    return cp, dp, tok_fn


def train_priority_model(df: pd.DataFrame, tok_fn):
    """Train priority classifier (สูง/กลาง/ต่ำ) จาก keyword-labeled data"""
    if tok_fn is None:
        return None

    from sklearn.pipeline import Pipeline
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression

    df2 = df.dropna(subset=["text_clean", "priority"]).copy()
    if len(df2) > _TRAIN_CAP:
        df2 = df2.sample(_TRAIN_CAP, random_state=42)

    X = df2["text_clean"].apply(tok_fn)
    y = df2["priority"]

    model = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=6000,
                                  sublinear_tf=True, min_df=2)),
        ("clf",   LogisticRegression(max_iter=500, C=1.5,
                                     class_weight="balanced", solver="lbfgs",
                                     random_state=42)),
    ], memory=None)
    model.fit(X, y)
    return model


def build_data_digest(df: pd.DataFrame) -> str:
    """
    สรุปข้อมูลทั้งหมดเป็นข้อความสั้นๆ (ไม่ใช่ raw data) สำหรับส่งเป็น context ให้ LLM
    ทำแบบนี้เพื่อไม่ต้องส่งข้อมูลทุกแถว (แพง + ช้า) แค่สรุปสถิติที่จำเป็นพอ
    """
    total   = len(df)
    done    = int(df["done"].sum())
    pending = total - done

    by_district = df["district"].value_counts().head(8)
    by_category = df["category"].value_counts().head(8)
    by_dept_days = (
        df[df["done"] & df["days"].notna()]
        .groupby("department")["days"].mean()
        .sort_values(ascending=False).head(5)
    )

    lines = [
        f"ข้อมูลคำร้องเรียนทั้งหมด {total} รายการ (เสร็จแล้ว {done}, รอดำเนินการ {pending})",
        "จำนวนคำร้องแยกตามเขต (มากไปน้อย): " +
        ", ".join(f"{k} {v} รายการ" for k, v in by_district.items()),
        "จำนวนคำร้องแยกตามประเภท (มากไปน้อย): " +
        ", ".join(f"{k} {v} รายการ" for k, v in by_category.items()),
        "ฝ่ายที่ใช้เวลาดำเนินการเฉลี่ยนานที่สุด (วัน): " +
        ", ".join(f"{k} {v:.0f} วัน" for k, v in by_dept_days.items()),
    ]
    return "\n".join(lines)


def get_map_data(df: pd.DataFrame) -> dict:
    """สรุปจำนวนคำร้องต่อเขต สำหรับแสดงผลบนแผนที่ (ใช้ขนาด/สีจุดตามความหนาแน่น)"""
    rows = []
    unspecified = 0
    for name, grp in df.groupby("district"):
        name = str(name).strip()
        if not name or "ไม่ระบุ" in name:
            unspecified += len(grp)
            continue
        total   = len(grp)
        pending = int((~grp["done"]).sum())
        done    = total - pending
        rows.append({
            "district":        name,
            "total":           total,
            "pending":         pending,
            "done":            done,
            "completion_rate": round(100 * done / total, 1) if total else 0,
        })
    rows.sort(key=lambda r: r["total"], reverse=True)
    return {"districts": rows, "unspecified_count": unspecified}


def get_year_over_year(df: pd.DataFrame) -> dict:
    """เทียบจำนวนคำร้องรายเดือน ปีนี้ vs ปีก่อน (พ.ศ.)"""
    d = df[df["received"].notna()].copy()
    d["year"]  = d["received"].dt.year
    d["month"] = d["received"].dt.month

    this_year = date.today().year
    last_year = this_year - 1

    cur  = d[d["year"] == this_year].groupby("month").size()
    prev = d[d["year"] == last_year].groupby("month").size()

    months_th = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
                 "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

    rows = []
    for m in range(1, 13):
        c = int(cur.get(m, 0))
        p = int(prev.get(m, 0))
        pct = round(100 * (c - p) / p, 1) if p > 0 else None
        rows.append({"month": months_th[m - 1], "this_year": c, "last_year": p, "pct_change": pct})

    total_cur, total_prev = int(cur.sum()), int(prev.sum())
    overall_pct = round(100 * (total_cur - total_prev) / total_prev, 1) if total_prev > 0 else None

    return {
        "this_year_label": str(this_year + 543),
        "last_year_label": str(last_year + 543),
        "months": rows,
        "total_this_year": total_cur,
        "total_last_year": total_prev,
        "overall_pct_change": overall_pct,
    }


def _append_audit_log(cid: str, action: str, by: str) -> None:
    """บันทึกประวัติการกระทำของเจ้าหน้าที่ลงไฟล์แยก (เก็บไว้ตรวจสอบย้อนหลังได้ ไม่ปนกับข้อมูลคำร้องหลัก)"""
    log_path = _HERE / "data" / "audit_log.csv"
    entry = pd.DataFrame([{
        "เลขคำร้อง": cid,
        "การกระทำ":   action,
        "โดย":        by,
        "เมื่อ":       datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }])
    if log_path.exists():
        entry.to_csv(log_path, mode="a", header=False, index=False, encoding="utf-8-sig")
    else:
        entry.to_csv(log_path, mode="w", header=True, index=False, encoding="utf-8-sig")


def get_audit_log(limit: int = 100) -> list:
    """ดึงประวัติการปิดงานล่าสุด สำหรับให้แอดมินตรวจสอบย้อนหลัง"""
    log_path = _HERE / "data" / "audit_log.csv"
    if not log_path.exists():
        return []
    df = pd.read_csv(log_path, low_memory=False)
    df = df.sort_values("เมื่อ", ascending=False).head(limit)
    return [
        {"cid": str(r["เลขคำร้อง"]), "action": str(r["การกระทำ"]), "by": str(r["โดย"]), "at": str(r["เมื่อ"])}
        for _, r in df.iterrows()
    ]


def send_line_notify(token: str, message: str) -> bool:
    """
    ส่งแจ้งเตือนผ่าน LINE Notify ไปยัง token ของผู้แจ้ง (ถ้ามี)
    คืน True/False เฉยๆ ไม่ raise exception — ถ้าส่งไม่ได้ (token ผิด/หมดอายุ/เน็ตล้ม)
    ต้องไม่ทำให้การปิดงานคำร้องล้มเหลวไปด้วย เพราะการแจ้งเตือนเป็นแค่ส่วนเสริม
    """
    if not token:
        return False
    try:
        import requests
        resp = requests.post(
            "https://notify-api.line.me/api/notify",
            headers={"Authorization": f"Bearer {token}"},
            data={"message": message},
            timeout=5,
        )
        return resp.status_code == 200
    except Exception:
        return False


def complete_complaint(cid: str, after_photo_filename: str = "", closed_by: str = "") -> bool:
    """
    ปิดงานคำร้อง — เปลี่ยนสถานะเป็น 'ประเมินผลเสร็จสิ้น' พร้อมวันที่เสร็จวันนี้
    บันทึกชื่อผู้ปิดงานทั้งในตัวคำร้องเอง (closed_by) และใน audit log แยก (ตรวจสอบย้อนหลังได้)
    ถ้าผู้แจ้งให้ LINE token ไว้ตอนยื่นคำร้อง จะส่งแจ้งเตือนให้ด้วย (ส่งไม่ได้ก็ไม่เป็นไร ไม่กระทบการปิดงาน)
    คืน True ถ้าหาเจอและอัปเดตสำเร็จ, False ถ้าไม่พบ cid หรือถ้าปิดงานไปแล้ว (กันปิดซ้ำ ทำให้
    วันที่เสร็จขยับใหม่และ audit log บวมข้อมูลซ้ำซ้อนโดยไม่จำเป็น)
    """
    csv_path = _HERE / "data" / "data.csv"
    df = _read_csv_for_write(csv_path)

    mask = df["เลขคำร้อง"].astype(str).str.strip() == cid.strip()
    if not mask.any():
        return False

    if (df.loc[mask, "สถานะ"] == "ประเมินผลเสร็จสิ้น").any():
        return False  # ปิดไปแล้ว — ไม่ทำซ้ำ

    df.loc[mask, "สถานะ"] = "ประเมินผลเสร็จสิ้น"
    df.loc[mask, "วันที่เสร็จ"] = _today_thai_date()
    if after_photo_filename:
        df.loc[mask, "รูปภาพหลังแก้ไข"] = after_photo_filename
    df.loc[mask, "ปิดงานโดย"] = closed_by

    # ดึง LINE token ของคำร้องนี้ไว้ก่อนเขียนไฟล์ใหม่ เผื่อต้องแจ้งเตือน
    line_token = ""
    if "LINE Token" in df.columns:
        vals = df.loc[mask, "LINE Token"].dropna()
        line_token = str(vals.iloc[0]) if len(vals) else ""

    df.to_csv(csv_path, index=False, encoding="utf-8-sig")

    if closed_by:
        _append_audit_log(cid, "ปิดงาน", closed_by)

    if line_token:
        send_line_notify(line_token, f"\nคำร้อง #{cid} ของคุณดำเนินการเสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการครับ/ค่ะ")
    return True


def update_department(cid: str, new_department: str, changed_by: str) -> bool:
    """
    เปลี่ยนหน่วยงาน/ฝ่ายที่รับผิดชอบคำร้อง — Admin ยืนยันแทนค่าที่ AI แนะนำ
    บันทึกลง audit log ด้วยเพื่อตรวจสอบย้อนหลัง
    คืน True ถ้าสำเร็จ, False ถ้าไม่พบ cid
    """
    csv_path = _HERE / "data" / "data.csv"
    df = _read_csv_for_write(csv_path)

    mask = df["เลขคำร้อง"].astype(str).str.strip() == cid.strip()
    if not mask.any():
        return False

    df.loc[mask, "ฝ่าย"] = new_department
    df.to_csv(csv_path, index=False, encoding="utf-8-sig")

    _append_audit_log(cid, f"เปลี่ยนฝ่าย → {new_department}", changed_by)
    return True


def get_known_taxonomy(df: pd.DataFrame) -> dict:
    """
    ดึงรายชื่อประเภทคำร้อง/หน่วยงานที่มีอยู่จริงในข้อมูล
    ใช้เป็น "ตัวเลือกที่อนุญาต" ให้ AI เลือก เพื่อให้ผลลัพธ์เข้ากับระบบ median lookup เดิมได้
    """
    categories  = sorted(c for c in df["category"].dropna().unique() if str(c).strip() and c != _UNKNOWN)
    departments = sorted(d for d in df["department"].dropna().unique() if str(d).strip() and d != _UNKNOWN)
    return {"categories": categories, "departments": departments}


def get_recent_open_in_district(df: pd.DataFrame, district: str, limit: int = 12) -> list:
    """คำร้องที่ยังไม่เสร็จในเขตเดียวกัน ใช้เป็น context ให้ AI เช็คว่าเป็นเรื่องซ้ำกันหรือไม่"""
    d = df[(~df["done"]) & (df["district"] == district)].sort_values("received", ascending=False).head(limit)
    return [{"cid": str(r["cid"]).strip(), "text": str(r["text"])[:120]} for _, r in d.iterrows()]


def ai_smart_intake(text: str, district: str, user_category: str, user_department: str,
                     taxonomy: dict, recent_open: list, api_key: str) -> dict:
    """
    ใช้ Claude วิเคราะห์คำร้องตอนรับเรื่อง (ตอนยื่นคำร้อง) แทนการพึ่ง ML/keyword อย่างเดียว:
      1. ยืนยัน/แก้ไขประเภทคำร้องและหน่วยงานที่รับผิดชอบ ให้ตรงบริบทจริง ไม่ใช่แค่จับคำ
      2. ประเมินความเร่งด่วนจริง (สูง/กลาง/ต่ำ) จากเนื้อหา ไม่ใช่แค่มี keyword คำว่า "ไฟดับ" ก็ตั้งสูงเหมือนกันหมด
      3. เช็คว่าคล้ายกับคำร้องที่ยังไม่เสร็จในเขตเดียวกันหรือไม่ (เรื่องซ้ำ)
      4. ร่างข้อความตอบรับให้ประชาชนที่เจาะจงกับเรื่องนั้นจริงๆ

    คืน dict เสมอ มี key "mode": "ai" หรือ "fallback"
    ถ้าไม่มี api_key หรือเรียก AI ไม่สำเร็จ จะ fallback ไปใช้ keyword priority + ข้อความสำเร็จรูป
    (ไม่ทำให้การยื่นคำร้องล้มเหลว — AI เป็นส่วนเสริมความฉลาด ไม่ใช่จุดที่พังแล้วระบบหลักพังตาม)
    """
    fallback = {
        "mode":            "fallback",
        "category":        user_category,
        "department":      user_department,
        "priority":        _keyword_priority(text),
        "is_duplicate":    False,
        "duplicate_cid":   None,
        "ack_message":     f"ได้รับเรื่อง \"{text[:40]}\" แล้ว ระบบจะดำเนินการแจ้งหน่วยงานที่เกี่ยวข้องต่อไป",
    }

    if not api_key:
        return fallback

    try:
        import anthropic, json as _json
        client = anthropic.Anthropic(api_key=api_key)

        prompt = f"""วิเคราะห์คำร้องเรียนนี้ของเทศบาลนครขอนแก่น แล้วตอบเป็น JSON เท่านั้น (ไม่มีข้อความอื่นนอก JSON):

ข้อความร้องเรียน: "{text}"
เขตที่แจ้ง: {district}
ผู้แจ้งเลือกประเภทไว้ว่า: {user_category}
ผู้แจ้งเลือกหน่วยงานไว้ว่า: {user_department}

ประเภทคำร้องที่มีอยู่ในระบบ (เลือกให้ตรงที่สุด ถ้าไม่มีให้ใช้ของผู้แจ้ง): {", ".join(taxonomy["categories"][:40])}
หน่วยงานที่มีอยู่ในระบบ (เลือกให้ตรงที่สุด ถ้าไม่มีให้ใช้ของผู้แจ้ง): {", ".join(taxonomy["departments"][:40])}

คำร้องที่ยังไม่เสร็จในเขตเดียวกัน (เช็คว่าเรื่องนี้ซ้ำกับเรื่องใดไหม):
{_json.dumps(recent_open, ensure_ascii=False)}

ตอบเป็น JSON ตาม schema นี้เท่านั้น:
{{
  "category": "ประเภทที่ถูกต้องที่สุด",
  "department": "หน่วยงานที่ถูกต้องที่สุด",
  "priority": "สูง หรือ กลาง หรือ ต่ำ",
  "priority_reason": "เหตุผลสั้นๆ 1 ประโยค",
  "is_duplicate": true หรือ false,
  "duplicate_cid": "เลขคำร้องที่ซ้ำ ถ้ามี ไม่งั้นเป็น null",
  "ack_message": "ข้อความตอบรับประชาชน 1-2 ประโยค เจาะจงกับเรื่องนี้ ระบุความเร่งด่วนด้วย"
}}"""

        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = "".join(b.text for b in msg.content if b.type == "text").strip()
        # กันกรณี AI ตอบมี markdown code fence แถมมา
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        parsed = _json.loads(raw)

        return {
            "mode":            "ai",
            "category":        parsed.get("category") or user_category,
            "department":      parsed.get("department") or user_department,
            "priority":        parsed.get("priority") if parsed.get("priority") in ("สูง", "กลาง", "ต่ำ") else fallback["priority"],
            "priority_reason": parsed.get("priority_reason", ""),
            "is_duplicate":    bool(parsed.get("is_duplicate", False)),
            "duplicate_cid":   parsed.get("duplicate_cid"),
            "ack_message":     parsed.get("ack_message") or fallback["ack_message"],
        }
    except Exception:
        # AI ล้ม (network/parse/quota ฯลฯ) — เงียบไว้ ใช้ fallback แทนเพื่อไม่ให้ยื่นคำร้องไม่ได้
        return fallback


def get_complaint_status(df: pd.DataFrame, cid: str) -> Optional[dict]:
    """หาคำร้องจากเลขคำร้อง คืนสถานะ + พยากรณ์ถ้ายังไม่เสร็จ"""
    cid = cid.strip()
    match = df[df["cid"].astype(str).str.strip() == cid]
    if match.empty:
        return None
    row = match.iloc[0]

    result = {
        "cid":        cid,
        "text":       str(row.get("text", "")),
        "category":   str(row.get("category", "")) if pd.notna(row.get("category")) else _UNKNOWN,
        "department": str(row.get("department", "")) if pd.notna(row.get("department")) else _UNKNOWN,
        "district":   str(row.get("district", "")),
        "community":  str(row.get("community", "")) if pd.notna(row.get("community")) else "",
        "status":     str(row.get("status", "")),
        "done":       bool(row.get("done", False)),
        "photo":      str(row.get("photo", "")) or None,
        "after_photo": str(row.get("after_photo", "")) or None,
        "closed_by":  str(row.get("closed_by", "")) or None,
        "received":   row["received"].date().isoformat() if pd.notna(row.get("received")) else None,
        "completed":  row["completed"].date().isoformat() if pd.notna(row.get("completed")) else None,
    }

    if not result["done"]:
        df_done = df[df["done"] & df["days"].notna()]
        lookup  = build_median_lookup(df_done)
        pred    = predict_days_fast(result["category"], result["department"], lookup)
        days    = pred["days"]
        result["predicted_days"]   = days
        result["confidence"]       = pred["confidence"]
        result["sample_size"]      = pred["sample_size"]
        result["confidence_basis"] = pred["basis"]
        override = str(row.get("priority_override", "") or "").strip()
        result["priority"]      = override or _keyword_priority(result["text"])
        result["ai_assessed"]   = bool(override)
        if result["received"]:
            received_dt = row["received"]
            expected = (received_dt + timedelta(days=days)).date().isoformat()
            result["expected_done"] = expected
            result["overdue"] = expected < date.today().isoformat()
        else:
            result["expected_done"] = None
            result["overdue"] = False

    return result


def get_recent_complaints(df: pd.DataFrame, limit: int = 8) -> list:
    """คำร้องล่าสุดเรียงตามวันที่รับเรื่อง สำหรับ live ticker"""
    d = df[df["received"].notna()].sort_values("received", ascending=False).head(limit)
    rows = []
    for _, row in d.iterrows():
        rows.append({
            "cid":      str(row.get("cid", "")).strip(),
            "text":     str(row.get("text", ""))[:60],
            "district": str(row.get("district", "")),
            "category": str(row.get("category", "")) if pd.notna(row.get("category")) else _UNKNOWN,
            "received": row["received"].date().isoformat(),
        })
    return rows


def get_leaderboard(df: pd.DataFrame) -> dict:
    """จัดอันดับฝ่าย/เขต ตาม completion rate และความเร็วเฉลี่ย"""
    def _rank(group_col: str) -> list:
        g = df.groupby(group_col)
        out = []
        for name, grp in g:
            if pd.isna(name) or str(name).strip() in ("", _UNKNOWN):
                continue
            total = len(grp)
            if total < 3:
                continue
            done = grp["done"].sum()
            done_with_days = grp[grp["done"] & grp["days"].notna()]
            avg_days = float(done_with_days["days"].mean()) if len(done_with_days) else None
            out.append({
                "name":            str(name),
                "total":           int(total),
                "done":            int(done),
                "completion_rate": round(100 * done / total, 1),
                "avg_days":        round(avg_days, 1) if avg_days is not None else None,
            })
        # เรียงตาม completion_rate ก่อน แล้วตามความเร็ว (avg_days น้อยกว่า = ดีกว่า)
        out.sort(key=lambda x: (-x["completion_rate"], x["avg_days"] if x["avg_days"] is not None else 9999))
        return out

    return {
        "department": _rank("department"),
        "district":   _rank("district"),
    }


def get_hotspot_forecast(df: pd.DataFrame) -> list:
    """
    พยากรณ์แนวโน้มคำร้องรายเขตเดือนหน้า ด้วย linear trend จาก 6 เดือนล่าสุด
    เรียบง่ายแต่พอสำหรับ prototype — ไม่ใช่ time-series model ที่ซับซ้อน
    """
    d = df[df["received"].notna()].copy()
    d["month"] = d["received"].dt.to_period("M")

    months = sorted(d["month"].unique())[-6:]
    if len(months) < 3:
        return []

    pivot = (
        d[d["month"].isin(months)]
        .groupby(["district", "month"])
        .size()
        .unstack(fill_value=0)
        .reindex(columns=months, fill_value=0)
    )

    x = list(range(len(months)))
    results = []
    for district, row in pivot.iterrows():
        if pd.isna(district) or str(district).strip() == "":
            continue
        y = row.values.astype(float)
        if y.sum() < 3:
            continue
        slope, intercept = (0.0, float(y.mean())) if len(set(x)) < 2 else tuple(
            np.polyfit(x, y, 1)
        )
        next_val = max(0, slope * len(months) + intercept)
        results.append({
            "district":      str(district),
            "recent_avg":     round(float(y.mean()), 1),
            "trend":          "เพิ่มขึ้น" if slope > 0.15 else ("ลดลง" if slope < -0.15 else "คงที่"),
            "projected_next": round(next_val, 1),
        })

    results.sort(key=lambda r: r["projected_next"], reverse=True)
    return results


def build_median_lookup(df_done: pd.DataFrame) -> dict:
    """Pre-compute median lookup dict — O(1) per prediction แทน O(n) filter"""
    cat_stats  = df_done.groupby("category")["days"].agg(["median", "count"])
    dept_stats = df_done.groupby("department")["days"].agg(["median", "count"])
    overall    = int(df_done["days"].median()) if len(df_done) else 7

    return {
        "cat":     {k: (int(v["median"]), int(v["count"])) for k, v in cat_stats.iterrows() if v["count"] >= 3},
        "dept":    {k: (int(v["median"]), int(v["count"])) for k, v in dept_stats.iterrows() if v["count"] >= 3},
        "overall": overall,
        "overall_n": int(len(df_done)),
    }


def _confidence_label(n: int) -> str:
    """แปลงจำนวนตัวอย่างเป็นระดับความมั่นใจที่อ่านง่าย"""
    if n >= 20:
        return "สูง"
    if n >= 8:
        return "กลาง"
    return "ต่ำ"


def predict_days_fast(cat, dept, lookup: dict) -> dict:
    """
    O(1) lookup แทนการ filter DataFrame ทุก row
    คืนทั้งจำนวนวันที่คาดการณ์และความมั่นใจ (อิงจากจำนวนคำร้องที่ใช้คำนวณค่ามัธยฐาน)
    """
    if cat in lookup["cat"]:
        days, n = lookup["cat"][cat]
        return {"days": days, "sample_size": n, "confidence": _confidence_label(n), "basis": "ประเภทคำร้องเดียวกัน"}
    if dept in lookup["dept"]:
        days, n = lookup["dept"][dept]
        return {"days": days, "sample_size": n, "confidence": _confidence_label(n), "basis": "หน่วยงานเดียวกัน"}
    return {
        "days": lookup["overall"], "sample_size": lookup["overall_n"],
        "confidence": "ต่ำ", "basis": "ค่าเฉลี่ยรวมทั้งหมด (ไม่มีข้อมูลเฉพาะประเภท/หน่วยงานนี้)",
    }


def build_predictions(df: pd.DataFrame, cat_model, dept_model, tok_fn, priority_model=None) -> list:
    df_done    = df[df["done"] & df["days"].notna()]
    df_pending = df[~df["done"]].copy()

    lookup = build_median_lookup(df_done)
    today  = date.today().isoformat()

    # Batch predict category สำหรับ rows ที่ไม่มี category
    need_pred = df_pending["category"].isna() | (df_pending["category"].astype(str).str.strip() == "")
    if need_pred.any() and cat_model is not None:
        texts      = df_pending.loc[need_pred, "text_clean"].apply(tok_fn)
        pred_cats  = cat_model.predict(texts)
        pred_depts = dept_model.predict(texts)
        df_pending.loc[need_pred, "category"]   = pred_cats
        df_pending.loc[need_pred, "department"] = pred_depts

    # Batch predict priority ด้วย ML สำหรับทุก pending row
    all_texts = df_pending["text_clean"].apply(tok_fn)
    if priority_model is not None:
        df_pending["priority_ml"] = priority_model.predict(all_texts)
    else:
        df_pending["priority_ml"] = df_pending["text_clean"].apply(_keyword_priority)

    rows = []
    for _, row in df_pending.iterrows():
        cat      = row.get("category")
        dept     = row.get("department")
        pred     = predict_days_fast(cat, dept, lookup)
        days     = pred["days"]
        received = row["received"]

        if pd.notna(received):
            expected = (received + timedelta(days=days)).date().isoformat()
            overdue  = expected < today
        else:
            expected = None
            overdue  = False

        rows.append({
            "cid":            str(row.get("cid", "")).strip(),
            "text":           str(row.get("text", ""))[:100],
            "district":       str(row.get("district", "")),
            "community":      str(row.get("community", "")),
            "received":       received.date().isoformat() if pd.notna(received) else None,
            "category":       str(cat) if pd.notna(cat) else _UNKNOWN,
            "department":     str(dept) if pd.notna(dept) else _UNKNOWN,
            "ai_suggested_dept": str(dept) if pd.notna(dept) else _UNKNOWN,
            "priority":       str(row.get("priority_override") or row.get("priority_ml", "กลาง")),
            "ai_assessed":    bool(row.get("priority_override")),
            "predicted_days": days,
            "expected_done":  expected,
            "overdue":        overdue,
            "confidence":     pred["confidence"],
            "sample_size":    pred["sample_size"],
            "confidence_basis": pred["basis"],
        })

    rows.sort(key=lambda x: x["expected_done"] or "9999")
    return rows

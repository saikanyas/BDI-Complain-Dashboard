from pathlib import Path
from datetime import date, timedelta

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
    df["received"]   = df["received"].apply(_parse_date)
    df["completed"]  = df["completed"].apply(_parse_date)
    df["days"]       = (df["completed"] - df["received"]).dt.days.clip(lower=0)
    df["done"]       = df["status"].str.contains("เสร็จ", na=False)
    df["district"]   = df["district"].replace({"ไม่ระบุ": "ไม่ระบุเขต", "อาคารเขต 7": "เขต 7"})
    df["text_clean"] = _correct_text(df["text"])
    df["priority"]   = df["text_clean"].apply(_keyword_priority)
    return df


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


def build_median_lookup(df_done: pd.DataFrame) -> dict:
    """Pre-compute median lookup dict — O(1) per prediction แทน O(n) filter"""
    cat_stats  = df_done.groupby("category")["days"].agg(["median", "count"])
    dept_stats = df_done.groupby("department")["days"].agg(["median", "count"])
    overall    = int(df_done["days"].median()) if len(df_done) else 7

    return {
        "cat":     {k: int(v["median"]) for k, v in cat_stats.iterrows() if v["count"] >= 3},
        "dept":    {k: int(v["median"]) for k, v in dept_stats.iterrows() if v["count"] >= 3},
        "overall": overall,
    }


def predict_days_fast(cat, dept, lookup: dict) -> int:
    """O(1) lookup แทนการ filter DataFrame ทุก row"""
    if cat in lookup["cat"]:
        return lookup["cat"][cat]
    if dept in lookup["dept"]:
        return lookup["dept"][dept]
    return lookup["overall"]


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
        days     = predict_days_fast(cat, dept, lookup)
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
            "priority":       str(row.get("priority_ml", "กลาง")),
            "predicted_days": days,
            "expected_done":  expected,
            "overdue":        overdue,
        })

    rows.sort(key=lambda x: x["expected_done"] or "9999")
    return rows

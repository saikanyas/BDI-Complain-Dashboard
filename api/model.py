from pathlib import Path
from datetime import timedelta

import pandas as pd

_HERE = Path(__file__).parent
_STOPWORDS = {
    "ของ","ใน","ที่","และ","มี","ให้","กับ","ได้","จาก","เป็น",
    "ไม่","มา","แล้ว","จะ","ก็","นั้น","อยู่","ต้อง","ว่า","ไป",
    "ๆ","nan","","บน","ตาม","โดย","กา","การ","ราย","นะ","ครับ","ค่ะ",
}
_DATA_PATHS = [
    _HERE / "data" / "data.xlsx",
    _HERE.parent / "ap1" / "ข้อมูลคำร้อง_sampled (1).xlsx",
    _HERE.parent / "ap1" / "ข้อมูลคำร้อง_sampled.xlsx",
]


def _parse_date(s):
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


def load_data() -> pd.DataFrame:
    raw = None
    for p in _DATA_PATHS:
        if p.exists():
            raw = pd.read_excel(p)
            break
    if raw is None:
        raise FileNotFoundError("No data file found — place data.xlsx in api/data/")

    rename = {
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
    df = raw.rename(columns=rename)
    df["received"]  = df["received"].apply(_parse_date)
    df["completed"] = df["completed"].apply(_parse_date)
    df["days"]      = (df["completed"] - df["received"]).dt.days.clip(lower=0)
    df["done"]      = df["status"].str.contains("เสร็จ", na=False)
    df["district"]  = df["district"].replace({"ไม่ระบุ": "ไม่ระบุเขต", "อาคารเขต 7": "เขต 7"})

    _corrections = {
        "ถ.": "ถนน", "ซ.": "ซอย", "ต.": "ตำบล",
        "อ.": "อำเภอ", "จ.": "จังหวัด",
        "ไฟฝ้า": "ไฟฟ้า", "ทอ": "ท่อ",
    }
    def _correct(t):
        for abbr, full in _corrections.items():
            t = str(t).replace(abbr, full)
        return t
    df["text_clean"] = df["text"].apply(_correct)
    return df


def get_tokenizer():
    try:
        from pythainlp.tokenize import word_tokenize
        def _tok(text: str) -> list:
            tokens = word_tokenize(str(text), engine="newmm", keep_whitespace=False)
            return [t.strip() for t in tokens
                    if t.strip() and len(t) > 1 and t.strip() not in _STOPWORDS]
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

    def _tok_str(t): return " ".join(tok_fn(str(t)))
    X  = df2["text_clean"].apply(_tok_str)
    yc = df2["category"]
    yd = df2["department"]

    Xtr, _, yc_tr, _, yd_tr, _ = train_test_split(
        X, yc, yd, test_size=0.2, random_state=42, stratify=yc
    )

    def _pipe():
        return Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=8000,
                                      sublinear_tf=True, min_df=2)),
            ("clf",   LogisticRegression(max_iter=600, C=1.5,
                                         class_weight="balanced", solver="lbfgs")),
        ])

    cp = _pipe(); cp.fit(Xtr, yc_tr)
    dp = _pipe(); dp.fit(Xtr, yd_tr)
    return cp, dp, _tok_str


def predict_days(cat, dept, df_done: pd.DataFrame) -> int:
    m1 = df_done[(df_done["category"] == cat) & df_done["days"].notna()]
    if len(m1) >= 3:
        return int(m1["days"].median())
    m2 = df_done[(df_done["department"] == dept) & df_done["days"].notna()]
    if len(m2) >= 3:
        return int(m2["days"].median())
    return int(df_done["days"].median()) if len(df_done) else 7


def build_predictions(df: pd.DataFrame, cat_model, dept_model, tok_fn) -> list:
    df_done    = df[df["done"] & df["days"].notna()].copy()
    df_pending = df[~df["done"]].copy()

    rows = []
    for _, row in df_pending.iterrows():
        cat  = row.get("category")
        dept = row.get("department")

        if (pd.isna(cat) or str(cat).strip() == "") and cat_model is not None:
            tok_text = tok_fn(str(row["text_clean"]))
            cat  = cat_model.predict([tok_text])[0]
            dept = dept_model.predict([tok_text])[0]

        days     = predict_days(cat, dept, df_done)
        received = row["received"]
        if pd.notna(received):
            expected = (received + timedelta(days=days)).date().isoformat()
            from datetime import date
            overdue = expected < date.today().isoformat()
        else:
            expected = None
            overdue  = False

        rows.append({
            "cid":           str(row.get("cid", "")).strip(),
            "text":          str(row.get("text", ""))[:100],
            "district":      str(row.get("district", "")),
            "community":     str(row.get("community", "")),
            "received":      received.date().isoformat() if pd.notna(received) else None,
            "category":      str(cat) if pd.notna(cat) else "ไม่ระบุ",
            "department":    str(dept) if pd.notna(dept) else "ไม่ระบุ",
            "predicted_days": days,
            "expected_done": expected,
            "overdue":       overdue,
        })

    rows.sort(key=lambda x: x["expected_done"] or "9999")
    return rows

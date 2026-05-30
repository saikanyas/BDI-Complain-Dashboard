from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from model import load_data, train_models, train_priority_model, build_predictions

_state: dict = {}


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
    yield


app = FastAPI(title="BDI Predict API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    total   = len(_state.get("df", []))
    pending = int((~_state["df"]["done"]).sum()) if "df" in _state else 0
    return {"status": "ok", "total": total, "pending": pending}


@app.get("/pending-predictions")
def pending_predictions():
    return build_predictions(
        _state["df"],
        _state["cat_model"],
        _state["dept_model"],
        _state["tok_fn"],
        _state["priority_model"],
    )

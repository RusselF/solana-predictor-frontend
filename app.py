from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import yfinance as yf
import pandas as pd
import numpy as np
import joblib
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler
from typing import List, Dict, Tuple
from datetime import datetime
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Dict

# App & CORS
app = FastAPI(title="SOL Forecast API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Konfigurasi (MULTIVARIATE - OHLCV)
MODEL_PATH  = "artifacts/informer_bilstm_model_ohlcv.pth"
SCALER_PATH = "artifacts/scaler_ohlcv.pkl"

FEATURES: List[str] = ["Open", "High", "Low", "Close", "Volume"]
TARGET: str          = "Close"
INPUT_DIM: int       = len(FEATURES)   # 5
WINDOW: int          = 120
HORIZON: int         = 1

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Model Definition
class InformerBiLSTM(nn.Module):
    def __init__(self, input_dim: int):
        super().__init__()
        self.input_proj = nn.Linear(input_dim, 128)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=128, nhead=8, dim_feedforward=256,
            dropout=0.2, batch_first=True,
        )
        self.informer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=3)
        self.bilstm = nn.LSTM(
            input_size=128, hidden_size=64, num_layers=2,
            batch_first=True, bidirectional=True, dropout=0.2,
        )
        self.fc = nn.Sequential(
            nn.Linear(128, 64), nn.ReLU(), nn.Dropout(0.2), nn.Linear(64, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.input_proj(x)
        x = self.informer_encoder(x)
        lstm_out, _ = self.bilstm(x)
        out = lstm_out[:, -1, :]
        return self.fc(out).squeeze(-1)

# Load Model & Scaler
print("[Startup] Loading model and scaler...")
scaler: MinMaxScaler = joblib.load(SCALER_PATH)
model = InformerBiLSTM(INPUT_DIM)
checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
state_dict = checkpoint["model_state_dict"] if "model_state_dict" in checkpoint else checkpoint
model.load_state_dict(state_dict)
model.to(DEVICE)
model.eval()
print(f"[Startup] Model loaded on {DEVICE} ✅")

executor = ThreadPoolExecutor(max_workers=3)

# Cache
_PRICE_CACHE:    Dict[Tuple[str, str, str], Tuple[pd.DataFrame, float]] = {}
_FORECAST_CACHE: Dict[Tuple[str, str],      Tuple[dict, float]]         = {}
_DOWNLOAD_LOCKS: dict = {}

PRICE_TTL_SEC    = 1800
FORECAST_TTL_SEC = 120


async def get_prices_cached_async(
    symbol: str = "SOL-USD",
    period: str = "max",
    interval: str = "1d",
) -> pd.DataFrame:
    key = (symbol, period, interval)
    now = time.time()

    if key in _PRICE_CACHE:
        df, ts = _PRICE_CACHE[key]
        if now - ts < PRICE_TTL_SEC:
            return df.copy()

    if key in _DOWNLOAD_LOCKS:
        while key in _DOWNLOAD_LOCKS:
            await asyncio.sleep(0.1)
        return _PRICE_CACHE[key][0].copy() if key in _PRICE_CACHE else None

    _DOWNLOAD_LOCKS[key] = True
    try:
        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(
            executor,
            lambda: yf.download(
                symbol, period=period, interval=interval,
                auto_adjust=False, progress=False
            ),
        )
        df = raw[FEATURES].copy()
        df.columns = FEATURES
        df = df.dropna()
        _PRICE_CACHE[key] = (df, now)
        return df.copy()
    finally:
        _DOWNLOAD_LOCKS.pop(key, None)

# Helpers
TARGET_IDX = FEATURES.index(TARGET)

def inverse_close(scaled_vals: np.ndarray) -> np.ndarray:
    scaled_vals = np.array(scaled_vals).reshape(-1, 1)
    dummy = np.zeros((len(scaled_vals), INPUT_DIM))
    dummy[:, TARGET_IDX] = scaled_vals.ravel()
    inv = scaler.inverse_transform(dummy)
    return inv[:, TARGET_IDX]


def predict_one(series_scaled: np.ndarray) -> float:
    x = torch.tensor(
        series_scaled[-WINDOW:, :].reshape(1, WINDOW, INPUT_DIM),
        dtype=torch.float32,
    ).to(DEVICE)
    with torch.no_grad():
        y_hat = model(x).cpu().item()
    return float(inverse_close([y_hat])[0])


def forecast_recursive(series_scaled: np.ndarray, steps: int = 30) -> np.ndarray:
    buf = series_scaled.copy()
    preds_scaled: List[float] = []
    for _ in range(steps):
        x = torch.tensor(
            buf[-WINDOW:, :].reshape(1, WINDOW, INPUT_DIM),
            dtype=torch.float32,
        ).to(DEVICE)
        with torch.no_grad():
            y_hat_scaled = model(x).cpu().item()
        preds_scaled.append(y_hat_scaled)
        new_row = buf[-1, :].copy()
        new_row[TARGET_IDX] = y_hat_scaled
        buf = np.vstack([buf, new_row.reshape(1, -1)])
    return inverse_close(preds_scaled)


def backtest_predictions(
    series_scaled: np.ndarray,
    df_ohlcv: pd.DataFrame,
    span: int = 60,
) -> List[Dict]:
    N = series_scaled.shape[0]
    dates = df_ohlcv.index
    results = []
    start_idx = max(WINDOW, N - span)
    for i in range(start_idx, N):
        x = torch.tensor(
            series_scaled[i - WINDOW:i, :].reshape(1, WINDOW, INPUT_DIM),
            dtype=torch.float32,
        ).to(DEVICE)
        with torch.no_grad():
            y_hat_scaled = model(x).cpu().item()
        results.append({
            "date":      str(dates[i].date()),
            "actual":    float(df_ohlcv[TARGET].iloc[i]),
            "predicted": float(inverse_close([y_hat_scaled])[0]),
        })
    return results

# Startup
async def warm_cache_background():
    try:
        await get_prices_cached_async("SOL-USD", "max", "1d")
        print("[Background] Cache warmed ✅")
    except Exception as e:
        print(f"[Background] Warm cache failed: {e}")


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(warm_cache_background())
    print("[Startup] API ready!")

# Routes
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "device": str(DEVICE),
        "cache": {
            "price_entries":    len(_PRICE_CACHE),
            "forecast_entries": len(_FORECAST_CACHE),
        },
    }


@app.get("/predict")
async def predict(period: str = Query("max")):
    df = await get_prices_cached_async("SOL-USD", period, "1d")
    series_scaled = scaler.transform(df[FEATURES].values)
    next_day   = predict_one(series_scaled)
    last_close = float(df[TARGET].iloc[-1])
    last_date  = str(df.index[-1].date())
    return JSONResponse(
        {"date": last_date, "last_close": last_close, "pred_next_day": next_day},
        headers={"Cache-Control": "public, max-age=1800"},
    )


@app.get("/predict_date")
async def predict_date(
    target_date: str,
    period: str = Query("max"),
):
    df = await get_prices_cached_async("SOL-USD", period, "1d")
    series_scaled = scaler.transform(df[FEATURES].values)
    last_date = df.index[-1].date()

    try:
        target = datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError:
        return JSONResponse({"error": "Format tanggal salah. Gunakan YYYY-MM-DD"}, status_code=400)

    days_ahead = (target - last_date).days
    if days_ahead <= 0:
        return JSONResponse({"error": f"Tanggal harus setelah data terakhir ({last_date})"}, status_code=400)
    if days_ahead > 60:
        return JSONResponse({"error": "Maksimal 60 hari ke depan."}, status_code=400)

    preds = forecast_recursive(series_scaled, steps=days_ahead)
    return JSONResponse(
        {
            "last_date":       str(last_date),
            "target_date":     str(target),
            "days_ahead":      days_ahead,
            "predicted_price": float(preds[-1]),
        },
        headers={"Cache-Control": "public, max-age=1800"},
    )


@app.get("/forecast")
async def forecast(period: str = Query("max")):
    key = (period, "1d")
    now = time.time()

    if key in _FORECAST_CACHE:
        data, ts = _FORECAST_CACHE[key]
        if now - ts < FORECAST_TTL_SEC:
            return JSONResponse(data, headers={"Cache-Control": "public, max-age=1800", "X-Cache-Status": "HIT"})

    df = await get_prices_cached_async("SOL-USD", period, "1d")
    series_scaled = scaler.transform(df[FEATURES].values)

    preds_next_30 = forecast_recursive(series_scaled, steps=30)
    future_dates  = pd.date_range(start=df.index[-1] + pd.Timedelta(days=1), periods=30, freq="D")
    eval_pairs    = backtest_predictions(series_scaled, df, span=60)

    result = {
        "history": [
            {"date": str(d.date()), "price": float(p)}
            for d, p in zip(df.index[-WINDOW:], df[TARGET].tail(WINDOW).values)
        ],
        "eval":     eval_pairs,
        "forecast": [
            {"date": str(d.date()), "price": float(p)}
            for d, p in zip(future_dates, preds_next_30)
        ],
    }

    _FORECAST_CACHE[key] = (result, now)
    return JSONResponse(result, headers={"Cache-Control": "public, max-age=1800", "X-Cache-Status": "MISS"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=7860, reload=True)
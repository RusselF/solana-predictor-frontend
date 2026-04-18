"use client";

import { useEffect, useState } from "react";
import { formatUSD, pctValue } from "@/lib/api";
import { PredictResponse } from "@/lib/types";
import { API_URL } from "@/lib/config";
import Link from "next/link";

export default function HomePage() {
  const [data, setData] = useState<PredictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = "https://russelfx-solana-predictor.hf.space/predict";
    console.log("Fetching:", url);
    fetch(`${API_URL}/predict`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const pct = data ? pctValue(data.pred_next_day, data.last_close) : 0;
  const isUp = pct >= 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16">
      {/* Hero */}
      <div className="text-center mb-14">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs mb-6"
          style={{
            background: "rgba(139,92,246,0.1)",
            border: "1px solid rgba(139,92,246,0.25)",
            color: "#A78BFA",
            letterSpacing: "0.15em",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
          LIVE · SOL / USD
        </div>
        <h1
          className="text-6xl md:text-8xl font-bold mb-5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="text-gradient-sol">SolCast</span>
        </h1>
        <p className="text-sm md:text-base max-w-md mx-auto leading-relaxed" style={{ color: "var(--sol-muted)" }}>
          Solana price forecasting powered by<br />
          Informer Encoder + Bidirectional LSTM
        </p>
      </div>

      {/* Price Cards */}
      {loading ? (
        <div className="card p-8 text-center mb-10 w-full max-w-xl">
          <p className="text-sm" style={{ color: "var(--sol-muted)" }}>Loading...</p>
        </div>
      ) : error ? (
        <div className="card p-6 text-center mb-10" style={{ color: "#F87171" }}>
          ⚠ Failed to load data: {error}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl mb-12">
          {/* Last Close */}
          <div className="card p-7">
            <p className="text-xs tracking-widest mb-4" style={{ color: "var(--sol-muted)" }}>
              LAST CLOSE · {data.date}
            </p>
            <p
              className="text-4xl font-bold mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--sol-text)" }}
            >
              {formatUSD(data.last_close)}
            </p>
            <p className="text-xs" style={{ color: "var(--sol-muted)" }}>Solana · USD</p>
          </div>

          {/* Next Day Prediction */}
          <div
            className="card p-7"
            style={{
              border: `1px solid ${isUp ? "rgba(16,185,129,0.3)" : "rgba(248,113,113,0.3)"}`,
              background: isUp ? "rgba(16,185,129,0.06)" : "rgba(248,113,113,0.06)",
            }}
          >
            <p className="text-xs tracking-widest mb-4" style={{ color: "var(--sol-muted)" }}>
              TOMORROW`S PREDICTION
            </p>
            <p
              className="text-4xl font-bold mb-1"
              style={{
                fontFamily: "var(--font-display)",
                color: isUp ? "#34D399" : "#F87171",
              }}
            >
              {formatUSD(data.pred_next_day)}
            </p>
            <p className="text-xs font-medium" style={{ color: isUp ? "#34D399" : "#F87171" }}>
              {isUp ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}% from last close
            </p>
          </div>
        </div>
      ) : null}

      {/* CTA Buttons */}
      <div className="flex gap-3 flex-wrap justify-center">
        <Link href="/forecast" className="btn-primary">
          View 30-Day Forecast →
        </Link>
        <Link href="/predict-date" className="btn-secondary">
          Predict a Date
        </Link>
      </div>

      <p className="mt-16 text-xs" style={{ color: "var(--sol-muted)", opacity: 0.5 }}>
        Predictions are for informational purposes only · Not financial advice
      </p>
    </div>
  );
}
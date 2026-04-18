"use client";

import { useState } from "react";
import { API_URL } from "@/lib/config";
import { PredictDateResponse } from "@/lib/types";

function formatUSD(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(v);
}

export default function PredictDatePage() {
  const [date, setDate] = useState("");
  const [result, setResult] = useState<PredictDateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  const max = maxDate.toISOString().split("T")[0];

  async function handleSubmit() {
    if (!date) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const r = await fetch(`${API_URL}/predict_date?target_date=${date}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setResult(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs tracking-widest mb-2" style={{ color: "var(--sol-muted)" }}>
            SOL / USD
          </p>
          <h1
            className="text-4xl md:text-5xl font-bold mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Predict a <span className="text-gradient-sol">Date</span>
          </h1>
          <p className="text-sm" style={{ color: "var(--sol-muted)" }}>
            Get SOL price prediction for any date up to 60 days ahead
          </p>
        </div>

        {/* Form */}
        <div className="card p-7 mb-6">
          <label
            className="block text-xs tracking-widest mb-3"
            style={{ color: "var(--sol-muted)" }}
          >
            SELECT DATE
          </label>
          <input
            type="date"
            value={date}
            min={today}
            max={max}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm mb-5 outline-none transition-all"
            style={{
              background: "#0F0F1A",
              border: "1px solid #2A2A45",
              color: "var(--sol-text)",
              fontFamily: "var(--font-mono)",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!date || loading}
            className="w-full py-3 rounded-xl text-sm font-medium tracking-widest transition-all duration-200"
            style={{
              background:
                !date || loading
                  ? "#2A2A45"
                  : "linear-gradient(135deg, #8B5CF6, #10B981)",
              color: !date || loading ? "var(--sol-muted)" : "#fff",
              cursor: !date || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Predicting..." : "GET PREDICTION →"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            className="card p-4 text-center text-sm mb-4"
            style={{ color: "#F87171", borderColor: "rgba(248,113,113,0.3)" }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className="card p-7"
            style={{
              border: "1px solid rgba(139,92,246,0.3)",
              background: "rgba(139,92,246,0.05)",
            }}
          >
            <p
              className="text-xs tracking-widest mb-4"
              style={{ color: "var(--sol-muted)" }}
            >
              PREDICTED PRICE FOR {result.target_date}
            </p>
            <p
              className="text-5xl font-bold mb-3"
              style={{
                fontFamily: "var(--font-display)",
                color: "#A78BFA",
              }}
            >
              {formatUSD(result.predicted_price)}
            </p>
            <p className="text-xs" style={{ color: "var(--sol-muted)" }}>
              {result.days_ahead} day{result.days_ahead > 1 ? "s" : ""} ahead · based on data up to {result.last_date}
            </p>
          </div>
        )}

        <p className="text-center text-xs mt-8" style={{ color: "var(--sol-muted)", opacity: 0.5 }}>
          Predictions are for informational purposes only · Not financial advice
        </p>
      </div>
    </div>
  );
}
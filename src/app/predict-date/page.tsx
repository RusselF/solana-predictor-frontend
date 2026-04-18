"use client";

import { useState } from "react";
import { API_URL } from "@/lib/config";
import { PredictDateResponse } from "@/lib/types";
import Link from "next/link";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, ReferenceDot,
} from "recharts";

function fmt(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2,
  }).format(v);
}

interface TProps { active?: boolean; payload?: { value: number; name: string }[]; label?: string; }

const CustomTooltip = ({ active, payload, label }: TProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#161B22", border: "1px solid #30363D",
      borderRadius: 6, padding: "10px 14px",
      fontSize: 12, fontFamily: "var(--font-mono)",
    }}>
      <div style={{ color: "#7D8590", marginBottom: 4, fontSize: 11 }}>{label}</div>
      <div style={{ color: "#E6EDF3" }}>${payload[0].value.toFixed(2)}</div>
    </div>
  );
};

export default function PredictDatePage() {
  const [date, setDate] = useState("");
  const [result, setResult] = useState<PredictDateResponse | null>(null);
  const [history, setHistory] = useState<{ date: string; price: number }[]>([]);
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
      const [predRes, forecastRes] = await Promise.all([
        fetch(`${API_URL}/predict_date?target_date=${date}`).then((r) => r.json()),
        fetch(`${API_URL}/forecast`).then((r) => r.json()),
      ]);

      if (predRes.error) throw new Error(predRes.error);
      setResult(predRes);
      setHistory(forecastRes.history.slice(-30));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Build chart data: history + predicted point
  const chartData = result
    ? [
        ...history.map((h) => ({
          date: new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          Price: h.price,
        })),
        {
          date: new Date(result.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          Predicted: result.predicted_price,
        },
      ]
    : [];

  return (
    <div style={{ minHeight: "100vh", paddingTop: 48 }}>
      {/* Top bar */}
      <div style={{
        borderBottom: "1px solid #21262D", padding: "12px 24px",
        fontFamily: "var(--font-mono)", fontSize: 11, color: "#7D8590",
      }}>
        SOL-USD · DATE PREDICTION · MAX 60 DAYS AHEAD
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>

              {/* Back button */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "#6B7280", textDecoration: "none",
          fontFamily: "var(--font-mono)",
        }}>
          ← Back to Overview
        </Link>
      </div>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
            Predict a Date
          </h1>
          <p style={{ fontSize: 13, color: "#7D8590" }}>
            Get SOL price prediction for any date up to 60 days ahead
          </p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: "block", fontSize: 11,
                fontFamily: "var(--font-mono)", color: "#484F58",
                letterSpacing: "0.06em", marginBottom: 8,
              }}>
                TARGET DATE
              </label>
              <input
                type="date"
                value={date}
                min={today}
                max={max}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px",
                  background: "#0D1117", border: "1px solid #30363D",
                  borderRadius: 6, color: "#E6EDF3",
                  fontSize: 13, fontFamily: "var(--font-mono)",
                  outline: "none",
                }}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!date || loading}
              style={{
                padding: "9px 20px", borderRadius: 6, fontSize: 13,
                fontWeight: 500, cursor: !date || loading ? "not-allowed" : "pointer",
                background: !date || loading ? "#1C2333" : "#7C6FF7",
                border: `1px solid ${!date || loading ? "#30363D" : "#7C6FF7"}`,
                color: !date || loading ? "#484F58" : "#fff",
                transition: "all 0.15s", whiteSpace: "nowrap",
              }}
            >
              {loading ? "Computing..." : "Run Prediction →"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="card" style={{
            padding: "14px 20px", marginBottom: 20,
            borderColor: "#F85149", color: "#F85149", fontSize: 13,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <>
            {/* Result card */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1, background: "#21262D", borderRadius: 8,
              overflow: "hidden", border: "1px solid #21262D",
              marginBottom: 20,
            }}>
              {[
                { label: "TARGET DATE", value: result.target_date, color: "#E6EDF3" },
                { label: "PREDICTED PRICE", value: fmt(result.predicted_price), color: "#7C6FF7" },
                { label: "DAYS AHEAD", value: `${result.days_ahead}d`, color: "#E6EDF3" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "#161B22", padding: "18px 20px" }}>
                  <div style={{
                    fontSize: 10, fontFamily: "var(--font-mono)",
                    color: "#484F58", letterSpacing: "0.08em", marginBottom: 6,
                  }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, color }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="card" style={{ padding: "20px 24px" }}>
              <div style={{
                fontSize: 12, color: "#7D8590", fontFamily: "var(--font-mono)",
                marginBottom: 16,
              }}>
                30-day history + predicted point
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date"
                    tick={{ fill: "#484F58", fontSize: 11, fontFamily: "var(--font-mono)" }}
                    tickLine={false} axisLine={false} interval={6} />
                  <YAxis
                    tick={{ fill: "#484F58", fontSize: 11, fontFamily: "var(--font-mono)" }}
                    tickLine={false} axisLine={false}
                    tickFormatter={(v) => "$" + v.toFixed(0)} width={52} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Price" stroke="#30363D"
                    strokeWidth={1.5} dot={false} connectNulls />
                  <Line type="monotone" dataKey="Predicted" stroke="#7C6FF7"
                    strokeWidth={0} dot={{ fill: "#7C6FF7", r: 5, strokeWidth: 2, stroke: "#161B22" }}
                    connectNulls />
                  <ReferenceDot
                    x={new Date(result.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    y={result.predicted_price}
                    r={6} fill="#7C6FF7" stroke="#161B22" strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <p style={{
          marginTop: 32, fontSize: 11, color: "#484F58",
          fontFamily: "var(--font-mono)", textAlign: "center",
        }}>
          Predictions are for informational purposes only · Not financial advice
        </p>
      </div>
    </div>
  );
}
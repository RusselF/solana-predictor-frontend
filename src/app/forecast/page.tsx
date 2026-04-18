"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";
import { ForecastResponse } from "@/lib/types";
import Link from "next/link";
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, ReferenceLine,
} from "recharts";

function fmt(v: number) {
  return "$" + v.toFixed(2);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface TooltipPayload { name: string; value: number; color: string; }
interface TProps { active?: boolean; payload?: TooltipPayload[]; label?: string; }

const CustomTooltip = ({ active, payload, label }: TProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#161B22", border: "1px solid #30363D",
      borderRadius: 6, padding: "10px 14px",
      fontSize: 12, fontFamily: "var(--font-mono)",
    }}>
      <div style={{ color: "#7D8590", marginBottom: 6, fontSize: 11 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  );
};

export default function ForecastPage() {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/forecast`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const chartData = data ? [
    ...data.history.slice(-60).map((h) => ({
      date: fmtDate(h.date), History: h.price,
    })),
    ...data.eval.map((e) => ({
      date: fmtDate(e.date), History: e.actual, Backtest: e.predicted,
    })),
    ...data.forecast.map((f) => ({
      date: fmtDate(f.date), Forecast: f.price,
    })),
  ] : [];

  const todayLabel = data ? fmtDate(data.eval[data.eval.length - 1].date) : "";
  const lastActual = data?.eval[data.eval.length - 1]?.actual;

  return (
    <div style={{ minHeight: "100vh", paddingTop: 48 }}>
      {/* Top bar */}
      <div style={{
        borderBottom: "1px solid #21262D", padding: "12px 24px",
        fontFamily: "var(--font-mono)", fontSize: 11, color: "#7D8590",
        display: "flex", justifyContent: "space-between",
      }}>
        <span>SOL-USD · 30-DAY FORECAST · INFORMER+BILSTM</span>
        <span>History · Backtest · Forecast</span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

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
            30-Day Price Forecast
          </h1>
          <p style={{ fontSize: 13, color: "#7D8590" }}>
            Historical prices, model backtest evaluation, and 30-day forward prediction
          </p>
        </div>

        {/* Chart */}
        <div className="card" style={{ padding: "24px", marginBottom: 20 }}>
          {/* Legend */}
          <div style={{ display: "flex", gap: 20, marginBottom: 20, fontSize: 12, fontFamily: "var(--font-mono)" }}>
            {[
              { color: "#30363D", label: "History" },
              { color: "#7C6FF7", label: "Backtest" },
              { color: "#3FB950", label: "Forecast" },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, color: "#7D8590" }}>
                <div style={{ width: 20, height: 2, background: color, borderRadius: 1 }} />
                {label}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ height: 340, display: "flex", alignItems: "center", justifyContent: "center", color: "#7D8590" }}>
              Loading...
            </div>
          ) : error ? (
            <div style={{ height: 340, display: "flex", alignItems: "center", justifyContent: "center", color: "#F85149" }}>
              ⚠ {error}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: "#484F58", fontSize: 11, fontFamily: "var(--font-mono)" }}
                  tickLine={false} axisLine={false} interval={14} />
                <YAxis tick={{ fill: "#484F58", fontSize: 11, fontFamily: "var(--font-mono)" }}
                  tickLine={false} axisLine={false} tickFormatter={(v) => "$" + v.toFixed(0)} width={56} />
                <Tooltip content={<CustomTooltip />} />
                {todayLabel && (
                  <ReferenceLine x={todayLabel} stroke="#30363D" strokeDasharray="3 3" />
                )}
                <Line type="monotone" dataKey="History" stroke="#30363D" strokeWidth={1.5} dot={false} connectNulls />
                <Line type="monotone" dataKey="Backtest" stroke="#7C6FF7" strokeWidth={1.5} dot={false} connectNulls strokeDasharray="4 3" />
                <Line type="monotone" dataKey="Forecast" stroke="#3FB950" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Forecast table */}
        {data && (
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #21262D" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Forecast Details</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font-mono)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #21262D" }}>
                    {["Date", "Predicted Price", "Daily Change"].map((h) => (
                      <th key={h} style={{
                        textAlign: "left", padding: "10px 20px",
                        fontSize: 11, color: "#484F58", letterSpacing: "0.06em",
                        fontWeight: 400,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.forecast.map((f, i) => {
                    const prev = i === 0 ? lastActual! : data.forecast[i - 1].price;
                    const chg = ((f.price - prev) / prev) * 100;
                    const up = chg >= 0;
                    return (
                      <tr key={f.date} style={{ borderBottom: "1px solid #161B22" }}>
                        <td style={{ padding: "10px 20px", color: "#7D8590" }}>{f.date}</td>
                        <td style={{ padding: "10px 20px", color: "#E6EDF3", fontWeight: 500 }}>{fmt(f.price)}</td>
                        <td style={{ padding: "10px 20px", color: up ? "#3FB950" : "#F85149" }}>
                          {up ? "+" : ""}{chg.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
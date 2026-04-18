"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";
import { ForecastResponse } from "@/lib/types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatUSD(v: number) {
  return "$" + v.toFixed(2);
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#1C1C30",
        border: "1px solid #2A2A45",
        borderRadius: 12,
        padding: "10px 14px",
        fontSize: 12,
        fontFamily: "var(--font-mono)",
      }}
    >
      <p style={{ color: "#8888AA", marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: {formatUSD(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function ForecastPage() {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/forecast`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  // Merge semua data jadi satu array untuk chart
  const chartData = data
    ? [
        ...data.history.slice(-60).map((h) => ({
          date: formatDate(h.date),
          History: h.price,
        })),
        ...data.eval.map((e) => ({
          date: formatDate(e.date),
          History: e.actual,
          Backtest: e.predicted,
        })),
        ...data.forecast.map((f) => ({
          date: formatDate(f.date),
          Forecast: f.price,
        })),
      ]
    : [];

  const lastActualPrice = data?.eval[data.eval.length - 1]?.actual;

  return (
    <div className="min-h-screen px-4 md:px-10 pt-24 pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs tracking-widest mb-2" style={{ color: "var(--sol-muted)" }}>
          SOL / USD
        </p>
        <h1
          className="text-4xl md:text-5xl font-bold mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          30-Day <span className="text-gradient-sol">Forecast</span>
        </h1>
        <p className="text-sm" style={{ color: "var(--sol-muted)" }}>
          Price history · Backtest evaluation · Future prediction
        </p>
      </div>

      {/* Chart */}
      <div className="card p-6 mb-6">
        {loading ? (
          <div className="flex items-center justify-center h-80">
            <p style={{ color: "var(--sol-muted)" }}>Loading forecast data...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-80">
            <p style={{ color: "#F87171" }}>⚠ {error}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: "#8888AA", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={14}
              />
              <YAxis
                tick={{ fill: "#8888AA", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => "$" + v.toFixed(0)}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "#8888AA", paddingTop: 16 }}
              />
              {lastActualPrice && (
                <ReferenceLine
                  x={formatDate(data!.eval[data!.eval.length - 1].date)}
                  stroke="#2A2A45"
                  strokeDasharray="4 4"
                  label={{ value: "Today", fill: "#8888AA", fontSize: 11 }}
                />
              )}
              <Line
                type="monotone"
                dataKey="History"
                stroke="#4B5563"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="Backtest"
                stroke="#8B5CF6"
                strokeWidth={1.5}
                dot={false}
                connectNulls
                strokeDasharray="4 4"
              />
              <Line
                type="monotone"
                dataKey="Forecast"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {[
          { color: "#4B5563", label: "History", desc: "Actual close prices (last 60 days)" },
          { color: "#8B5CF6", label: "Backtest", desc: "Model predictions vs actual prices" },
          { color: "#10B981", label: "Forecast", desc: "Predicted prices for next 30 days" },
        ].map(({ color, label, desc }) => (
          <div key={label} className="card2 p-4 flex items-start gap-3">
            <div
              className="w-3 h-3 rounded-full mt-0.5 shrink-0"
              style={{ background: color }}
            />
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--sol-text)" }}>
                {label}
              </p>
              <p className="text-xs" style={{ color: "var(--sol-muted)" }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Forecast table */}
      {data && (
        <div className="card p-6">
          <h2
            className="text-lg font-semibold mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Forecast Details
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2A2A45" }}>
                  {["Date", "Predicted Price", "Change"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2 px-3 text-xs tracking-widest"
                      style={{ color: "var(--sol-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.forecast.map((f, i) => {
                  const prev = i === 0 ? lastActualPrice! : data.forecast[i - 1].price;
                  const chg = ((f.price - prev) / prev) * 100;
                  const isUp = chg >= 0;
                  return (
                    <tr
                      key={f.date}
                      style={{ borderBottom: "1px solid rgba(42,42,69,0.4)" }}
                    >
                      <td className="py-2 px-3" style={{ color: "var(--sol-muted)" }}>
                        {f.date}
                      </td>
                      <td
                        className="py-2 px-3 font-medium"
                        style={{ color: "var(--sol-text)" }}
                      >
                        {formatUSD(f.price)}
                      </td>
                      <td
                        className="py-2 px-3 text-xs font-medium"
                        style={{ color: isUp ? "#34D399" : "#F87171" }}
                      >
                        {isUp ? "▲" : "▼"} {Math.abs(chg).toFixed(2)}%
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
  );
}
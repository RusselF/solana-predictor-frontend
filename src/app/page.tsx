"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";
import { PredictResponse } from "@/lib/types";
import Link from "next/link";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip,
} from "recharts";

interface CoinData {
  current_price: number;
  market_cap: number;
  fully_diluted_valuation: number;
  total_volume: number;
  circulating_supply: number;
  total_supply: number;
  ath: number;
  price_change_percentage_1h_in_currency: number;
  price_change_percentage_24h_in_currency: number;
  price_change_percentage_7d_in_currency: number;
  price_change_percentage_14d_in_currency: number;
  price_change_percentage_30d_in_currency: number;
  price_change_percentage_1y_in_currency: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
}

interface ChartPoint { time: string; price: number; }

function fmt(v: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(v);
}

function fmtCompact(v: number) {
  if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
  return v.toLocaleString();
}

interface TProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: TProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1E2130", border: "1px solid #2A2A3E",
      borderRadius: 4, padding: "6px 10px",
      fontSize: 12, fontFamily: "var(--font-mono)",
    }}>
      <div style={{ color: "#6B7280", marginBottom: 2, fontSize: 11 }}>{label}</div>
      <div style={{ color: "#E6EDF3", fontWeight: 600 }}>{fmt(payload[0].value)}</div>
    </div>
  );
}

type Range = "1" | "7" | "30" | "180" | "365";

export default function HomePage() {
  const [coin, setCoin] = useState<CoinData | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [pred, setPred] = useState<PredictResponse | null>(null);
  const [range, setRange] = useState<Range>("1");
  const [lastUpdated, setLastUpdated] = useState("");

  function fetchCoin() {
    fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=solana&price_change_percentage=1h,24h,7d,14d,30d,1y")
      .then((r) => r.json())
      .then((d) => {
        if (d[0]) setCoin(d[0]);
        setLastUpdated(new Date().toLocaleTimeString("en-US", { hour12: false }));
      })
      .catch(() => null);
  }

  function fetchChart(days: string) {
    fetch(`https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.prices) return;
        const pts: ChartPoint[] = d.prices.map(([ts, price]: [number, number]) => ({
          time: days === "1"
            ? new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
            : new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          price,
        }));
        setChart(pts);
      })
      .catch(() => null);
  }

  function fetchPred() {
    fetch(`${API_URL}/predict`)
      .then((r) => r.json())
      .then((d) => setPred(d))
      .catch(() => null);
  }

  useEffect(() => {
    fetchCoin();
    fetchChart("1");
    fetchPred();
    const id = setInterval(fetchCoin, 60000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRange(r: Range) {
    setRange(r);
    fetchChart(r);
  }

  const isDown = (coin?.price_change_24h ?? 0) < 0;
  const chartColor = chart.length > 1 && chart[chart.length - 1].price >= chart[0].price ? "#26A69A" : "#F23645";
  const pctChange = pred && coin ? ((pred.pred_next_day - coin.current_price) / coin.current_price) * 100 : null;
  const predUp = (pctChange ?? 0) >= 0;

  const periods = [
    { label: "1 day",   value: coin?.price_change_percentage_24h_in_currency },
    { label: "1 week",  value: coin?.price_change_percentage_7d_in_currency },
    { label: "1 month", value: coin?.price_change_percentage_30d_in_currency },
    { label: "1 year",  value: coin?.price_change_percentage_1y_in_currency },
  ];

  const ranges: { label: string; value: Range }[] = [
    { label: "1D", value: "1" },
    { label: "1W", value: "7" },
    { label: "1M", value: "30" },
    { label: "6M", value: "180" },
    { label: "1Y", value: "365" },
  ];

  const stats = [
    { label: "Market cap",         value: coin ? fmtCompact(coin.market_cap) + " USD" : "—" },
    { label: "Fully diluted",      value: coin?.fully_diluted_valuation ? fmtCompact(coin.fully_diluted_valuation) + " USD" : "—" },
    { label: "Volume 24h",         value: coin ? fmtCompact(coin.total_volume) + " USD" : "—" },
    { label: "All time high",      value: coin ? fmt(coin.ath) : "—" },
    { label: "Circulating supply", value: coin ? fmtCompact(coin.circulating_supply) + " SOL" : "—" },
    { label: "Total supply",       value: coin ? fmtCompact(coin.total_supply ?? 0) + " SOL" : "—" },
  ];

  return (
    <div style={{ minHeight: "100vh", paddingTop: 44, background: "#131722" }}>
      <div style={{ padding: "24px 28px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800, color: "#fff",
            }}>S</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 22, fontWeight: 700 }}>Solana</span>
                <span style={{
                  fontSize: 11, padding: "1px 7px", borderRadius: 3,
                  background: "#1E2130", border: "1px solid #2A2A3E",
                  color: "#6B7280", fontFamily: "var(--font-mono)",
                }}>SOLUSD</span>
                <span style={{
                  fontSize: 11, padding: "1px 7px", borderRadius: 3,
                  background: "#1A2535", color: "#3B82F6", fontFamily: "var(--font-mono)",
                }}>#7</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{
                  fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em",
                  fontFamily: "var(--font-mono)",
                }}>
                  {coin ? coin.current_price.toFixed(3) : "—"}
                </span>
                <span style={{ fontSize: 13, color: "#6B7280" }}>USD</span>
                {coin && (
                  <span style={{
                    fontSize: 15, fontWeight: 600, fontFamily: "var(--font-mono)",
                    color: isDown ? "#F23645" : "#26A69A",
                  }}>
                    {isDown ? "" : "+"}{coin.price_change_24h.toFixed(3)}{" "}
                    {isDown ? "−" : "+"}{Math.abs(coin.price_change_percentage_24h_in_currency).toFixed(2)}%
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "var(--font-mono)" }}>
                As of today {lastUpdated && `· Updated ${lastUpdated}`}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1E2130", marginBottom: 20 }}>
          {[
            { label: "Overview",  href: "/" },
            { label: "Forecast",  href: "/forecast" },
            { label: "Predict",   href: "/predict-date" },
          ].map(({ label, href }, i) => (
            <Link key={label} href={href} style={{
              padding: "8px 20px", fontSize: 13,
              color: i === 0 ? "#E6EDF3" : "#6B7280",
              borderBottom: i === 0 ? "2px solid #2962FF" : "2px solid transparent",
              fontWeight: i === 0 ? 500 : 400,
              textDecoration: "none", marginBottom: -1,
            }}>
              {label}
            </Link>
          ))}
        </div>

        {/* 2-col layout — full width */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>

          {/* LEFT */}
          <div>
            {/* Range selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>Chart</span>
              <div style={{ display: "flex", gap: 2 }}>
                {ranges.map(({ label, value }) => (
                  <button key={value} onClick={() => handleRange(value)} style={{
                    padding: "3px 10px", borderRadius: 4, fontSize: 11,
                    cursor: "pointer", fontFamily: "var(--font-mono)",
                    background: range === value ? "#1E2130" : "none",
                    border: range === value ? "1px solid #2A2A3E" : "1px solid transparent",
                    color: range === value ? "#E6EDF3" : "#6B7280",
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div style={{
              background: "#131722", border: "1px solid #1E2130",
              borderRadius: "4px 4px 0 0", padding: "12px 4px 4px",
            }}>
              {chart.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={chartColor} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time"
                      tick={{ fill: "#4B5563", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis
                      tick={{ fill: "#4B5563", fontSize: 10, fontFamily: "var(--font-mono)" }}
                      tickLine={false} axisLine={false}
                      tickFormatter={(v) => "$" + v.toFixed(0)}
                      width={48} domain={["auto", "auto"]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="price" stroke={chartColor}
                      strokeWidth={1.5} fill="url(#grad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#4B5563", fontSize: 13 }}>
                  Loading chart...
                </div>
              )}
            </div>

            {/* Period % */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
              background: "#1E2130", borderRadius: "0 0 4px 4px",
              border: "1px solid #1E2130", borderTop: "none", marginBottom: 16,
            }}>
              {periods.map(({ label, value }, i) => {
                const up = (value ?? 0) >= 0;
                return (
                  <div key={label} style={{
                    padding: "12px 16px",
                    borderRight: i < 3 ? "1px solid #131722" : "none",
                  }}>
                    <div style={{ fontSize: 11, color: "#6B7280", fontFamily: "var(--font-mono)", marginBottom: 2 }}>
                      {label}
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)",
                      color: value === undefined ? "#6B7280" : up ? "#26A69A" : "#F23645",
                    }}>
                      {value === undefined ? "—" : `${up ? "+" : ""}${value.toFixed(2)}%`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Prediction CTA */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              gap: 16, alignItems: "center",
              background: "#1A1F35", border: "1px solid #2A2A3E",
              borderRadius: 6, padding: "16px 20px",
            }}>
              <div>
                <div style={{
                  fontSize: 10, color: "#6B7280", fontFamily: "var(--font-mono)",
                  marginBottom: 6, letterSpacing: "0.08em",
                }}>
                  AI PRICE PREDICTION · INFORMER + BILSTM
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: "#6B7280" }}>Tomorrow</span>
                  <span style={{
                    fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)",
                    color: predUp ? "#26A69A" : "#F23645",
                  }}>
                    {pred ? fmt(pred.pred_next_day) : "—"}
                  </span>
                  {pctChange !== null && (
                    <span style={{
                      fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)",
                      color: predUp ? "#26A69A" : "#F23645",
                    }}>
                      {predUp ? "+" : ""}{pctChange.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#4B5563", fontFamily: "var(--font-mono)" }}>
                  OHLCV · 120-day window · Not financial advice
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Link href="/forecast" style={{
                  padding: "7px 16px", borderRadius: 4, textAlign: "center",
                  background: "#2962FF", border: "1px solid #2962FF",
                  color: "#fff", fontSize: 12, fontWeight: 600,
                  textDecoration: "none", whiteSpace: "nowrap",
                }}>
                  View 30-Day Forecast
                </Link>
                <Link href="/predict-date" style={{
                  padding: "7px 16px", borderRadius: 4, textAlign: "center",
                  background: "#1E2130", border: "1px solid #2A2A3E",
                  color: "#E6EDF3", fontSize: 12,
                  textDecoration: "none", whiteSpace: "nowrap",
                }}>
                  Predict a Date
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Key stats */}
            <div style={{ background: "#1E2130", borderRadius: 6, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Key stats</div>
              {stats.map(({ label, value }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "7px 0", borderBottom: "1px solid #131722", gap: 8,
                }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)", textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* 24h Range */}
            {coin && (
              <div style={{ background: "#1E2130", borderRadius: 6, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>24h Range</div>
                <div style={{ position: "relative", height: 4, background: "#131722", borderRadius: 2, marginBottom: 8 }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, height: "100%",
                    width: `${Math.min(100, Math.max(0, ((coin.current_price - coin.low_24h) / (coin.high_24h - coin.low_24h)) * 100))}%`,
                    background: isDown ? "#F23645" : "#26A69A", borderRadius: 2,
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--font-mono)", color: "#6B7280" }}>
                  <span>{fmt(coin.low_24h)}</span>
                  <span>{fmt(coin.high_24h)}</span>
                </div>
              </div>
            )}

            {/* About */}
            <div style={{ background: "#1E2130", borderRadius: 6, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>About Solana</div>
              {[
                { label: "Category",  value: "Smart contract" },
                { label: "Website",   value: "solana.com" },
                { label: "Explorers", value: "solscan.io" },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "7px 0", borderBottom: "1px solid #131722",
                }}>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{value}</span>
                </div>
              ))}
              <p style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.7, marginTop: 10 }}>
                High-performance blockchain using Proof of History + Proof of Stake.
                Fast, low-cost transactions. SOL used for fees and staking.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 28, paddingTop: 14, borderTop: "1px solid #1E2130",
          fontSize: 11, color: "#4B5563", fontFamily: "var(--font-mono)",
        }}>
          Price data from CoinGecko · AI predictions powered by Informer+BiLSTM · Not financial advice
        </div>
      </div>
    </div>
  );
}
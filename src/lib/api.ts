import type {
  PredictResponse,
  PredictDateResponse,
  ForecastResponse,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7860";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate: 1800 },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function getPredict(): Promise<PredictResponse> {
  return apiFetch<PredictResponse>("/predict");
}

export async function getForecast(): Promise<ForecastResponse> {
  return apiFetch<ForecastResponse>("/forecast");
}

export async function getPredictDate(
  targetDate: string
): Promise<PredictDateResponse> {
  return apiFetch<PredictDateResponse>(
    `/predict_date?target_date=${targetDate}`
  );
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function pctValue(current: number, previous: number): number {
  return ((current - previous) / previous) * 100;
}
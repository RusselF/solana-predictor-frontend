export interface PredictResponse {
  date: string;
  last_close: number;
  pred_next_day: number;
}

export interface PredictDateResponse {
  last_date: string;
  target_date: string;
  days_ahead: number;
  predicted_price: number;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface EvalPoint {
  date: string;
  actual: number;
  predicted: number;
}

export interface ForecastResponse {
  history: PricePoint[];
  eval: EvalPoint[];
  forecast: PricePoint[];
}
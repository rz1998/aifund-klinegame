import axios from 'axios';

const API_BASE = '/api/v1';
const API_KEY = 'ak_17c0fc2357df41348aee3c4c61a1dc1c';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  config.headers['X-API-Key'] = API_KEY;
  return config;
});

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  revealed: boolean;
}

export interface KlineGameResponse {
  stock_code: string;
  stock_name: string;
  candles: Candle[];
}

export interface GuessResult {
  correct: boolean;
  up: boolean;
  actualUp: boolean;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  prevClose: number; // previous candle's close for comparison
}

export const fetchRandomKline = async (retries = 3): Promise<KlineGameResponse> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await apiClient.get<{ data: KlineGameResponse }>('/kline-game/random');
      return response.data.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('Failed to fetch after retries');
};

export { apiClient };

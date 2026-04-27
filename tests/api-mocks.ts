import { type Page } from '@playwright/test';

/**
 * API Mock utilities for KlineGame testing
 */

/**
 * Create a mock KlineGame response with configurable data
 */
export function createMockKlineResponse(overrides: Partial<{
  stockCode: string;
  stockName: string;
  candles: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    revealed: boolean;
  }>;
}> = {}): object {
  const {
    stockCode = '600519',
    stockName = '贵州茅台',
    candles = [
      { date: '2024-03-01', open: 1680.0, high: 1700.0, low: 1670.0, close: 1695.0, revealed: true },
      { date: '2024-03-04', open: 1695.0, high: 1710.0, low: 1690.0, close: 1705.0, revealed: true },
      { date: '2024-03-05', open: 1705.0, high: 1715.0, low: 1695.0, close: 1700.0, revealed: true },
      { date: '2024-03-06', open: 1700.0, high: 1708.0, low: 1692.0, close: 1695.0, revealed: true },
      { date: '2024-03-07', open: 1695.0, high: 1702.0, low: 1690.0, close: 1698.0, revealed: true },
      { date: '2024-03-08', open: 1698.0, high: 1710.0, low: 1695.0, close: 1705.0, revealed: false },
      { date: '2024-03-11', open: 1705.0, high: 1720.0, low: 1700.0, close: 1715.0, revealed: false },
      { date: '2024-03-12', open: 1715.0, high: 1718.0, low: 1705.0, close: 1708.0, revealed: false },
      { date: '2024-03-13', open: 1708.0, high: 1712.0, low: 1700.0, close: 1702.0, revealed: false },
      { date: '2024-03-14', open: 1702.0, high: 1705.0, low: 1695.0, close: 1698.0, revealed: false },
    ],
  } = overrides;

  return {
    data: {
      stock_code: stockCode,
      stock_name: stockName,
      candles,
    },
  };
}

/**
 * Mock API with specific stock data
 */
export function mockWithStockData(
  page: Page,
  stockCode: string,
  stockName: string,
  trend: 'up' | 'down' | 'mixed' = 'mixed'
): void {
  const baseClose = 100;
  const candles = [];
  let prevClose = baseClose;

  // Generate 5 historical candles (revealed)
  for (let i = 0; i < 5; i++) {
    const change = (Math.random() - 0.5) * 5;
    const open = prevClose;
    const close = prevClose + change;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;

    candles.push({
      date: `2024-03-${String(i + 1).padStart(2, '0')}`,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      revealed: true,
    });
    prevClose = close;
  }

  // Generate 5 future candles (hidden) based on trend
  for (let i = 0; i < 5; i++) {
    let change: number;
    if (trend === 'up') {
      change = Math.random() * 3 + 1; // Positive trend
    } else if (trend === 'down') {
      change = -Math.random() * 3 - 1; // Negative trend
    } else {
      change = (Math.random() - 0.5) * 5; // Mixed
    }

    const open = prevClose;
    const close = prevClose + change;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;

    candles.push({
      date: `2024-03-${String(i + 8).padStart(2, '0')}`,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      revealed: false,
    });
    prevClose = close;
  }

  const mockResponse = createMockKlineResponse({
    stockCode,
    stockName,
    candles,
  });

  page.route('**/api/v1/kline-game/random', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });
}

/**
 * Mock API to fail with specific error
 */
export function mockAPIFailure(
  page: Page,
  statusCode: number = 500,
  errorMessage: string = 'Internal Server Error'
): void {
  page.route('**/api/v1/kline-game/random', (route) => {
    route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify({ error: errorMessage }),
    });
  });
}

/**
 * Mock API to fail then succeed (for testing retry logic)
 */
export function mockFailThenSucceed(
  page: Page,
  failTimes: number = 2,
  successResponse?: object
): void {
  let callCount = 0;

  const defaultSuccess = createMockKlineResponse();

  page.route('**/api/v1/kline-game/random', (route) => {
    callCount++;
    if (callCount <= failTimes) {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server Error' }),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse ?? defaultSuccess),
      });
    }
  });
}

/**
 * Mock API with network delay
 */
export function mockWithDelay(
  page: Page,
  delayMs: number,
  response?: object
): void {
  const defaultResponse = createMockKlineResponse();

  page.route('**/api/v1/kline-game/random', async (route) => {
    await page.waitForTimeout(delayMs);
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response ?? defaultResponse),
    });
  });
}

/**
 * Mock API with random stock selection
 */
export function mockRandomStocks(page: Page): void {
  const stocks = [
    { code: '600519', name: '贵州茅台' },
    { code: '000001', name: '平安银行' },
    { code: '600036', name: '招商银行' },
    { code: '601318', name: '中国平安' },
    { code: '000858', name: '五粮液' },
    { code: '002594', name: '比亚迪' },
    { code: '300750', name: '宁德时代' },
    { code: '688981', name: '中芯国际' },
    { code: '600900', name: '长江电力' },
    { code: '601888', name: '中国中免' },
  ];

  page.route('**/api/v1/kline-game/random', (route) => {
    const stock = stocks[Math.floor(Math.random() * stocks.length)];
    const response = createMockKlineResponse({
      stockCode: stock.code,
      stockName: stock.name,
    });
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Intercept and modify API response
 */
export function interceptAndModify(
  page: Page,
  modifier: (response: object) => object
): void {
  page.route('**/api/v1/kline-game/random', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    const modifiedJson = modifier(json);
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(modifiedJson),
    });
  });
}

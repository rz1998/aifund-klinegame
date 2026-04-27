import { type Page, type Route } from '@playwright/test';

/**
 * Test utilities for KlineGame testing
 */

/**
 * Wait for a condition to be true with polling
 */
export async function waitForCondition(
  page: Page,
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? 10000;
  const interval = options.interval ?? 100;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await page.waitForTimeout(interval);
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Mock API response for KlineGame
 */
export function mockKlineGameAPI(
  page: Page,
  overrides: {
    status?: number;
    body?: object;
    times?: number;
  } = {}
): { handleRoute: (route: Route) => void } {
  let callCount = 0;
  const { status = 200, body, times = Infinity } = overrides;

  const defaultBody = {
    data: {
      stock_code: '600519',
      stock_name: '贵州茅台',
      candles: [
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
    },
  };

  function handleRoute(route: Route) {
    callCount++;
    if (callCount <= times) {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body ?? defaultBody),
      });
    } else {
      route.abort();
    }
  }

  return { handleRoute };
}

/**
 * Create multiple mock responses for testing retry logic
 */
export function createRetryMock(
  page: Page,
  failCount: number,
  successBody?: object
): void {
  let attempt = 0;
  const defaultSuccessBody = {
    data: {
      stock_code: '600519',
      stock_name: '贵州茅台',
      candles: [
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
    },
  };

  page.route('**/api/v1/kline-game/random', (route) => {
    attempt++;
    if (attempt <= failCount) {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server Error' }),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successBody ?? defaultSuccessBody),
      });
    }
  });
}

/**
 * Get canvas image data for visual comparison
 */
export async function getCanvasImageData(
  page: Page,
  canvasSelector: string = 'canvas'
): Promise<string | null> {
  return page.evaluate((selector) => {
    const canvas = document.querySelector(selector) as HTMLCanvasElement;
    if (!canvas) return null;
    return canvas.toDataURL();
  }, canvasSelector);
}

/**
 * Check if canvas has been painted (not blank)
 */
export async function isCanvasPainted(
  page: Page,
  canvasSelector: string = 'canvas'
): Promise<boolean> {
  return page.evaluate((selector) => {
    const canvas = document.querySelector(selector) as HTMLCanvasElement;
    if (!canvas) return false;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Check if all pixels are the same (blank)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // If any pixel is not fully transparent and not the background color
      if (a > 0) {
        // Check if it's not the background color (#0f0f23 = rgb(15, 15, 35))
        if (r !== 15 || g !== 15 || b !== 35) {
          return true;
        }
      }
    }
    return false;
  }, canvasSelector);
}

/**
 * Simulate slow network for testing loading states
 */
export function setupSlowNetwork(
  page: Page,
  delayMs: number = 3000
): void {
  page.route('**/api/v1/kline-game/random', async (route) => {
    await page.waitForTimeout(delayMs);
    route.continue();
  });
}

/**
 * Take a screenshot and save with a custom name
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  path: string = './test-results/screenshots'
): Promise<string> {
  const fs = await import('fs');
  const pathModule = await import('path');

  // Ensure directory exists
  const dir = pathModule.join(process.cwd(), path);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = pathModule.join(dir, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

/**
 * Extract text content from page for debugging
 */
export function getPageTextContent(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}

/**
 * Check if element is visible and has positive dimensions
 */
export async function isElementVisibleAndSized(
  page: Page,
  selector: string
): Promise<boolean> {
  const box = await page.locator(selector).boundingBox();
  return box !== null && box.width > 0 && box.height > 0;
}

/**
 * Get computed CSS property value for an element
 */
export async function getComputedStyleValue(
  page: Page,
  selector: string,
  property: string
): Promise<string> {
  return page.evaluate(
    ([sel, prop]) => {
      const el = document.querySelector(sel);
      if (!el) return '';
      return window.getComputedStyle(el).getPropertyValue(prop);
    },
    [selector, property]
  );
}

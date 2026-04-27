import { test as base, type Page, type Locator } from '@playwright/test';
import KlineGamePage from './page-objects/KlineGamePage';

/**
 * Custom fixtures for KlineGame testing
 */

export interface KlineGameFixtures {
  klinePage: KlineGamePage;
  mockAPI: (page: Page) => void;
}

export const test = base.extend<KlineGameFixtures>({
  /**
   * Provide a KlineGamePage instance
   */
  klinePage: async ({ page }, use) => {
    const klinePage = new KlineGamePage(page, 'http://localhost:5173');
    await use(klinePage);
  },

  /**
   * Default mock API that returns valid data
   */
  mockAPI: async ({ page }, use) => {
    const defaultMock = () => {
      page.route('**/api/v1/kline-game/random', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
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
          }),
        });
      });
    };

    await use(defaultMock);
  },
});

export { expect } from '@playwright/test';

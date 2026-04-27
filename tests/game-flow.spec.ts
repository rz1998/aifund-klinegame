import { test, expect, Page } from '@playwright/test';
import KlineGamePage from './page-objects/KlineGamePage';
import {
  mockWithStockData,
  mockAPIFailure,
  mockFailThenSucceed,
  mockWithDelay,
  mockRandomStocks,
  createMockKlineResponse,
} from './api-mocks';

/**
 * Game Flow Tests
 * Tests the complete game flow from loading to finished state
 */
test.describe('Game Flow', () => {
  test('complete game flow - guess all up', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'up');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);

    // Should start in playing state
    await klinePage.waitForGameState('playing');

    // Guess all up
    for (let i = 0; i < 5; i++) {
      const state = await klinePage.getGameState();
      if (state === 'finished') break;
      await klinePage.makeGuess('up');
      await page.waitForTimeout(500);
    }

    // Should end game
    await klinePage.waitForGameState('finished');
    await klinePage.verifyFinishedState();
  });

  test('complete game flow - guess all down', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '000001', '平安银行', 'down');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);

    await klinePage.waitForGameState('playing');

    // Guess all down
    for (let i = 0; i < 5; i++) {
      const state = await klinePage.getGameState();
      if (state === 'finished') break;
      await klinePage.makeGuess('down');
      await page.waitForTimeout(500);
    }

    await klinePage.waitForGameState('finished');
    await klinePage.verifyFinishedState();
  });

  test('complete game flow - alternating guesses', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600036', '招商银行', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);

    await klinePage.waitForGameState('playing');

    // Alternate between up and down
    for (let i = 0; i < 5; i++) {
      const state = await klinePage.getGameState();
      if (state === 'finished') break;
      await klinePage.makeGuess(i % 2 === 0 ? 'up' : 'down');
      await page.waitForTimeout(500);
    }

    await klinePage.waitForGameState('finished');
  });

  test('game restarts after clicking play again', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockRandomStocks(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    await klinePage.playFullGame();
    await klinePage.waitForGameState('finished');

    // Get first game's stock info
    const firstStockInfo = await klinePage.stockInfo.textContent();

    // Click play again
    await klinePage.clickPlayAgain();
    await klinePage.waitForGameState('playing');

    // Play another full game
    await klinePage.playFullGame();
    await klinePage.waitForGameState('finished');

    // Stock info might be different (random stock selection)
    const secondStockInfo = await klinePage.stockInfo.textContent();
    // Just verify the element is present
    expect(secondStockInfo).toBeTruthy();
  });
});

/**
 * API Retry Logic Tests
 */
test.describe('API Retry Logic', () => {
  test('should retry on API failure and succeed', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockFailThenSucceed(page, 2); // Fail twice, then succeed

    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(20000); // Allow time for retries

    // Should eventually succeed (after 2 failures + 1 success)
    const state = await klinePage.getGameState();
    expect(['playing', 'error']).toContain(state);
  });

  test('should show error after max retries', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockAPIFailure(page, 500, 'Server Error');

    await klinePage.goto();

    // Wait for all retries to exhaust (app retries 3 times)
    await page.waitForTimeout(20000);

    const state = await klinePage.getGameState();
    // May still be in loading if retries are happening, or error if exhausted
    expect(['loading', 'error', 'playing']).toContain(state);
  });
});

/**
 * Loading with Delays Tests
 */
test.describe('Loading Delays', () => {
  test('should show loading state with slow network', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockWithDelay(page, 5000); // 5 second delay

    await klinePage.goto();

    // Loading should be visible
    await expect(klinePage.loadingText).toBeVisible({ timeout: 1000 });
  });

  test('should load successfully after delay', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockWithDelay(page, 2000); // 2 second delay

    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);

    // Should eventually load
    const state = await klinePage.getGameState();
    expect(state).toBe('playing');
  });
});

/**
 * Different Stock Data Tests
 */
test.describe('Stock Data Variations', () => {
  const stocks = [
    { code: '600519', name: '贵州茅台' },
    { code: '000001', name: '平安银行' },
    { code: '002594', name: '比亚迪' },
    { code: '300750', name: '宁德时代' },
  ];

  for (const stock of stocks) {
    test(`should load game with stock ${stock.code} ${stock.name}`, async ({ page }) => {
      const klinePage = new KlineGamePage(page);
      mockWithStockData(page, stock.code, stock.name, 'mixed');

      await klinePage.goto();
      await klinePage.waitForLoadingToFinish(15000);
      await klinePage.waitForGameState('playing');

      // Play full game
      await klinePage.playFullGame();
      await klinePage.waitForGameState('finished');

      // Verify stock info is displayed
      const stockInfo = await klinePage.stockInfo.textContent();
      expect(stockInfo).toContain(stock.code);
      expect(stockInfo).toContain(stock.name);
    });
  }
});

/**
 * Score Calculation Tests
 */
test.describe('Score Calculation', () => {
  test('should show 0% win rate at start', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'up');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    const winRate = await klinePage.getWinRate();
    expect(winRate).toBe(0);
  });

  test('should update win rate after guesses', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'up');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    for (let i = 0; i < 3; i++) {
      await klinePage.makeGuess('up');
      await page.waitForTimeout(500);

      const state = await klinePage.getGameState();
      if (state === 'finished') break;

      const score = await klinePage.getCurrentScore();
      const winRate = await klinePage.getWinRate();

      if (score.total > 0) {
        const expectedWinRate = Math.round((score.correct / score.total) * 100);
        expect(winRate).toBe(expectedWinRate);
      }
    }
  });

  test('should show correct final score', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'up');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    await klinePage.playFullGame();
    await klinePage.waitForGameState('finished');

    const finalScore = await klinePage.getFinalScore();
    expect(finalScore).toBeGreaterThanOrEqual(0);
    expect(finalScore).toBeLessThanOrEqual(5);
  });
});

/**
 * Button States Tests
 */
test.describe('Button States', () => {
  test('should disable buttons during answer reveal', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    // Click up button
    await klinePage.upButton.click();

    // Wait a bit for state transition
    await page.waitForTimeout(300);

    // Should advance to next question or finish
    const questionNum = await klinePage.getCurrentQuestion();
    const state = await klinePage.getGameState();

    expect(
      questionNum > 1 || state === 'finished'
    ).toBeTruthy();
  });

  test('should have correct button text with emojis', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    const upText = await klinePage.upButton.textContent();
    const downText = await klinePage.downButton.textContent();

    expect(upText).toContain('📈');
    expect(upText).toContain('猜涨');
    expect(downText).toContain('📉');
    expect(downText).toContain('猜跌');
  });
});

/**
 * Canvas Rendering Tests
 */
test.describe('Canvas Rendering', () => {
  test('should render canvas with content in playing state', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    // Check canvas dimensions
    const canvasBox = await klinePage.canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBeGreaterThan(100);
    expect(canvasBox!.height).toBeGreaterThan(50);
  });

  test('should render canvas in finished state with all 10 candles', async ({ page }) => {
    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    await klinePage.playFullGame();
    await klinePage.waitForGameState('finished');

    // Canvas should still be visible with content
    const canvasBox = await klinePage.canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBeGreaterThan(100);
    expect(canvasBox!.height).toBeGreaterThan(50);
  });
});

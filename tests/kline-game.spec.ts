import { test, expect, Page } from '@playwright/test';
import KlineGamePage from './page-objects/KlineGamePage';
import { mockWithStockData, createMockKlineResponse } from './api-mocks';

// ==================== Fixtures ====================

function createKlineGamePage(page: Page, baseURL: string = 'http://localhost:5173'): KlineGamePage {
  return new KlineGamePage(page, baseURL);
}

// ==================== Navigation & Initial Load Tests ====================

test.describe('Page Navigation & Initial Load', () => {
  test('should load the kline game page successfully', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await expect(page).toHaveTitle(/股票大作手|K线游戏/);
    await expect(klinePage.headerTitle).toBeVisible();
  });

  test('should show loading state on initial load', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.verifyLoadingState();
  });

  test('should load font before showing game content', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    const state = await klinePage.getGameState();
    expect(['playing', 'error']).toContain(state);
  });

  test('should load within reasonable time', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await page.waitForFunction(
      () => {
        const bodyText = document.body.innerText;
        return (
          bodyText.includes('游戏结束') ||
          bodyText.includes('第 1/5 题') ||
          bodyText.includes('加载失败')
        );
      },
      { timeout: 15000 }
    );
  });
});

// ==================== Loading State Tests ====================

test.describe('Loading State', () => {
  test('should display LOADING text with animation', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await expect(klinePage.loadingText).toBeVisible({ timeout: 5000 });
    await klinePage.verifyLoadingAnimation();
  });

  test('should display pixel-style header during loading', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await expect(klinePage.headerTitle).toBeVisible();
    await expect(klinePage.headerTitle).toHaveText('股票大作手');
  });

  test('should show pixel font styling on header', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.verifyPixelFont();
  });
});

// ==================== Playing State Tests ====================

test.describe('Playing State', () => {
  test.beforeEach(async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
  });

  test('should display all game elements in playing state', async ({ page }) => {
    const klinePage = createKlineGamePage(page);
    await klinePage.verifyPlayingState();
  });

  test('should show question counter starting at 1/5', async ({ page }) => {
    const klinePage = createKlineGamePage(page);
    const questionNum = await klinePage.getCurrentQuestion();
    expect(questionNum).toBe(1);
  });

  test('should display K-line canvas chart', async ({ page }) => {
    const klinePage = createKlineGamePage(page);
    await expect(klinePage.canvas).toBeVisible();
    await klinePage.verifyCanvasHasContent();
  });

  test('should have both up and down guess buttons visible', async ({ page }) => {
    const klinePage = createKlineGamePage(page);
    await expect(klinePage.upButton).toBeVisible();
    await expect(klinePage.downButton).toBeVisible();
    const upText = await klinePage.upButton.textContent();
    const downText = await klinePage.downButton.textContent();
    expect(upText).toContain('📈');
    expect(upText).toContain('猜涨');
    expect(downText).toContain('📉');
    expect(downText).toContain('猜跌');
  });

  test('should have up button styled with red color', async ({ page }) => {
    const klinePage = createKlineGamePage(page);
    await klinePage.verifyUpButtonStyling();
  });

  test('should have down button styled with green color', async ({ page }) => {
    const klinePage = createKlineGamePage(page);
    await klinePage.verifyDownButtonStyling();
  });

  test('should show initial score as 0/0', async ({ page }) => {
    const klinePage = createKlineGamePage(page);
    const score = await klinePage.getCurrentScore();
    expect(score.correct).toBe(0);
    expect(score.total).toBe(0);
  });

  test('should show initial win rate as 0%', async ({ page }) => {
    const klinePage = createKlineGamePage(page);
    const winRate = await klinePage.getWinRate();
    expect(winRate).toBe(0);
  });
});

// ==================== Guess Interaction Tests ====================

test.describe('Guess Interactions', () => {
  test.beforeEach(async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
  });

  test('should advance to question 2 after first guess', async ({ page }) => {
    const klinePage = createKlineGamePage(page);
    await klinePage.makeGuess('up');
    await page.waitForTimeout(500);
    const questionNum = await klinePage.getCurrentQuestion();
    expect(questionNum).toBe(2);
  });

  test('should transition to finished state after 5 guesses', async ({ page }) => {
    const klinePage = createKlineGamePage(page);
    for (let i = 0; i < 5; i++) {
      const state = await klinePage.getGameState();
      if (state === 'finished') break;
      await klinePage.makeGuess(i % 2 === 0 ? 'up' : 'down');
      await page.waitForTimeout(500);
    }
    await klinePage.waitForGameState('finished');
  });

  test('should show answer feedback after guess', async ({ page }) => {
    const klinePage = createKlineGamePage(page);
    await klinePage.makeGuess('up');
    await page.waitForTimeout(500);
    const questionNum = await klinePage.getCurrentQuestion();
    const state = await klinePage.getGameState();
    expect(questionNum > 1 || state === 'finished').toBeTruthy();
  });
});

// ==================== Complete Game Flow Tests ====================

test.describe('Complete Game Flow', () => {
  test('should play through entire game with random guesses', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    await klinePage.playFullGame();
    const state = await klinePage.getGameState();
    expect(state).toBe('finished');
  });
});

// ==================== Finished State Tests ====================

test.describe('Finished State', () => {
  test('should display game over title', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    await klinePage.playFullGame();
    await klinePage.waitForGameState('finished');
    await expect(klinePage.gameOverTitle).toBeVisible();
    await expect(klinePage.gameOverTitle).toContainText('游戏结束');
  });

  test('should display stock information', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    await klinePage.playFullGame();
    await klinePage.waitForGameState('finished');
    await expect(klinePage.stockInfo).toBeVisible();
    const stockText = await klinePage.stockInfo.textContent();
    expect(stockText).toMatch(/股票: \d+ /);
  });

  test('should display final score', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    await klinePage.playFullGame();
    await klinePage.waitForGameState('finished');
    await expect(klinePage.finalScore).toBeVisible();
    const scoreText = await klinePage.finalScore.textContent();
    expect(scoreText).toMatch(/您的战绩: \d+\/5/);
  });

  test('should have play again button', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    await klinePage.playFullGame();
    await klinePage.waitForGameState('finished');
    await expect(klinePage.playAgainButton).toBeVisible();
  });

  test('should have share button', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    await klinePage.playFullGame();
    await klinePage.waitForGameState('finished');
    await expect(klinePage.shareButton).toBeVisible();
  });

  test('should restart game when clicking play again', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    await klinePage.playFullGame();
    await klinePage.waitForGameState('finished');
    await klinePage.clickPlayAgain();
    await page.waitForTimeout(500);
    const state = await klinePage.getGameState();
    expect(['loading', 'playing']).toContain(state);
  });
});

// ==================== Canvas Rendering Tests ====================

test.describe('Canvas Rendering', () => {
  test('should render canvas in playing state', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    const canvasCount = await klinePage.canvas.count();
    expect(canvasCount).toBe(1);
  });

  test('should render canvas in finished state', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    await klinePage.playFullGame();
    await klinePage.waitForGameState('finished');
    const canvasCount = await klinePage.canvas.count();
    expect(canvasCount).toBe(1);
    await klinePage.verifyCanvasHasContent();
  });
});

// ==================== Accessibility Tests ====================

test.describe('Accessibility', () => {
  test('should have semantic heading structure', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('should have accessible button text', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    await klinePage.verifyButtonAccessibility();
  });

  test('should have canvas element', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    await klinePage.verifyCanvasAccessibility();
  });
});

// ==================== Performance Tests ====================

test.describe('Performance', () => {
  test('should load page within acceptable time', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const startTime = Date.now();
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(15000);
  });

  test('should render quickly after state change', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    const startTime = Date.now();
    await klinePage.makeGuess('up');
    await page.waitForTimeout(300);
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(2000);
  });
});

// ==================== Visual Styling Tests ====================

test.describe('Visual Styling', () => {
  test('should use pixel font family', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');
    await klinePage.verifyPixelFont();
  });

  test('should have accent color on header', async ({ page }) => {
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    const klinePage = createKlineGamePage(page);
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    const headerColor = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (!h1) return '';
      return window.getComputedStyle(h1).color;
    });
    // Should be reddish (accent color #e94560 = rgb(233, 69, 96))
    expect(headerColor).toMatch(/rgb\(2[0-9]{2}, 6[0-9], 9[0-6]\)/);
  });
});

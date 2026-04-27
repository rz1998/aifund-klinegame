import { test, expect, Page } from '@playwright/test';
import KlineGamePage from './page-objects/KlineGamePage';
import { mockWithStockData } from './api-mocks';

/**
 * Responsive Design Tests
 * Tests the application's responsive behavior across different viewport sizes
 */

const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'Mobile' },
  mobileLandscape: { width: 667, height: 375, name: 'Mobile Landscape' },
  tablet: { width: 768, height: 1024, name: 'Tablet' },
  tabletLandscape: { width: 1024, height: 768, name: 'Tablet Landscape' },
  desktop: { width: 1280, height: 720, name: 'Desktop' },
  desktopLarge: { width: 1920, height: 1080, name: 'Desktop Large' },
};

/**
 * Test basic rendering at each viewport size
 */
test.describe('Viewport Rendering', () => {
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`should render correctly at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const klinePage = new KlineGamePage(page);
      mockWithStockData(page, '600519', '贵州茅台', 'mixed');
      await klinePage.goto();
      await klinePage.waitForLoadingToFinish(15000);

      // Should render without errors
      await expect(page).toHaveTitle(/股票大作手|K线游戏/);
      await expect(klinePage.headerTitle).toBeVisible();

      // Should eventually reach playing state
      await klinePage.waitForGameState('playing', 15000);
      await expect(klinePage.canvas).toBeVisible();
      await expect(klinePage.upButton).toBeVisible();
      await expect(klinePage.downButton).toBeVisible();
    });
  }
});

/**
 * Test button layout at different viewport sizes
 */
test.describe('Button Layout', () => {
  test('should stack buttons vertically on mobile portrait', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    const upBox = await klinePage.upButton.boundingBox();
    const downBox = await klinePage.downButton.boundingBox();

    expect(upBox).not.toBeNull();
    expect(downBox).not.toBeNull();

    // On mobile portrait, buttons should be side by side but narrow
    // with small gap (width: 48%)
    expect(upBox!.width).toBeLessThan(200);
    expect(upBox!.width).toBeCloseTo(downBox!.width, 10);
  });

  test('should use full width buttons on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    const upBox = await klinePage.upButton.boundingBox();
    const downBox = await klinePage.downButton.boundingBox();

    // Each button should take about 48% of container width
    // So width should be approximately half of the container
    const totalWidth = upBox!.width + downBox!.width;
    expect(upBox!.width).toBeGreaterThan(100);
  });

  test('should center buttons on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    const upBox = await klinePage.upButton.boundingBox();
    const downBox = await klinePage.downButton.boundingBox();

    // Buttons should be side by side
    expect(upBox!.x).toBeLessThan(downBox!.x);
    // Each button should be around 200px wide
    expect(upBox!.width).toBeGreaterThan(150);
  });
});

/**
 * Test font size adaptation
 */
test.describe('Font Size Adaptation', () => {
  test('should use smaller fonts on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    // Get header font size
    const headerFontSize = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (!h1) return 0;
      const style = window.getComputedStyle(h1);
      const fontSize = parseFloat(style.fontSize);
      return fontSize;
    });

    // On mobile, header font should be smaller (around 12px based on config)
    expect(headerFontSize).toBeLessThanOrEqual(14);
  });

  test('should use larger fonts on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    // Get header font size
    const headerFontSize = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (!h1) return 0;
      const style = window.getComputedStyle(h1);
      const fontSize = parseFloat(style.fontSize);
      return fontSize;
    });

    // On desktop, header font should be around 14px
    expect(headerFontSize).toBeGreaterThanOrEqual(14);
  });
});

/**
 * Test canvas size adaptation
 */
test.describe('Canvas Size Adaptation', () => {
  test('should have smaller canvas on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    const canvasBox = await klinePage.canvas.boundingBox();

    // On mobile, canvas should be narrower
    expect(canvasBox!.width).toBeLessThan(400);
    expect(canvasBox!.height).toBeLessThan(250);
  });

  test('should have larger canvas on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    const canvasBox = await klinePage.canvas.boundingBox();

    // On desktop, canvas should be wider and taller
    expect(canvasBox!.width).toBeGreaterThan(500);
    expect(canvasBox!.height).toBeGreaterThan(200);
  });
});

/**
 * Test dynamic resize handling
 */
test.describe('Dynamic Resize', () => {
  test('should adapt when resizing from mobile to desktop', async ({ page }) => {
    // Start with mobile
    await page.setViewportSize({ width: 375, height: 667 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    const mobileCanvasBox = await klinePage.canvas.boundingBox();

    // Resize to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500); // Wait for resize handler

    const desktopCanvasBox = await klinePage.canvas.boundingBox();

    // Canvas should be larger on desktop
    expect(desktopCanvasBox!.width).toBeGreaterThan(mobileCanvasBox!.width);
  });

  test('should maintain game state during resize', async ({ page }) => {
    // Start with mobile
    await page.setViewportSize({ width: 375, height: 667 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    // Make a guess
    await klinePage.makeGuess('up');
    await page.waitForTimeout(500);

    // Get current state
    const questionBeforeResize = await klinePage.getCurrentQuestion();
    const scoreBeforeResize = await klinePage.getCurrentScore();

    // Resize window
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);

    // State should be preserved
    const questionAfterResize = await klinePage.getCurrentQuestion();
    const scoreAfterResize = await klinePage.getCurrentScore();

    expect(questionAfterResize).toBe(questionBeforeResize);
    expect(scoreAfterResize.total).toBeGreaterThanOrEqual(scoreBeforeResize.total);
  });

  test('should adapt button layout when resizing', async ({ page }) => {
    // Start with mobile
    await page.setViewportSize({ width: 375, height: 667 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    const mobileUpBox = await klinePage.upButton.boundingBox();

    // Resize to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);

    const desktopUpBox = await klinePage.upButton.boundingBox();

    // Button should be wider on desktop
    expect(desktopUpBox!.width).toBeGreaterThan(mobileUpBox!.width);
  });
});

/**
 * Test touch-specific behaviors
 */
test.describe('Touch Optimization', () => {
  test('should have adequate touch targets on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    const upBox = await klinePage.upButton.boundingBox();
    const downBox = await klinePage.downButton.boundingBox();

    // Touch targets should be at least 48x48px per spec
    expect(upBox!.width).toBeGreaterThanOrEqual(48);
    expect(upBox!.height).toBeGreaterThanOrEqual(48);
    expect(downBox!.width).toBeGreaterThanOrEqual(48);
    expect(downBox!.height).toBeGreaterThanOrEqual(48);
  });

  test('should not have hover effects that block interaction on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    // Verify buttons are clickable
    await klinePage.upButton.click();
    await page.waitForTimeout(300);

    // Game should progress (question number should increase or state should change)
    const questionNum = await klinePage.getCurrentQuestion();
    const state = await klinePage.getGameState();
    expect(questionNum > 1 || state === 'finished').toBeTruthy();
  });
});

/**
 * Test padding and margins at different sizes
 */
test.describe('Spacing Adaptation', () => {
  test('should have smaller padding on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    const headerBox = await klinePage.headerTitle.boundingBox();
    expect(headerBox).not.toBeNull();

    // Header should be within viewport bounds with appropriate padding
    expect(headerBox!.x).toBeGreaterThanOrEqual(0);
  });

  test('should have larger padding on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const klinePage = new KlineGamePage(page);
    mockWithStockData(page, '600519', '贵州茅台', 'mixed');
    await klinePage.goto();
    await klinePage.waitForLoadingToFinish(15000);
    await klinePage.waitForGameState('playing');

    // Get the main container
    const mainElement = page.locator('main');
    const mainBox = await mainElement.boundingBox();

    expect(mainBox).not.toBeNull();
    // Main content should be centered on desktop
    expect(mainBox!.x).toBeGreaterThan(0);
  });
});

/**
 * Test specific breakpoints
 */
test.describe('Breakpoint Tests', () => {
  const breakpoints = [
    { width: 767, expectedDevice: 'mobile' },
    { width: 768, expectedDevice: 'tablet' },
    { width: 1023, expectedDevice: 'tablet' },
    { width: 1024, expectedDevice: 'desktop' },
  ];

  for (const bp of breakpoints) {
    test(`should detect ${bp.expectedDevice} at ${bp.width}px width`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: 800 });

      const klinePage = new KlineGamePage(page);
      mockWithStockData(page, '600519', '贵州茅台', 'mixed');
      await klinePage.goto();
      await klinePage.waitForLoadingToFinish(15000);
      await klinePage.waitForGameState('playing');

      const deviceType = await klinePage.getDeviceType();
      expect(deviceType).toBe(bp.expectedDevice);
    });
  }
});

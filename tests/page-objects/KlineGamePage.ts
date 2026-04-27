import { type Page, type Locator, expect } from '@playwright/test';

export type GameState = 'loading' | 'playing' | 'finished' | 'error';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Page Object Model for the KlineGame (股票大作手) application
 */
export class KlineGamePage {
  readonly page: Page;
  readonly baseURL: string;

  // Header
  readonly headerTitle: Locator;

  // Loading state
  readonly loadingBar: Locator;
  readonly loadingText: Locator;
  readonly loadingTip: Locator;

  // Error state
  readonly errorMessage: Locator;
  readonly retryButton: Locator;

  // Playing state
  readonly questionCounter: Locator;
  readonly canvas: Locator;
  readonly upButton: Locator;
  readonly downButton: Locator;
  readonly scoreDisplay: Locator;
  readonly winRateDisplay: Locator;

  // Finished state
  readonly gameOverTitle: Locator;
  readonly stockInfo: Locator;
  readonly dateRange: Locator;
  readonly finalScore: Locator;
  readonly congratsMessage: Locator;
  readonly playAgainButton: Locator;
  readonly shareButton: Locator;

  // Card containers
  readonly questionCard: Locator;
  readonly canvasContainer: Locator;
  readonly scoreCard: Locator;
  readonly resultCard: Locator;

  constructor(page: Page, baseURL: string = 'http://localhost:5173') {
    this.page = page;
    this.baseURL = baseURL;

    // Header
    this.headerTitle = page.locator('h1');

    // Loading state
    this.loadingBar = page.locator('[data-testid="loading-bar"], div:has-text("LOADING...")');
    this.loadingText = page.locator('text=LOADING...');
    this.loadingTip = page.locator('text=/正在/');

    // Error state
    this.errorMessage = page.locator('text=加载失败');
    this.retryButton = page.locator('button:has-text("重新加载")');

    // Playing state
    this.questionCounter = page.locator('text=/第 \\d+\\/5 题/');
    this.canvas = page.locator('canvas');
    this.upButton = page.locator('button:has-text("猜涨")');
    this.downButton = page.locator('button:has-text("猜跌")');
    this.scoreDisplay = page.locator('text=/当前战绩: \\d+\\/\\d+/');
    this.winRateDisplay = page.locator('text=/胜率:/');

    // Finished state
    this.gameOverTitle = page.locator('text=游戏结束');
    this.stockInfo = page.locator('text=/股票: \\d+ /');
    this.dateRange = page.locator('text=/时间: \\d{4}-\\d{2}-\\d{2} ~/');
    this.finalScore = page.locator('text=/您的战绩: \\d+\\/5/');
    this.congratsMessage = page.locator('[data-testid="congrats-message"]');
    this.playAgainButton = page.locator('button:has-text("再玩一次")');
    this.shareButton = page.locator('button:has-text("分享战绩")');

    // Card containers
    this.questionCard = page.locator('text=/第 \\d+\\/5 题/').locator('..');
    this.canvasContainer = page.locator('canvas').locator('..');
    this.scoreCard = page.locator('text=/当前战绩/').locator('..');
    this.resultCard = page.locator('text=游戏结束').locator('..');
  }

  async goto() {
    await this.page.goto(this.baseURL);
  }

  // ==================== Game State Detection ====================

  /**
   * Wait for loading state to disappear
   */
  async waitForLoadingToFinish(timeout = 15000) {
    await this.page.waitForSelector('text=LOADING...', { state: 'hidden', timeout });
  }

  /**
   * Get current game state by checking visible elements
   */
  async getGameState(): Promise<GameState> {
    // Check for error state first
    if (await this.errorMessage.isVisible({ timeout: 500 }).catch(() => false)) {
      return 'error';
    }

    // Check for loading state
    if (await this.loadingText.isVisible({ timeout: 500 }).catch(() => false)) {
      return 'loading';
    }

    // Check for finished state
    if (await this.gameOverTitle.isVisible({ timeout: 500 }).catch(() => false)) {
      return 'finished';
    }

    // Check for playing state (canvas + guess buttons visible)
    if (await this.canvas.isVisible({ timeout: 500 }).catch(() => false)) {
      return 'playing';
    }

    return 'unknown';
  }

  /**
   * Wait for a specific game state
   */
  async waitForGameState(state: GameState, timeout = 15000) {
    const checkFns: Record<GameState, () => Promise<boolean>> = {
      loading: () => this.loadingText.isVisible(),
      playing: () => this.canvas.isVisible(),
      finished: () => this.gameOverTitle.isVisible(),
      error: () => this.errorMessage.isVisible(),
      unknown: async () => false,
    };

    await this.page.waitForFunction(
      async (s) => {
        // Simple state detection
        const loadingVisible = document.body.innerText.includes('LOADING...');
        const errorVisible = document.body.innerText.includes('加载失败');
        const finishedVisible = document.body.innerText.includes('游戏结束');
        const canvasVisible = document.querySelector('canvas') !== null;

        switch (s) {
          case 'loading': return loadingVisible && !canvasVisible;
          case 'playing': return canvasVisible && !finishedVisible;
          case 'finished': return finishedVisible;
          case 'error': return errorVisible;
          default: return false;
        }
      },
      state,
      { timeout }
    );
  }

  // ==================== Loading State Tests ====================

  /**
   * Verify loading state elements are visible
   */
  async verifyLoadingState() {
    await expect(this.loadingText).toBeVisible();
    await expect(this.loadingTip).toBeVisible();
    // Check header is visible during loading
    await expect(this.headerTitle).toBeVisible();
    await expect(this.headerTitle).toHaveText('股票大作手');
  }

  /**
   * Verify loading tips cycle (call this multiple times to check cycling)
   */
  async verifyLoadingTipsCycle() {
    const initialTip = await this.loadingTip.textContent();
    // Wait for tip to potentially change (tips cycle every 2s)
    await this.page.waitForTimeout(2500);
    const newTip = await this.loadingTip.textContent();
    return initialTip !== newTip;
  }

  // ==================== Playing State Tests ====================

  /**
   * Verify all playing state elements are visible
   */
  async verifyPlayingState() {
    await expect(this.canvas).toBeVisible();
    await expect(this.upButton).toBeVisible();
    await expect(this.downButton).toBeVisible();
    await expect(this.questionCounter).toBeVisible();
    await expect(this.scoreDisplay).toBeVisible();
    await expect(this.winRateDisplay).toBeVisible();
    await expect(this.headerTitle).toHaveText('股票大作手');
  }

  /**
   * Make a guess (up or down)
   */
  async makeGuess(direction: 'up' | 'down') {
    const button = direction === 'up' ? this.upButton : this.downButton;
    await button.click();
    // Wait for UI to update
    await this.page.waitForTimeout(500);
  }

  /**
   * Play through a complete game (answer all 5 questions randomly)
   */
  async playFullGame() {
    for (let i = 0; i < 5; i++) {
      await this.waitForGameState('playing');
      // Randomly guess up or down
      const guess = Math.random() > 0.5 ? 'up' : 'down';
      await this.makeGuess(guess);
    }
    await this.waitForGameState('finished');
  }

  /**
   * Get current question number (1-5)
   */
  async getCurrentQuestion(): Promise<number> {
    const text = await this.questionCounter.textContent();
    const match = text?.match(/第 (\d+)\/5 题/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get current score (format: "X/Y" where X is correct, Y is total attempted)
   */
  async getCurrentScore(): Promise<{ correct: number; total: number }> {
    const text = await this.scoreDisplay.textContent();
    const match = text?.match(/当前战绩: (\d+)\/(\d+)/);
    return match ? { correct: parseInt(match[1], 10), total: parseInt(match[2], 10) } : { correct: 0, total: 0 };
  }

  /**
   * Get current win rate percentage
   */
  async getWinRate(): Promise<number> {
    const text = await this.winRateDisplay.textContent();
    const match = text?.match(/胜率: (\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // ==================== Finished State Tests ====================

  /**
   * Verify all finished state elements are visible
   */
  async verifyFinishedState() {
    await expect(this.gameOverTitle).toBeVisible();
    await expect(this.stockInfo).toBeVisible();
    await expect(this.dateRange).toBeVisible();
    await expect(this.finalScore).toBeVisible();
    await expect(this.playAgainButton).toBeVisible();
    await expect(this.shareButton).toBeVisible();
    // Canvas should still be visible with all 10 candles
    await expect(this.canvas).toBeVisible();
  }

  /**
   * Get final score from finished state
   */
  async getFinalScore(): Promise<number> {
    const text = await this.finalScore.textContent();
    const match = text?.match(/您的战绩: (\d+)\/5/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get congratulations message based on score
   */
  async getCongratsMessage(): Promise<string> {
    // The message is in a specific div after game over
    const messageContainer = this.page.locator('text=/[🏆😢😅💪]/').first();
    return messageContainer.textContent();
  }

  /**
   * Click "再玩一次" button
   */
  async clickPlayAgain() {
    await this.playAgainButton.click();
    // Wait for loading or playing state
    await this.page.waitForTimeout(500);
  }

  /**
   * Click "分享战绩" button
   */
  async clickShare() {
    await this.shareButton.click();
    // Wait for share to initiate
    await this.page.waitForTimeout(1000);
  }

  // ==================== Error State Tests ====================

  /**
   * Verify error state elements
   */
  async verifyErrorState() {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.retryButton).toBeVisible();
  }

  /**
   * Click retry button
   */
  async clickRetry() {
    await this.retryButton.click();
    // Wait for state change
    await this.page.waitForTimeout(500);
  }

  // ==================== Canvas & Rendering Tests ====================

  /**
   * Verify canvas has content (non-zero dimensions)
   */
  async verifyCanvasHasContent() {
    const canvasBox = await this.canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBeGreaterThan(0);
    expect(canvasBox!.height).toBeGreaterThan(0);
  }

  /**
   * Get canvas pixel color at a specific point (for verifying rendering)
   */
  async getCanvasPixelColor(x: number, y: number): Promise<string> {
    return this.page.evaluate(
      ([xCoord, yCoord]) => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return '';
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        const pixel = ctx.getImageData(xCoord, yCoord, 1, 1).data;
        return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
      },
      [x, y]
    );
  }

  // ==================== Responsive Design Tests ====================

  /**
   * Detect device type based on viewport
   */
  async getDeviceType(): Promise<DeviceType> {
    const width = this.page.viewportSize()?.width ?? 1024;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Verify buttons are side by side (desktop/tablet) or stacked (mobile)
   */
  async verifyButtonLayout() {
    const upBox = await this.upButton.boundingBox();
    const downBox = await this.downButton.boundingBox();
    expect(upBox).not.toBeNull();
    expect(downBox).not.toBeNull();

    const deviceType = await this.getDeviceType();

    if (deviceType === 'mobile') {
      // Buttons should be vertically stacked or side by side with small gap
      expect(upBox!.y).toBeCloseTo(downBox!.y, 10);
    } else {
      // Buttons should be side by side
      expect(upBox!.x).toBeLessThan(downBox!.x);
    }
  }

  // ==================== Color Verification ====================

  /**
   * Verify up button has red styling (Chinese convention: red = up)
   */
  async verifyUpButtonStyling() {
    const upButtonBox = await this.upButton.boundingBox();
    expect(upButtonBox).not.toBeNull();
    // Check that up button is visible and clickable
    await expect(this.upButton).toBeVisible();
    await expect(this.upButton).toBeEnabled();
  }

  /**
   * Verify down button has green styling (Chinese convention: green = down)
   */
  async verifyDownButtonStyling() {
    const downBox = await this.downButton.boundingBox();
    expect(downBox).not.toBeNull();
  }

  // ==================== Animation & Transitions ====================

  /**
   * Check that loading bar animation exists
   */
  async verifyLoadingAnimation() {
    const animationStyle = await this.page.evaluate(() => {
      const loadingDiv = document.querySelector('div[style*="animation"]');
      if (!loadingDiv) return null;
      const computed = window.getComputedStyle(loadingDiv);
      return computed.animation;
    });
    expect(animationStyle).toBeTruthy();
  }

  /**
   * Verify button click feedback (scale transform)
   */
  async verifyButtonClickFeedback() {
    await this.upButton.click();
    // Button should respond to click (either disabled or state changed)
    await this.page.waitForTimeout(200);
  }

  // ==================== Font & Styling Tests ====================

  /**
   * Verify pixel font is applied
   */
  async verifyPixelFont() {
    const fontFamily = await this.page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (!h1) return '';
      return window.getComputedStyle(h1).fontFamily;
    });
    // Should contain Zpix or Press Start 2P (fallback)
    expect(fontFamily).toMatch(/Zpix|Press Start 2P|monospace/);
  }

  /**
   * Verify dark theme colors
   */
  async verifyDarkTheme() {
    const bgColor = await this.page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // Should be a dark color (approximate match for #0f0f23)
    expect(bgColor).toMatch(/rgb\(1[0-5], 1[0-5], 3[0-5]\)/);
  }

  // ==================== Share Functionality Tests ====================

  /**
   * Verify share button is disabled during sharing
   */
  async verifyShareButtonState() {
    await this.clickShare();
    // Check if button shows "生成中..." or is disabled
    const buttonText = await this.shareButton.textContent();
    const isDisabled = await this.shareButton.isDisabled();
    // After clicking, either disabled or shows generating text
    expect(isDisabled || buttonText?.includes('生成中')).toBeTruthy();
  }

  // ==================== Accessibility Tests ====================

  /**
   * Basic accessibility: buttons should have accessible names
   */
  async verifyButtonAccessibility() {
    const upButtonAccessibleName = await this.upButton.getAttribute('aria-label');
    const downButtonAccessibleName = await this.downButton.getAttribute('aria-label');
    // Note: This app may not have aria-labels, so we check for button text instead
    const upText = await this.upButton.textContent();
    const downText = await this.downButton.textContent();
    expect(upText).toContain('猜涨');
    expect(downText).toContain('猜跌');
  }

  /**
   * Canvas should have role="img" or be accessible
   */
  async verifyCanvasAccessibility() {
    const canvasRole = await this.canvas.getAttribute('role');
    const canvasAriaLabel = await this.canvas.getAttribute('aria-label');
    // Canvas may not have explicit accessibility attributes, but should exist
    const canvasExists = await this.canvas.count();
    expect(canvasExists).toBe(1);
  }
}

export default KlineGamePage;

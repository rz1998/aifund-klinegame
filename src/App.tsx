import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchRandomKline } from './services/api';
import type { KlineGameResponse, GuessResult } from './services/api';
import QRCode from 'qrcode';

const COLORS = {
  background: '#0f0f23',
  cardBg: '#1a1a2e',
  border: '#16213e',
  accent: '#e94560',
  text: '#eaeaea',
  textMuted: '#8b8b9e',
  upColor: '#ff0000',
  downColor: '#00ff00',
  success: '#00ff00',
  error: '#ff4444',
  flatColor: '#888888',
};

type GameState = 'loading' | 'playing' | 'finished' | 'error';

// 响应式断点
const BREAKPOINT = 768;

interface ResponsiveConfig {
  isMobile: boolean;
  canvasWidth: number;
  canvasHeight: number;
  candleWidth: number;
  candleGap: number;
  headerFontSize: number;
  bodyFontSize: number;
  buttonFontSize: number;
  labelFontSize: number;
  klineLabelFontSize: number;
  padding: number;
  cardPadding: number;
  buttonHeight: number;
  buttonGap: number;
}

function getResponsiveConfig(isMobile: boolean): ResponsiveConfig {
  if (isMobile) {
    return {
      isMobile: true,
      canvasWidth: 340,
      canvasHeight: 200,
      candleWidth: 16,
      candleGap: 4,
      headerFontSize: 12,
      bodyFontSize: 10,
      buttonFontSize: 10,
      labelFontSize: 9,
      klineLabelFontSize: 6,
      padding: 12,
      cardPadding: 16,
      buttonHeight: 56,
      buttonGap: 16,
    };
  }
  return {
    isMobile: false,
    canvasWidth: 700,
    canvasHeight: 300,
    candleWidth: 24,
    candleGap: 8,
    headerFontSize: 14,
    bodyFontSize: 12,
    buttonFontSize: 12,
    labelFontSize: 10,
    klineLabelFontSize: 8,
    padding: 24,
    cardPadding: 24,
    buttonHeight: 48,
    buttonGap: 24,
  };
}

const MESSAGES = [
  { min: 0, message: '全军覆没...要不要再来一局？ 😢' },
  { min: 20, message: '运气不太好，再试一次？ 😅' },
  { min: 40, message: '再接再厉！ 💪' },
  { min: 60, message: '还不错，继续加油！ 🏆' },
  { min: 80, message: '祝贺！身手不凡！ 🏆🏆' },
  { min: 100, message: '完美！你是量化之神！ 🏆🏆🏆' },
];

const LOADING_TIPS = [
  '正在回忆爆仓的痛苦...',
  '正在加载翻倍的经验...',
  '正在研究K线的奥秘...',
  '正在召唤财运...',
  '正在计算涨跌概率...',
  '正在偷看主力动向...',
  '正在学习割韭菜技术...',
  '正在酝酿下一个涨停...',
  '正在躲避回调...',
  '正在追踪热点板块...',
  '正在分析筹码分布...',
  '正在等待最佳买点...',
  '正在研究MACD金叉...',
  '正在计算布林带收口...',
  '正在观察成交量异动...',
  '正在研究北向资金...',
  '正在追踪游资席位...',
  '正在学习打板技巧...',
  '正在等待龙虎榜...',
  '正在研究机构调研...',
];

function App() {
  const [fontsReady, setFontsReady] = useState(false);
  const [question, setQuestion] = useState<KlineGameResponse | null>(null);
  const [gameState, setGameState] = useState<GameState>('loading');
  const [guessResults, setGuessResults] = useState<(GuessResult | null)[]>(Array(5).fill(null));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [loadingTip, setLoadingTip] = useState(LOADING_TIPS[0]);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef(0);

  const isMobile = windowWidth < BREAKPOINT;
  const cfg = getResponsiveConfig(isMobile);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cycle through loading tips
  useEffect(() => {
    if (gameState !== 'loading') return;
    const interval = setInterval(() => {
      setLoadingTip((prev) => {
        const idx = LOADING_TIPS.indexOf(prev);
        return LOADING_TIPS[(idx + 1) % LOADING_TIPS.length];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Preload pixel font before anything else
  useEffect(() => {
    const loadFont = async () => {
      try {
        const font = new FontFace('Zpix', 'url(/fonts/zpix.ttf)');
        await font.load();
        document.fonts.add(font);
        setFontsReady(true);
      } catch (e) {
        console.error('Font load failed:', e);
        setFontsReady(true); // Continue anyway
      }
    };
    loadFont();
  }, []);

  const guessedCount = guessResults.filter((r) => r !== null).length;
  const winRate = guessedCount > 0 ? score / guessedCount : 0;

  const getMessage = (rate: number) => {
    const r = Math.round(rate * 100);
    let result = MESSAGES[0];
    for (const m of MESSAGES) {
      if (r >= m.min) result = m;
    }
    return result;
  };
  const msg = getMessage(winRate);

  const drawKline = useCallback(
    (q: KlineGameResponse, guessed: (GuessResult | null)[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { canvasWidth: width, canvasHeight: height, candleWidth, candleGap } = cfg;
      const guessedCount = guessed.filter((r) => r !== null).length;

      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, width, height);

      const upColor = COLORS.upColor;
      const downColor = COLORS.downColor;
      const totalCandleWidth = candleWidth + candleGap;
      const chartHeight = height - 60;
      const chartTop = 30;
      const totalCandles = 10;
      const chartContentWidth = totalCandles * totalCandleWidth;
      const startX = (width - chartContentWidth) / 2;

      // 价格范围基于所有已揭示的K线（K1-K5已知 + 已猜测的K6-K10）
      const prices: number[] = [];
      for (let i = 0; i < 5; i++) {
        const c = q.candles[i];
        prices.push(c.high, c.low);
      }
      for (let i = 5; i < 5 + guessedCount; i++) {
        const c = q.candles[i];
        prices.push(c.high, c.low);
      }
      if (prices.length === 0) return;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice || 1;
      const priceToY = (price: number) =>
        chartTop + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

      // Grid lines
      ctx.strokeStyle = '#1a1a3e';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = chartTop + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(startX - 5, y);
        ctx.lineTo(startX + chartContentWidth + 5, y);
        ctx.stroke();
      }

      // Price labels
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = `${cfg.labelFontSize}px "Press Start 2P"`;
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const price = minPrice + (priceRange / 4) * (4 - i);
        const y = chartTop + (chartHeight / 4) * i;
        ctx.fillText(price.toFixed(2), startX - 10, y + 4);
      }

      // Draw all 10 candle positions
      for (let i = 0; i < 10; i++) {
        const x = startX + i * totalCandleWidth + candleWidth / 2;

        if (i < 5) {
          // K1-K5: 已知K线
          const c = q.candles[i];
          const isUp = c.close >= c.open;
          const color = isUp ? upColor : downColor;

          // Wick
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, priceToY(c.high));
          ctx.lineTo(x, priceToY(c.low));
          ctx.stroke();

          // Body
          const bodyTop = priceToY(Math.max(c.open, c.close));
          const bodyHeight = Math.max(1, Math.abs(priceToY(c.open) - priceToY(c.close)));
          ctx.fillStyle = color;
          ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

          // K label
          ctx.fillStyle = COLORS.text;
          ctx.font = `${cfg.klineLabelFontSize}px "Press Start 2P"`;
          ctx.textAlign = 'center';
          ctx.fillText(`K${i + 1}`, x, height - 10);

        } else {
          // K6-K10: 待猜位置
          const guessedIndex = i - 5;

          if (guessedIndex < guessedCount) {
            // 已猜测：显示结果K线 + ✓/✗
            const c = q.candles[i];
            const isUp = c.close >= c.open;
            const color = isUp ? upColor : downColor;

            // Wick
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, priceToY(c.high));
            ctx.lineTo(x, priceToY(c.low));
            ctx.stroke();

            // Body
            const bodyTop = priceToY(Math.max(c.open, c.close));
            const bodyHeight = Math.max(1, Math.abs(priceToY(c.open) - priceToY(c.close)));
            ctx.fillStyle = color;
            ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

            // K label
            ctx.fillStyle = COLORS.text;
            ctx.font = `${cfg.klineLabelFontSize}px "Press Start 2P"`;
            ctx.textAlign = 'center';
            ctx.fillText(`K${i + 1}`, x, height - 10);

            // Guess result marker
            if (guessed[guessedIndex]) {
              const result = guessed[guessedIndex]!;
              ctx.fillStyle = result.correct ? COLORS.success : COLORS.error;
              ctx.font = `${cfg.klineLabelFontSize + 2}px "Press Start 2P"`;
              ctx.fillText(result.correct ? '✓' : '✗', x, chartTop - 8);
            }
          } else {
            // 未猜测：显示问号
            ctx.fillStyle = COLORS.textMuted;
            ctx.font = `${cfg.klineLabelFontSize + 6}px "Press Start 2P"`;
            ctx.textAlign = 'center';
            ctx.fillText('?', x, chartTop + chartHeight / 2 + 4);

            // K label
            ctx.fillStyle = COLORS.textMuted;
            ctx.font = `${cfg.klineLabelFontSize}px "Press Start 2P"`;
            ctx.textAlign = 'center';
            ctx.fillText(`K${i + 1}`, x, height - 10);
          }
        }
      }
    },
    [cfg]
  );

  useEffect(() => {
    if (question && gameState === 'playing') {
      const id = ++requestIdRef.current;
      setTimeout(() => {
        if (id !== requestIdRef.current) return;
        drawKline(question, guessResults);
      }, 100);
    }
  }, [question, currentIndex, guessResults, gameState, drawKline]);

  useEffect(() => {
    if (question && gameState === 'finished') {
      drawKline(question, guessResults);
    }
  }, [question, gameState, guessResults, drawKline]);

  // Redraw canvas when page becomes visible again (tab switch fix)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && question && (gameState === 'playing' || gameState === 'finished')) {
        drawKline(question, guessResults);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [question, guessResults, gameState, drawKline]);

  const loadQuestion = useCallback(async () => {
    setGameState('loading');
    setGuessResults(Array(5).fill(null));
    setCurrentIndex(0);
    setScore(0);
    try {
      const q = await fetchRandomKline();
      setQuestion(q);
      setGameState('playing');
    } catch {
      setGameState('error');
    }
  }, []);

  // Load question once fonts are ready
  useEffect(() => {
    if (fontsReady) {
      loadQuestion();
    }
  }, [fontsReady, loadQuestion]);

  const handleGuess = (pick: 'up' | 'down') => {
    if (!question || guessResults[currentIndex] !== null || gameState !== 'playing') return;
    const currentCandle = question.candles[5 + currentIndex];
    const prevCandle = question.candles[4 + currentIndex];
    const actualUp = currentCandle.close >= prevCandle.close;
    const correct = pick === (actualUp ? 'up' : 'down');
    const newResults = [...guessResults];
    newResults[currentIndex] = { correct, up: pick === 'up', actualUp, price: currentCandle.close, open: currentCandle.open, high: currentCandle.high, low: currentCandle.low, close: currentCandle.close, prevClose: prevCandle.close };
    setGuessResults(newResults);
    if (correct) setScore((s) => s + 1);
    if (currentIndex < 4) {
      setCurrentIndex((i) => i + 1);
    } else {
      setGameState('finished');
    }
  };

  const handleShare = async () => {
    if (!question || !canvasRef.current || isSharing) return;
    setIsSharing(true);
    try {
      // Use existing font or load if needed
      let fontLoaded = document.fonts.check('12px Zpix');
      if (!fontLoaded) {
        const pixelFont = new FontFace('Zpix', 'url(/fonts/zpix.ttf)');
        await pixelFont.load();
        document.fonts.add(pixelFont);
        fontLoaded = true;
      }

      // Layout constants - 固定分享图尺寸
      const marginX = 2;
      const headerH = 35;
      const chartW = 536;
      const chartH = Math.round(chartW * (300 / 700));
      const gap = 8;
      const panelH = 210;
      const totalW = 540;

      const totalH = headerH + gap + chartH + gap + panelH;

      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = totalW * scale;
      canvas.height = totalH * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsSharing(false);
        return;
      }
      ctx.scale(scale, scale);

      ctx.fillStyle = '#0f0f23';
      ctx.fillRect(0, 0, totalW, totalH);

      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 24px Zpix';
      ctx.textAlign = 'center';
      ctx.fillText('cewang.ai', totalW / 2, 28);

      const chartY = headerH + gap;
      const klineCanvas = canvasRef.current;
      ctx.drawImage(klineCanvas, marginX, chartY, chartW, chartH);

      const panelY = chartY + chartH + gap;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, panelY, totalW, panelH);
      ctx.strokeStyle = '#16213e';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, panelY, totalW, panelH);

      ctx.fillStyle = '#8b8b9e';
      ctx.font = '10px Zpix';
      ctx.textAlign = 'center';
      ctx.fillText(`${question.stock_code} ${question.stock_name}`, totalW / 2, panelY + 22);
      ctx.fillText(`${question.candles[0].date} ~ ${question.candles[9].date}`, totalW / 2, panelY + 40);

      ctx.fillStyle = winRate > 0.5 ? '#ff0000' : '#00ff00';
      ctx.font = 'bold 26px Zpix';
      ctx.fillText(`${score}/5 (${(winRate * 100).toFixed(0)}%)`, totalW / 2, panelY + 75);

      ctx.fillStyle = '#eaeaea';
      ctx.font = '13px Zpix';
      ctx.fillText(msg.message, totalW / 2, panelY + 105);

      const qrDataUrl = await QRCode.toDataURL('https://cewang.ai', {
        width: 70 * scale,
        margin: 1,
        color: { dark: '#eaeaea', light: '#0f0f23' }
      });
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
      });
      ctx.drawImage(qrImg, totalW / 2 - 35, panelY + 115, 70, 70);

      ctx.fillStyle = '#e94560';
      ctx.font = '11px Zpix';
      ctx.fillText('识别二维码开始股海沉浮', totalW / 2, panelY + 205);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });
      const file = new File([blob], `kline-game-${question.stock_code}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '股票大作手战绩',
          text: `我的战绩: ${score}/5 (${(winRate * 100).toFixed(0)}%) - ${msg.message}`
        });
      } else {
        const link = document.createElement('a');
        link.download = `kline-game-${question.stock_code}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
      setIsSharing(false);
    } catch (err) {
      setIsSharing(false);
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  };

  // 动态样式
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: COLORS.background,
      color: COLORS.text,
      fontFamily: '"Zpix", "Press Start 2P", monospace',
    },
    header: {
      padding: `${cfg.padding}px`,
      textAlign: 'center' as const,
      borderBottom: `3px solid ${COLORS.border}`,
      boxShadow: `0 0 20px ${COLORS.border}40`,
    },
    headerTitle: {
      fontSize: `${cfg.headerFontSize}px`,
      color: COLORS.accent,
      textShadow: `0 0 10px ${COLORS.accent}`,
      fontFamily: '"Zpix", "Press Start 2P"',
      margin: 0,
    },
    main: {
      padding: `${cfg.padding}px`,
      maxWidth: isMobile ? '100%' : '800px',
      margin: '0 auto',
    },
    card: {
      backgroundColor: COLORS.cardBg,
      border: `2px solid ${COLORS.border}`,
      padding: `${cfg.cardPadding}px`,
      marginBottom: `${cfg.padding}px`,
      textAlign: 'center' as const,
    },
    cardAccent: {
      backgroundColor: COLORS.cardBg,
      border: `3px solid ${COLORS.accent}`,
      padding: `${cfg.cardPadding}px`,
      textAlign: 'center' as const,
      marginBottom: `${cfg.padding}px`,
      boxShadow: `0 0 30px ${COLORS.accent}40`,
    },
    canvasContainer: {
      backgroundColor: COLORS.background,
      padding: isMobile ? '6px' : '10px',
      marginBottom: `${cfg.padding}px`,
    },
    canvas: {
      width: '100%',
      maxWidth: `${cfg.canvasWidth}px`,
      height: 'auto',
      imageRendering: 'pixelated' as const,
      margin: '0 auto',
      display: 'block',
    },
    buttonGroup: {
      display: 'flex',
      gap: `${cfg.buttonGap}px`,
      justifyContent: 'center',
      marginBottom: `${cfg.padding}px`,
    },
    guessButton: {
      flex: isMobile ? 1 : 0,
      maxWidth: isMobile ? '48%' : '200px',
      height: `${cfg.buttonHeight}px`,
      padding: `${isMobile ? 16 : 12}px ${isMobile ? 20 : 16}px`,
      fontSize: `${cfg.buttonFontSize}px`,
      fontFamily: '"Zpix", "Press Start 2P"',
      backgroundColor: '#330000',
      border: `3px solid ${COLORS.upColor}`,
      color: COLORS.upColor,
      cursor: 'pointer',
      boxShadow: `0 0 15px ${COLORS.upColor}40`,
    },
    guessButtonDown: {
      flex: isMobile ? 1 : 0,
      maxWidth: isMobile ? '48%' : '200px',
      height: `${cfg.buttonHeight}px`,
      padding: `${isMobile ? 16 : 12}px ${isMobile ? 20 : 16}px`,
      fontSize: `${cfg.buttonFontSize}px`,
      fontFamily: '"Zpix", "Press Start 2P"',
      backgroundColor: '#003300',
      border: `3px solid ${COLORS.downColor}`,
      color: COLORS.downColor,
      cursor: 'pointer',
      boxShadow: `0 0 15px ${COLORS.downColor}40`,
    },
    actionButton: {
      flex: 1,
      maxWidth: '200px',
      padding: `${isMobile ? 16 : 15}px`,
      fontSize: `${cfg.bodyFontSize}px`,
      fontFamily: '"Zpix", "Press Start 2P"',
      backgroundColor: COLORS.accent,
      border: `3px solid ${COLORS.accent}`,
      color: COLORS.text,
      cursor: 'pointer',
    },
    actionButtonOutline: {
      flex: 1,
      maxWidth: '200px',
      padding: `${isMobile ? 16 : 15}px`,
      fontSize: `${cfg.bodyFontSize}px`,
      fontFamily: '"Zpix", "Press Start 2P"',
      backgroundColor: 'transparent',
      border: `3px solid ${COLORS.textMuted}`,
      color: COLORS.text,
      cursor: 'pointer',
    },
    textMuted: {
      fontSize: `${cfg.bodyFontSize}px`,
      color: COLORS.textMuted,
      fontFamily: '"Zpix", "Press Start 2P"',
    },
    textAccent: {
      fontSize: `${cfg.headerFontSize}px`,
      color: COLORS.accent,
      fontFamily: '"Zpix", "Press Start 2P"',
    },
    textLarge: {
      fontSize: isMobile ? '14px' : '16px',
      color: winRate > 0.5 ? COLORS.error : COLORS.success,
      marginBottom: '15px',
      fontFamily: '"Zpix", "Press Start 2P"',
    },
    textSmall: {
      fontSize: `${cfg.bodyFontSize}px`,
      color: winRate > 0.5 ? COLORS.error : COLORS.success,
      fontFamily: '"Zpix", "Press Start 2P"',
    },
    questionText: {
      fontSize: `${cfg.bodyFontSize}px`,
      color: COLORS.accent,
      fontFamily: '"Zpix", "Press Start 2P"',
    },
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>股票大作手</h1>
      </header>

      <main style={styles.main}>
        {gameState === 'loading' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ width: isMobile ? '160px' : '200px', height: '12px', backgroundColor: COLORS.cardBg, border: `2px solid ${COLORS.border}`, margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '60%', backgroundColor: COLORS.accent, animation: 'loadbar 1.5s ease-in-out infinite' }} />
              </div>
            </div>
            <div style={{ fontSize: `${cfg.bodyFontSize}px`, color: COLORS.accent, animation: 'blink 1s infinite', fontFamily: '"Zpix", "Press Start 2P"', marginBottom: '15px' }}>LOADING...</div>
            <div style={{ fontSize: `${cfg.labelFontSize}px`, color: COLORS.textMuted, fontFamily: '"Zpix", "Press Start 2P"' }}>{loadingTip}</div>
          </div>
        )}

        {gameState === 'error' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: `${cfg.bodyFontSize}px`, color: COLORS.error, animation: 'blink 1s infinite', fontFamily: '"Zpix", "Press Start 2P"', marginBottom: '20px' }}>加载失败，请检查网络后重试</div>
            <button onClick={loadQuestion} style={{ ...styles.actionButton, maxWidth: 'none' }}>重新加载</button>
          </div>
        )}

        {gameState === 'playing' && question && (
          <>
            <div style={styles.card}>
              <div style={styles.questionText}>第 {guessedCount + 1}/5 题</div>
            </div>

            <div style={styles.canvasContainer}>
              <canvas ref={canvasRef} width={cfg.canvasWidth} height={cfg.canvasHeight} style={styles.canvas} />
            </div>

            {currentIndex < 5 && guessResults[currentIndex] === null && (
              <div style={styles.buttonGroup}>
                <button onClick={() => handleGuess('up')} style={styles.guessButton}>📈 猜涨</button>
                <button onClick={() => handleGuess('down')} style={styles.guessButtonDown}>📉 猜跌</button>
              </div>
            )}

            <div style={styles.card}>
              <div style={styles.textMuted}>当前战绩: {score}/{guessedCount}</div>
              <div style={{ marginTop: '8px', ...styles.textSmall }}>胜率: {guessedCount > 0 ? Math.round(score / guessedCount * 100) : 0}%</div>
            </div>
          </>
        )}

        {gameState === 'finished' && question && (
          <>
            <div style={styles.cardAccent}>
              <div style={styles.textAccent}>🎉 游戏结束 🎉</div>

              <div style={styles.canvasContainer}>
                <canvas ref={canvasRef} width={cfg.canvasWidth} height={cfg.canvasHeight} style={styles.canvas} />
              </div>

              <div style={{ fontSize: `${cfg.bodyFontSize}px`, color: COLORS.textMuted, marginBottom: '10px', fontFamily: '"Zpix", "Press Start 2P"' }}>股票: {question.stock_code} {question.stock_name}</div>
              <div style={{ fontSize: `${cfg.bodyFontSize}px`, color: COLORS.textMuted, marginBottom: '20px', fontFamily: '"Zpix", "Press Start 2P"' }}>时间: {question.candles[0].date} ~ {question.candles[9].date}</div>

              <div style={styles.textLarge}>
                您的战绩: {score}/5 ({(winRate * 100).toFixed(0)}%)
              </div>

              <div style={{ fontSize: `${cfg.bodyFontSize}px`, padding: '15px', backgroundColor: COLORS.background, border: `2px solid ${COLORS.border}`, fontFamily: '"Zpix", "Press Start 2P"' }}>{msg.message}</div>
            </div>

            <div style={styles.buttonGroup}>
              <button onClick={loadQuestion} style={styles.actionButton}>再玩一次</button>
              <button onClick={handleShare} disabled={isSharing} style={isSharing ? { ...styles.actionButtonOutline, opacity: 0.5, cursor: 'not-allowed' } : styles.actionButtonOutline}>
                {isSharing ? '生成中...' : '分享战绩'}
              </button>
            </div>
          </>
        )}
      </main>

      <style>{`
        @keyframes loadbar {
          0% { left: -60%; }
          100% { left: 100%; }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
        * { box-sizing: border-box; }
        button:hover { opacity: 0.9; }
        button:active { transform: scale(0.98); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        body { margin: 0; }
        /* 禁用移动端hover */
        @media (hover: none) {
          button:hover { opacity: 1; }
        }
        /* 触摸优化 - 防止长按弹出菜单 */
        button {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
          touch-action: manipulation;
        }
      `}</style>
    </div>
  );
}

export default App;

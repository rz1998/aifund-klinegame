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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef(0);

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

      const width = 700;
      const guessedCount = guessed.filter((r) => r !== null).length;
      console.log('[DEBUG] drawKline called:', { guessedCount, gameState: 'playing' });
      const height = 300;
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, width, height);

      const upColor = COLORS.upColor;
      const downColor = COLORS.downColor;
      const candleWidth = 24;
      const candleGap = 8;
      const totalCandleWidth = candleWidth + candleGap;
      const chartHeight = height - 80;
      const chartTop = 40;
      const totalCandles = 10;
      // 图表固定宽度，10根K线均匀分布
      const chartContentWidth = totalCandles * totalCandleWidth;
      const startX = (width - chartContentWidth) / 2;

      // 价格范围基于所有已揭示的K线（K1-K5已知 + 已猜测的K6-K10）
      const prices: number[] = [];
      for (let i = 0; i < 5; i++) {
        const c = q.candles[i];
        prices.push(c.high, c.low);
      }
      // 加入已揭示的K6-K10价格
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
      ctx.font = '10px "Press Start 2P"';
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

          // K label (K1-K10 全部显示)
          ctx.fillStyle = COLORS.text;
          ctx.font = '8px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillText(`K${i + 1}`, x, height - 15);

        } else {
          // K6-K10: 待猜位置
          const guessedIndex = i - 5; // 0-4 for guessResults

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
            ctx.font = '8px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(`K${i + 1}`, x, height - 15);

            // Guess result marker
            if (guessed[guessedIndex]) {
              const result = guessed[guessedIndex]!;
              ctx.fillStyle = result.correct ? COLORS.success : COLORS.error;
              ctx.font = '10px "Press Start 2P"';
              ctx.fillText(result.correct ? '✓' : '✗', x, chartTop - 10);
            }
          } else {
            // 未猜测：显示问号
            ctx.fillStyle = COLORS.textMuted;
            ctx.font = '16px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('?', x, chartTop + chartHeight / 2 + 6);

            // K label
            ctx.fillStyle = COLORS.textMuted;
            ctx.font = '8px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(`K${i + 1}`, x, height - 15);
          }
        }
      }
    },
    []
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
    // K6-K10 are at candles[5]-[9], currentIndex 0-4 maps to candles[5]-[9]
    const c = question.candles[5 + currentIndex];
    const actualUp = c.close >= c.open;
    const correct = pick === (actualUp ? 'up' : 'down');
    const newResults = [...guessResults];
    newResults[currentIndex] = { correct, up: pick === 'up', actualUp, price: c.close, open: c.open, high: c.high, low: c.low, close: c.close };
    console.log('[DEBUG] handleGuess:', { pick, correct, currentIndex, guessedCount: guessResults.filter(r => r !== null).length });
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

      // Layout constants
      const marginX = 5;
      const headerH = 35;
      const chartW = 530;
      const chartH = Math.round(chartW * (300 / 700)); // maintain 7:3 ratio
      const gap = 8;
      const panelH = 180;
      const totalW = 540;

      // Calculate total height
      const totalH = headerH + gap + chartH + gap + panelH;

      // Create high-res canvas (2x for retina quality)
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

      // Background
      ctx.fillStyle = '#0f0f23';
      ctx.fillRect(0, 0, totalW, totalH);

      // Header with cewang.ai
      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 24px Zpix';
      ctx.textAlign = 'center';
      ctx.fillText('cewang.ai', totalW / 2, 28);

      // K-line chart area
      const chartY = headerH + gap;
      const klineCanvas = canvasRef.current;
      ctx.drawImage(klineCanvas, marginX, chartY, chartW, chartH);

      // Bottom panel - game results
      const panelY = chartY + chartH + gap;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, panelY, totalW, panelH);
      ctx.strokeStyle = '#16213e';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, panelY, totalW, panelH);

      // Stock info
      ctx.fillStyle = '#8b8b9e';
      ctx.font = '10px Zpix';
      ctx.textAlign = 'center';
      ctx.fillText(`${question.stock_code} ${question.stock_name}`, totalW / 2, panelY + 22);
      ctx.fillText(`${question.candles[0].date} ~ ${question.candles[9].date}`, totalW / 2, panelY + 40);

      // Score
      ctx.fillStyle = winRate > 0.5 ? '#ff0000' : '#00ff00';
      ctx.font = 'bold 26px Zpix';
      ctx.fillText(`${score}/5 (${(winRate * 100).toFixed(0)}%)`, totalW / 2, panelY + 75);

      // Message
      ctx.fillStyle = '#eaeaea';
      ctx.font = '13px Zpix';
      ctx.fillText(msg.message, totalW / 2, panelY + 105);

      // QR Code
      const qrDataUrl = await QRCode.toDataURL('https://cewang.ai', {
        width: 60 * scale,
        margin: 1,
        color: { dark: '#eaeaea', light: '#0f0f23' }
      });
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
      });
      ctx.drawImage(qrImg, totalW / 2 - 30, panelY + 120, 60, 60);

      // QR label
      ctx.fillStyle = '#8b8b9e';
      ctx.font = '10px Zpix';
      ctx.fillText('扫码挑战', totalW / 2, panelY + 195);

      // Try Web Share API first (works better on mobile)
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
        // Fallback: download
        const link = document.createElement('a');
        link.download = `kline-game-${question.stock_code}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
      setIsSharing(false);
    } catch (err) {
      setIsSharing(false);
      // User cancelled or share failed - don't show error
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  };

  useEffect(() => {
    if (fontsReady) {
      loadQuestion();
    }
  }, [fontsReady, loadQuestion]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.background, color: COLORS.text, fontFamily: '"Zpix", "Press Start 2P", monospace' }}>
      <header style={{ padding: '20px', textAlign: 'center', borderBottom: `3px solid ${COLORS.border}`, boxShadow: `0 0 20px ${COLORS.border}40` }}>
        <h1 style={{ fontSize: '16px', color: COLORS.accent, textShadow: `0 0 10px ${COLORS.accent}`, fontFamily: '"Zpix", "Press Start 2P"' }}>股票大作手</h1>
      </header>

      <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        {gameState === 'loading' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ width: '200px', height: '12px', backgroundColor: COLORS.cardBg, border: `2px solid ${COLORS.border}`, margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '60%', backgroundColor: COLORS.accent, animation: 'loadbar 1.5s ease-in-out infinite' }} />
              </div>
            </div>
            <div style={{ fontSize: '10px', color: COLORS.accent, animation: 'blink 1s infinite', fontFamily: '"Zpix", "Press Start 2P"', marginBottom: '15px' }}>LOADING...</div>
            <div style={{ fontSize: '9px', color: COLORS.textMuted, fontFamily: '"Zpix", "Press Start 2P"' }}>{loadingTip}</div>
          </div>
        )}

        {gameState === 'error' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '10px', color: COLORS.error, animation: 'blink 1s infinite', fontFamily: '"Zpix", "Press Start 2P"', marginBottom: '20px' }}>加载失败，请检查网络后重试</div>
            <button onClick={loadQuestion} style={{ padding: '15px 30px', fontSize: '10px', fontFamily: '"Zpix", "Press Start 2P"', backgroundColor: COLORS.accent, border: `3px solid ${COLORS.accent}`, color: COLORS.text, cursor: 'pointer' }}>重新加载</button>
          </div>
        )}

        {gameState === 'playing' && question && (
          <>
            <div style={{ backgroundColor: COLORS.cardBg, border: `2px solid ${COLORS.border}`, padding: '15px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: COLORS.accent, fontFamily: '"Zpix", "Press Start 2P"' }}>第 {guessedCount + 1}/5 题</div>
            </div>

            <div style={{ backgroundColor: COLORS.cardBg, border: `2px solid ${COLORS.border}`, padding: '10px', marginBottom: '20px' }}>
              <canvas ref={canvasRef} width={700} height={300} style={{ width: '100%', maxWidth: '700px', height: 'auto', imageRendering: 'pixelated' }} />
            </div>

            {currentIndex < 5 && guessResults[currentIndex] === null && (
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '20px' }}>
                <button onClick={() => handleGuess('up')} style={{ flex: 1, maxWidth: '200px', padding: '20px', fontSize: '12px', fontFamily: '"Zpix", "Press Start 2P"', backgroundColor: '#330000', border: `3px solid ${COLORS.upColor}`, color: COLORS.upColor, cursor: 'pointer', boxShadow: `0 0 15px ${COLORS.upColor}40` }}>📈 猜涨</button>
                <button onClick={() => handleGuess('down')} style={{ flex: 1, maxWidth: '200px', padding: '20px', fontSize: '12px', fontFamily: '"Zpix", "Press Start 2P"', backgroundColor: '#003300', border: `3px solid ${COLORS.downColor}`, color: COLORS.downColor, cursor: 'pointer', boxShadow: `0 0 15px ${COLORS.downColor}40` }}>📉 猜跌</button>
              </div>
            )}

            <div style={{ backgroundColor: COLORS.cardBg, border: `2px solid ${COLORS.border}`, padding: '15px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: COLORS.textMuted, fontFamily: '"Zpix", "Press Start 2P"' }}>当前战绩: {score}/{guessedCount}</div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: winRate > 0.5 ? COLORS.error : COLORS.success, fontFamily: '"Zpix", "Press Start 2P"' }}>胜率: {guessedCount > 0 ? Math.round(score / guessedCount * 100) : 0}%</div>
            </div>
          </>
        )}

        {gameState === 'finished' && question && (
          <>
            <div style={{ backgroundColor: COLORS.cardBg, border: `3px solid ${COLORS.accent}`, padding: '30px', textAlign: 'center', marginBottom: '20px', boxShadow: `0 0 30px ${COLORS.accent}40` }}>
              <div style={{ fontSize: '14px', color: COLORS.accent, marginBottom: '20px', fontFamily: '"Zpix", "Press Start 2P"' }}>🎉 游戏结束 🎉</div>

              <div style={{ backgroundColor: COLORS.background, padding: '10px', marginBottom: '20px' }}>
                <canvas ref={canvasRef} width={700} height={300} style={{ width: '100%', maxWidth: '700px', height: 'auto', imageRendering: 'pixelated' }} />
              </div>

              <div style={{ fontSize: '10px', color: COLORS.textMuted, marginBottom: '10px', fontFamily: '"Zpix", "Press Start 2P"' }}>股票: {question.stock_code} {question.stock_name}</div>
              <div style={{ fontSize: '10px', color: COLORS.textMuted, marginBottom: '20px', fontFamily: '"Zpix", "Press Start 2P"' }}>时间: {question.candles[0].date} ~ {question.candles[9].date}</div>

              <div style={{ fontSize: '16px', color: winRate > 0.5 ? COLORS.error : COLORS.success, marginBottom: '15px', fontFamily: '"Zpix", "Press Start 2P"' }}>
                您的战绩: {score}/5 ({(winRate * 100).toFixed(0)}%)
              </div>

              <div style={{ fontSize: '10px', padding: '15px', backgroundColor: COLORS.background, border: `2px solid ${COLORS.border}`, fontFamily: '"Zpix", "Press Start 2P"' }}>{msg.message}</div>
            </div>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button onClick={loadQuestion} style={{ flex: 1, maxWidth: '200px', padding: '15px', fontSize: '10px', fontFamily: '"Zpix", "Press Start 2P"', backgroundColor: COLORS.accent, border: `3px solid ${COLORS.accent}`, color: COLORS.text, cursor: 'pointer' }}>再玩一次</button>
              <button onClick={handleShare} disabled={isSharing} style={{ flex: 1, maxWidth: '200px', padding: '15px', fontSize: '10px', fontFamily: '"Zpix", "Press Start 2P"', backgroundColor: isSharing ? COLORS.cardBg : 'transparent', border: `3px solid ${COLORS.textMuted}`, color: COLORS.text, cursor: isSharing ? 'not-allowed' : 'pointer' }}>{isSharing ? '生成中...' : '分享战绩'}</button>
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
      `}</style>
    </div>
  );
}

export default App;

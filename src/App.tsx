import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchRandomKline } from './services/api';
import type { KlineGameResponse, GuessResult } from './services/api';

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
  { min: 0, message: '📉 糟糕透了，继续加油！' },
  { min: 20, message: '🙁 还需要学习 K 线知识' },
  { min: 40, message: '😐 勉强及格，再接再厉' },
  { min: 60, message: '🙂 还不错！继续挑战' },
  { min: 80, message: '😊 太棒了！你很厉害！' },
  { min: 100, message: '🎉 完美！你是 K 线大师！' },
];

function App() {
  const [question, setQuestion] = useState<KlineGameResponse | null>(null);
  const [gameState, setGameState] = useState<GameState>('loading');
  const [guessResults, setGuessResults] = useState<(GuessResult | null)[]>(Array(5).fill(null));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef(0);

  const guessedCount = guessResults.filter((r) => r !== null).length;
  const winRate = guessedCount > 0 ? score / guessedCount : 0;

  const getMessage = (rate: number) => {
    const r = Math.round(rate * 100);
    for (const m of MESSAGES) {
      if (r >= m.min) return m;
    }
    return MESSAGES[0];
  };
  const msg = getMessage(winRate);

  const drawKline = useCallback(
    (q: KlineGameResponse, revealed: number, guessed: (GuessResult | null)[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 700;
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
      const chartPadding = 40;
      const chartHeight = height - 80;
      const chartTop = 40;

      // 始终至少显示5根已知K线，最多显示10根
      const visibleCount = Math.max(5, Math.min(revealed, q.candles.length));
      const prices: number[] = [];
      for (let i = 0; i < visibleCount; i++) {
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
        ctx.moveTo(chartPadding, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
      }

      // Price labels
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '10px "Press Start 2P"';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const price = minPrice + (priceRange / 4) * (4 - i);
        const y = chartTop + (chartHeight / 4) * i;
        ctx.fillText(price.toFixed(2), chartPadding - 5, y + 4);
      }

      // Draw candles
      for (let i = 0; i < visibleCount; i++) {
        const c = q.candles[i];
        const x = chartPadding + i * totalCandleWidth + candleWidth / 2;
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
        if (i < 5) {
          ctx.fillStyle = guessedCount > i ? COLORS.text : COLORS.textMuted;
          ctx.font = '8px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillText(`K${i + 1}`, x, height - 15);
        }

        // Guess result marker
        if (guessedCount > i && guessed[i]) {
          const result = guessed[i]!;
          ctx.fillStyle = result.correct ? COLORS.success : COLORS.error;
          ctx.font = '10px "Press Start 2P"';
          ctx.fillText(result.correct ? '✓' : '✗', x, chartTop - 10);
        }
      }

      // Question marks for unrevealed candles (K6-K10 that haven't been guessed yet)
      for (let i = 5; i < 10; i++) {
        if (i >= 5 + guessedCount) {
          const x = chartPadding + i * totalCandleWidth + candleWidth / 2;
          ctx.fillStyle = COLORS.textMuted;
          ctx.font = '16px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillText('?', x, chartTop + chartHeight / 2 + 6);
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
        drawKline(question, 5 + guessedCount, guessResults);
      }, 100);
    }
  }, [question, currentIndex, guessResults, gameState, drawKline]);

  useEffect(() => {
    if (question && gameState === 'finished') {
      drawKline(question, 10, guessResults);
    }
  }, [question, gameState, guessResults, drawKline]);

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

  const handleGuess = (pick: 'up' | 'down') => {
    if (!question || guessResults[currentIndex] !== null || gameState !== 'playing') return;
    // K6-K10 are at candles[5]-[9], currentIndex 0-4 maps to candles[5]-[9]
    const c = question.candles[5 + currentIndex];
    const actualUp = c.close >= c.open;
    const correct = pick === (actualUp ? 'up' : 'down');
    const newResults = [...guessResults];
    newResults[currentIndex] = { correct, up: pick === 'up', actualUp, price: c.close, open: c.open, high: c.high, low: c.low, close: c.close };
    setGuessResults(newResults);
    if (correct) setScore((s) => s + 1);
    if (currentIndex < 4) {
      setCurrentIndex((i) => i + 1);
    } else {
      setGameState('finished');
    }
  };

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.background, color: COLORS.text, fontFamily: '"Zpix", "Press Start 2P", monospace' }}>
      <header style={{ padding: '20px', textAlign: 'center', borderBottom: `3px solid ${COLORS.border}`, boxShadow: `0 0 20px ${COLORS.border}40` }}>
        <h1 style={{ fontSize: '16px', color: COLORS.accent, textShadow: `0 0 10px ${COLORS.accent}`, fontFamily: '"Zpix", "Press Start 2P"' }}>K线竞彩</h1>
      </header>

      <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        {gameState === 'loading' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ width: '200px', height: '12px', backgroundColor: COLORS.cardBg, border: `2px solid ${COLORS.border}`, margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '60%', backgroundColor: COLORS.accent, animation: 'loadbar 1.5s ease-in-out infinite' }} />
              </div>
            </div>
            <div style={{ fontSize: '12px', color: COLORS.accent, animation: 'blink 1s infinite', fontFamily: '"Zpix", "Press Start 2P"' }}>LOADING...</div>
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
              <div style={{ marginTop: '8px', fontSize: '12px', color: score > guessedCount / 2 ? COLORS.success : COLORS.error, fontFamily: '"Zpix", "Press Start 2P"' }}>胜率: {guessedCount > 0 ? Math.round(score / guessedCount * 100) : 0}%</div>
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

              <div style={{ fontSize: '16px', color: winRate >= 0.6 ? COLORS.success : winRate >= 0.4 ? COLORS.flatColor : COLORS.error, marginBottom: '15px', fontFamily: '"Zpix", "Press Start 2P"' }}>
                您的战绩: {score}/5 ({(winRate * 100).toFixed(0)}%)
              </div>

              <div style={{ fontSize: '10px', padding: '15px', backgroundColor: COLORS.background, border: `2px solid ${COLORS.border}`, fontFamily: '"Zpix", "Press Start 2P"' }}>{msg.message}</div>
            </div>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button onClick={loadQuestion} style={{ flex: 1, maxWidth: '200px', padding: '15px', fontSize: '10px', fontFamily: '"Zpix", "Press Start 2P"', backgroundColor: COLORS.accent, border: `3px solid ${COLORS.accent}`, color: COLORS.text, cursor: 'pointer' }}>再玩一次</button>
              <button onClick={() => { const text = `📊 K线竞彩战绩\n股票: ${question.stock_code} ${question.stock_name}\n时间: ${question.candles[0].date} ~ ${question.candles[9].date}\n胜率: ${score}/5 (${(winRate * 100).toFixed(0)}%)\n评价: ${msg.message}\n👉 点击挑战: http://8.151.136.102/kline-game`; navigator.clipboard.writeText(text).then(() => alert('战绩已复制！')) }} style={{ flex: 1, maxWidth: '200px', padding: '15px', fontSize: '10px', fontFamily: '"Zpix", "Press Start 2P"', backgroundColor: 'transparent', border: `3px solid ${COLORS.textMuted}`, color: COLORS.text, cursor: 'pointer' }}>分享战绩</button>
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

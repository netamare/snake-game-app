import { useCallback, useEffect, useRef, useState } from 'react';

const BOARD_SIZE = 20;
const STARTING_SNAKE = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
const SPEEDS = { Easy: 170, Medium: 115, Hard: 72 };
const OPPOSITES = { up: 'down', down: 'up', left: 'right', right: 'left' };
const MOVES = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

const getRandomFood = (snake) => {
  const open = [];
  for (let y = 0; y < BOARD_SIZE; y += 1) for (let x = 0; x < BOARD_SIZE; x += 1) {
    if (!snake.some((piece) => piece.x === x && piece.y === y)) open.push({ x, y });
  }
  return open[Math.floor(Math.random() * open.length)] || null;
};

function Icon({ children }) { return <span aria-hidden="true" className="icon">{children}</span>; }

function App() {
  const [snake, setSnake] = useState(STARTING_SNAKE);
  const [food, setFood] = useState({ x: 15, y: 10 });
  const [direction, setDirection] = useState('right');
  const [status, setStatus] = useState('Ready');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('snake-high-score')) || 0);
  const [difficulty, setDifficulty] = useState('Medium');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('snake-theme') !== 'light');
  const snakeRef = useRef(STARTING_SNAKE);
  const foodRef = useRef({ x: 15, y: 10 });
  const directionRef = useRef('right');
  const queuedRef = useRef('right');

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('snake-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  useEffect(() => localStorage.setItem('snake-high-score', String(highScore)), [highScore]);

  const changeDirection = useCallback((next) => {
    if (next && OPPOSITES[directionRef.current] !== next) queuedRef.current = next;
  }, []);

  const reset = useCallback((shouldStart = false) => {
    setSnake(STARTING_SNAKE); setFood({ x: 15, y: 10 }); setScore(0);
    snakeRef.current = STARTING_SNAKE; foodRef.current = { x: 15, y: 10 };
    directionRef.current = 'right'; queuedRef.current = 'right'; setDirection('right');
    setStatus(shouldStart ? 'Playing' : 'Ready');
  }, []);

  const tick = useCallback(() => {
    const current = snakeRef.current;
    const nextDirection = queuedRef.current;
    directionRef.current = nextDirection; setDirection(nextDirection);
    const move = MOVES[nextDirection];
    const head = { x: current[0].x + move.x, y: current[0].y + move.y };
    const eating = head.x === foodRef.current?.x && head.y === foodRef.current?.y;
    const bodyToCheck = eating ? current : current.slice(0, -1);
    const collided = head.x < 0 || head.x >= BOARD_SIZE || head.y < 0 || head.y >= BOARD_SIZE || bodyToCheck.some((part) => part.x === head.x && part.y === head.y);
    if (collided) { setStatus('Game over'); return; }
    const updated = [head, ...current];
    if (eating) {
      const nextScore = score + 10;
      setScore(nextScore); setHighScore((best) => Math.max(best, nextScore));
      const nextFood = getRandomFood(updated); foodRef.current = nextFood; setFood(nextFood);
    } else updated.pop();
    snakeRef.current = updated; setSnake(updated);
  }, [score]);

  useEffect(() => {
    if (status !== 'Playing') return undefined;
    const id = window.setInterval(tick, SPEEDS[difficulty]);
    return () => window.clearInterval(id);
  }, [status, difficulty, tick]);
  useEffect(() => {
    const keyMap = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    const handleKey = (event) => { const move = keyMap[event.key]; if (move) { event.preventDefault(); changeDirection(move); } else if (event.key === ' ' && status === 'Playing') setStatus('Paused'); };
    window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey);
  }, [changeDirection, status]);

  const startOrResume = () => {
    if (status === 'Game over') reset(true);
    else setStatus('Playing');
  };
  const isSnake = (x, y) => snake.findIndex((part) => part.x === x && part.y === y);

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#game"><span className="brand-mark">S</span>snake<span>•</span></a><button className="theme-button" onClick={() => setDarkMode((v) => !v)} aria-label="Toggle color theme"><Icon>{darkMode ? '☀' : '☾'}</Icon><span>{darkMode ? 'Light mode' : 'Dark mode'}</span></button></header>
    <section className="hero"><div><p className="eyebrow">CLASSIC ARCADE, REIMAGINED</p><h1>Stay sharp.<br /><em>Grow longer.</em></h1><p className="intro">Guide your snake, collect the glow, and see how far your instincts can take you.</p></div><div className="status-pill"><span className={`status-dot ${status.toLowerCase().replace(' ', '-')}`} />{status}</div></section>
    <section className="game-layout" id="game">
      <div className="board-wrap"><div className="board" role="application" aria-label="Snake game board">
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => { const x = index % BOARD_SIZE; const y = Math.floor(index / BOARD_SIZE); const snakeIndex = isSnake(x, y); const isFood = food?.x === x && food?.y === y; return <div key={index} className={`cell ${snakeIndex === 0 ? 'snake-head' : snakeIndex > 0 ? 'snake-body' : ''} ${isFood ? 'food' : ''}`} />; })}
        {status !== 'Playing' && <div className="board-message"><strong>{status === 'Game over' ? 'Game over' : status === 'Paused' ? 'Paused' : 'Ready to play?'}</strong><span>{status === 'Game over' ? 'Hit restart and chase a new high score.' : status === 'Paused' ? 'Take a breath. Your snake is waiting.' : 'Press start or use the controls below.'}</span></div>}
      </div></div>
      <aside className="sidebar"><div className="score-card"><p>YOUR SCORE</p><strong>{String(score).padStart(3, '0')}</strong><div><span>Best</span><b>{String(highScore).padStart(3, '0')}</b></div></div><div className="panel"><p className="panel-label">DIFFICULTY</p><div className="difficulty-tabs">{Object.keys(SPEEDS).map((level) => <button key={level} className={difficulty === level ? 'active' : ''} onClick={() => setDifficulty(level)}>{level}</button>)}</div></div><div className="panel controls-help"><p className="panel-label">HOW TO PLAY</p><div><span className="keys">↑ ↓ ← →</span><span>or</span><span className="keys">W A S D</span></div><small>Collect the glowing dots. Avoid walls and your own tail.</small></div></aside>
    </section>
    <section className="actions"><button className="primary" onClick={startOrResume}>{status === 'Paused' ? 'Resume game' : status === 'Playing' ? 'Playing…' : 'Start game'} <Icon>→</Icon></button><button className="secondary" onClick={() => setStatus((value) => value === 'Playing' ? 'Paused' : value === 'Paused' ? 'Playing' : value)} disabled={status === 'Ready' || status === 'Game over'}>{status === 'Paused' ? 'Resume' : 'Pause'}</button><button className="restart" onClick={() => reset(false)}><Icon>↻</Icon> Restart</button></section>
    <section className="mobile-controls" aria-label="Touch movement controls"><button onClick={() => changeDirection('up')}>↑</button><div><button onClick={() => changeDirection('left')}>←</button><button onClick={() => changeDirection('down')}>↓</button><button onClick={() => changeDirection('right')}>→</button></div></section>
    <footer><span>Made for quick breaks and high scores</span><span>Use arrow keys or WASD to move</span></footer>
  </main>;
}
export default App;

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS';
  cover: string;
  color: 'cyan' | 'magenta' | 'yellow' | 'green';
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export interface User {
  name: string;
}

export const GAMES: Game[] = [
  {
    id: 'brickblast',
    title: 'BRICKBLAST',
    short: 'Destroy the wall.',
    long: 'A classic brick-breaking experience. Launch your ball, angle your shots, and clear every block before time runs out. Chain combos for score multipliers.',
    cat: 'ARCADE',
    cover: 'cover-bricks',
    color: 'cyan',
    best: 142800,
    plays: '18.2K',
  },
  {
    id: 'tetromino',
    title: 'TETROMINO',
    short: 'Stack. Clear. Survive.',
    long: 'Falling blocks demand split-second decisions. Rotate and place pieces to clear lines. The speed increases until only the sharpest minds endure.',
    cat: 'PUZZLE',
    cover: 'cover-tetro',
    color: 'magenta',
    best: 389500,
    plays: '31.7K',
  },
  {
    id: 'serpentrix',
    title: 'SERPENTRIX',
    short: 'Eat. Grow. Avoid.',
    long: 'Guide your serpent through the arena, consuming pixels to grow longer. One wrong turn and it is over. How long can you last?',
    cat: 'ARCADE',
    cover: 'cover-snake',
    color: 'green',
    best: 76400,
    plays: '12.4K',
  },
  {
    id: 'galaktron',
    title: 'GALAKTRON',
    short: 'Pac-man, reimagined.',
    long: 'Navigate the maze, collect every dot, and evade the ghost drones. Power pellets flip the script — turn hunter into hunted for precious seconds.',
    cat: 'PUZZLE',
    cover: 'cover-glot',
    color: 'yellow',
    best: 215300,
    plays: '9.8K',
  },
  {
    id: 'spaceraid',
    title: 'SPACE RAID',
    short: 'Defend the frontier.',
    long: 'Waves of alien formations descend. Your laser cannon is the last line of defense. Take cover, conserve ammo, and never let them reach the bottom.',
    cat: 'SHOOTER',
    cover: 'cover-invaders',
    color: 'green',
    best: 428900,
    plays: '24.1K',
  },
  {
    id: 'asteroidbelt',
    title: 'ASTEROID BELT',
    short: 'Thrust. Shoot. Survive.',
    long: 'Pilot your ship through a deadly asteroid field. Inertia is your enemy. One collision ends the run — split large rocks before they split you.',
    cat: 'SHOOTER',
    cover: 'cover-rocas',
    color: 'cyan',
    best: 198700,
    plays: '15.6K',
  },
  {
    id: 'frogway',
    title: 'FROGWAY',
    short: 'Hop or get crushed.',
    long: 'Cross the highway and the river using only timing and nerve. Logs drift, cars speed, and one mistimed jump means starting over from scratch.',
    cat: 'ARCADE',
    cover: 'cover-rana',
    color: 'green',
    best: 88200,
    plays: '7.3K',
  },
  {
    id: 'pixelduel',
    title: 'PIXEL DUEL',
    short: 'One screen. Two fighters.',
    long: 'Face off against another player on a single screen. Master your moveset, read your opponent, and land the finishing blow before the timer runs out.',
    cat: 'VERSUS',
    cover: 'cover-duelo',
    color: 'magenta',
    best: 99999,
    plays: '41.0K',
  },
];

export const CATS: string[] = ['TODOS', 'ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS'];

export const PLAYERS: string[] = [
  'ACE', 'BLADE', 'COBRA', 'DASH', 'ECHO',
  'FLASH', 'GHOST', 'HAWK', 'IRON', 'JINX',
  'KRYPT', 'LYNX', 'MAVEN', 'NOVA', 'ORBIT',
  'PIXEL', 'QUARK', 'RYZE',
];

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function seededScores(seed: number, count = 10): ScoreRow[] {
  const rng = lcg(seed);
  const rows: ScoreRow[] = [];

  for (let i = 0; i < count; i++) {
    const nameIdx = Math.floor(rng() * PLAYERS.length);
    const suffix = String.fromCharCode(65 + Math.floor(rng() * 26));
    const score = Math.floor(rng() * 380000) + 20000;
    const day = String(1 + Math.floor(rng() * 28)).padStart(2, '0');
    const month = String(1 + Math.floor(rng() * 12)).padStart(2, '0');
    const year = 2024 + Math.floor(rng() * 2);

    rows.push({
      rank: i + 1,
      name: `${PLAYERS[nameIdx]}.${suffix}`,
      score,
      date: `${day}/${month}/${year}`,
    });
  }

  return rows.sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, rank: i + 1 }));
}

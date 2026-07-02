export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // formateado desde created_at para mostrar (dd/mm/aaaa)
}

export interface User {
  name: string;
}

export const CATS: string[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];

import { createClient } from "@/app/lib/supabase/client";
import type { Game, ScoreRow } from "@/app/data";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function getGames(): Promise<Game[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("games").select("*");
  if (error) throw error;
  return data as Game[];
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Game | null;
}

export async function getTopScores(
  gameId: string,
  limit = 10,
): Promise<ScoreRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

export async function getAllTopScores(
  limit = 12,
): Promise<(ScoreRow & { gameId: string })[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("game_id, name, score, created_at")
    .order("score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    date: formatDate(row.created_at),
    gameId: row.game_id,
  }));
}

export async function getGameStats(
  gameId: string,
): Promise<{ best: number; plays: number }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("score")
    .eq("game_id", gameId);
  if (error) throw error;
  const scores = (data ?? []).map((row) => row.score as number);
  return {
    best: scores.length > 0 ? Math.max(...scores) : 0,
    plays: scores.length,
  };
}

export async function saveScore(entry: {
  gameId: string;
  name: string;
  score: number;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scores").insert({
    game_id: entry.gameId,
    name: entry.name,
    score: entry.score,
  });
  if (error) throw error;
}

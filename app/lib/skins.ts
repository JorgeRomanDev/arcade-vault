export type SkinId = "classic" | "neon" | "retro";
export const SKIN_IDS: SkinId[] = ["classic", "neon", "retro"];
export const DEFAULT_SKIN: SkinId = "classic";
export const SKIN_LABELS: Record<SkinId, string> = {
  classic: "Clásico",
  neon: "Neón",
  retro: "Retro",
};

const STORAGE_KEY = "av-skin";

export function loadSkin(): SkinId {
  if (typeof window === "undefined") return DEFAULT_SKIN;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return SKIN_IDS.includes(raw as SkinId) ? (raw as SkinId) : DEFAULT_SKIN;
}

export function saveSkin(skin: SkinId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, skin);
}

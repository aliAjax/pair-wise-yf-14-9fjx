import type { Pos } from "../data/types";
import type { Session } from "./types";

export function emptySession(showId: string): Session {
  return {
    showId,
    substitutions: {},
    blockingOffset: {},
    actual: {},
    loadedGel: {},
    results: {},
    notes: {},
    versionNote: "",
    pointer: 0,
    log: [],
    savedAt: 0,
  };
}

export function now(): string {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

export function clampStage(p: Pos): Pos {
  return {
    x: Math.max(-8, Math.min(8, Math.round(p.x * 10) / 10)),
    y: Math.max(-5, Math.min(8, Math.round(p.y * 10) / 10)),
  };
}

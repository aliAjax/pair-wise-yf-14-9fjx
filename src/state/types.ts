import type { Pos } from "../data/types";

// 排练会话：仅归本场排练的临时数据，与基线业务数据分离。

export type CueStatus = "pending" | "passed" | "stopped";

export interface SessionCue {
  status: CueStatus;
  reasons: string[]; // 停在当前 Cue 时的原因
  time?: string; // 本次判定时间
}

export interface LogEntry {
  time: string;
  text: string;
  tone: "info" | "ok" | "stop";
}

export interface Session {
  showId: string;
  /** roleId -> true 表示该角色当前由替补演出 */
  substitutions: Record<string, boolean>;
  /** roleId -> 走位累计偏移（米），调整走位时重算引用该角色的 Cue */
  blockingOffset: Record<string, { dx: number; dy: number }>;
  /** cueId -> roleId -> 实测落点 */
  actual: Record<string, Record<string, Pos>>;
  /** fixtureId -> 当前装片（只记录与基线不同的） */
  loadedGel: Record<string, string>;
  /** cueId -> 判定结果 */
  results: Record<string, SessionCue>;
  /** cueId -> 本场备注（演出版本备注仍在基线外，按本场保留） */
  notes: Record<string, string>;
  /** 版本备注（本场） */
  versionNote: string;
  /** GO 当前执行位（Cue 顺序下标） */
  pointer: number;
  log: LogEntry[];
  savedAt: number;
}

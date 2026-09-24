import type { Point } from "../data/types";

// 排练会话模型：只描述“本场排练”的临时状态，不改动基线业务数据。

export type Verdict = "pending" | "ok" | "fail-position" | "fail-gel" | "fail-both";

export interface CueResult {
  verdict: Verdict;
  actualMark: Point; // 实际落点（基线点 + 角色走位偏移；无角色即基线点）
  deviationM: number; // 落点偏差（米）
  actualGel: string; // 当前灯上实际色片
  reasons: string[]; // 停在当前 Cue 的原因
  executed: boolean; // 本场是否已执行通过
  stoppedAt?: number; // 停场时间戳
}

export interface Recast {
  roleId: string;
  actorId: string; // 上场的替补演员
  offset: Point; // 走位偏移（相对基线落点，米）
}

export type LogKind = "rehearsal" | "cast" | "restore" | "execute" | "stop" | "recompute" | "reset";

export interface LogEntry {
  id: string;
  t: number; // 时间戳
  kind: LogKind;
  text: string;
}

export interface RehearsalState {
  rehearsalId: string;
  title: string;
  startedAt: number;
  versionNote: string; // 演出版本备注（本场）
  recasts: Recast[];
  gelOverrides: Record<string, string>; // 灯具编号 -> 临时换装的色片
  results: Record<string, CueResult>;
  stoppedCueId: string | null; // 停在当前 Cue
  nextOrder: number; // 顺序执行下一条的 order
  logs: LogEntry[];
}

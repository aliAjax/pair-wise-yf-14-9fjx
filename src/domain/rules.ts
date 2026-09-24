import type { Cue, Fixture, Point, ShowData } from "../data/types";
import type { CueResult, Recast, Verdict } from "./types";

// 判定规则：与界面完全解耦的纯函数，可独立测试。

export const POSITION_TOLERANCE_M = 1.5; // 落点偏差阈值（米），超过即停

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function actualMarkFor(cue: Cue, recasts: Recast[]): Point {
  if (!cue.roleId) return { ...cue.expectedMark };
  const recast = recasts.find((r) => r.roleId === cue.roleId);
  if (!recast) return { ...cue.expectedMark }; // 原角色在：回到基线
  return {
    x: cue.expectedMark.x + recast.offset.x,
    y: cue.expectedMark.y + recast.offset.y,
  };
}

export function actualGelFor(fixture: Fixture, overrides: Record<string, string>): string {
  return overrides[fixture.id] ?? fixture.loadedGel;
}

export interface EvalContext {
  show: ShowData;
  recasts: Recast[];
  gelOverrides: Record<string, string>;
}

// 执行 Cue 前的接光判定。无角色/未换角的 Cue 走位偏差恒为 0（原演员走基线）。
export function evaluateCue(cue: Cue, ctx: EvalContext): Omit<CueResult, "executed" | "stoppedAt"> {
  const fixture = ctx.show.fixtures.find((f) => f.id === cue.fixtureId);
  const actualMark = actualMarkFor(cue, ctx.recasts);
  const deviation = round2(distance(actualMark, cue.expectedMark));
  const actualGel = fixture ? actualGelFor(fixture, ctx.gelOverrides) : cue.expectedGel;

  const recast = cue.roleId ? ctx.recasts.find((r) => r.roleId === cue.roleId) : undefined;
  const needsPositionCheck = Boolean(recast);
  const positionBad = needsPositionCheck && deviation > POSITION_TOLERANCE_M;
  const gelBad = actualGel !== cue.expectedGel;

  const reasons: string[] = [];
  if (positionBad) {
    reasons.push(
      `落点偏差 ${deviation}m，超过 ${POSITION_TOLERANCE_M}m 容差（实际 (${round2(actualMark.x)}, ${round2(actualMark.y)})，基准 (${cue.expectedMark.x}, ${cue.expectedMark.y})）`
    );
  }
  if (gelBad) {
    const want = ctx.show.gels[cue.expectedGel]?.name ?? cue.expectedGel;
    const got = ctx.show.gels[actualGel]?.name ?? actualGel;
    reasons.push(`色片不符：要求 ${cue.expectedGel} ${want}，实际 ${actualGel} ${got}`);
  }

  let verdict: Verdict = "pending";
  if (positionBad && gelBad) verdict = "fail-both";
  else if (positionBad) verdict = "fail-position";
  else if (gelBad) verdict = "fail-gel";
  else verdict = "ok";

  return { verdict, actualMark, deviationM: deviation, actualGel, reasons };
}

// 重算所有受影响的 Cue 判定；保留执行/停场标记（执行通过的不会因后续调整变未执行）。
export function recomputeResults(
  show: ShowData,
  recasts: Recast[],
  gelOverrides: Record<string, string>,
  previous: Record<string, CueResult>
): Record<string, CueResult> {
  const next: Record<string, CueResult> = {};
  for (const cue of show.cues) {
    const eval_ = evaluateCue(cue, { show, recasts, gelOverrides });
    const prev = previous[cue.id];
    next[cue.id] = {
      ...eval_,
      executed: prev?.executed ?? false,
      stoppedAt: prev?.stoppedAt,
    };
  }
  return next;
}

// 走位/色片调整后，原来停住的 Cue 若已恢复合格则自动放行；仍不合格则继续停。
export function resolveStop(
  results: Record<string, CueResult>,
  cues: Cue[]
): { stoppedCueId: string | null; released: Cue[]; stillBlocked: Cue[] } {
  for (const cue of cues) {
    const r = results[cue.id];
    if (r?.stoppedAt && r.verdict !== "ok") {
      return { stoppedCueId: cue.id, released: [], stillBlocked: [cue] };
    }
  }
  const released = cues.filter((c) => results[c.id]?.stoppedAt && results[c.id].verdict === "ok");
  return { stoppedCueId: null, released, stillBlocked: [] };
}

export function verdictText(v: Verdict): string {
  switch (v) {
    case "ok":
      return "可接光";
    case "fail-position":
      return "落点超标";
    case "fail-gel":
      return "色片不符";
    case "fail-both":
      return "落点+色片";
    default:
      return "未判定";
  }
}

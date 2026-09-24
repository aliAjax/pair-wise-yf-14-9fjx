import type { Cue, Pos, Show } from "../data/types";
import { DEVIATION_LIMIT_M } from "../data/baseline";
import type { Session, SessionCue } from "../state/types";

// 判定层：全部为纯函数，不依赖 React、不读写存储。
// 业务规则集中在这里，界面和数据变更不需要改动判定逻辑。

export const distance = (a: Pos, b: Pos) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const round1 = (n: number) => Math.round(n * 10) / 10;

/** 走位调整后的期望落点 = 基线走位 + 该角色本场累计偏移 */
export function expectedMark(
  cue: Cue,
  roleId: string,
  offset?: { dx: number; dy: number }
): Pos {
  const base = cue.roles.find((r) => r.roleId === roleId)!.mark;
  return { x: base.x + (offset?.dx ?? 0), y: base.y + (offset?.dy ?? 0) };
}

/** 灯具在当前排练会话里实际装载的色片 */
export function loadedGelFor(
  show: Show,
  session: Session,
  fixtureId: string
): string {
  return (
    session.loadedGel[fixtureId] ??
    show.fixtures.find((f) => f.id === fixtureId)!.gel
  );
}

export interface CheckFailure {
  kind: "position" | "gel";
  message: string;
}

/**
 * 核心判定：执行某 Cue 时，只有两种情况不通过——
 * 1) 任一演员实际落点与期望落点偏差 > 1.5 米；
 * 2) Cue 要求的色片与灯具当前装片不符。
 * 氛围 Cue（无角色落点、无色片变更要求）直接通过。
 */
export function evaluateCue(
  show: Show,
  session: Session,
  cue: Cue
): { ok: boolean; failures: CheckFailure[] } {
  const failures: CheckFailure[] = [];

  for (const cr of cue.roles) {
    const expected = expectedMark(cue, cr.roleId, session.blockingOffset[cr.roleId]);
    const actual = session.actual[cue.id]?.[cr.roleId] ?? expected;
    const dev = distance(actual, expected);
    if (dev > DEVIATION_LIMIT_M) {
      const role = show.roles.find((r) => r.id === cr.roleId);
      const sub = session.substitutions[cr.roleId];
      const actor = sub
        ? `${role?.understudy}（替 ${role?.name}）`
        : (role?.name ?? cr.roleId);
      failures.push({
        kind: "position",
        message: `${actor} 落点偏差 ${round1(dev)}m（限值 ${DEVIATION_LIMIT_M}m）`,
      });
    }
  }

  for (const fs of cue.fixtures) {
    if (!fs.gel) continue; // Cue 未指定色片则沿用当前装片，不判定
    const loaded = loadedGelFor(show, session, fs.fixtureId);
    if (loaded !== fs.gel) {
      const fixture = show.fixtures.find((f) => f.id === fs.fixtureId);
      const wanted = show.gels.find((g) => g.code === fs.gel);
      const got = show.gels.find((g) => g.code === loaded);
      failures.push({
        kind: "gel",
        message: `${fixture?.id} 色片不符：要求 ${fs.gel} ${wanted?.name ?? ""}，当前 ${loaded} ${got?.name ?? ""}`,
      });
    }
  }

  return { ok: failures.length === 0, failures };
}

/** 引用某角色的 Cue（走位调整 / 恢复原角时重算范围） */
export function cuesReferencingRole(show: Show, roleId: string): Cue[] {
  return show.cues
    .filter((c) => c.roles.some((r) => r.roleId === roleId))
    .sort((a, b) => a.order - b.order);
}

export function roleActorName(show: Show, session: Session, roleId: string): string {
  const role = show.roles.find((r) => r.id === roleId);
  if (!role) return roleId;
  return session.substitutions[roleId] ? role.understudy : role.name;
}

export function resultStatus(session: Session, cueId: string): SessionCue["status"] {
  return session.results[cueId]?.status ?? "pending";
}

export function sortedCues(show: Show): Cue[] {
  return [...show.cues].sort((a, b) => a.order - b.order);
}

/** GO：从当前执行位顺序往下，遇不通过则停在该 Cue；无关 Cue 不受影响 */
export function nextStop(
  show: Show,
  session: Session,
  pointer: number
): { passed: string[]; stoppedAt: string | null } {
  const cues = sortedCues(show);
  const passed: string[] = [];
  for (const cue of cues.slice(pointer)) {
    const { ok } = evaluateCue(show, session, cue);
    if (!ok) return { passed, stoppedAt: cue.id };
    passed.push(cue.id);
  }
  return { passed, stoppedAt: null };
}

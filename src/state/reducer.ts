import type { Pos, Show } from "../data/types";
import type { LogEntry, Session } from "./types";
import { emptySession, now } from "./session";
import {
  cuesReferencingRole,
  evaluateCue,
  sortedCues,
} from "../domain/rules";

// 状态层：维护"本场排练"会话；基线 Show 只读传入，永不修改。

export type Action =
  | { type: "GO" }
  | { type: "RUN_CUE"; cueId: string }
  | { type: "RESET_CUE"; cueId: string }
  | { type: "SET_SUBSTITUTE"; roleId: string; on: boolean }
  | { type: "NUDGE_BLOCKING"; roleId: string; dx: number; dy: number }
  | { type: "RESET_BLOCKING"; roleId: string }
  | { type: "SET_ACTUAL"; cueId: string; roleId: string; pos: Pos }
  | { type: "SET_LOADED_GEL"; fixtureId: string; gel: string }
  | { type: "SET_VERSION_NOTE"; text: string }
  | { type: "SET_CUE_NOTE"; cueId: string; text: string }
  | { type: "SET_POINTER"; index: number }
  | { type: "END_REHEARSAL" };

function log(session: Session, text: string, tone: LogEntry["tone"] = "info"): Session {
  const entry: LogEntry = { time: now(), text, tone };
  return { ...session, log: [entry, ...session.log].slice(0, 100) };
}

/** 重置某角色相关 Cue 的本场判定（保留实测落点，状态回待确认） */
function resetRoleCueResults(session: Session, cueIds: string[]): Session {
  const results = { ...session.results };
  for (const id of cueIds) delete results[id];
  return { ...session, results };
}

function judgeCue(show: Show, session: Session, cueId: string): Session {
  const cue = show.cues.find((c) => c.id === cueId)!;
  const { ok, failures } = evaluateCue(show, session, cue);
  const next: Session = {
    ...session,
    results: {
      ...session.results,
      [cueId]: {
        status: ok ? "passed" : "stopped",
        reasons: failures.map((f) => f.message),
        time: now(),
      },
    },
  };
  return log(
    next,
    ok
      ? `${cue.code} 确认通过，追光可接续`
      : `${cue.code} 停止执行：${failures.map((f) => f.message).join("；")}`,
    ok ? "ok" : "stop"
  );
}

export function reducer(show: Show) {
  return function reduce(session: Session, action: Action): Session {
    switch (action.type) {
      case "GO": {
        const cues = sortedCues(show);
        let s = session;
        let i = s.pointer;
        // 顺序执行：通过的连续通过，第一个不通过的 Cue 停住
        while (i < cues.length) {
          const cue = cues[i];
          s = judgeCue(show, s, cue.id);
          if (s.results[cue.id]?.status === "stopped") {
            return { ...s, pointer: i }; // 停在当前 Cue，执行位不前进
          }
          i += 1;
        }
        s = { ...s, pointer: cues.length };
        return log(s, "本场 Cue 全部执行完毕", "ok");
      }

      case "RUN_CUE": {
        // 无关 Cue 照常执行：单个执行不移动 GO 执行位
        return judgeCue(show, session, action.cueId);
      }

      case "RESET_CUE": {
        const results = { ...session.results };
        delete results[action.cueId];
        const cue = show.cues.find((c) => c.id === action.cueId)!;
        return log({ ...session, results }, `${cue.code} 清除本场判定，回到待确认`);
      }

      case "SET_SUBSTITUTE": {
        const role = show.roles.find((r) => r.id === action.roleId)!;
        const cueIds = cuesReferencingRole(show, role.id).map((c) => c.id);
        let s: Session = {
          ...session,
          substitutions: { ...session.substitutions, [role.id]: action.on },
        };
        // 换角/恢复只影响引用该角色的 Cue：清除其实测落点与判定，等待重新确认
        const actual = { ...s.actual };
        for (const id of cueIds) delete actual[id];
        s = { ...resetRoleCueResults({ ...s, actual }, cueIds) } as Session;
        // 恢复原角色 -> 该角色回到基线（走位偏移一并清除）
        if (!action.on) {
          const blockingOffset = { ...s.blockingOffset };
          delete blockingOffset[role.id];
          s = { ...s, blockingOffset };
        }
        return log(
          s,
          action.on
            ? `临时换角：${role.understudy} 接替 ${role.name}，相关 ${cueIds.length} 个 Cue 待确认`
            : `恢复原角色：${role.name} 回到基线，相关 Cue 判定已清空`,
          action.on ? "info" : "ok"
        );
      }

      case "NUDGE_BLOCKING": {
        const role = show.roles.find((r) => r.id === action.roleId)!;
        const cur = session.blockingOffset[role.id] ?? { dx: 0, dy: 0 };
        const nextOffset = {
          dx: Math.max(-4, Math.min(4, Math.round((cur.dx + action.dx) * 10) / 10)),
          dy: Math.max(-4, Math.min(4, Math.round((cur.dy + action.dy) * 10) / 10)),
        };
        let s: Session = {
          ...session,
          blockingOffset: { ...session.blockingOffset, [role.id]: nextOffset },
        };
        // 调整走位：重算引用该角色的 Cue（清判定，保留实测落点待重新比对），
        // 其他 Cue 顺序和灯位不变
        const cueIds = cuesReferencingRole(show, role.id).map((c) => c.id);
        s = resetRoleCueResults(s, cueIds);
        return log(
          s,
          `调整 ${role.name} 走位 (Δx ${nextOffset.dx}, Δy ${nextOffset.dy})m，重算 ${cueIds.length} 个引用 Cue；其余 Cue 顺序与灯位不变`
        );
      }

      case "RESET_BLOCKING": {
        const role = show.roles.find((r) => r.id === action.roleId)!;
        const blockingOffset = { ...session.blockingOffset };
        delete blockingOffset[role.id];
        let s: Session = { ...session, blockingOffset };
        const cueIds = cuesReferencingRole(show, role.id).map((c) => c.id);
        s = resetRoleCueResults(s, cueIds);
        return log(s, `${role.name} 走位恢复基线，重算 ${cueIds.length} 个引用 Cue`);
      }

      case "SET_ACTUAL": {
        const pos: Pos = {
          x: Math.round(action.pos.x * 10) / 10,
          y: Math.round(action.pos.y * 10) / 10,
        };
        return {
          ...session,
          actual: {
            ...session.actual,
            [action.cueId]: {
              ...(session.actual[action.cueId] ?? {}),
              [action.roleId]: pos,
            },
          },
        };
      }

      case "SET_LOADED_GEL": {
        const fixture = show.fixtures.find((f) => f.id === action.fixtureId)!;
        const loadedGel = { ...session.loadedGel };
        if (action.gel === fixture.gel) delete loadedGel[fixture.id];
        else loadedGel[fixture.id] = action.gel;
        return log(session, `${fixture.id} 当前装片改为 ${action.gel}`);
      }

      case "SET_VERSION_NOTE":
        return { ...session, versionNote: action.text };

      case "SET_CUE_NOTE":
        return {
          ...session,
          notes: { ...session.notes, [action.cueId]: action.text },
        };

      case "SET_POINTER":
        return { ...session, pointer: action.index };

      case "END_REHEARSAL": {
        const fresh = emptySession(show.id);
        return log(fresh, "本场排练结束，临时换角与判定记录已清除，回到基线", "ok");
      }

      default:
        return session;
    }
  };
}

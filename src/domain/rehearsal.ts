import type { ShowData } from "../data/types";
import { DEFAULT_SUBSTITUTE_OFFSET } from "../data/seed";
import { recomputeResults, resolveStop } from "./rules";
import type { CueResult, LogEntry, LogKind, RehearsalState } from "./types";

// 会话状态机：所有换角/判定结果都只活在排练状态里，基线数据不被修改。

export type Action =
  | { type: "newRehearsal"; rehearsalId: string; title: string; t: number }
  | { type: "setNote"; note: string }
  | { type: "cast"; roleId: string; actorId: string; t: number }
  | { type: "restoreRole"; roleId: string; t: number }
  | { type: "setOffset"; roleId: string; offset: { x: number; y: number }; t: number; silent?: boolean }
  | { type: "setGel"; fixtureId: string; gelCode: string | null; t: number }
  | { type: "executeOne"; cueId: string; t: number }
  | { type: "step"; t: number }
  | { type: "runAll"; t: number }
  | { type: "resetRun"; t: number };

const MAX_LOGS = 120;

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function log(state: RehearsalState, kind: LogKind, text: string): LogEntry[] {
  return [{ id: uid(), t: Date.now(), kind, text }, ...state.logs].slice(0, MAX_LOGS);
}

export function createRehearsal(rehearsalId: string, title: string, t: number, show: ShowData): RehearsalState {
  const state: RehearsalState = {
    rehearsalId,
    title,
    startedAt: t,
    versionNote: "",
    recasts: [],
    gelOverrides: {},
    results: {},
    stoppedCueId: null,
    nextOrder: Math.min(...show.cues.map((c) => c.order)),
    logs: [],
  };
  state.results = recomputeResults(show, [], {}, {});
  state.logs = [
    { id: uid(), t: Date.now(), kind: "rehearsal", text: `本场排练「${title}」开始，灯位与 Cue 顺序按基线载入` },
  ];
  return state;
}

// 走位 / 换片调整后重算，并处理停场 Cue 的自动放行（仍不合格则继续停）。
// silent 用于拖图过程中的连续重算：判定照算、停场照放行，但不刷日志。
function afterRecompute(
  state: RehearsalState,
  show: ShowData,
  kind: LogKind,
  text: string,
  silent = false
): RehearsalState {
  const results = recomputeResults(show, state.recasts, state.gelOverrides, state.results);
  const stop = resolveStop(results, show.cues);
  let logs = state.logs;
  if (stop.released.length) {
    for (const cue of stop.released) {
      results[cue.id] = { ...results[cue.id], stoppedAt: undefined };
    }
    if (!silent) {
      const releasedLog: LogEntry = {
        id: uid(),
        t: Date.now(),
        kind: "recompute",
        text: `${stop.released.map((c) => c.id).join("、")} 重算后达标，停场解除，可继续接光`,
      };
      logs = [releasedLog, ...logs].slice(0, MAX_LOGS);
    }
  }
  return {
    ...state,
    results,
    stoppedCueId: stop.stillBlocked.length ? stop.stillBlocked[0].id : null,
    logs: silent
      ? logs
      : [{ id: uid(), t: Date.now(), kind, text }, ...logs].slice(0, MAX_LOGS),
  };
}

// 执行单条 Cue：合格标记已执行；不合格停在当前 Cue（其他 Cue 不受影响、照常可执行）。
function fireCue(state: RehearsalState, cueId: string, t: number, show: ShowData): RehearsalState {
  const cue = show.cues.find((c) => c.id === cueId);
  if (!cue) return state;
  const results = recomputeResults(show, state.recasts, state.gelOverrides, state.results);
  const current = results[cueId];
  if (!current || current.executed) return { ...state, results };

  if (current.verdict === "ok") {
    results[cueId] = { ...current, executed: true };
    return {
      ...state,
      results,
      // 不推进顺序指针：手动单条执行（含停场期间照常执行的无关 Cue）不影响顺序
      logs: log(state, "execute", `${cue.id} ${cue.name} 执行通过（偏差 ${current.deviationM}m，色片 ${current.actualGel}）`),
    };
  }
  results[cueId] = { ...current, stoppedAt: t };
  return {
    ...state,
    results,
    stoppedCueId: cueId,
    logs: log(state, "stop", `${cue.id} ${cue.name} 停场：${current.reasons.join("；")}`),
  };
}

export function reducer(show: ShowData) {
  return (state: RehearsalState, action: Action): RehearsalState => {
    switch (action.type) {
      case "newRehearsal":
        return createRehearsal(action.rehearsalId, action.title, action.t, show);

      case "setNote":
        return { ...state, versionNote: action.note };

      case "cast": {
        const role = show.roles.find((r) => r.id === action.roleId);
        const actor = show.actors.find((a) => a.id === action.actorId);
        if (!role || !actor) return state;
        const offset = DEFAULT_SUBSTITUTE_OFFSET[role.id] ?? { x: 0, y: 0 };
        const recasts = [
          ...state.recasts.filter((r) => r.roleId !== action.roleId),
          { roleId: role.id, actorId: actor.id, offset },
        ];
        return afterRecompute(
          { ...state, recasts },
          show,
          "cast",
          `${role.name} 临时换角：${actor.name} 上场，引用该角色的 Cue 已按替补走位重新判定`
        );
      }

      case "restoreRole": {
        const role = show.roles.find((r) => r.id === action.roleId);
        if (!role) return state;
        const recasts = state.recasts.filter((r) => r.roleId !== action.roleId);
        return afterRecompute(
          { ...state, recasts },
          show,
          "restore",
          `${role.name} 恢复原演员，相关 Cue 走位判定回到基线`
        );
      }

      case "setOffset": {
        const recast = state.recasts.find((r) => r.roleId === action.roleId);
        const role = show.roles.find((r) => r.id === action.roleId);
        if (!recast || !role) return state;
        const recasts = state.recasts.map((r) =>
          r.roleId === action.roleId ? { ...r, offset: action.offset } : r
        );
        const cueCount = show.cues.filter((c) => c.roleId === action.roleId).length;
        return afterRecompute(
          { ...state, recasts },
          show,
          "recompute",
          `调整 ${role.name} 走位偏移至 (${action.offset.x}, ${action.offset.y})m，重算引用该角色的 ${cueCount} 条 Cue；其他 Cue 顺序与灯位不变`,
          action.silent
        );
      }

      case "setGel": {
        const fixture = show.fixtures.find((f) => f.id === action.fixtureId);
        if (!fixture) return state;
        const gelOverrides = { ...state.gelOverrides };
        if (action.gelCode === null) delete gelOverrides[fixture.id];
        else gelOverrides[fixture.id] = action.gelCode;
        const gel = action.gelCode ? show.gels[action.gelCode] : null;
        const cueCount = show.cues.filter((c) => c.fixtureId === fixture.id).length;
        return afterRecompute(
          { ...state, gelOverrides },
          show,
          "recompute",
          `${fixture.id} ${fixture.name} ${
            gel ? `临时换装 ${gel.code} ${gel.name}` : "拆片恢复基线装片"
          }，重算该灯具的 ${cueCount} 条 Cue；灯位不变`
        );
      }

      case "executeOne":
        return fireCue(state, action.cueId, action.t, show);

      case "step": {
        const cue = show.cues.find((c) => c.order === state.nextOrder);
        if (!cue) return state;
        // 该 Cue 已被手动单条执行过：顺序指针直接跳过
        if (state.results[cue.id]?.executed) {
          return { ...state, nextOrder: cue.order + 1 };
        }
        const fired = fireCue(state, cue.id, action.t, show);
        // 顺序流：只有执行通过才推进；停场则指针停在当前 Cue
        return fired.results[cue.id]?.executed
          ? { ...fired, nextOrder: cue.order + 1 }
          : fired;
      }

      case "runAll": {
        // 顺序执行：从当前位置依次打，遇到停场 Cue 停在当前 Cue；无关 Cue 仍可手动照常执行。
        let current = state;
        const ordered = [...show.cues].sort((a, b) => a.order - b.order);
        for (const cue of ordered) {
          if (cue.order < current.nextOrder) continue;
          const before: CueResult | undefined = recomputeResults(
            show,
            current.recasts,
            current.gelOverrides,
            current.results
          )[cue.id];
          if (before?.executed) {
            current = { ...current, nextOrder: cue.order + 1 };
            continue;
          }
          current = fireCue(current, cue.id, action.t, show);
          const after = current.results[cue.id];
          if (after && !after.executed) break; // 停在当前 Cue
          current = { ...current, nextOrder: cue.order + 1 };
        }
        return current;
      }

      case "resetRun":
        return {
          ...state,
          results: recomputeResults(show, state.recasts, state.gelOverrides, {}),
          stoppedCueId: null,
          nextOrder: Math.min(...show.cues.map((c) => c.order)),
          logs: log(state, "reset", "本场执行记录已重置（换角与走位保留），从第一条 Cue 重新走"),
        };

      default:
        return state;
    }
  };
}

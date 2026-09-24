import type { ShowData } from "../data/types";
import { recomputeResults } from "../domain/rules";
import type { RehearsalState } from "../domain/types";

// 持久化层：只保存“本场排练记录”。业务基线永远来自 data 层，重新打开后合并基线重算判定。

const STORAGE_KEY = "followspot-rehearsal-v1";

function isStateLike(v: unknown): v is RehearsalState {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.rehearsalId === "string" &&
    Array.isArray(s.logs) &&
    typeof s.results === "object" &&
    Array.isArray(s.recasts)
  );
}

export const rehearsalRepo = {
  load(show: ShowData): RehearsalState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as RehearsalState;
      if (!isStateLike(parsed)) return null;
      // 判定不照单全收：用当前基线 + 保存的换角/走位/换片重算判定，
      // 但保留本场的执行/停场过程标记，避免规则或基线数据漂移。
      const savedResults = parsed.results ?? {};
      const results = recomputeResults(show, parsed.recasts ?? [], parsed.gelOverrides ?? {}, savedResults);
      // 上次停场的 Cue 若重算后已达标，则不再拦截
      const stoppedCueId =
        parsed.stoppedCueId && results[parsed.stoppedCueId]?.verdict !== "ok"
          ? parsed.stoppedCueId
          : null;
      return {
        ...parsed,
        gelOverrides: parsed.gelOverrides ?? {},
        stoppedCueId,
        results,
        logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      };
    } catch {
      return null;
    }
  },
  save(state: RehearsalState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // 存储不可用时静默降级为仅内存
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};

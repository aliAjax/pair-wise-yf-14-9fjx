import { useEffect, useMemo, useReducer } from "react";
import type { Show } from "../data/types";
import { emptySession } from "./session";
import type { Session } from "./types";
import { reducer } from "./reducer";

const STORAGE_KEY = "cue-rehearsal-session-v1";

function load(show: Show): Session {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySession(show.id);
    const parsed = JSON.parse(raw) as Session;
    if (parsed.showId !== show.id) return emptySession(show.id);
    // 与基线结构合并，基线新增字段不会导致旧记录崩溃
    return { ...emptySession(show.id), ...parsed };
  } catch {
    return emptySession(show.id);
  }
}

/** 本场排练会话状态：页面重开后从 localStorage 恢复；基线数据不持久化、不修改 */
export function useRehearsal(show: Show) {
  const reduce = useMemo(() => reducer(show), [show]);
  const [session, dispatch] = useReducer(reduce, show, load);

  useEffect(() => {
    const toSave: Session = { ...session, savedAt: Date.now() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // 存储不可用时仅影响重开恢复，不阻塞排练操作
    }
  }, [session]);

  return { session, dispatch };
}

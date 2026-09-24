import { useEffect, useMemo, useReducer } from "react";
import { SHOW } from "../data/seed";
import { createRehearsal, reducer, type Action } from "./rehearsal";
import { rehearsalRepo } from "./repository";
import type { RehearsalState } from "./types";

// 状态装配：业务数据 SHOW 与排练状态分离；页面重开后恢复当次排练记录。
export function useRehearsal(): {
  show: typeof SHOW;
  state: RehearsalState;
  dispatch: React.Dispatch<Action>;
  restored: boolean;
} {
  const { initial, restored } = useMemo(() => {
    const saved = rehearsalRepo.load(SHOW);
    if (saved) return { initial: saved, restored: true };
    const now = new Date();
    return {
      initial: createRehearsal(
        "RH-" + now.getTime().toString(36).slice(-6),
        "排练 " + now.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
        now.getTime(),
        SHOW
      ),
      restored: false,
    };
    // 仅初始化时读取一次存档
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [state, dispatch] = useReducer(reducer(SHOW), initial);

  useEffect(() => {
    rehearsalRepo.save(state);
  }, [state]);

  return { show: SHOW, state, dispatch, restored };
}

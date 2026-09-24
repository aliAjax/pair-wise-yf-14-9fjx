import type { ShowData } from "../data/types";
import type { RehearsalState } from "../domain/types";

// 顶部控制条：本场排练信息、顺序执行、停场横幅、指标；结果只归本场。

interface Props {
  show: ShowData;
  state: RehearsalState;
  restored: boolean;
  onNote: (note: string) => void;
  onStep: () => void;
  onRunAll: () => void;
  onResetRun: () => void;
  onEnd: () => void;
}

function clock(ts: number): string {
  return new Date(ts).toLocaleTimeString("zh-CN", { hour12: false });
}

export default function ControlBar({ show, state, restored, onNote, onStep, onRunAll, onResetRun, onEnd }: Props) {
  const ordered = [...show.cues].sort((a, b) => a.order - b.order);
  const doneCount = ordered.filter((c) => state.results[c.id]?.executed).length;
  const pendingFocus = show.cues
    .filter((c) => c.roleId && state.recasts.some((r) => r.roleId === c.roleId))
    .filter((c) => state.results[c.id]?.verdict !== "ok").length;
  const stoppedCue = ordered.find((c) => c.id === state.stoppedCueId);
  const stoppedResult = stoppedCue ? state.results[stoppedCue.id] : null;
  const nextCue = ordered.find((c) => c.order === state.nextOrder);
  const currentLabel = stoppedCue
    ? `停在 ${stoppedCue.id}`
    : doneCount >= ordered.length
      ? "本场 Cue 已走完"
      : nextCue
        ? `待执行 ${nextCue.id}`
        : "—";

  const metrics = [
    { label: "灯具数量", value: show.fixtures.length },
    { label: "Cue 数量", value: show.cues.length },
    { label: "当前场景", value: currentLabel, raw: true },
    { label: "待确认焦点", value: pendingFocus },
  ];

  return (
    <header className="topbar">
      <div className="title-row">
        <div>
          <p className="kicker">hxyfront-62002 · 灯光控制台</p>
          <h1>{show.name} · Cue 表</h1>
        </div>
        <div className="session">
          <div>
            <strong>{state.title}</strong>
            <span>
              {state.rehearsalId} · {clock(state.startedAt)} 开始
              {restored && <b className="restored">页面重开，已恢复本场记录</b>}
            </span>
          </div>
          <button className="ghost" onClick={onEnd}>结束排练（回基线）</button>
        </div>
      </div>

      <div className="run-row">
        <div className="run-controls">
          <button className="primary" onClick={onStep} disabled={!!stoppedCue}>
            顺序执行下一条
          </button>
          <button onClick={onRunAll} disabled={!!stoppedCue}>
            连续执行到停场
          </button>
          <button className="ghost" onClick={onResetRun}>重置执行记录</button>
        </div>
        <label className="note-input">
          演出版本备注
          <input value={state.versionNote} onChange={(e) => onNote(e.target.value)} placeholder="如：版本B，谢幕全台面光80%" />
        </label>
      </div>

      {stoppedCue && stoppedResult && (
        <div className="stop-banner" role="alert">
          <b>⛔ 停在 {stoppedCue.id} {stoppedCue.name}</b>
          <span>{stoppedResult.reasons.join("；")}</span>
          <em>无关 Cue 照常执行；调整走位/色片重算达标后自动放行，再点“顺序执行下一条”继续。</em>
        </div>
      )}

      <div className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            {m.raw ? <strong className="raw">{m.value}</strong> : <strong>{m.value}</strong>}
          </article>
        ))}
      </div>
    </header>
  );
}

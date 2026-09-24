import type { LogEntry } from "../domain/types";

// 排练日志：本场换角、停场、重算与执行记录；页面重开后随会话一起恢复。

const KIND_LABEL: Record<LogEntry["kind"], string> = {
  rehearsal: "排练",
  cast: "换角",
  restore: "恢复",
  execute: "执行",
  stop: "停场",
  recompute: "重算",
  reset: "重置",
};

function clock(t: number): string {
  const d = new Date(t);
  return d.toLocaleTimeString("zh-CN", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0").slice(0, 2);
}

export default function RehearsalLog({ logs }: { logs: LogEntry[] }) {
  return (
    <div className="log-panel">
      <div className="log-head">
        <h3>本场排练记录</h3>
        <span>{logs.length} 条 · 仅归本场，结束排练清空</span>
      </div>
      <ul className="log-list">
        {logs.map((entry) => (
          <li key={entry.id} className={"log-item kind-" + entry.kind}>
            <time>{clock(entry.t)}</time>
            <span className="log-kind">{KIND_LABEL[entry.kind]}</span>
            <span className="log-text">{entry.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

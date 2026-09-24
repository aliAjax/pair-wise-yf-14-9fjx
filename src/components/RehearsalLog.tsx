import type { Session } from "../state/types";

export function RehearsalLog({ session }: { session: Session }) {
  const saved = session.savedAt
    ? new Date(session.savedAt).toLocaleString("zh-CN", { hour12: false })
    : "尚未保存";
  return (
    <section className="panel log-panel">
      <div className="heading">
        <div>
          <p className="side-label">本场排练记录</p>
          <h2>执行日志</h2>
        </div>
        <span className="muted small">自动保存：{saved}</span>
      </div>
      {session.log.length === 0 ? (
        <p className="muted">暂无记录。换角、执行 Cue、调整走位都会记入本场排练，重开页面仍保留。</p>
      ) : (
        <ul className="log-list">
          {session.log.map((entry, i) => (
            <li key={`${entry.time}-${i}`} className={`tone-${entry.tone}`}>
              <time>{entry.time}</time>
              <span>{entry.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

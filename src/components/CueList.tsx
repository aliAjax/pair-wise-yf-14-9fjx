import type { Show } from "../data/types";
import type { Session } from "../state/types";
import { resultStatus, sortedCues } from "../domain/rules";

interface Props {
  show: Show;
  session: Session;
  selectedId: string;
  onSelect: (cueId: string) => void;
  onRun: (cueId: string) => void;
  onReset: (cueId: string) => void;
  onGo: () => void;
}

/** Cue 列表：触发顺序、GO 执行位、每个 Cue 的本场判定与停止原因 */
export function CueList({ show, session, selectedId, onSelect, onRun, onReset, onGo }: Props) {
  const cues = sortedCues(show);
  const atEnd = session.pointer >= cues.length;

  return (
    <section className="panel cue-panel">
      <div className="heading">
        <div>
          <p>Cue 触发顺序</p>
          <h2>Cue 列表</h2>
        </div>
        <button className="primary go-btn" onClick={onGo}>
          ▶ GO{atEnd ? "（已到底）" : ` · ${cues[session.pointer]?.code ?? ""}`}
        </button>
      </div>

      <div className="cue-items">
        {cues.map((cue, i) => {
          const status = resultStatus(session, cue.id);
          const r = session.results[cue.id];
          const selected = cue.id === selectedId;
          const isPointer = i === session.pointer && !atEnd;
          const subbedRoles = cue.roles.filter((cr) => session.substitutions[cr.roleId]);
          const offsetRoles = cue.roles.filter((cr) => session.blockingOffset[cr.roleId]);
          return (
            <article
              key={cue.id}
              className={`cue-item ${selected ? "selected" : ""} ${status} ${isPointer ? "pointer" : ""}`}
              onClick={() => onSelect(cue.id)}
            >
              <div className="ci-top">
                <span className="ci-order">{String(cue.order).padStart(2, "0")}</span>
                <b className="ci-code">{cue.code}</b>
                <span className="ci-name">{cue.name}</span>
                <span className={`ci-status ${status}`}>
                  {status === "passed" ? "✓ 通过" : status === "stopped" ? "⛔ 停止" : "待确认"}
                </span>
              </div>
              <div className="ci-meta">
                <span>{cue.fixtures.length} 灯</span>
                {cue.roles.length > 0 && <span>{cue.roles.length} 角色落点</span>}
                {subbedRoles.length > 0 && (
                  <span className="tag-sub">临时换角 ×{subbedRoles.length}</span>
                )}
                {offsetRoles.length > 0 && (
                  <span className="tag-offset">走位已调整 ×{offsetRoles.length}</span>
                )}
                {isPointer && <span className="tag-pointer">GO 执行位</span>}
              </div>
              {status === "stopped" && (
                <ul className="ci-reasons">
                  {r?.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
              {status === "passed" && r?.time && <div className="ci-time">确认时间 {r.time}</div>}
              <div className="ci-actions" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onRun(cue.id)}>执行本 Cue</button>
                {status !== "pending" && (
                  <button onClick={() => onReset(cue.id)}>清除判定</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="hint">GO 从执行位顺序触发，遇到落点偏差 &gt; 1.5m 或色片不符即停在该 Cue；其他 Cue 可点「执行本 Cue」照常确认。</p>
    </section>
  );
}

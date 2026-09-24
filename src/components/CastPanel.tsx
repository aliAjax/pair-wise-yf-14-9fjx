import type { Show } from "../data/types";
import type { Session } from "../state/types";
import { cuesReferencingRole, round1 } from "../domain/rules";

interface Props {
  show: Show;
  session: Session;
  onSubstitute: (roleId: string, on: boolean) => void;
  onNudge: (roleId: string, dx: number, dy: number) => void;
  onResetBlocking: (roleId: string) => void;
}

/** 临时换角 + 走位调整：结果只归本场排练，恢复原角色回到基线 */
export function CastPanel({ show, session, onSubstitute, onNudge, onResetBlocking }: Props) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>本场排练 · 临时换角</p>
          <h2>角色与替补</h2>
        </div>
      </div>
      <div className="role-cards">
        {show.roles.map((role) => {
          const subbed = !!session.substitutions[role.id];
          const off = session.blockingOffset[role.id];
          const refCount = cuesReferencingRole(show, role.id).length;
          return (
            <div key={role.id} className={`role-card ${subbed ? "subbed" : ""}`}>
              <div className="rc-head">
                <i className="role-dot" style={{ background: role.color }} />
                <div>
                  <b>{role.name}</b>
                  <span className="muted">替补：{role.understudy} · 引用 {refCount} 个 Cue</span>
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={subbed}
                  onChange={(e) => onSubstitute(role.id, e.target.checked)}
                />
                <span>{subbed ? `替补 ${role.understudy} 演出中` : "原角色演出"}</span>
              </label>

              <div className="blocking">
                <span className="muted">走位调整（米）</span>
                <div className="nudge-row">
                  <span>Δx</span>
                  <button onClick={() => onNudge(role.id, -0.5, 0)}>−0.5</button>
                  <b>{round1(off?.dx ?? 0)}</b>
                  <button onClick={() => onNudge(role.id, 0.5, 0)}>＋0.5</button>
                </div>
                <div className="nudge-row">
                  <span>Δy</span>
                  <button onClick={() => onNudge(role.id, 0, -0.5)}>−0.5</button>
                  <b>{round1(off?.dy ?? 0)}</b>
                  <button onClick={() => onNudge(role.id, 0, 0.5)}>＋0.5</button>
                </div>
                <button
                  className="ghost"
                  disabled={!off || (off.dx === 0 && off.dy === 0)}
                  onClick={() => onResetBlocking(role.id)}
                >
                  走位恢复基线
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="hint">
        换角/调走位只重算引用该角色的 Cue，其他 Cue 顺序和灯位不变；关闭换角即恢复原角色并回到基线。
      </p>
    </section>
  );
}

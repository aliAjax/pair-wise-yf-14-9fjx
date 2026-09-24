import type { Point, ShowData } from "../data/types";
import type { RehearsalState } from "../domain/types";

// 换角面板：换角/恢复原演员只影响本场排练；走位以“偏移量”调整，重算引用该角色的 Cue。

interface Props {
  show: ShowData;
  state: RehearsalState;
  onCast: (roleId: string, actorId: string) => void;
  onRestore: (roleId: string) => void;
  onOffset: (roleId: string, offset: Point) => void;
}

function step(v: number): number {
  return Math.round(v * 10) / 10;
}

export default function CastPanel({ show, state, onCast, onRestore, onOffset }: Props) {
  return (
    <div className="cast-panel">
      {show.roles.map((role) => {
        const recast = state.recasts.find((r) => r.roleId === role.id);
        const baselineActor = show.actors.find((a) => a.id === role.baselineActorId);
        const cueCount = show.cues.filter((c) => c.roleId === role.id).length;

        return (
          <section key={role.id} className={"cast-card" + (recast ? " recast" : "")}>
            <div className="cast-head">
              <div>
                <h3>{role.name}</h3>
                <p>
                  原演员：{baselineActor?.name}
                  <span className="muted"> · 引用 {cueCount} 条 Cue</span>
                </p>
              </div>
              <span className={"cast-state " + (recast ? "is-sub" : "is-base")}>
                {recast ? "替补上场（本场）" : "基线"}
              </span>
            </div>

            <div className="cast-actors">
              <label className={"actor-opt is-base" + (!recast ? " active" : "")}>
                <input
                  type="radio"
                  name={"cast-" + role.id}
                  checked={!recast}
                  onChange={() => onRestore(role.id)}
                />
                {baselineActor?.name}
              </label>
              {role.substituteActorIds.map((id) => {
                const actor = show.actors.find((a) => a.id === id);
                const active = recast?.actorId === id;
                return (
                  <label key={id} className={"actor-opt is-sub" + (active ? " active" : "")}>
                    <input
                      type="radio"
                      name={"cast-" + role.id}
                      checked={!!active}
                      onChange={() => onCast(role.id, id)}
                    />
                    {actor?.name}
                  </label>
                );
              })}
            </div>

            {recast && (
              <div className="offset-box">
                <div className="offset-title">
                  替补走位偏移（相对基线，米）
                  <button className="link-btn" onClick={() => onOffset(role.id, { x: 0, y: 0 })}>
                    回正到基线
                  </button>
                </div>
                <div className="offset-inputs">
                  <label>
                    左右 Δx
                    <div className="num-input">
                      <button onClick={() => onOffset(role.id, { x: step(recast.offset.x - 0.1), y: recast.offset.y })}>−</button>
                      <input
                        type="number"
                        step="0.1"
                        value={recast.offset.x}
                        onChange={(e) =>
                          onOffset(role.id, { x: step(Number(e.target.value) || 0), y: recast.offset.y })
                        }
                      />
                      <button onClick={() => onOffset(role.id, { x: step(recast.offset.x + 0.1), y: recast.offset.y })}>＋</button>
                    </div>
                  </label>
                  <label>
                    前后 Δy
                    <div className="num-input">
                      <button onClick={() => onOffset(role.id, { x: recast.offset.x, y: step(recast.offset.y - 0.1) })}>−</button>
                      <input
                        type="number"
                        step="0.1"
                        value={recast.offset.y}
                        onChange={(e) =>
                          onOffset(role.id, { x: recast.offset.x, y: step(Number(e.target.value) || 0) })
                        }
                      />
                      <button onClick={() => onOffset(role.id, { x: recast.offset.x, y: step(recast.offset.y + 0.1) })}>＋</button>
                    </div>
                  </label>
                </div>
                <p className="offset-note">调整即重算引用 {role.name} 的 {cueCount} 条 Cue；其他 Cue 顺序与灯位不变。恢复原演员后走位判定回到基线。</p>
                <button className="restore-btn" onClick={() => onRestore(role.id)}>
                  恢复原角色
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

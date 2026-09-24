import type { Cue, Show } from "../data/types";
import type { Session } from "../state/types";
import {
  distance,
  expectedMark,
  loadedGelFor,
  roleActorName,
  round1,
} from "../domain/rules";
import { DEVIATION_LIMIT_M } from "../data/baseline";

interface Props {
  show: Show;
  session: Session;
  cue: Cue;
  onLoadedGel: (fixtureId: string, gel: string) => void;
}

/** 当前场景预览：灯具亮度/色片装片 + 演员落点核查；停止时在此说明原因 */
export function ScenePreview({ show, session, cue, onLoadedGel }: Props) {
  const result = session.results[cue.id];

  return (
    <section className="panel preview-panel">
      <div className="heading">
        <div>
          <p>当前场景预览</p>
          <h2>{cue.code} · {cue.name}</h2>
        </div>
        <span className={`status-tag ${result?.status ?? "pending"}`}>
          {result?.status === "passed"
            ? "已确认通过"
            : result?.status === "stopped"
              ? "停在本 Cue"
              : "待确认"}
        </span>
      </div>

      {cue.note && <p className="cue-note">{cue.note}</p>}

      {result?.status === "stopped" && (
        <div className="stop-box">
          <b>停止原因（{result.time}）</b>
          <ul>
            {result.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <span>已停在当前 Cue；修正后重新执行本 Cue 或按 GO 继续，无关 Cue 可在列表中单独执行。</span>
        </div>
      )}

      <h3 className="sub">灯具状态</h3>
      <div className="fixture-rows">
        {cue.fixtures.map((fs) => {
          const f = show.fixtures.find((x) => x.id === fs.fixtureId)!;
          const loaded = loadedGelFor(show, session, f.id);
          const mismatch = !!fs.gel && fs.gel !== loaded;
          const follows = fs.targetRoleId
            ? show.roles.find((r) => r.id === fs.targetRoleId)
            : undefined;
          return (
            <div key={f.id} className={`fixture-row ${mismatch ? "bad" : ""}`}>
              <div className="fr-head">
                <b>{f.id}</b>
                <span className="muted">{f.label} · CH{String(f.channel).padStart(3, "0")} · {f.type}</span>
                {follows && <span className="follow">→ 追 {roleActorName(show, session, follows.id)}</span>}
              </div>
              <div className="fr-body">
                <label className="gel-select">
                  <span>装片</span>
                  <select value={loaded} onChange={(e) => onLoadedGel(f.id, e.target.value)}>
                    {show.gels.map((g) => (
                      <option key={g.code} value={g.code}>
                        {g.code} {g.name}
                      </option>
                    ))}
                  </select>
                  <i className="swatch" style={{ background: show.gels.find((g) => g.code === loaded)?.color }} />
                </label>
                {fs.gel && (
                  <span className={`gel-wanted ${mismatch ? "bad" : "ok"}`}>
                    本 Cue 要求 {fs.gel} {show.gels.find((g) => g.code === fs.gel)?.name}
                    {mismatch ? " · 不符" : " · 一致"}
                  </span>
                )}
                <div className="brightness">
                  <span>{fs.brightness}%</span>
                  <div className="bar">
                    <i style={{ width: `${fs.brightness}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <h3 className="sub">落点核查</h3>
      {cue.roles.length === 0 ? (
        <p className="muted">氛围 Cue，无演员落点，仅核查色片。</p>
      ) : (
        <div className="role-rows">
          {cue.roles.map((cr) => {
            const role = show.roles.find((r) => r.id === cr.roleId)!;
            const expected = expectedMark(cue, cr.roleId, session.blockingOffset[cr.roleId]);
            const actual = session.actual[cue.id]?.[cr.roleId] ?? expected;
            const dev = distance(actual, expected);
            const over = dev > DEVIATION_LIMIT_M;
            const subbed = !!session.substitutions[cr.roleId];
            return (
              <div key={cr.roleId} className={`role-row ${over ? "bad" : ""}`}>
                <i className="role-dot" style={{ background: role.color }} />
                <div className="rr-main">
                  <b>
                    {role.name}
                    {subbed && <em className="sub-badge">替补 {role.understudy} 演出</em>}
                  </b>
                  <span className="muted">
                    期望 ({expected.x}, {expected.y})m · 实际 ({actual.x}, {actual.y})m
                  </span>
                </div>
                <strong className={over ? "dev-bad" : "dev-ok"}>{round1(dev)}m</strong>
                <span className="limit">/ {DEVIATION_LIMIT_M}m</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

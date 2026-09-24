import type { ShowData } from "../data/types";
import { verdictText } from "../domain/rules";
import type { RehearsalState } from "../domain/types";

// Cue 列表：判定结果与停场原因内联展示；无关 Cue 在停场期间照常可执行。

const VERDICT_CLASS: Record<string, string> = {
  ok: "v-ok",
  "fail-position": "v-pos",
  "fail-gel": "v-gel",
  "fail-both": "v-both",
};

interface Props {
  show: ShowData;
  state: RehearsalState;
  selectedCueId: string;
  onSelect: (id: string) => void;
  onExecute: (id: string) => void;
}

export default function CueList({ show, state, selectedCueId, onSelect, onExecute }: Props) {
  const ordered = [...show.cues].sort((a, b) => a.order - b.order);

  return (
    <div className="cue-list">
      {ordered.map((cue) => {
        const result = state.results[cue.id];
        const fixture = show.fixtures.find((f) => f.id === cue.fixtureId);
        const role = cue.roleId ? show.roles.find((r) => r.id === cue.roleId) : undefined;
        const recast = role ? state.recasts.find((r) => r.roleId === role.id) : undefined;
        const recastActor = recast ? show.actors.find((a) => a.id === recast.actorId) : null;
        const wantGel = show.gels[cue.expectedGel];
        const gotGel = show.gels[result?.actualGel ?? cue.expectedGel];
        const selected = cue.id === selectedCueId;
        const stopped = cue.id === state.stoppedCueId;
        const failed = result && result.verdict !== "ok";

        return (
          <article
            key={cue.id}
            className={
              "cue-row" +
              (selected ? " selected" : "") +
              (stopped ? " stopped" : "") +
              (result?.executed ? " done" : "")
            }
            onClick={() => onSelect(cue.id)}
          >
            <div className="cue-head">
              <span className="cue-order">{String(cue.order).padStart(2, "0")}</span>
              <div className="cue-title">
                <h3>{cue.id} · {cue.name}</h3>
                <p>
                  {fixture?.id}（{fixture?.channel}，{fixture?.type}）· 亮度 {cue.brightness}%
                  {role && (
                    <>
                      {" "}· 追光：<b>{role.name}</b>
                      {recastActor ? <em className="recast-tag">替补 {recastActor.name}</em> : <em className="base-tag">原演员</em>}
                    </>
                  )}
                </p>
              </div>
              <div className="cue-side">
                <span className={"verdict " + VERDICT_CLASS[result?.verdict ?? "pending"]}>
                  {verdictText(result?.verdict ?? "pending")}
                  {recast && result ? ` ${result.deviationM}m` : ""}
                </span>
                <button
                  className={"run-btn" + (result?.executed ? " is-done" : "")}
                  disabled={!!result?.executed}
                  onClick={(e) => {
                    e.stopPropagation();
                    onExecute(cue.id);
                  }}
                >
                  {result?.executed ? "✓ 已执行" : stopped ? "停在本 Cue" : "执行 Cue"}
                </button>
              </div>
            </div>

            <div className="cue-spec">
              <span className="spec-item">
                色片
                <i className="swatch" style={{ background: wantGel?.color }} />
                {cue.expectedGel} {wantGel?.name}
              </span>
              <span className="spec-item">
                实际
                <i className="swatch" style={{ background: gotGel?.color }} />
                {result?.actualGel} {gotGel?.name}
                {result && result.actualGel !== cue.expectedGel && <b className="mismatch">不符</b>}
              </span>
              <span className="spec-item">
                落点基准 ({cue.expectedMark.x}, {cue.expectedMark.y})m
                {recast && result && (
                  <>
                    → 实际 ({result.actualMark.x}, {result.actualMark.y})m
                    <b className={result.deviationM > 1.5 ? "mismatch" : "within"}>偏差 {result.deviationM}m</b>
                  </>
                )}
              </span>
              {cue.note && <span className="spec-item note">{cue.note}</span>}
            </div>

            {/* 列表内说明停场原因 */}
            {failed && (selected || stopped) && (
              <ul className="reason-list">
                {result.reasons.length === 0 ? (
                  <li className="ok-reason">判定通过，可接光</li>
                ) : (
                  result.reasons.map((r) => (
                    <li key={r} className="bad-reason">⛔ {r}</li>
                  ))
                )}
                {stopped && (
                  <li className="hint-reason">已停在当前 Cue：调整走位或换片后自动重算；达标即放行，其他 Cue 仍可照常执行。</li>
                )}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}

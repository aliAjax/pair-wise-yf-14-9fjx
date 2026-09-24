import { useMemo, useState } from "react";
import "./styles.css";
import { baselineShow } from "./data/baseline";
import type { FixtureType } from "./data/types";
import { useRehearsal } from "./state/useRehearsal";
import { resultStatus, sortedCues } from "./domain/rules";
import { StageMap } from "./components/StageMap";
import { ScenePreview } from "./components/ScenePreview";
import { CueList } from "./components/CueList";
import { CastPanel } from "./components/CastPanel";
import { FilterPanel, FIXTURE_TYPES } from "./components/FilterPanel";
import { NotesPanel } from "./components/NotesPanel";
import { RehearsalLog } from "./components/RehearsalLog";

function App() {
  const show = baselineShow;
  const { session, dispatch } = useRehearsal(show);
  const cues = useMemo(() => sortedCues(show), [show]);
  const [selectedId, setSelectedId] = useState(cues[0]?.id ?? "");
  const [activeTypes, setActiveTypes] = useState<Set<FixtureType>>(new Set());

  const cue = show.cues.find((c) => c.id === selectedId) ?? cues[0];

  const counts = useMemo(() => {
    const c = Object.fromEntries(FIXTURE_TYPES.map((t) => [t, 0])) as Record<FixtureType, number>;
    for (const f of show.fixtures) c[f.type] += 1;
    return c;
  }, [show]);

  const passed = cues.filter((c) => resultStatus(session, c.id) === "passed").length;
  const stopped = cues.filter((c) => resultStatus(session, c.id) === "stopped").length;
  const pendingFocus = cues.filter((c) => resultStatus(session, c.id) === "pending").length;
  const subCount = Object.values(session.substitutions).filter(Boolean).length;
  const pointerCue = cues[session.pointer];

  const toggleType = (t: FixtureType) =>
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  return (
    <main className="app">
      <header className="hero compact">
        <div>
          <p>hxyfront-62002 · 源提示词2 · Port 62002</p>
          <h1>剧场灯光 Cue 表 · 排练换角确认</h1>
          <span>
            执行 Cue 时核查替补落点（限值 1.5m）与色片：不符即停在当前 Cue 并在舞台图、预览、列表说明原因；
            确认结果只归本场排练，恢复原角色回到基线，重开页面保留当次记录。
          </span>
        </div>
      </header>

      <section className="metrics">
        <article>
          <small>灯具数量</small>
          <strong>{show.fixtures.length}</strong>
        </article>
        <article>
          <small>Cue 数量</small>
          <strong>{show.cues.length}</strong>
        </article>
        <article>
          <small>当前 GO 场景</small>
          <strong className="metric-text">{pointerCue ? pointerCue.code : "已到底"}</strong>
        </article>
        <article>
          <small>待确认焦点</small>
          <strong>{pendingFocus}</strong>
        </article>
        <article>
          <small>已通过 / 停止</small>
          <strong className="metric-text">
            <em className="ok-num">{passed}</em> / <em className="stop-num">{stopped}</em>
          </strong>
        </article>
        <article>
          <small>临时换角</small>
          <strong>{subCount}</strong>
        </article>
      </section>

      <div className="layout">
        <aside className="col-side">
          <CastPanel
            show={show}
            session={session}
            onSubstitute={(roleId, on) => dispatch({ type: "SET_SUBSTITUTE", roleId, on })}
            onNudge={(roleId, dx, dy) => dispatch({ type: "NUDGE_BLOCKING", roleId, dx, dy })}
            onResetBlocking={(roleId) => dispatch({ type: "RESET_BLOCKING", roleId })}
          />
          <FilterPanel active={activeTypes} onToggle={toggleType} counts={counts} />
          <NotesPanel
            show={show}
            session={session}
            onNote={(text) => dispatch({ type: "SET_VERSION_NOTE", text })}
            onEnd={() => {
              if (window.confirm("结束本场排练？所有临时换角、走位与判定记录将清除并回到基线。")) {
                dispatch({ type: "END_REHEARSAL" });
              }
            }}
          />
        </aside>

        <section className="col-cues">
          <CueList
            show={show}
            session={session}
            selectedId={cue.id}
            onSelect={setSelectedId}
            onRun={(cueId) => dispatch({ type: "RUN_CUE", cueId })}
            onReset={(cueId) => dispatch({ type: "RESET_CUE", cueId })}
            onGo={() => dispatch({ type: "GO" })}
          />
          <RehearsalLog session={session} />
        </section>

        <section className="col-stage">
          <StageMap
            show={show}
            session={session}
            cue={cue}
            activeTypes={activeTypes}
            onDragActual={(cueId, roleId, pos) => dispatch({ type: "SET_ACTUAL", cueId, roleId, pos })}
          />
          <ScenePreview
            show={show}
            session={session}
            cue={cue}
            onLoadedGel={(fixtureId, gel) => dispatch({ type: "SET_LOADED_GEL", fixtureId, gel })}
          />
        </section>
      </div>
    </main>
  );
}

export default App;

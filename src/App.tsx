import { useState } from "react";
import type { FixtureType, Point } from "./data/types";
import { useRehearsal } from "./domain/useRehearsal";
import { rehearsalRepo } from "./domain/repository";
import { createRehearsal } from "./domain/rehearsal";
import ControlBar from "./components/ControlBar";
import StagePlan from "./components/StagePlan";
import CueList from "./components/CueList";
import ScenePreview from "./components/ScenePreview";
import CastPanel from "./components/CastPanel";
import RehearsalLog from "./components/RehearsalLog";
import "./styles.css";

function App() {
  const { show, state, dispatch, restored } = useRehearsal();
  const [selectedCueId, setSelectedCueId] = useState<string>(show.cues[0].id);
  const [activeTypes, setActiveTypes] = useState<Set<FixtureType>>(
    () => new Set<FixtureType>(["面光", "侧光", "逆光", "效果光", "追光"])
  );

  const now = () => Date.now();

  function toggleType(t: FixtureType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        if (next.size > 1) next.delete(t);
      } else next.add(t);
      return next;
    });
  }

  function endRehearsal() {
    // 结束排练：换角/判定/日志全部清空，回到基线并开一场新的空白排练
    rehearsalRepo.clear();
    const d = new Date();
    const fresh = createRehearsal(
      "RH-" + d.getTime().toString(36).slice(-6),
      "排练 " + d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
      d.getTime(),
      show
    );
    dispatch({ type: "newRehearsal", rehearsalId: fresh.rehearsalId, title: fresh.title, t: d.getTime() });
  }

  return (
    <main className="app">
      <ControlBar
        show={show}
        state={state}
        restored={restored}
        onNote={(note) => dispatch({ type: "setNote", note })}
        onStep={() => dispatch({ type: "step", t: now() })}
        onRunAll={() => dispatch({ type: "runAll", t: now() })}
        onResetRun={() => dispatch({ type: "resetRun", t: now() })}
        onEnd={endRehearsal}
      />

      <div className="layout">
        <section className="panel stage-panel">
          <PanelHead title="舞台平面灯位图" sub="方格 1m；方框=灯具，○=追光落点，△=无角色 Cue，虚线圆=1.5m 容差" />
          <StagePlan
            show={show}
            state={state}
            selectedCueId={selectedCueId}
            activeTypes={activeTypes}
            onToggleType={toggleType}
            onSelectCue={setSelectedCueId}
            onDragMark={(roleId, offset: Point, silent?: boolean) =>
              dispatch({ type: "setOffset", roleId, offset, t: now(), silent })
            }
          />
        </section>

        <section className="panel side-panel">
          <PanelHead title="当前场景" sub="选中 Cue 的灯光效果与接光判定" />
          <ScenePreview
            show={show}
            state={state}
            selectedCueId={selectedCueId}
            onSetGel={(fixtureId, gelCode) => dispatch({ type: "setGel", fixtureId, gelCode, t: now() })}
          />
        </section>
      </div>

      <div className="layout lower">
        <section className="panel cue-panel">
          <PanelHead title="Cue 触发列表" sub="按顺序执行；停场原因内联展开，停场期间无关 Cue 照常执行" />
          <CueList
            show={show}
            state={state}
            selectedCueId={selectedCueId}
            onSelect={setSelectedCueId}
            onExecute={(cueId) => dispatch({ type: "executeOne", cueId, t: now() })}
          />
        </section>

        <aside className="panel side-col">
          <PanelHead title="临时换角" sub="仅本场有效，恢复原角色即回基线" />
          <CastPanel
            show={show}
            state={state}
            onCast={(roleId, actorId) => dispatch({ type: "cast", roleId, actorId, t: now() })}
            onRestore={(roleId) => dispatch({ type: "restoreRole", roleId, t: now() })}
            onOffset={(roleId, offset) => dispatch({ type: "setOffset", roleId, offset, t: now() })}
          />
        </aside>
      </div>

      <section className="panel">
        <PanelHead title="排练日志" sub="业务数据 / 判定 / 界面分层维护，判定由纯规则层计算" />
        <RehearsalLog logs={state.logs} />
      </section>

      <footer className="foot">
        规则：落点偏差 &gt; 1.5m 或色片不符 → 停在当前 Cue（舞台图 / 预览 / 列表同步说明）；
        调整走位只重算引用该角色的 Cue；本场记录存于本机，重开页面保留，结束排练回到基线。
      </footer>
    </main>
  );
}

function PanelHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="panel-head">
      <h2>{title}</h2>
      <p>{sub}</p>
    </div>
  );
}

export default App;

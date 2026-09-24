import type { FixtureType } from "../data/types";

export const FIXTURE_TYPES: FixtureType[] = ["面光", "侧光", "逆光", "追光", "效果光"];

interface Props {
  active: Set<FixtureType>;
  onToggle: (t: FixtureType) => void;
  counts: Record<FixtureType, number>;
}

/** 灯具筛选（多选，不选=全部） */
export function FilterPanel({ active, onToggle, counts }: Props) {
  return (
    <section className="panel">
      <p className="side-label">灯具筛选</p>
      <div className="chips">
        {FIXTURE_TYPES.map((t) => (
          <button
            key={t}
            className={active.has(t) ? "chip-on" : ""}
            onClick={() => onToggle(t)}
          >
            {t} <em>{counts[t]}</em>
          </button>
        ))}
      </div>
      <p className="hint">点击多选，灯位图只高亮所选类型。</p>
    </section>
  );
}

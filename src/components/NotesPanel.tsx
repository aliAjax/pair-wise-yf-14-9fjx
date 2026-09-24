import type { Show } from "../data/types";
import type { Session } from "../state/types";

interface Props {
  show: Show;
  session: Session;
  onNote: (text: string) => void;
  onEnd: () => void;
}

/** 演出版本备注（本场排练保留）+ 结束排练（清除临时记录回基线） */
export function NotesPanel({ show, session, onNote, onEnd }: Props) {
  return (
    <section className="panel">
      <p className="side-label">演出版本备注</p>
      <div className="version-line muted">{show.version}</div>
      <textarea
        className="note-input"
        rows={4}
        placeholder="记录本场排练备注，如：二幕联排、追光换乙机…（仅本场保留，重开页面不丢失）"
        value={session.versionNote}
        onChange={(e) => onNote(e.target.value)}
      />
      <button className="danger ghost full" onClick={onEnd}>
        结束本场排练（清除换角与判定，回到基线）
      </button>
    </section>
  );
}

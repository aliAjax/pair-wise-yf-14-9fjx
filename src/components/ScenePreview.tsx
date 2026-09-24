import type { ShowData } from "../data/types";
import { POSITION_TOLERANCE_M, verdictText } from "../domain/rules";
import type { RehearsalState } from "../domain/types";

// 当前场景预览：选中 Cue 的光束/色片/落点在小舞台上的可视化，并可对该灯具临时换片。

const W = 320;
const H = 250;
const SCALE = 16;
const CX = W / 2;
const FRONT_Y = 58;

const VCOLOR: Record<string, string> = {
  ok: "#22c55e",
  "fail-position": "#ef4444",
  "fail-gel": "#f97316",
  "fail-both": "#dc2626",
  pending: "#94a3b8",
};

interface Props {
  show: ShowData;
  state: RehearsalState;
  selectedCueId: string;
  onSetGel: (fixtureId: string, gelCode: string | null) => void;
}

export default function ScenePreview({ show, state, selectedCueId, onSetGel }: Props) {
  const cue = show.cues.find((c) => c.id === selectedCueId) ?? show.cues[0];
  const fixture = show.fixtures.find((f) => f.id === cue.fixtureId);
  const result = state.results[cue.id];
  const role = cue.roleId ? show.roles.find((r) => r.id === cue.roleId) : undefined;
  const recast = role ? state.recasts.find((r) => r.roleId === role.id) : undefined;
  const color = VCOLOR[result?.verdict ?? "pending"];
  const gel = show.gels[result?.actualGel ?? cue.expectedGel];

  const px = (x: number) => CX + x * SCALE;
  const py = (y: number) => FRONT_Y + y * SCALE;
  const actual = result?.actualMark ?? cue.expectedMark;
  const override = fixture ? state.gelOverrides[fixture.id] : undefined;

  // 光束锥：从灯位到实际落点，端点宽度按垂直方向展开
  let cone: string | null = null;
  if (fixture) {
    const a = fixture.position;
    const b = actual;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const half = 1.1;
    cone = `${px(a.x)},${py(a.y)} ${px(b.x + nx * half)},${py(b.y + ny * half)} ${px(b.x - nx * half)},${py(b.y - ny * half)}`;
  }

  return (
    <div className="preview">
      <div className="preview-head">
        <div>
          <p className="kicker">当前场景预览</p>
          <h3>{cue.id} · {cue.name}</h3>
        </div>
        <span className={"verdict-badge"} style={{ borderColor: color, color }}>
          {verdictText(result?.verdict ?? "pending")}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="preview-svg">
        <rect x={0} y={0} width={W} height={H} rx={8} fill="#0c111b" />
        <text x={CX} y={20} fill="#64748b" fontSize="9" textAnchor="middle" letterSpacing="4">观众席</text>
        <rect x={CX - 7 * SCALE} y={FRONT_Y} width={14 * SCALE} height={9 * SCALE} fill="#111927" stroke="#3b475c" />
        {[-6, -3, 0, 3, 6].map((x) => (
          <line key={x} x1={px(x)} y1={FRONT_Y} x2={px(x)} y2={FRONT_Y + 9 * SCALE} stroke="#1f2a3c" />
        ))}
        {[0, 3, 6, 9].map((y) => (
          <line key={y} x1={CX - 7 * SCALE} y1={py(y)} x2={CX + 7 * SCALE} y2={py(y)} stroke="#1f2a3c" />
        ))}

        {fixture && cone && (
          <>
            <polygon points={cone} fill={gel?.color ?? "#fff"} opacity="0.4" />
            <rect x={px(fixture.position.x) - 5} y={py(fixture.position.y) - 5} width="10" height="10" rx="2" fill="#0c111b" stroke={color} strokeWidth="2" />
          </>
        )}

        {recast && (
          <circle cx={px(cue.expectedMark.x)} cy={py(cue.expectedMark.y)} r={POSITION_TOLERANCE_M * SCALE} fill="none" stroke={color} strokeDasharray="3 3" opacity="0.8" />
        )}
        <circle cx={px(cue.expectedMark.x)} cy={py(cue.expectedMark.y)} r="5" fill="none" stroke="#94a3b8" strokeWidth="1.6" />
        {recast && (
          <>
            <line x1={px(cue.expectedMark.x)} y1={py(cue.expectedMark.y)} x2={px(actual.x)} y2={py(actual.y)} stroke="#fca5a5" strokeDasharray="2 2" />
            <circle cx={px(actual.x)} cy={py(actual.y)} r="4.5" fill={color} stroke="#fff" strokeWidth="1.2" />
          </>
        )}
        <text x={px(cue.expectedMark.x)} y={py(cue.expectedMark.y) + 16} fill="#cbd5e1" fontSize="8.5" textAnchor="middle">
          {role ? role.name : cue.fixtureId}
        </text>
      </svg>

      <dl className="preview-facts">
        <div>
          <dt>灯具</dt>
          <dd>{fixture?.id} · {fixture?.channel}</dd>
        </div>
        <div>
          <dt>亮度</dt>
          <dd>{cue.brightness}%</dd>
        </div>
        <div>
          <dt>落点偏差</dt>
          <dd style={{ color }}>{result?.deviationM ?? 0}m {recast ? `（容差 ${POSITION_TOLERANCE_M}m）` : "· 原演员基线"}</dd>
        </div>
        <div>
          <dt>实装色片</dt>
          <dd>
            <i className="swatch sm" style={{ background: gel?.color }} />
            {result?.actualGel} {gel?.name}
          </dd>
        </div>
      </dl>

      {result && result.verdict !== "ok" && (
        <div className="preview-reasons">
          {result.reasons.map((r) => (
            <p key={r}>⛔ {r}</p>
          ))}
        </div>
      )}

      <label className="gel-select">
        临时换装（{fixture?.id}，仅本场）
        <select value={override ?? ""} onChange={(e) => onSetGel(cue.fixtureId, e.target.value || null)}>
          <option value="">基线装片：{fixture?.loadedGel} {show.gels[fixture?.loadedGel ?? ""]?.name}</option>
          {Object.values(show.gels)
            .filter((g) => g.code !== fixture?.loadedGel)
            .map((g) => (
              <option key={g.code} value={g.code}>
                {g.code} {g.name}
              </option>
            ))}
        </select>
      </label>
    </div>
  );
}

import { useRef, useState } from "react";
import type { Cue, Fixture, FixtureType, Point, ShowData } from "../data/types";
import { POSITION_TOLERANCE_M } from "../domain/rules";
import type { RehearsalState } from "../domain/types";

// 舞台平面灯位图。
// 约定：灯具一律方框；追光目标一律 ○；无角色 Cue 一律 △；虚线圆为 1.5m 容差圈。

const W = 720;
const H = 620;
const SCALE = 40; // 1m = 40px
const CX = W / 2;
const FRONT_Y = 135; // 台口（y=0）的像素位置

const TYPE_COLOR: Record<FixtureType, string> = {
  面光: "#f59e0b",
  侧光: "#06b6d4",
  逆光: "#a78bfa",
  效果光: "#d946ef",
  追光: "#7c3aed",
};

const VERDICT_COLOR: Record<string, string> = {
  ok: "#22c55e",
  "fail-position": "#ef4444",
  "fail-gel": "#f97316",
  "fail-both": "#dc2626",
  pending: "#94a3b8",
};

const FIXTURE_TYPES: FixtureType[] = ["面光", "侧光", "逆光", "效果光", "追光"];

function px(p: Point): number {
  return CX + p.x * SCALE;
}
function py(p: Point): number {
  return FRONT_Y + p.y * SCALE;
}

interface Props {
  show: ShowData;
  state: RehearsalState;
  selectedCueId: string;
  activeTypes: Set<FixtureType>;
  onToggleType: (t: FixtureType) => void;
  onSelectCue: (id: string) => void;
  onDragMark: (roleId: string, offset: Point, silent?: boolean) => void;
}

function trianglePoints(cx: number, cy: number, r: number): string {
  return `${cx},${cy - r} ${cx - r * 0.9},${cy + r * 0.75} ${cx + r * 0.9},${cy + r * 0.75}`;
}

export default function StagePlan({
  show,
  state,
  selectedCueId,
  activeTypes,
  onToggleType,
  onSelectCue,
  onDragMark,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragRole, setDragRole] = useState<string | null>(null);
  const dragOffsetRef = useRef<Point | null>(null);

  const fixtureById = new Map(show.fixtures.map((f) => [f.id, f]));
  const selectedCue = show.cues.find((c) => c.id === selectedCueId) ?? show.cues[0];
  const stoppedCue = show.cues.find((c) => c.id === state.stoppedCueId) ?? null;

  function clientToM(clientX: number, clientY: number): Point {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: (pt.x - CX) / SCALE, y: (pt.y - FRONT_Y) / SCALE };
  }

  function startDrag(e: React.PointerEvent, roleId: string) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragRole(roleId);
    const recast = state.recasts.find((r) => r.roleId === roleId);
    dragOffsetRef.current = recast ? { ...recast.offset } : { x: 0, y: 0 };
    onSelectCue(show.cues.find((c) => c.roleId === roleId)?.id ?? selectedCueId);
  }
  function moveDrag(e: React.PointerEvent) {
    if (!dragRole) return;
    const cue = show.cues.find((c) => c.roleId === dragRole);
    if (!cue) return;
    const m = clientToM(e.clientX, e.clientY);
    const offset = {
      x: Math.round((m.x - cue.expectedMark.x) * 10) / 10,
      y: Math.round((m.y - cue.expectedMark.y) * 10) / 10,
    };
    const last = dragOffsetRef.current;
    if (last && (last.x !== offset.x || last.y !== offset.y)) {
      dragOffsetRef.current = offset;
      onDragMark(dragRole, offset, true); // 拖动过程只重算，不写日志
    }
  }
  function endDrag() {
    // 松手时落一条带最终偏移的重算记录
    if (dragRole && dragOffsetRef.current) {
      const recast = state.recasts.find((r) => r.roleId === dragRole);
      const final = recast ? recast.offset : dragOffsetRef.current;
      if (final.x !== 0 || final.y !== 0) onDragMark(dragRole, final, false);
    }
    dragOffsetRef.current = null;
    setDragRole(null);
  }

  // 选中 Cue 的追光锥（从灯位打到实际落点，宽度按亮度暗示）
  function coneFor(cue: Cue) {
    const fx = fixtureById.get(cue.fixtureId);
    if (!fx) return null;
    const r = state.results[cue.id];
    const a = fx.position;
    const b = r?.actualMark ?? cue.expectedMark;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const half = 1.1; // 落点端锥宽（米）
    const gel = show.gels[r?.actualGel ?? cue.expectedGel];
    const color = gel?.color ?? "#ffffff";
    return (
      <polygon
        points={`${px(a)},${py(a)} ${px({ x: b.x + nx * half, y: b.y + ny * half })},${py({
          x: b.x + nx * half,
          y: b.y + ny * half,
        })} ${px({ x: b.x - nx * half, y: b.y - ny * half })},${py({
          x: b.x - nx * half,
          y: b.y - ny * half,
        })}`}
        fill={color}
        opacity={Math.min(0.34, 0.12 + cue.brightness / 300)}
        style={{ pointerEvents: "none" }}
      />
    );
  }

  const gridV = [];
  for (let x = -7; x <= 7; x++) {
    gridV.push(
      <line key={"v" + x} x1={CX + x * SCALE} y1={FRONT_Y} x2={CX + x * SCALE} y2={FRONT_Y + show.stageDepthM * SCALE} stroke="#232c3d" strokeWidth={x === 0 ? 1.4 : 0.7} />
    );
    if (x % 2 === 0)
      gridV.push(
        <text key={"vt" + x} x={CX + x * SCALE} y={FRONT_Y + show.stageDepthM * SCALE + 18} fill="#7b8798" fontSize="11" textAnchor="middle">
          {x}m
        </text>
      );
  }
  const gridH = [];
  for (let y = 0; y <= 9; y++) {
    gridH.push(
      <line key={"h" + y} x1={CX - (show.stageWidthM / 2) * SCALE} y1={FRONT_Y + y * SCALE} x2={CX + (show.stageWidthM / 2) * SCALE} y2={FRONT_Y + y * SCALE} stroke="#232c3d" strokeWidth={y === 0 ? 1.4 : 0.7} />
    );
    gridH.push(
      <text key={"ht" + y} x={CX - (show.stageWidthM / 2) * SCALE - 8} y={FRONT_Y + y * SCALE + 4} fill="#7b8798" fontSize="11" textAnchor="end">
        {y}m
      </text>
    );
  }

  function fixtureDim(f: Fixture) {
    return activeTypes.has(f.type) ? 1 : 0.18;
  }
  function cueDim(c: Cue) {
    const f = fixtureById.get(c.fixtureId);
    return f && activeTypes.has(f.type) ? 1 : 0.2;
  }

  return (
    <div className="stage-wrap">
      <div className="filter-chips">
        <span className="chip-label">灯具筛选</span>
        {FIXTURE_TYPES.map((t) => (
          <button
            key={t}
            className={"chip" + (activeTypes.has(t) ? " on" : "")}
            style={activeTypes.has(t) ? ({ ["--chip" as string]: TYPE_COLOR[t] } as React.CSSProperties) : undefined}
            onClick={() => onToggleType(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="stage-svg" role="img" aria-label="舞台平面灯位图">
        <rect x={0} y={0} width={W} height={H} rx={10} fill="#0c111b" />

        {/* 台口外（观众席侧）/ 天幕外标注 */}
        <text x={CX} y={36} fill="#64748b" fontSize="13" textAnchor="middle" letterSpacing="6">
          观 众 席
        </text>
        <text x={CX} y={H - 12} fill="#64748b" fontSize="12" textAnchor="middle">
          天幕 / 后台
        </text>

        {/* 舞台台面与网格 */}
        <rect
          x={CX - (show.stageWidthM / 2) * SCALE}
          y={FRONT_Y}
          width={show.stageWidthM * SCALE}
          height={show.stageDepthM * SCALE}
          fill="#111927"
          stroke="#3b475c"
          strokeWidth="1.6"
        />
        {gridV}
        {gridH}
        <line x1={CX - (show.stageWidthM / 2) * SCALE} y1={FRONT_Y} x2={CX + (show.stageWidthM / 2) * SCALE} y2={FRONT_Y} stroke="#94a3b8" strokeWidth="2.4" />

        {/* 选中 Cue 的光束 */}
        {coneFor(selectedCue)}

        {/* 灯具：方框 */}
        {show.fixtures.map((f) => {
          const onStage = f.position.y >= 0 && f.position.y <= show.stageDepthM;
          const gel = show.gels[state.gelOverrides[f.id] ?? f.loadedGel];
          return (
            <g key={f.id} opacity={fixtureDim(f)} style={{ cursor: "pointer" }} onClick={() => onSelectCue(show.cues.find((c) => c.fixtureId === f.id)?.id ?? selectedCueId)}>
              <rect x={px(f.position) - 7} y={py(f.position) - 7} width="14" height="14" rx="2" fill="#0c111b" stroke={TYPE_COLOR[f.type]} strokeWidth="2.4" />
              <text x={px(f.position)} y={py(f.position) - 12} fill="#dbe3ef" fontSize="10.5" textAnchor="middle" fontWeight="700">
                {f.id}
              </text>
              {!onStage && (
                <text x={px(f.position) + 12} y={py(f.position) + 4} fill="#64748b" fontSize="9.5">
                  {f.position.y < 0 ? "台口外" : "天幕外"}
                </text>
              )}
              <circle cx={px(f.position) + 11} cy={py(f.position) - 11} r="4" fill={gel?.color ?? "#fff"} stroke="#475569" strokeWidth="0.8" />
            </g>
          );
        })}

        {/* Cue 焦点标记 */}
        {show.cues.map((cue) => {
          const result = state.results[cue.id];
          const color = VERDICT_COLOR[result?.verdict ?? "pending"];
          const selected = cue.id === selectedCueId;
          const stopped = cue.id === state.stoppedCueId;
          const recast = cue.roleId ? state.recasts.find((r) => r.roleId === cue.roleId) : undefined;
          const ex = px(cue.expectedMark);
          const ey = py(cue.expectedMark);
          const ax = result ? px(result.actualMark) : ex;
          const ay = result ? py(result.actualMark) : ey;

          return (
            <g key={cue.id} opacity={cueDim(cue)} onClick={() => onSelectCue(cue.id)} style={{ cursor: "pointer" }}>
              {/* 换角追光：1.5m 容差圈 + 偏差连线 */}
              {cue.roleId && recast && (
                <>
                  <circle cx={ex} cy={ey} r={POSITION_TOLERANCE_M * SCALE} fill="none" stroke={color} strokeWidth="1.4" strokeDasharray="6 5" opacity="0.75" />
                  <line x1={ex} y1={ey} x2={ax} y2={ay} stroke="#fca5a5" strokeWidth="1.2" strokeDasharray="3 3" />
                </>
              )}

              {/* 追光目标 ○ / 无角色 Cue △ */}
              {cue.roleId ? (
                <circle cx={ex} cy={ey} r="9.5" fill="none" stroke={color} strokeWidth="2.4" />
              ) : (
                <polygon points={trianglePoints(ex, ey, 10)} fill="none" stroke={color} strokeWidth="2.4" />
              )}

              {/* 替补实际落点（可拖动调整走位） */}
              {cue.roleId && recast && (
                <circle
                  cx={ax}
                  cy={ay}
                  r={dragRole === cue.roleId ? 9 : 7}
                  fill={color}
                  stroke="#fff"
                  strokeWidth="1.6"
                  style={{ cursor: dragRole === cue.roleId ? "grabbing" : "grab" }}
                  onPointerDown={(e) => cue.roleId && startDrag(e, cue.roleId)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                />
              )}

              {selected && <circle cx={ex} cy={ey} r="15" fill="none" stroke="#e2e8f0" strokeWidth="1.4" />}
              {stopped && (
                <circle cx={ex} cy={ey} r="21" fill="none" stroke="#ef4444" strokeWidth="2" className="stop-pulse" />
              )}
              {result?.executed && (
                <text x={ex + 13} y={ey - 11} fill="#22c55e" fontSize="12" fontWeight="800">
                  ✓
                </text>
              )}

              <text x={ex} y={ey + 26} fill={selected ? "#f8fafc" : "#9aa7ba"} fontSize="10.5" textAnchor="middle" fontWeight={selected ? 800 : 600}>
                {cue.id}
                {recast && result ? ` · ${result.deviationM}m` : ""}
              </text>

              {/* 停场原因直接标在舞台图上 */}
              {stopped && result && (
                <g>
                  <rect x={Math.min(ex + 18, W - 232)} y={ay - 44} width="216" height="40" rx="6" fill="#3f1216" stroke="#ef4444" strokeWidth="1.2" />
                  <text x={Math.min(ex + 26, W - 224)} y={ay - 28} fill="#fecaca" fontSize="10.5" fontWeight="700">
                    停场 {cue.id}：{result.verdict === "fail-gel" ? "色片不符" : result.verdict === "fail-position" ? "落点超 1.5m" : "落点与色片均不符"}
                  </text>
                  <text x={Math.min(ex + 26, W - 224)} y={ay - 14} fill="#fda4a4" fontSize="9.8">
                    {result.reasons[0]?.slice(0, 26)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <div className="legend">
        <span><i className="lg-box" /> 灯具（方框，颜色=灯种）</span>
        <span><i className="lg-circle" /> 追光落点 ○</span>
        <span><i className="lg-tri" /> 无角色 Cue △</span>
        <span><i className="lg-ring" /> 1.5m 容差圈</span>
        <span><i className="lg-dot" style={{ background: "#ef4444" }} /> 不符</span>
        <span><i className="lg-dot" style={{ background: "#22c55e" }} /> 可接光</span>
        <span className="legend-tip">拖动替补实点可调整走位，自动重算引用该角色的 Cue</span>
      </div>
    </div>
  );
}

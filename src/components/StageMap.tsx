import { useRef } from "react";
import type { Cue, Fixture, FixtureType, Pos, Show } from "../data/types";
import type { Session } from "../state/types";
import {
  distance,
  expectedMark,
  loadedGelFor,
  roleActorName,
  round1,
} from "../domain/rules";
import { DEVIATION_LIMIT_M } from "../data/baseline";

// 舞台平面坐标系（米）：x 左右 ±8，y 台口 -5 到后区 8；灯具可在台外
const VW = 1000;
const VH = 640;
const X = (x: number) => 500 + x * 48;
const Y = (y: number) => 350 - y * 30;

interface Props {
  show: Show;
  session: Session;
  cue: Cue;
  activeTypes: Set<FixtureType>;
  onDragActual: (cueId: string, roleId: string, pos: Pos) => void;
}

function fixtureShape(f: Fixture) {
  const cx = X(f.pos.x);
  const cy = Y(f.pos.y);
  switch (f.type) {
    case "面光":
      return <rect x={cx - 8} y={cy - 8} width={16} height={16} rx={3} />;
    case "侧光":
      return (
        <polygon
          points={`${cx - 9},${cy + 8} ${cx + 9},${cy + 8} ${cx},${cy - 8}`}
          transform={f.pos.x > 0 ? `rotate(180 ${cx} ${cy})` : undefined}
        />
      );
    case "逆光":
      return <polygon points={`${cx},${cy - 9} ${cx + 9},${cy} ${cx},${cy + 9} ${cx - 9},${cy}`} />;
    case "追光":
      return <circle r={9} cx={cx} cy={cy} />;
    case "效果光":
      return (
        <polygon
          points={`${cx},${cy - 9} ${cx + 3},${cy - 3} ${cx + 9},${cy} ${cx + 3},${cy + 3} ${cx},${cy + 9} ${cx - 3},${cy + 3} ${cx - 9},${cy} ${cx - 3},${cy - 3}`}
        />
      );
  }
}

export function StageMap({ show, session, cue, activeTypes, onDragActual }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<string | null>(null);

  const gelOf = (code: string) => show.gels.find((g) => g.code === code);
  const result = session.results[cue.id];
  const activeFixtureIds = new Set(cue.fixtures.map((f) => f.fixtureId));

  const toWorld = (clientX: number, clientY: number): Pos => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * VW;
    const py = ((clientY - rect.top) / rect.height) * VH;
    return {
      x: Math.max(-8, Math.min(8, (px - 500) / 48)),
      y: Math.max(-5, Math.min(8, (350 - py) / 30)),
    };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    onDragActual(cue.id, dragging.current, toWorld(e.clientX, e.clientY));
  };

  // 光束：追光打到演员，其余灯向台心投射短锥
  const beams = cue.fixtures.map((fs) => {
    const f = show.fixtures.find((x) => x.id === fs.fixtureId)!;
    const gelCode = loadedGelFor(show, session, f.id);
    const color = gelOf(gelCode)?.color ?? "#fff";
    let target: Pos;
    if (fs.targetRoleId) {
      target =
        session.actual[cue.id]?.[fs.targetRoleId] ??
        expectedMark(cue, fs.targetRoleId, session.blockingOffset[fs.targetRoleId]);
    } else {
      const dir = { x: -f.pos.x, y: 1.2 - f.pos.y };
      const len = Math.hypot(dir.x, dir.y) || 1;
      target = { x: f.pos.x + (dir.x / len) * 3.2, y: f.pos.y + (dir.y / len) * 3.2 };
    }
    return { f, fs, target, color };
  });

  return (
    <section className="panel stage-panel">
      <div className="heading">
        <div>
          <p>舞台平面灯位图</p>
          <h2>{show.name} · {show.version}</h2>
        </div>
        <div className="stage-legend">
          {(["面光", "侧光", "逆光", "追光", "效果光"] as FixtureType[]).map((t) => (
            <span key={t} className={activeTypes.size === 0 || activeTypes.has(t) ? "" : "off"}>
              <i className={`dot shape-${t}`} />
              {t}
            </span>
          ))}
        </div>
      </div>

      <svg
        ref={svgRef}
        className="stage"
        viewBox={`0 0 ${VW} ${VH}`}
        onPointerMove={onPointerMove}
        onPointerUp={() => (dragging.current = null)}
        onPointerLeave={() => (dragging.current = null)}
      >
        {/* 台外区域 */}
        <rect x={0} y={0} width={VW} height={VH} fill="#0f1526" />
        {/* 舞台 */}
        <rect
          x={X(-8)}
          y={Y(8)}
          width={X(8) - X(-8)}
          height={Y(-5) - Y(8)}
          fill="#202a44"
          stroke="#3b4a6b"
          strokeWidth={2}
        />
        {/* 网格（1 米） */}
        {Array.from({ length: 15 }, (_, i) => -7 + i).map((gx) => (
          <line key={`vx${gx}`} x1={X(gx)} y1={Y(-5)} x2={X(gx)} y2={Y(8)} stroke="#2b3856" strokeWidth={1} />
        ))}
        {Array.from({ length: 12 }, (_, i) => -4 + i).map((gy) => (
          <line key={`hy${gy}`} x1={X(-8)} y1={Y(gy)} x2={X(8)} y2={Y(gy)} stroke="#2b3856" strokeWidth={1} />
        ))}
        {/* 中心线 / 台口 */}
        <line x1={X(0)} y1={Y(-5)} x2={X(0)} y2={Y(8)} stroke="#42557f" strokeDasharray="6 6" />
        <line x1={X(-8)} y1={Y(-5)} x2={X(8)} y2={Y(-5)} stroke="#7c8db5" strokeWidth={4} />
        <text x={X(0)} y={Y(-5) + 26} textAnchor="middle" fill="#9fb0d4" fontSize={15}>
          台口 / 观众席
        </text>
        <text x={X(0) - 4} y={Y(8) - 10} textAnchor="end" fill="#9fb0d4" fontSize={13}>后区 8m</text>
        <text x={X(-8) + 6} y={Y(-5) - 6} fill="#9fb0d4" fontSize={13}>-8m</text>
        <text x={X(8) - 6} y={Y(-5) - 6} textAnchor="end" fill="#9fb0d4" fontSize={13}>8m</text>

        {/* 光束（当前预览 Cue） */}
        {beams.map(({ f, fs, target, color }) => {
          const x1 = X(f.pos.x);
          const y1 = Y(f.pos.y);
          const x2 = X(target.x);
          const y2 = Y(target.y);
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const w = 10;
          const opacity = 0.08 + (fs.brightness / 100) * 0.42;
          return (
            <polygon
              key={`beam-${f.id}`}
              points={`${x1},${y1} ${x2 + nx * w},${y2 + ny * w} ${x2 - nx * w},${y2 - ny * w}`}
              fill={color}
              opacity={opacity}
            />
          );
        })}

        {/* 灯具 */}
        {show.fixtures.map((f) => {
          const dim = activeTypes.size > 0 && !activeTypes.has(f.type);
          const gel = gelOf(loadedGelFor(show, session, f.id));
          const active = activeFixtureIds.has(f.id);
          return (
            <g
              key={f.id}
              className={`fixture ${dim ? "dim" : ""} ${active ? "active" : ""}`}
              opacity={dim ? 0.25 : 1}
            >
              <g fill={active ? "#fde68a" : "#cbd5e1"} stroke="#0f1526" strokeWidth={1.5}>
                {fixtureShape(f)}
              </g>
              <circle cx={X(f.pos.x)} cy={Y(f.pos.y) - 14} r={5} fill={gel?.color} stroke="#0f1526" />
              <text
                x={X(f.pos.x)}
                y={Y(f.pos.y) + 24}
                textAnchor="middle"
                fill={active ? "#fde68a" : "#c6d2ea"}
                fontSize={12}
              >
                {f.id}
              </text>
            </g>
          );
        })}

        {/* 走位标记：期望（虚环）+ 实测落点（可拖拽圆点） */}
        {cue.roles.map((cr) => {
          const role = show.roles.find((r) => r.id === cr.roleId)!;
          const expected = expectedMark(cue, cr.roleId, session.blockingOffset[cr.roleId]);
          const actual = session.actual[cue.id]?.[cr.roleId] ?? expected;
          const dev = distance(actual, expected);
          const over = dev > DEVIATION_LIMIT_M;
          const subbed = !!session.substitutions[cr.roleId];
          return (
            <g key={cr.roleId}>
              {dev > 0.05 && (
                <line
                  x1={X(expected.x)}
                  y1={Y(expected.y)}
                  x2={X(actual.x)}
                  y2={Y(actual.y)}
                  stroke={over ? "#ef4444" : "#94a3b8"}
                  strokeWidth={over ? 3 : 1.5}
                  strokeDasharray="5 4"
                />
              )}
              {/* 期望落点：十字虚环 */}
              <circle
                cx={X(expected.x)}
                cy={Y(expected.y)}
                r={11}
                fill="none"
                stroke={role.color}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              <line x1={X(expected.x) - 15} y1={Y(expected.y)} x2={X(expected.x) + 15} y2={Y(expected.y)} stroke={role.color} strokeWidth={1} />
              <line x1={X(expected.x)} y1={Y(expected.y) - 15} x2={X(expected.x)} y2={Y(expected.y) + 15} stroke={role.color} strokeWidth={1} />
              {/* 实测落点：可拖动 */}
              <circle
                cx={X(actual.x)}
                cy={Y(actual.y)}
                r={9}
                fill={role.color}
                stroke={over ? "#ef4444" : "#ffffff"}
                strokeWidth={over ? 3.5 : 2}
                className="actual-mark"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  dragging.current = cr.roleId;
                }}
              />
              <text
                x={X(actual.x)}
                y={Y(actual.y) - 16}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={13}
                fontWeight={700}
              >
                {roleActorName(show, session, cr.roleId)}
                {subbed ? " · 替" : ""}
                {dev > 0.05 ? ` ${round1(dev)}m` : ""}
              </text>
            </g>
          );
        })}

        {/* 停止原因横幅（舞台图说明原因） */}
        {result?.status === "stopped" && (
          <g>
            <rect x={120} y={14} width={760} height={30 + result.reasons.length * 20} rx={8} fill="rgba(239,68,68,0.92)" />
            <text x={140} y={36} fill="#fff" fontSize={15} fontWeight={800}>
              ⛔ 停在 {cue.code}：{result.reasons[0]}
            </text>
            {result.reasons.slice(1).map((r, i) => (
              <text key={r} x={140} y={58 + i * 20} fill="#fff" fontSize={14}>
                {r}
              </text>
            ))}
          </g>
        )}
        {result?.status === "passed" && (
          <g>
            <rect x={360} y={14} width={280} height={30} rx={8} fill="rgba(34,197,94,0.92)" />
            <text x={500} y={34} textAnchor="middle" fill="#fff" fontSize={15} fontWeight={800}>
              ✓ {cue.code} 确认通过
            </text>
          </g>
        )}
      </svg>
      <p className="hint">
        虚线十字＝走位调整后的期望落点；彩色圆点＝实测落点，可直接拖动。偏差超过 {DEVIATION_LIMIT_M}m 时圆点描红。
      </p>
    </section>
  );
}

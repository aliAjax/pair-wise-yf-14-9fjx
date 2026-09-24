import type { ShowData } from "./types";

// 本场演出的基线业务数据（灯位、通道、色片、Cue 顺序）。
// 排练换角的所有临时状态都不写回这里，恢复原角色 / 结束排练即回到此基线。
export const SHOW: ShowData = {
  name: "《夜航·码头》",
  stageWidthM: 14,
  stageDepthM: 9,
  gels: {
    L000: { code: "L000", name: "白光", color: "#f8fafc" },
    L101: { code: "L101", name: "明黄", color: "#facc15" },
    L117: { code: "L117", name: "浅蓝", color: "#7dd3fc" },
    L158: { code: "L158", name: "暖橙", color: "#fb923c" },
    L205: { code: "L205", name: "深蓝", color: "#1d4ed8" },
    L022: { code: "L022", name: "品红", color: "#d946ef" },
  },
  fixtures: [
    { id: "FOH-01", name: "面光桥·左", channel: "CH 011", type: "面光", position: { x: -4.5, y: -2.2 }, loadedGel: "L000", brightness: 80 },
    { id: "FOH-03", name: "追光·台右", channel: "CH 013", type: "追光", position: { x: 3.6, y: -2.6 }, loadedGel: "L205", brightness: 70 },
    { id: "FOH-04", name: "追光·台左", channel: "CH 014", type: "追光", position: { x: -3.6, y: -2.6 }, loadedGel: "L158", brightness: 70 },
    { id: "SL-01", name: "侧光吊笼·上场门", channel: "CH 021", type: "侧光", position: { x: -7.3, y: 3.2 }, loadedGel: "L117", brightness: 60 },
    { id: "SR-01", name: "侧光吊笼·下场门", channel: "CH 024", type: "侧光", position: { x: 7.3, y: 4.6 }, loadedGel: "L158", brightness: 55 },
    { id: "BK-01", name: "逆光排灯", channel: "CH 031", type: "逆光", position: { x: 0, y: 9.4 }, loadedGel: "L101", brightness: 75 },
    { id: "FX-02", name: "效果光·云灯", channel: "CH 041", type: "效果光", position: { x: -5, y: 9.4 }, loadedGel: "L022", brightness: 40 },
  ],
  actors: [
    { id: "A1", name: "林岚（原）" },
    { id: "A2", name: "周野（原）" },
    { id: "A3", name: "沈雪（替补）" },
    { id: "A4", name: "高远（替补）" },
  ],
  roles: [
    { id: "R1", name: "苏芳", baselineActorId: "A1", substituteActorIds: ["A3"] },
    { id: "R2", name: "信使", baselineActorId: "A2", substituteActorIds: ["A4"] },
  ],
  cues: [
    { id: "Cue 1", name: "前场钟声·暖场", order: 1, fixtureId: "FOH-01", expectedMark: { x: 0, y: 2 }, expectedGel: "L000", brightness: 40 },
    { id: "Cue 8", name: "苏芳追光入场", order: 2, fixtureId: "FOH-03", roleId: "R1", expectedMark: { x: -2.2, y: 3.6 }, expectedGel: "L205", brightness: 65, note: "二幕开场，门口定位" },
    { id: "Cue 12", name: "冷蓝侧光", order: 3, fixtureId: "SL-01", expectedMark: { x: 0, y: 4.5 }, expectedGel: "L117", brightness: 60 },
    { id: "Cue 18", name: "信使站台追光", order: 4, fixtureId: "FOH-04", roleId: "R2", expectedMark: { x: 2.4, y: 5.2 }, expectedGel: "L158", brightness: 60, note: "站木箱前沿" },
    { id: "Cue 20", name: "梦境效果", order: 5, fixtureId: "FX-02", expectedMark: { x: -3.5, y: 6.2 }, expectedGel: "L022", brightness: 40 },
    { id: "Cue 24", name: "暖色谢幕", order: 6, fixtureId: "BK-01", expectedMark: { x: 0, y: 3 }, expectedGel: "L101", brightness: 80 },
  ],
};

// 刚换角时替补相对基线走位的默认偏差（排练实测走位前的初值，灯光师可拖图/输入修正）
export const DEFAULT_SUBSTITUTE_OFFSET: Record<string, { x: number; y: number }> = {
  R1: { x: 1.8, y: -0.5 }, // ≈1.87m，超 1.5m
  R2: { x: -0.4, y: 0.9 }, // ≈0.99m，容差内
};

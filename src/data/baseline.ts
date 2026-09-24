import type { Show } from "./types";

// 基线业务数据：演出、灯具、色片、角色走位、Cue 触发顺序。
// 排练期间任何临时换角 / 走位调整都只写入排练会话（state），不修改这里。

export const DEVIATION_LIMIT_M = 1.5; // 落点偏差允许上限（米）

export const baselineShow: Show = {
  id: "harbor-dawn",
  name: "《海港之晨》",
  version: "版本 B · 二幕联排",
  gels: [
    { code: "W2", name: "暖白", color: "#ffe7b3" },
    { code: "B6", name: "冷蓝", color: "#8ec5ff" },
    { code: "A3", name: "琥珀", color: "#f4a259" },
    { code: "R1", name: "酒红", color: "#b23a48" },
    { code: "G7", name: "苔绿", color: "#6a994e" },
    { code: "P9", name: "紫罗兰", color: "#9d4edd" },
    { code: "C5", name: "青蓝", color: "#48cae4" },
    { code: "CL", name: "无色", color: "#f8fafc" },
  ],
  fixtures: [
    // 面光（台口外）
    { id: "FOH-01", label: "面光一", type: "面光", channel: 1, pos: { x: -6, y: -6 }, gel: "W2" },
    { id: "FOH-02", label: "面光二", type: "面光", channel: 2, pos: { x: -2, y: -6 }, gel: "W2" },
    { id: "FOH-04", label: "面光三", type: "面光", channel: 4, pos: { x: 2, y: -6 }, gel: "W2" },
    { id: "FOH-05", label: "面光四", type: "面光", channel: 5, pos: { x: 6, y: -6 }, gel: "W2" },
    // 追光（台口外高位）
    { id: "FOH-03", label: "追光甲", type: "追光", channel: 3, pos: { x: 0, y: -7 }, gel: "W2" },
    { id: "FOH-06", label: "追光乙", type: "追光", channel: 6, pos: { x: 7.5, y: -7 }, gel: "CL" },
    // 侧光（两侧灯架）
    { id: "SL-01", label: "左桥一", type: "侧光", channel: 21, pos: { x: -8.6, y: -2 }, gel: "B6" },
    { id: "SL-02", label: "左桥二", type: "侧光", channel: 22, pos: { x: -8.6, y: 3 }, gel: "B6" },
    { id: "SL-03", label: "右桥一", type: "侧光", channel: 23, pos: { x: 8.6, y: -2 }, gel: "C5" },
    { id: "SL-04", label: "右桥二", type: "侧光", channel: 24, pos: { x: 8.6, y: 3 }, gel: "C5" },
    // 逆光（后区灯杆）
    { id: "BL-01", label: "逆光一", type: "逆光", channel: 31, pos: { x: -5, y: 7.2 }, gel: "P9" },
    { id: "BL-02", label: "逆光二", type: "逆光", channel: 32, pos: { x: 0, y: 7.2 }, gel: "P9" },
    { id: "BL-03", label: "逆光三", type: "逆光", channel: 33, pos: { x: 5, y: 7.2 }, gel: "R1" },
    // 效果光
    { id: "FX-01", label: "晨光效果", type: "效果光", channel: 41, pos: { x: -7, y: 6.8 }, gel: "A3" },
    { id: "FX-02", label: "月影效果", type: "效果光", channel: 42, pos: { x: 7, y: 6.8 }, gel: "B6" },
    { id: "FX-03", label: "雾汽地排", type: "效果光", channel: 43, pos: { x: 0, y: -4.6 }, gel: "G7" },
  ],
  roles: [
    { id: "R1", name: "林晚（主角）", understudy: "周替补", color: "#7c3aed" },
    { id: "R2", name: "陈潮（对手）", understudy: "吴替补", color: "#f59e0b" },
    { id: "R3", name: "小鸥（信使）", understudy: "郑替补", color: "#06b6d4" },
  ],
  cues: [
    {
      id: "q12",
      code: "Cue 12",
      name: "二幕开场 · 冷蓝侧光",
      order: 1,
      note: "纯氛围 Cue，无演员落点",
      fixtures: [
        { fixtureId: "SL-01", brightness: 65 },
        { fixtureId: "SL-02", brightness: 65 },
        { fixtureId: "FX-02", brightness: 20 },
      ],
      roles: [],
    },
    {
      id: "q13",
      code: "Cue 13",
      name: "主角登场",
      order: 2,
      note: "主角上场门入场走位",
      fixtures: [
        { fixtureId: "FOH-03", brightness: 90, targetRoleId: "R1" },
        { fixtureId: "SL-01", brightness: 35 },
      ],
      roles: [{ roleId: "R1", mark: { x: -5.5, y: -1 } }],
    },
    {
      id: "q18",
      code: "Cue 18",
      name: "追光入场 · 门口对位",
      order: 3,
      note: "需演员走位确认",
      fixtures: [
        { fixtureId: "FOH-03", brightness: 100, targetRoleId: "R1" },
        { fixtureId: "FOH-01", brightness: 40 },
        { fixtureId: "FOH-02", brightness: 40 },
        { fixtureId: "FX-01", brightness: 25 },
      ],
      roles: [
        { roleId: "R1", mark: { x: 0, y: -3 } },
        { roleId: "R2", mark: { x: 4.5, y: 0 } },
      ],
    },
    {
      id: "q22",
      code: "Cue 22",
      name: "双人对峙",
      order: 4,
      fixtures: [
        { fixtureId: "FOH-03", brightness: 85, targetRoleId: "R1" },
        { fixtureId: "FOH-06", brightness: 85, targetRoleId: "R2" },
        { fixtureId: "BL-03", brightness: 30 },
      ],
      roles: [
        { roleId: "R1", mark: { x: -2, y: 1 } },
        { roleId: "R2", mark: { x: 2, y: 1 } },
      ],
    },
    {
      id: "q23",
      code: "Cue 23",
      name: "信使穿梭",
      order: 5,
      fixtures: [
        { fixtureId: "FOH-06", brightness: 80, targetRoleId: "R3" },
        { fixtureId: "SL-03", brightness: 45 },
      ],
      roles: [{ roleId: "R3", mark: { x: 0, y: -1 } }],
    },
    {
      id: "q24",
      code: "Cue 24",
      name: "暖色谢幕",
      order: 6,
      note: "全台面光 80%，追光改琥珀色片",
      fixtures: [
        { fixtureId: "FOH-01", brightness: 80, gel: "A3" },
        { fixtureId: "FOH-02", brightness: 80, gel: "A3" },
        { fixtureId: "FOH-04", brightness: 80, gel: "A3" },
        { fixtureId: "FOH-05", brightness: 80, gel: "A3" },
        { fixtureId: "FOH-03", brightness: 95, gel: "A3", targetRoleId: "R1" },
        { fixtureId: "FX-01", brightness: 60 },
      ],
      roles: [{ roleId: "R1", mark: { x: 0, y: -2.5 } }],
    },
  ],
};

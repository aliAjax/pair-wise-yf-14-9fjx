// 业务数据模型：演出的基线纸头数据，与排练过程、界面无关

export interface Point {
  /** 舞台坐标，单位：米；x 向右为正，y 自台口向天幕为正 */
  x: number;
  y: number;
}

export type FixtureType = "面光" | "侧光" | "逆光" | "效果光" | "追光";

export interface Gel {
  code: string; // 色片编号，如 L205
  name: string; // 色片中文名
  color: string; // 界面展示用色块
}

export interface Fixture {
  id: string; // 灯具编号，如 FOH-03
  name: string;
  channel: string; // 通道号
  type: FixtureType;
  position: Point; // 灯位（舞台平面坐标，米）
  loadedGel: string; // 基线装片（色片编号）
  brightness: number; // 亮度预设 %
}

export interface Actor {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  name: string; // 角色名
  baselineActorId: string; // 原演员
  substituteActorIds: string[]; // 可顶的替补
}

export interface Cue {
  id: string; // Cue 编号，如 Cue 18
  name: string;
  order: number; // Cue 触发顺序
  fixtureId: string; // 引用灯具
  roleId?: string; // 追光引用的角色（无角色即为无演员落点的普通光 Cue）
  expectedMark: Point; // 基线焦点/演员落点（米）
  expectedGel: string; // 色片要求
  brightness: number; // 亮度预设 %
  note?: string;
}

export interface ShowData {
  name: string;
  stageWidthM: number;
  stageDepthM: number;
  gels: Record<string, Gel>;
  fixtures: Fixture[];
  actors: Actor[];
  roles: Role[];
  cues: Cue[];
}

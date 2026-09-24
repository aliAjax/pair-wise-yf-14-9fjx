// 业务数据类型（基线数据，排练期间不可变）

export type FixtureType = "面光" | "侧光" | "逆光" | "追光" | "效果光";

export interface Pos {
  x: number; // 米，台口横向，右为正
  y: number; // 米，纵深，上场门方向为正
}

export interface Gel {
  code: string; // 色片编号，如 W2 / B6
  name: string;
  color: string;
}

export interface Fixture {
  id: string; // 灯具编号
  label: string;
  type: FixtureType;
  channel: number; // 通道号
  pos: Pos; // 灯位（舞台平面坐标，米）
  gel: string; // 基线装载色片编号
}

export interface Role {
  id: string;
  name: string; // 原演员 / 角色
  understudy: string; // 替补演员
  color: string;
}

export interface FixtureState {
  fixtureId: string;
  gel?: string; // 本 Cue 要求的色片；不填表示沿用当前装片
  brightness: number; // 亮度预设 0-100
  targetRoleId?: string; // 追光跟随的角色
}

export interface CueRoleMark {
  roleId: string;
  mark: Pos; // 基线走位落点
}

export interface Cue {
  id: string;
  code: string; // Cue 编号，如 Cue 18
  name: string;
  order: number; // 触发顺序
  note?: string;
  fixtures: FixtureState[];
  roles: CueRoleMark[];
}

export interface Show {
  id: string;
  name: string;
  version: string;
  gels: Gel[];
  fixtures: Fixture[];
  roles: Role[];
  cues: Cue[];
}

import type { CabinetUSlot } from '@/services/assets/dc-overview';

/** 所有 U 位弹窗共用的 props */
export interface USlotModalBaseProps {
  visible: boolean;
  /** 当前操作的 U 位（弹窗打开时传入） */
  slot: CabinetUSlot | null;
  /** 机柜编码（用于弹窗内提示文案） */
  cabinetCode: string;
  /** 当前机柜 id（调后端 6.7~6.13 接口用） */
  cabinetId: number | string;
  /** 当前机柜全部 U 位（用于本地校验连续空闲段） */
  allSlots: CabinetUSlot[];
  onClose: () => void;
  /** 提交成功回调，由父组件负责实际 patch 数据 */
  onSuccess: (positions: number[], patch: Partial<CabinetUSlot>) => void;
  /** 操作成功后重新拉取 U 位列表（保证与后端一致） */
  reload: () => void;
}

/** 校验结果 */
export interface ValidationResult {
  ok: boolean;
  msg: string;
  endPos: number;
}

const FORM_LAYOUT = {
  labelCol: { span: 5 },
  wrapperCol: { span: 19 },
};

export { FORM_LAYOUT };

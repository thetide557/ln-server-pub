import type { CabinetUSlot } from '@/services/assets/dc-overview';
import type { ValidationResult } from './types';

const STATUS_LABEL: Record<CabinetUSlot['status'], string> = {
  used: '已占用', idle: '空闲', reserved: '预留', fault: '故障', disabled: '禁用',
};

/** 获取与指定 slot 属于同一资产占用的所有 U 位 */
export function getAssetUPositions(slot: CabinetUSlot, allSlots: CabinetUSlot[]): number[] {
  if (!slot.asset_name) return [slot.u_position];
  const hasIp = !!slot.asset_ip;
  const same = allSlots.filter(
    (s) => s.asset_name === slot.asset_name && (!hasIp || s.asset_ip === slot.asset_ip),
  );
  if (same.length === 0) return [slot.u_position];
  return same.map((s) => s.u_position).sort((a, b) => a - b);
}

/** 校验从 startPos 开始 height 个连续 U 位是否全 idle */
export function validateContiguousIdle(
  startPos: number, height: number, allSlots: CabinetUSlot[],
): ValidationResult {
  const endPos = startPos + height - 1;
  if (height <= 0) return { ok: false, msg: '占用高度必须大于 0', endPos };
  for (let u = startPos; u <= endPos; u++) {
    const s = allSlots.find((x) => x.u_position === u);
    if (!s) return { ok: false, msg: `U${u} 不存在`, endPos };
    if (s.status !== 'idle') {
      return {
        ok: false, endPos,
        msg: `U${startPos} - U${endPos} 非连续空闲，不可用（U${u} 状态：${STATUS_LABEL[s.status]}）`,
      };
    }
  }
  return { ok: true, endPos, msg: `连续 ${height}U 可用（U${startPos} - U${endPos}）` };
}

/** 当前时间戳（mock 用） */
export function nowStr(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

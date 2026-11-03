interface RelativeTimeRange {
  start: number;
  end: number;
}

interface TimeOption {
  start: string;
  end: string;
  display?: string;
}

const regex = /^now$|^now\-(\d{1,10})([wdhms])$/;

export const mapOptionToRelativeTimeRange = (option: TimeOption): RelativeTimeRange | undefined => {
  return {
    start: relativeToSeconds(option.start),
    end: relativeToSeconds(option.end),
  };
};

// ---- 第六步 第4段 W0-6 修复轮（R0 第 6 条）----
// 把这个函数升级成 fe v9.1.0 的样子（fe:src/components/TimeRangePicker/RelativeTimeRangePicker/utils.ts:37-54，逐字）。
// 为什么要动：pub 老版本的签名只收 { start, end }，收不下 cumulative_window_from / cumulative_window_to
//（「累计窗口」，比如「今天到现在」这种起点固定、终点滚动的时间范围，后端存的是 now/d 这样的字符串而不是秒数）。
// 而 Form/utils.ts 的 V9 新编辑器分支要照 fe 的写法把这两个字段一起还原回表单，不放宽签名 tsc 就报 TS2345。
// 只放宽类型不加下面那段 if 是不够的——那样这两个字段会被静默丢掉，回填还是错的。
// 现状说明：pub 目前**没有**任何地方会把这两个字段存进规则里（提交侧的 mapOptionToRelativeTimeRange 还是老版本，
// 见 :14-19，它永远不产出这两个字段），所以下面这个 if 分支对现有数据不可达，**当前行为零变化**；
// 等提交侧补齐之后这条回填路径才真正起作用。提交侧那一半是另一件事，登记在 拿不准-W0.md U-09，本轮不动。
export const mapRelativeTimeRangeToOption = (
  range: RelativeTimeRange & {
    cumulative_window_from?: string;
    cumulative_window_to?: string;
  },
): TimeOption => {
  if (range.cumulative_window_from && range.cumulative_window_to) {
    return {
      start: range.cumulative_window_from,
      end: range.cumulative_window_to,
      display: `${range.cumulative_window_from} to ${range.cumulative_window_to}`,
    };
  }
  const start = secondsToRelativeFormat(range.start);
  const end = secondsToRelativeFormat(range.end);

  return { start, end, display: `${start} to ${end}` };
};

export type RangeValidation = {
  isValid: boolean;
  errorMessage?: string;
};

export const isRangeValid = (relative: string, now = Date.now()): RangeValidation => {
  if (!isRelativeFormat(relative)) {
    return {
      isValid: false,
      errorMessage: 'Value not in relative time format.',
    };
  }

  const seconds = relativeToSeconds(relative);

  if (seconds > Math.ceil(now / 1000)) {
    return {
      isValid: false,
      errorMessage: 'Can not enter value prior to January 1, 1970.',
    };
  }

  return { isValid: true };
};

export const isRelativeFormat = (format: string): boolean => {
  return regex.test(format);
};

const relativeToSeconds = (relative: string): number => {
  const match = regex.exec(relative);

  if (!match || match.length !== 3) {
    return 0;
  }

  const [, value, unit] = match;
  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    return 0;
  }

  return parsed * units[unit];
};

const units: Record<string, number> = {
  w: 604800,
  d: 86400,
  h: 3600,
  m: 60,
  s: 1,
};

const secondsToRelativeFormat = (seconds: number): string => {
  if (seconds <= 0) {
    return 'now';
  }

  if (seconds >= units.w && seconds % units.w === 0) {
    return `now-${seconds / units.w}w`;
  }

  if (seconds >= units.d && seconds % units.d === 0) {
    return `now-${seconds / units.d}d`;
  }

  if (seconds >= units.h && seconds % units.h === 0) {
    return `now-${seconds / units.h}h`;
  }

  if (seconds >= units.m && seconds % units.m === 0) {
    return `now-${seconds / units.m}m`;
  }

  return `now-${seconds}s`;
};

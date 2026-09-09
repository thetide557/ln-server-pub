/**
 * 第六步 第4段 W1-SQL组：fe v9.1.0 `src/components/InputGroupWithFormItem/index.tsx` 的本地副本。
 *
 * 为什么要它：doris 的告警查询卡片用 `addonAfter` 把「查询周期的单位」下拉挂在输入框右边
 * （`src/plugins/doris/AlertRule/Query.tsx` 的 query.interval 那一组，fe 原文 `:155-168`），
 * 而羚牛 pub 的公共组件是老版、只有 children / label / labelWidth / noStyle 四个 props
 * （见 `src/components/InputGroupWithFormItem/index.tsx`），没有 `addonAfter`——
 * 直接用就是 `error TS2322: Property 'addonAfter' does not exist`（本轮 tsc 第 2 个报错）。
 *
 * 按本轮纪律「pub 已有且不一致的共享文件一律保留 pub 版、不许覆盖」，不去升那个公共组件
 * （pub 很多页面在用它）。做法照第六步 ES 升级轮（step6f）的先例：
 * `src/pages/explorer/Elasticsearch/components/InputGroupWithFormItem.tsx` 就是同样一份本地副本。
 *
 * 与 fe 原文的差别只有一处：样式 import 从 './style.less' 改成 pub 现有的
 * '@/components/InputGroupWithFormItem/style.less'（同一份类名，不新增样式文件），与 step6f 那份一致。
 *
 * 遗留：现在同一个组件在仓库里有三份（pub 公共老版 / ES 那份 / 这份）。
 * 建议由 lead 收尾时统一（登记在 `第六步-流水线/第4段/拿不准-SQL组.md` U-06），本轮不动共享件。
 */
import React, { CSSProperties } from 'react';
import { Input } from 'antd';
import classNames from 'classnames';
import '@/components/InputGroupWithFormItem/style.less';

interface IProps {
  children: React.ReactNode;
  label: React.ReactNode;
  labelWidth?: number | string;
  labelMinWidth?: number | string;
  noStyle?: boolean;
  customStyle?: CSSProperties;
  addonAfter?: React.ReactNode;
  addonAfterWithContainer?: React.ReactNode;
  size?: 'small' | 'middle';
  className?: string;
}

export default function index(props: IProps) {
  const { children, label, labelWidth = 'max-content', labelMinWidth, noStyle = false, customStyle, addonAfter, addonAfterWithContainer, size = 'middle', className } = props;

  return (
    <Input.Group compact className={classNames('input-group-with-form-item', className)}>
      <span
        className={classNames({
          'ant-input-group-addon': !noStyle,
          'input-group-with-form-item-label': true,
          'input-group-with-form-item-label-small': size === 'small',
        })}
        style={{
          minWidth: labelMinWidth,
          width: labelWidth,
          maxWidth: 'unset',
          ...customStyle,
        }}
      >
        {label}
      </span>
      <div className={classNames('input-group-with-form-item-content', { 'input-group-with-form-item-content-small': size === 'small' })}>{children}</div>
      {addonAfter && <span className='ant-input-group-addon'>{addonAfter}</span>}
      {addonAfterWithContainer}
    </Input.Group>
  );
}

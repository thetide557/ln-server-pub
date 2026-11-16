/**
 * 第六步 ES 升级轮（step6f）：fe v9.1.0 `src/components/InputGroupWithFormItem/index.tsx` 的本地副本。
 *
 * 为什么要它：fe 那一版比羚牛 pub 的多四个 props——`addonAfter`（在输入框右边再挂一块，ES 查询栏用它放
 * 「查询条件历史记录」按钮）、`addonAfterWithContainer`、`labelMinWidth`、`size`、`className`
 * （对比 pub `src/components/InputGroupWithFormItem/index.tsx`，只有 children / label / labelWidth / noStyle）。
 * 按本轮纪律「pub 已有且不一致的共享文件一律保留 pub 版、pub 现有共享文件不许动」，
 * 不去升 pub 那个公共组件（它被 pub 很多页面用着），只在 ES 这一层用这份本地副本。
 *
 * 与 fe 原文的差别只有一处：样式 import 从 './style.less' 改成 pub 现有的
 * '@/components/InputGroupWithFormItem/style.less'（同一份类名，不新增样式文件）。
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

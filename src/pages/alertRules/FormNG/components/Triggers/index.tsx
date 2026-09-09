import React from 'react';
import Triggers from './Triggers';

interface IProps {
  prefixField?: any;
  fullPrefixName?: (string | number)[]; // 完整的前置字段名，用于 getFieldValue 获取指定字段的值
  prefixName?: (string | number)[]; // 列表字段名
  queries: any[];
  disabled?: boolean;
  initialValue?: any;
  // 第六步 第4段 W0：cate 在 fe 里是顶层字段，羚牛在每条策略上，所以改成可以由上层传进来（{...props} 直接透传）
  cate?: string;
}

export default function index(props: IProps) {
  return <Triggers {...props} />;
}

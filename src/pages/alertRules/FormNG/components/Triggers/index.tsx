import React from 'react';
import Triggers from './Triggers';

interface IProps {
  prefixField?: any;
  fullPrefixName?: (string | number)[]; // 完整的前置字段名，用于 getFieldValue 获取指定字段的值
  prefixName?: (string | number)[]; // 列表字段名
  queries: any[];
  disabled?: boolean;
  initialValue?: any;
  catePath?: (string | number)[]; // 第六步 第4段 W0：cate 字段的绝对路径，不传默认 ['cate']（fe 原样）
}

export default function index(props: IProps) {
  return <Triggers {...props} />;
}

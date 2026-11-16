// 2026-10-05 N16 摞二：复制自 fe v9.1.0 同路径（羚牛原无 Dashboard/；接线照 ck / doris）。
import React, { useState, useEffect } from 'react';
import { Input } from 'antd';

interface Props {
  value?: string;
  onChange?: (value?: string) => void;
}

export default function LegendInput({ value, onChange }: Props) {
  const [curValue, setCurValue] = useState(value);

  useEffect(() => {
    if (curValue !== value) {
      setCurValue(value);
    }
  }, [value]);

  return (
    <Input
      value={curValue}
      onChange={(e) => {
        setCurValue(e.target.value);
      }}
      onBlur={() => {
        onChange && onChange(curValue);
      }}
      onPressEnter={() => {
        onChange && onChange(curValue);
      }}
    />
  );
}

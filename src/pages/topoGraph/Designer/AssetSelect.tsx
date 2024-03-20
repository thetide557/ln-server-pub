import { getAssetStatus } from '@/services/assets/asset';
import { Select } from 'antd';
import React, { useEffect, useState } from 'react';

interface IProps {
  value?: number;
  onChange?: (number) => void;
  onAfterChange?: (number) => void;
}
const AssetSelect = ({ value, onChange, onAfterChange }: IProps) => {
  const [options, setOptions] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    getAssetStatus().then((res) => {
      setOptions(
        res.dat.map((v) => {
          return {
            label: `[${v.ip}]${v.name}`,
            value: v.id,
          };
        }),
      );
    });
  }, []);

  return (
    <Select
      onChange={(v) => {
        onChange && onChange(v);
        onAfterChange && onAfterChange(v);
      }}
      defaultValue={value}
      options={options}
      showSearch
      filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
    ></Select>
  );
};

export default AssetSelect;

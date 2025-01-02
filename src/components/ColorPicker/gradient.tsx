import React, { useRef, useState } from 'react';
import ColorPicker, { useColorPicker } from 'react-best-gradient-color-picker'
import { Input, Popover } from 'antd';
import useOnClickOutside from '@/components/useOnClickOutside';
import './style.less';

interface IProps {
  value?: string;
  label?: string;
  onChange?: (val: string) => void;
}
export default function index(props: IProps) {
  const { value = '', label, onChange } = props;
  const [visible, setVisible] = useState(false);
  const eleRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(eleRef, () => {
    setVisible(false);
  });

  return (
    <Popover
      trigger='click'
      placement='left'
      visible={visible}
      overlayClassName='color-picker-popover'
      content={
        <div
          ref={eleRef}
          onMouseLeave={() => {
            setVisible(false);
          }}
        >
          <ColorPicker
            value={value}
            presets={[
              '#FF656B',
              '#FF8286',
              '#CE4F52',

              '#FF9919',
              '#FFAE39',
              '#CE7B00',

              '#E6C627',
              '#ECD245',
              '#B99F00',

              '#3FC453',
              '#61D071',
              '#2C9D3D',

              '#9470FF',
              '#634CD9',
              '#51566B',
              '#FFFFFF',
            ]}
            onChange={(val) => {
              if (onChange) {
                onChange(val);
              }
            }}
          />
        </div>
      }
    >
      <Input value={value} placeholder={`请选择${label}`} />
      <div
        style={{ background: value, width: 32, height: 32, borderRadius: 2, cursor: 'pointer', border: '1px solid #d9d9d9' }}
        onClick={() => {
          setVisible(!visible);
        }}
      />
    </Popover>
  );
}

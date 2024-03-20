import React from 'react';
import { ChromePicker } from 'react-color';

interface IProps {
  value?: string;
  onChange?: (string) => void;
  onChangeHandler?: any;
}

const ColorPicker = function ({ value, onChange, onChangeHandler }: IProps) {
  const color = value;

  return (
    <div
      className='color-wrapper'
      style={{
        background: color,
        width: '100%',
      }}
    >
      获取颜色
      <div className='color'>
        <ChromePicker
          color={color}
          onChangeComplete={(e) => {
            onChange && onChange(`rgba(${e.rgb.r},${e.rgb.g},${e.rgb.b},${e.rgb.a})`);
            onChangeHandler && onChangeHandler(`rgba(${e.rgb.r},${e.rgb.g},${e.rgb.b},${e.rgb.a})`);
          }}
        />
      </div>
    </div>
  );
};

export default ColorPicker;

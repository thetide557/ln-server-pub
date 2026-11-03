import { Button, Input } from 'antd';
import React, { useRef, useState } from 'react';

import PromQueryBuilderModal from '@/components/PromQueryBuilder/PromQueryBuilderModal';
import { IRawTimeRange } from '@/components/TimeRangePicker/types';
import PromQLInput from '@/components/PromQLInput';

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  datasource: number;
}

export default ({ value, onChange, datasource }: Props) => {
  const [range, setRange] = useState<IRawTimeRange>({ start: 'now-1h', end: 'now' });
  const promQLInputRef = useRef<any>(null);
  const url = '/api/n9e/proxy';

  const openModal = () => {
    PromQueryBuilderModal({
      range: range,
      datasourceValue: datasource,
      value: value,
      onChange: (v) => {
        onChange && onChange(v);
      },
    });
  };

  return (
    <Input.Group compact>
      <div style={{ width: 'calc(100% - 55px)' }}>
        <PromQLInput ref={promQLInputRef} url={url} value={value} onChange={onChange} completeEnabled={true} datasourceValue={datasource} />
      </div>
      <Button type='primary' onClick={() => openModal()}>
        向导
      </Button>
    </Input.Group>
  );
};

import PageLayout from '@/components/pageLayout';
import Design from '@/pages/topoGraph/Designer';
import { Button, Input, Modal, Space } from 'antd';
import React, { useState } from 'react';

interface IProps {
  value?: string;
  onChange?: (value: string) => void;
}

export default function ({ value = '', onChange }: IProps) {
  const [showModal, setShowModal] = useState(false);
  const [topoValue, setTopoValue] = useState(value);

  return (
    <>
      <Space>
        <Input.TextArea value={topoValue}></Input.TextArea>
        <Button
          onClick={() => {
            setShowModal(true);
          }}
        >
          编辑
        </Button>
      </Space>
      {showModal && (
        <div className='options-topo-editor'>
          <Design></Design>
        </div>
      )}
    </>
  );
}

import React from 'react';
import { Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

interface IProps {
  label: React.ReactNode;
  field: React.ReactNode;
  description: React.ReactNode;
  className?: string;
}

export default function HelpLabel(props: IProps) {
  const { label, field, description, className } = props;

  return (
    <span className={['alert-rule-help-label', className].filter(Boolean).join(' ')}>
      <span className='alert-rule-help-label-text'>{label}</span>
      <Tooltip
        placement='top'
        title={
          <div className='alert-rule-help-tooltip'>
            <div className='alert-rule-help-tooltip-field'>{field}</div>
            <div className='alert-rule-help-tooltip-description'>{description}</div>
          </div>
        }
      >
        <span
          className='alert-rule-help-icon'
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <QuestionCircleOutlined />
        </span>
      </Tooltip>
    </span>
  );
}

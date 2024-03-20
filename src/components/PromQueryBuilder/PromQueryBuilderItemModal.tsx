import React, { useState } from 'react';
import { Modal, message } from 'antd';
import moment from 'moment';
import ModalHOC, { ModalWrapProps } from '@/components/ModalHOC';
import { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import { putOptionalMetrics } from '@/services/assets';

import PromQueryBuilder, { MetricItem } from './item';
import { renderQuery } from './RawQuery';

interface IProps {
  datasourceValue: number;
  range: IRawTimeRange;
  value?: string;
  type?: string;
}

function PromQueryBuilderItemModal(props: ModalWrapProps & IProps) {
  const { visible, datasourceValue, range, value = '', type } = props;
  const parsedRange = parseRange(range);
  const start = moment(parsedRange.start).unix();
  const end = moment(parsedRange.end).unix();
  const [metrics, setMetrics] = useState<MetricItem[]>([]);

  return (
    <Modal
      width={950}
      title='资产指标设置'
      visible={visible}
      closable={false}
      onOk={() => {
        var isSubmitted = true;
        metrics.forEach((item) => {
          if (item.name == null || item.name.length == 0) {
            isSubmitted = false;
          }
        });
        if (!isSubmitted) {
          message.error('指标或名称信息不完整！');
          return;
        }
        const optional_metrics: { name: string; metrics: string }[] = [];
        metrics.forEach((item) => {
          optional_metrics.push({
            name: item.name,
            metrics: renderQuery(item.query),
          });
        });
        putOptionalMetrics({
          id: parseInt(value),
          optional_metrics,
        }).then((res) => {
          if (metrics.length > 0) {
            message.success('该资产可选指标已设置！');
          } else {
            message.success('该资产可选指标取消/未设置！');
          }
          props.destroy();
        });
      }}
      onCancel={() => {
        props.destroy();
      }}
    >
      <PromQueryBuilder
        datasourceValue={datasourceValue}
        params={{
          start,
          end,
        }}
        id={value}
        type={type}
        onChange={(metrics) => {
          setMetrics(metrics);
        }}
      />
    </Modal>
  );
}

export default ModalHOC<IProps>(PromQueryBuilderItemModal);

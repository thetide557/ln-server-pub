import React, { useEffect, useState } from 'react';
import { Row, Col, Button, Cascader, Space } from 'antd';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import PromQueryBuilderModal from '@/components/PromQueryBuilder/PromQueryBuilderModal';
import PromQLInput, { CMExpressionInputProps } from './index';
import './locale';
import { getMonitoringOptions } from '@/services/assets';

export function PromQLInputWithSelect(props: CMExpressionInputProps & { datasourceValue: number }) {
  const { t } = useTranslation('promQLInput');
  let inputProps: any = { ...props };
  const [monOptions, setmonOptions] = useState([]);

  // @ts-ignore
  if (props.id) {
    // @ts-ignore
    inputProps.key = props.id; // TODO 在 Form.List 中修改 list 后重置组件，解决状态更新 field.name 错误问题
    // inputProps = { key: props.id, ...inputProps };
  }

  useEffect(() => {
    getMonitoringOptions().then((res) => {
      setmonOptions(res.dat);
    });
  }, []);

  return (
    <Row gutter={8}>
      <Col flex='auto'>
        <PromQLInput {...inputProps} />
      </Col>
      <Col flex='100px'>
        <Space>
          <Cascader
            onChange={(val) => {
              props.onChange && props.onChange(val[1].toString());
            }}
            options={monOptions}
            placeholder='请选择指标'
          />
          <Button
            onClick={() => {
              PromQueryBuilderModal({
                // TODO: PromQL 默认是最近12小时，这块应该从使用组件的环境获取实际的时间范围
                range: {
                  start: 'now-12h',
                  end: 'now',
                },
                datasourceValue: props.datasourceValue,
                value: props.value,
                onChange: (val) => {
                  props.onChange && props.onChange(val);
                },
              });
            }}
            disabled={props.readonly}
          >
            {t('builder_btn')}
          </Button>
        </Space>
      </Col>
    </Row>
  );
}

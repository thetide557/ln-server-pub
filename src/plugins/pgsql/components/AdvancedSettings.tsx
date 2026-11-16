import React, { useState } from 'react';
import { Row, Col, Form, Tooltip, Select, Space } from 'antd';
import { DownOutlined, RightOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';
import UnitPicker from '@/pages/dashboard/Components/UnitPicker';
import { NAME_SPACE } from '@/plugins/pgsql/constants';

interface IProps {
  span?: number;
  prefixField?: any;
  prefixName?: (string | number)[];
  disabled?: boolean;
  mode: 'graph' | 'table';
  expanded?: boolean;
  expandTriggerVisible?: boolean;
  onChange?: (key: string, value: any) => void;
  options?: any[];
  showUnit?: boolean;
}

function AdvancedSettings(props: IProps) {
  // @ts-ignore
  const { t } = useTranslation(NAME_SPACE);
  const { span = 6, prefixField = {}, prefixName = [], disabled, mode, expandTriggerVisible = true, onChange, options = [], showUnit } = props;
  const [open, setOpen] = useState(!!props.expanded);

  return (
    <div>
      {expandTriggerVisible && (
        <div style={{ marginBottom: 8 }}>
          <span
            onClick={() => {
              setOpen(!open);
            }}
            style={{ cursor: 'pointer' }}
          >
            {/* @ts-ignore */}
            {open ? <DownOutlined /> : <RightOutlined />} {t('query.advancedSettings.title')}
          </span>
        </div>
      )}
      <div style={{ display: open ? 'block' : 'none' }}>
        <Row gutter={8}>
          {mode === 'graph' && (
            <>
              <Col span={span}>
                <InputGroupWithFormItem
                  label={
                    <Space>
                      {t('query.advancedSettings.valueKey')}
                      <Tooltip title={t('query.advancedSettings.valueKey_tip')}>
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                >
                  {/* N33 批 A-4（B-5）：值字段加必填。后端 datasource/mysql/mysql.go:152-153 对 mysql 直接报
                      `valueKey is required`；pgsql 这一侧（datasource/postgresql/postgresql.go:197-204）没有这句显式校验，
                      但空串在 dskit/sqlbase/timeseries.go:90 拆出来是 [""]，认不出任何值列 → 图上一条线都没有、也没有报错，
                      比报错更难排查。同一个组件的 mysql 版本（src/plugins/mysql/components/AdvancedSettings.tsx:63-68）
                      本来就有这条 rule，文案键 query.advancedSettings.valueKey_required 四语也都在
                      （src/plugins/pgsql/locale/{zh_CN,zh_HK,en_US,ja_JP,ru_RU}.ts），所以这里按 mysql 那份对齐。
                      该组件告警规则（AlertRule/Queries/index.tsx）与仪表盘（Dashboard/QueryBuilder.tsx）共用，两处都该必填。 */}
                  <Form.Item
                    {...prefixField}
                    name={[...prefixName, 'keys', 'valueKey']}
                    style={{ width: '100%' }}
                    rules={[
                      {
                        required: true,
                        message: t('query.advancedSettings.valueKey_required'),
                      },
                    ]}
                  >
                    <Select
                      mode='tags'
                      disabled={disabled}
                      placeholder={t('query.advancedSettings.tags_placeholder')}
                      open={_.isEmpty(options) ? false : undefined}
                      onChange={(val) => {
                        onChange && onChange('valueKey', val);
                      }}
                      options={options}
                    />
                  </Form.Item>
                </InputGroupWithFormItem>
              </Col>
              <Col span={span}>
                <InputGroupWithFormItem
                  label={
                    <Space>
                      {t('query.advancedSettings.labelKey')}
                      <Tooltip title={t('query.advancedSettings.labelKey_tip')}>
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                >
                  <Form.Item {...prefixField} name={[...prefixName, 'keys', 'labelKey']} style={{ width: '100%' }}>
                    <Select
                      mode='tags'
                      placeholder={t('query.advancedSettings.tags_placeholder')}
                      disabled={disabled}
                      open={_.isEmpty(options) ? false : undefined}
                      onChange={(val) => {
                        onChange && onChange('labelKey', val);
                      }}
                      options={options}
                    />
                  </Form.Item>
                </InputGroupWithFormItem>
              </Col>
              {showUnit && (
                <Col span={span}>
                  <InputGroupWithFormItem label={t('common:unit')}>
                    <Form.Item {...prefixField} name={[prefixField.name, 'unit']} initialValue='none'>
                      <UnitPicker optionLabelProp='cleanLabel' style={{ width: '100%' }} dropdownMatchSelectWidth={false} />
                    </Form.Item>
                  </InputGroupWithFormItem>
                </Col>
              )}
            </>
          )}
        </Row>
      </div>
    </div>
  );
}

export default AdvancedSettings;

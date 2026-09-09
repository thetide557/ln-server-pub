import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Row, Col, Form, Tooltip, AutoComplete, InputNumber, Select, Space } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';

// 第六步 第4段 W1：本文件用到了 InputGroupWithFormItem 的 `addonAfter`（本文件 :122 的索引模式设置按钮、
// :186 的 'Lucene' 角标、:206 的时间单位下拉），而羚牛公共版 `@/components/InputGroupWithFormItem`
// 只有 children / label / labelWidth / noStyle 四个 prop（`src/components/InputGroupWithFormItem/index.tsx:6-11`），
// 少了 addonAfter，直接用会报 error TS2322。pub 现有共享组件按纪律不许改，
// 所以改指向 ES 升级轮（step6f）已经放在 pub 里的那份 fe v9.1.0 本地副本——
// `src/pages/explorer/Elasticsearch/components/InputGroupWithFormItem.tsx`（它的文件头注释写了来历），
// 那份就是 fe v9.1.0 的原文，addonAfter 等四个 prop 都在。本组只读它、不改它。
import InputGroupWithFormItem from '@/pages/explorer/Elasticsearch/components/InputGroupWithFormItem';
import QueryName from '@/components/QueryName';
import DocumentDrawer from '@/components/DocumentDrawer';
import { CommonStateContext } from '@/App';
import { useIsAuthorized } from '@/components/AuthorizationWrapper';
import IndexPatternSettingsBtn from '@/pages/explorer/Elasticsearch/components/IndexPatternSettingsBtn';
import { getESIndexPatterns } from '@/pages/log/IndexPatterns/services';
import CardContainer, { CardContainerHeader } from '@/pages/alertRules/FormNG/components/CardContainer';

import LuceneInput from '@/plugins/elasticsearch/components/LuceneInput';

import GraphPreview from '../GraphPreview';
import Value from './Value';
import DateField from './DateField';
import AdvancedSettings from './AdvancedSettings';
import IndexPatternSelect from './IndexPatternSelect';
import GroupBy from './GroupBy';

interface Props {
  hideIndexPattern?: boolean;
  field: any;
  datasourceValue: number;
  // 第六步 第4段 W1：数据源 id 列表，只往下透给 GraphPreview 的「换数据源」下拉框
  datasourceValues?: number[];
  indexOptions: any[];
  disabled?: boolean;
  // 第六步 第4段 W1（规矩 A/B，出处 第4段/顾问问答-大顾问.md Q1 第二、三节）：
  fullPrefixName?: (string | number)[]; // 绝对路径的前半段（羚牛是 ['strategies']；fe 是 []）
  prefixName?: (string | number)[]; // 相对路径（羚牛是 [n, 'rule_config']；fe 是 ['rule_config']）
  cate?: string; // 数据源类型；fe 在表单顶层读，羚牛在每条策略上，改成传进来
  onClose?: () => void;
}

export default function Query(props: Props) {
  const { t, i18n } = useTranslation('alertRules');
  // 第六步 第4段 W1：fe 的 ICommonState 里有 darkMode（暗色模式开关），pub 的没有（src/App.tsx 不改），
  // 照 pub 已有先例加 as any，取到 undefined = 浅色（写法同 src/components/LogQL/index.tsx:78）。
  const { darkMode } = useContext(CommonStateContext) as any;
  const { field } = props;
  const { hideIndexPattern, datasourceValue, datasourceValues, indexOptions, disabled, onClose, fullPrefixName = [], prefixName = ['rule_config'], cate } = props;
  const indexPatternsAuthorized = useIsAuthorized(['/log/index-patterns']);
  const [indexSearch, setIndexSearch] = useState('');
  const [indexPatternsRefreshFlag, setIndexPatternsRefreshFlag] = useState(_.uniqueId('indexPatternsRefreshFlag_'));
  const [indexPatterns, setIndexPatterns] = useState<any[]>([]);
  // 第六步 第4段 W1：fe 原文 :43 是 `const names = ['rule_config', 'queries']`。
  // 按规矩 A 要把「相对路径」和「绝对路径」拆成两个变量；本文件里这个变量的**每一处**用法都是绝对路径调用——
  //   :44-47 四个 Form.useWatch；:178 传给 DateField 的 preName（DateField.tsx:35,38 拿它做 _.get / _.set 整棵表单值）；
  //   :203 传给 Value 的 preName（Value.tsx:36 的 useWatch）；:212 传给 GroupBy 的 parentNames（GroupBy/index.tsx:62,63 的 getFieldValue）——
  // 相对路径那一侧在本文件里没有用到（所有 Form.Item / Form.List 都是 `{...field} name={[field.name, …]}`，
  // 前缀由外层 Form.List 自动补），所以这里只留绝对路径的那一个，改名叫 absNames，免得留一个没人用的变量。
  // 两个 prop 都不传时 absNames = ['rule_config','queries']，fe 行为一字不变。
  const absNames = [...fullPrefixName, ...prefixName, 'queries']; // 绝对路径
  const queries = Form.useWatch(absNames);
  const indexType = Form.useWatch([...absNames, field.name, 'index_type']);
  const indexValue = Form.useWatch([...absNames, field.name, 'index']);
  const indexPatternId = Form.useWatch([...absNames, field.name, 'index_pattern']);
  const curIndexValue = useMemo(() => {
    if (indexType === 'index') {
      return indexValue;
    }
    return _.find(indexPatterns, { id: indexPatternId })?.name;
  }, [indexType, indexValue, indexPatternId, JSON.stringify(indexPatterns)]);

  useEffect(() => {
    if (datasourceValue && !hideIndexPattern) {
      getESIndexPatterns(datasourceValue).then((res) => {
        setIndexPatterns(res);
      });
    }
  }, [datasourceValue, indexPatternsRefreshFlag]);

  return (
    <CardContainer key={field.key} onClose={onClose}>
      <CardContainerHeader>
        <Row gutter={8}>
          <Col flex='32px'>
            <Form.Item {...field} name={[field.name, 'ref']} initialValue='A'>
              <QueryName existingNames={_.map(queries, 'ref')} />
            </Form.Item>
          </Col>
          <Col flex='auto'>
            <Row gutter={8}>
              <Col flex='320px'>
                <InputGroupWithFormItem
                  label={
                    <Space>
                      <Form.Item {...field} name={[field.name, 'index_type']} noStyle initialValue='index'>
                        <Select
                          data-testid={`es-query-${field.name}-index-type-select`}
                          bordered={false}
                          options={_.concat(
                            [
                              {
                                label: t('datasource:es.index'),
                                value: 'index',
                              },
                            ],
                            hideIndexPattern ? [] : [{ label: t('datasource:es.indexPatterns'), value: 'index_pattern' }],
                          )}
                          dropdownMatchSelectWidth={false}
                          showArrow={hideIndexPattern ? false : true}
                        />
                      </Form.Item>
                      <Tooltip title={<Trans ns='datasource' i18nKey='datasource:es.index_tip' components={{ 1: <br /> }} />}>
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  addonAfter={
                    indexType === 'index_pattern' &&
                    indexPatternsAuthorized && (
                      <IndexPatternSettingsBtn
                        onReload={() => {
                          setIndexPatternsRefreshFlag(_.uniqueId('indexPatternsRefreshFlag_'));
                        }}
                      />
                    )
                  }
                >
                  {indexType === 'index' && (
                    <Tooltip title={indexValue} placement='right'>
                      <Form.Item
                        {...field}
                        name={[field.name, 'index']}
                        rules={[
                          {
                            required: true,
                            message: t('datasource:es.index_msg'),
                          },
                        ]}
                      >
                        <AutoComplete
                          style={{ width: '100%' }}
                          dropdownMatchSelectWidth={false}
                          options={_.filter(indexOptions, (item) => {
                            if (indexSearch) {
                              return item.value.includes(indexSearch);
                            }
                            return true;
                          })}
                          onSearch={(val) => {
                            setIndexSearch(val);
                          }}
                          disabled={disabled}
                          placeholder={t('datasource:es.index_placeholder')}
                        />
                      </Form.Item>
                    </Tooltip>
                  )}
                  {indexType === 'index_pattern' && <IndexPatternSelect field={field} indexPatterns={indexPatterns} />}
                </InputGroupWithFormItem>
              </Col>
              <Col flex='auto'>
                <InputGroupWithFormItem
                  label={
                    <span>
                      {t('datasource:es.filter')}{' '}
                      <Tooltip title={t('common:page_help')}>
                        <QuestionCircleOutlined
                          onClick={() => {
                            DocumentDrawer({
                              language: i18n.language,
                              darkMode,
                              title: t('common:page_help'),
                              type: 'iframe',
                              documentPath: 'https://flashcat.cloud/docs/content/flashcat-monitor/nightingale-v9/usage/alert-notify/rules/alert-rules/query-data/es/',
                            });
                          }}
                        />
                      </Tooltip>
                    </span>
                  }
                  addonAfter='Lucene'
                >
                  <Form.Item {...field} name={[field.name, 'filter']}>
                    <LuceneInput disabled={disabled} placeholder={t('datasource:es.filter_placeholder')} />
                  </Form.Item>
                </InputGroupWithFormItem>
              </Col>
            </Row>
          </Col>
        </Row>
      </CardContainerHeader>
      <Row gutter={8}>
        {indexType === 'index' && (
          <Col span={6}>
            <DateField disabled={disabled} datasourceValue={datasourceValue} index={indexValue} field={field} preName={absNames} />
          </Col>
        )}
        <Col span={6}>
          <InputGroupWithFormItem
            label={t('datasource:es.interval')}
            addonAfter={
              <Form.Item {...field} name={[field.name, 'interval_unit']} noStyle initialValue='min'>
                <Select disabled={disabled} dropdownMatchSelectWidth={false}>
                  <Select.Option value='second'>{t('common:time.second')}</Select.Option>
                  <Select.Option value='min'>{t('common:time.minute')}</Select.Option>
                  <Select.Option value='hour'>{t('common:time.hour')}</Select.Option>
                </Select>
              </Form.Item>
            }
            className='mb-4'
          >
            <Form.Item {...field} name={[field.name, 'interval']} noStyle initialValue={1}>
              <InputNumber disabled={disabled} style={{ width: '100%' }} min={1} />
            </Form.Item>
          </InputGroupWithFormItem>
        </Col>
        <Col span={indexType === 'index' ? 12 : 18}>
          <Value
            datasourceValue={datasourceValue}
            index={curIndexValue}
            field={field}
            preName={absNames}
            disabled={disabled}
            functions={['count', 'avg', 'sum', 'max', 'min', 'p90', 'p95', 'p99']}
          />
        </Col>
      </Row>
      <div>
        <GroupBy datasourceValue={datasourceValue} index={curIndexValue} parentNames={absNames} prefixField={field} prefixFieldNames={[field.name]} disabled={disabled} />
      </div>
      <AdvancedSettings field={field} />
      <GraphPreview datasourceValue={datasourceValue} datasourceValues={datasourceValues} cate={cate} data={queries?.[field.name]} disabled={disabled} />
    </CardContainer>
  );
}

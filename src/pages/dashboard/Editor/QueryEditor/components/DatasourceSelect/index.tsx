import React, { useContext } from 'react';
import { Form, Input, Select, Space } from 'antd';
import Icon from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { ProSvg } from '@/components/DatasourceSelect';
import { CommonStateContext } from '@/App';
import { IS_PLUS, DatasourceCateEnum } from '@/utils/constant';

const defaultDatasourceCate = 'prometheus';

/**
 * N33 批 A-3：仪表盘「数据源类型」下拉的准入门。
 *
 * 原来这里只筛 `!!item.dashboard`，于是 opensearch（baseCates 里 dashboard:true）也进了下拉；
 * 可是本仓库的查询编辑器没有 opensearch 分支（QueryEditor/index.tsx:63-118 九个分支 + 兜底），
 * 选中后显示的是 PromQL 输入框（兜底 <Monitoring/>），取数时
 * `fetchQueryMap['opensearch']` 是 undefined，`fetchQueryMap[cate](props)`
 * （Renderer/datasource/useQuery.tsx:87）直接抛「不是函数」。
 * 出处：N29 结论正本 A-4、前端补充-opensearch.md N-os-01。
 *
 * 上游 fe 的门是 `cateData?.dashboard === true && (cateData.graphPro ? IS_PLUS : true)`
 * （fe v9.1.0 同文件 :55）。**不能照抄**：羚牛 baseCates 里 graphPro=true 的有五个
 * ——ck / doris / mysql / pgsql / opensearch——前四个羚牛已经把开源实现搬进来了
 * （QueryEditor/index.tsx 有分支、useQuery.tsx 的 fetchQueryMap 有键），照抄会把它们一起挡掉。
 * 所以照羚牛在日志浏览那道门上已经用过的写法（src/pages/logExplorer/utils/datasourceAvailability.ts:25-27，
 * 拍板 M239 ②）：先放行自己真接了的那几种，其余仍走上游那道 graphPro 门。
 *
 * 加新源时此白名单要与 `Renderer/datasource/useQuery.tsx` 的 `fetchQueryMap` 键、
 * `QueryEditor/index.tsx` 的分支三处同步。
 */
const DASHBOARD_SUPPORTED_PRO_CATES: string[] = [
  DatasourceCateEnum.ck,
  DatasourceCateEnum.doris,
  DatasourceCateEnum.mysql,
  DatasourceCateEnum.pgsql,
];

export default function index({ chartForm, variableConfig }) {
  const { t } = useTranslation('dashboard');
  const { groupedDatasourceList, datasourceCateOptions } = useContext(CommonStateContext);
  groupedDatasourceList['api'] = [
    {
      id: 999,
      name: '数据接口服务',
      plugin_type: 'apiservcie',
    },
  ];
  const cates = _.filter(datasourceCateOptions, (item) => {
    if (item.dashboard !== true) {
      return false;
    }
    if (_.includes(DASHBOARD_SUPPORTED_PRO_CATES, item.value)) {
      return true;
    }
    return item.graphPro ? IS_PLUS : true;
  });
  const datasourceVars = _.filter(variableConfig, { type: 'datasource' });
  const getDefaultDatasourceValue = (datasourceCate) => {
    const finded = _.find(datasourceVars, { definition: datasourceCate });
    if (finded) {
      return `\${${finded.name}}`;
    }
    return groupedDatasourceList[datasourceCate]?.[0]?.id;
  };

  return (
    <Space align='start'>
      <Input.Group>
        <span className='ant-input-group-addon'>{t('common:datasource.type')}</span>
        <Form.Item name='datasourceCate' noStyle initialValue={defaultDatasourceCate}>
          <Select
            dropdownMatchSelectWidth={false}
            style={{ minWidth: 70 }}
            onChange={(val) => {
              // TODO: 调整数据源类型后需要重置配置
              // setTimeout(() => {
              if (val === 'prometheus') {
                chartForm.setFieldsValue({
                  targets: [
                    {
                      refId: 'A',
                      expr: '',
                    },
                  ],
                  datasourceValue: getDefaultDatasourceValue('prometheus'),
                });
              } else if (val === 'elasticsearch' || val === 'opensearch') {
                chartForm.setFieldsValue({
                  targets: [
                    {
                      refId: 'A',
                      query: {
                        index: '',
                        filters: '',
                        values: [
                          {
                            func: 'count',
                          },
                        ],
                        date_field: '@timestamp',
                        interval: 1,
                        interval_unit: 'min',
                      },
                    },
                  ],
                  datasourceValue: getDefaultDatasourceValue(val),
                });
              } else if (val === 'zabbix') {
                chartForm.setFieldsValue({
                  targets: [
                    {
                      refId: 'A',
                      query: {
                        mode: 'timeseries',
                        subMode: 'metrics',
                      },
                    },
                  ],
                  datasourceValue: undefined,
                });
              } else {
                chartForm.setFieldsValue({
                  targets: [
                    {
                      refId: 'A',
                    },
                  ],
                  datasourceValue: undefined,
                });
              }
              // }, 500);
            }}
          >
            {_.map(cates, (item) => (
              <Select.Option key={item.value} value={item.value}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.graphPro ? <Icon component={ProSvg as any} style={{ color: '#6C53B1', fontSize: 14 }} /> : null}
                  {item.label}
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Input.Group>
      <Form.Item shouldUpdate={(prev, curr) => prev.datasourceCate !== curr.datasourceCate} noStyle>
        {({ getFieldValue }) => {
          const cate = getFieldValue('datasourceCate') || defaultDatasourceCate;
          return (
            <Input.Group compact>
              <span
                className='ant-input-group-addon'
                style={{
                  width: 'max-content',
                  height: 32,
                  lineHeight: '32px',
                }}
              >
                {t('common:datasource.id')}
              </span>
              <Form.Item
                name='datasourceValue'
                rules={[
                  {
                    required: true,
                    message: t('query.datasource_msg'),
                  },
                ]}
                initialValue={getDefaultDatasourceValue(defaultDatasourceCate)}
              >
                <Select allowClear placeholder={t('query.datasource_placeholder')} style={{ minWidth: 70 }} dropdownMatchSelectWidth={false} showSearch optionFilterProp='children'>
                  {_.map(datasourceVars, (item, idx) => {
                    return (
                      <Select.Option value={`\${${item.name}}`} key={`${item.name}_${idx}`}>
                        {`\${${item.name}}`}
                      </Select.Option>
                    );
                  })}
                  {_.map(groupedDatasourceList[cate], (item) => (
                    <Select.Option value={item.id} key={item.id}>
                      {item.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Input.Group>
          );
        }}
      </Form.Item>
    </Space>
  );
}

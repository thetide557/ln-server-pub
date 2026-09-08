import React, { useState } from 'react';
import { Space, Form, Radio } from 'antd';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import OrganizeFields from '../TransformationsEditor/OrganizeFields';
import DatasourceSelect from './components/DatasourceSelect';
import Prometheus from './Prometheus';
import Elasticsearch from './Elasticsearch';
import Monitoring from './Monitoring';
import ApiService from './ApiService';
// ---- 第六步 L3（多数据源）：只加 6 行 import，全部追加在 import 块末尾。
// 走直达路径 @/plugins/<t>/Dashboard/QueryBuilder，不 import @/plugins/<t> 裸目录
// （裸目录的 index.tsx 会把 AlertRule / Explorer 整条闭包带进来，见拍板-02）。
// 三个 locale 要显式 import，pub 的 i18n 不像 fe 那样自动收集（拍板-02 坑二）。
import IotDB from '@/plugins/iotdb/Dashboard/QueryBuilder';
import TDengine from '@/plugins/TDengine/Dashboard/QueryBuilder';
import CK from '@/plugins/clickHouse/Dashboard/QueryBuilder';
import '@/plugins/iotdb/locale';
import '@/plugins/TDengine/locale';
import '@/plugins/clickHouse/locale';

export default function index({ chartForm, type, variableConfig, dashboardId }) {
  const { t } = useTranslation('dashboard');
  const [mode, setMode] = useState('query');

  return (
    <div>
      <Space align='start'>
        {type === 'table' && (
          <Radio.Group
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
            }}
            buttonStyle='solid'
          >
            <Radio.Button value='query'>{t('query.title')}</Radio.Button>
            <Radio.Button value='transform'>{t('query.transform')} (beta)</Radio.Button>
          </Radio.Group>
        )}
        <DatasourceSelect chartForm={chartForm} variableConfig={variableConfig} />
      </Space>
      <div
        style={{
          display: mode === 'query' ? 'block' : 'none',
        }}
      >
        <Form.Item shouldUpdate={(prev, curr) => prev.datasourceCate !== curr.datasourceCate} noStyle>
          {({ getFieldValue }) => {
            const cate = getFieldValue('datasourceCate') || 'prometheus';
            if (cate === 'prometheus') {
              return <Prometheus chartForm={chartForm} variableConfig={variableConfig} dashboardId={dashboardId} />;
            }
            if (cate === 'elasticsearch') {
              return <Elasticsearch chartForm={chartForm} variableConfig={variableConfig} dashboardId={dashboardId} />;
            }
            if (cate === 'api') {
              return <ApiService chartForm={chartForm} variableConfig={variableConfig} dashboardId={dashboardId}></ApiService>
            }
            // ---- 第六步 L3（多数据源）：三个只加的分发分支，守卫是 cate 值，对现有类型恒假。
            // fe 的 QueryBuilder 只收 datasourceValue（fe src/pages/dashboard/Editor/QueryEditor/QueryBuilder.tsx:33-43），
            // 而外层的 shouldUpdate 只盯 datasourceCate，所以这里再包一层 Form.Item 把 datasourceValue 取出来（顾问意见 X-6 (b)）。
            if (cate === 'iotdb') {
              return (
                <Form.Item shouldUpdate noStyle>
                  {({ getFieldValue: getFieldValue2 }) => <IotDB datasourceValue={getFieldValue2('datasourceValue')} />}
                </Form.Item>
              );
            }
            if (cate === 'tdengine') {
              return (
                <Form.Item shouldUpdate noStyle>
                  {({ getFieldValue: getFieldValue2 }) => <TDengine datasourceValue={getFieldValue2('datasourceValue')} />}
                </Form.Item>
              );
            }
            if (cate === 'ck') {
              return (
                <Form.Item shouldUpdate noStyle>
                  {({ getFieldValue: getFieldValue2 }) => <CK datasourceValue={getFieldValue2('datasourceValue')} />}
                </Form.Item>
              );
            }
            return <Monitoring chartForm={chartForm} variableConfig={variableConfig} dashboardId={dashboardId} />;
          }}
        </Form.Item>
      </div>
      <div
        style={{
          display: mode === 'transform' ? 'block' : 'none',
        }}
      >
        <OrganizeFields chartForm={chartForm} />
      </div>
    </div>
  );
}

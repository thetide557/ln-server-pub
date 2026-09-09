import React from 'react';
import _ from 'lodash';
import { Form } from 'antd';
import Queries from './Queries';
import Triggers from '@/pages/alertRules/FormNG/components/Triggers';

interface IProps {
  datasourceValue: number | number[];
  // ---- 第六步 第4段 W0（阶段 0 · ck 试点）加的两个**可选**参数 ----
  // 不传这两个的时候，本组件的行为与 fe v9.1.0 原文一字不差（字段路径就是顶层的 ['rule_config', ...]）。
  // 羚牛的告警表单外面套了一层多策略列表 `<Form.List name='strategies'>`（src/pages/alertRules/Form/index.tsx:198），
  // 一条规则最多 5 个策略，每个策略自己一份 rule_config。所以从分发点
  // （src/pages/alertRules/Form/Rule/Rule/Metric/index.tsx 的 cate === 'ck' 分支）把该策略的 field 传进来，
  // 本组件负责把两种路径都拼好：
  //   - 相对路径（给 Form.Item / Form.List 用）：[field.name, 'rule_config']，antd 会自动补上外层的 'strategies'
  //   - 绝对路径（给 Form.useWatch / getFieldValue 用）：['strategies', field.name, 'rule_config']
  // 之所以要分两种：antd 的 useWatch / getFieldValue 都是拿路径直接去表单根上取值的
  //（node_modules/rc-field-form/lib/useWatch.js 里 getValue(store, namePathRef.current)），**不吃 Form.List 的相对前缀**。
  field?: any; // 外层 Form.List 给的 field（含 name / key / fieldKey）
  listName?: string; // 外层 Form.List 的名字，默认 'strategies'
}

export default function index({ datasourceValue, field, listName = 'strategies' }: IProps) {
  const form = Form.useFormInstance();
  const inList = !!field && field.name !== undefined;

  // 相对路径：给 Form.Item / Form.List 用
  const prefixName: (string | number)[] = inList ? [field.name, 'rule_config'] : ['rule_config'];
  // Queries 的约定是「绝对路径 = fullPrefixName + prefixName」（见 Queries/index.tsx 的 :94）
  const queriesFullPrefixName: (string | number)[] = inList ? [listName] : [];
  // Triggers 的约定是「fullPrefixName 本身就是绝对路径」（见 FormNG/components/Triggers/Triggers.tsx 的 useWatch）
  const ruleConfigFullName: (string | number)[] = inList ? [listName, field.name, 'rule_config'] : ['rule_config'];
  // cate 不在 rule_config 里，是策略自己的字段
  const catePath: (string | number)[] = inList ? [listName, field.name, 'cate'] : ['cate'];

  return (
    <>
      <div className='mb-4'>
        <Queries
          form={form}
          prefixField={inList ? field : {}}
          prefixName={prefixName}
          fullPrefixName={queriesFullPrefixName}
          catePath={catePath}
          datasourceValue={datasourceValue}
        />
      </div>
      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          const queries = getFieldValue([...ruleConfigFullName, 'queries']);
          return <Triggers prefixField={inList ? field : {}} prefixName={prefixName} fullPrefixName={ruleConfigFullName} catePath={catePath} queries={queries} />;
        }}
      </Form.Item>
    </>
  );
}

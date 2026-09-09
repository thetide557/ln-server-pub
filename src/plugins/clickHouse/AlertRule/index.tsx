import React from 'react';
import _ from 'lodash';
import { Form } from 'antd';
import Queries from './Queries';
import Triggers from '@/pages/alertRules/FormNG/components/Triggers';

// 第六步 第4段 W0（阶段 0 · ck 试点）：把这个编辑器接进羚牛的多策略告警表单。
// 羚牛一条告警规则最多 5 个策略，外面套了一层 `<Form.List name="strategies">`
//（src/pages/alertRules/Form/index.tsx:198），每个策略自己一份 rule_config；
// 夜莺 fe 的表单是平铺的，所以原文里字段路径写死 ['rule_config', ...]。
//
// 两条规矩（出处：第六步-流水线/第4段/顾问问答-大顾问.md Q1 第二节）：
//   规矩 A · 按调用种类分路径：
//     - Form.Item / Form.List 的 name= 用**相对**路径（antd 会自动补上外层 Form.List 的前缀，
//       见 node_modules/rc-field-form/lib/List.js:40-48）
//     - Form.useWatch / getFieldValue / setFields / setFieldsValue 用**绝对**路径
//       （它们直接拿路径去整棵表单数据上取值，不吃 Form.List 前缀，见 lib/useWatch.js:69,78）
//   规矩 B · 顶层编辑器多收三个 prop：field（策略级 Form.List 的 field）、cate、disabled，
//     并在函数体开头派生出 prefixField / prefixName / fullPrefixName / absPrefix；
//     三个 prop 都不传时全部退回 fe 原状，组件在 fe 里原样能跑。
interface IProps {
  datasourceValue: number | number[];
  field?: any; // 羚牛策略级 Form.List 给的 field（含 name / key / fieldKey）；不传 = fe 原状
  cate?: string; // 数据源类型。fe 里是表单顶层字段，羚牛在每条策略上，所以改成由分发处传进来
  disabled?: boolean;
}

export default function index({ datasourceValue, field, cate, disabled }: IProps) {
  const form = Form.useFormInstance();
  const prefixField = field ? _.omit(field, 'key') : {}; // 给 Form.List / Form.Item 展开用（key 在分发处显式写）
  const prefixName: (string | number)[] = field ? [field.name, 'rule_config'] : ['rule_config']; // 相对路径
  const fullPrefixName: (string | number)[] = field ? ['strategies'] : []; // 绝对路径的前半段
  const absPrefix = [...fullPrefixName, ...prefixName]; // 绝对路径 = ['strategies', n, 'rule_config']

  return (
    <>
      <div className='mb-4'>
        <Queries
          form={form}
          prefixField={prefixField}
          fullPrefixName={fullPrefixName}
          prefixName={prefixName}
          cate={cate}
          disabled={disabled}
          datasourceValue={datasourceValue}
        />
      </div>
      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          const queries = getFieldValue([...absPrefix, 'queries']);
          return <Triggers prefixField={prefixField} fullPrefixName={fullPrefixName} prefixName={prefixName} cate={cate} disabled={disabled} queries={queries} />;
        }}
      </Form.Item>
    </>
  );
}

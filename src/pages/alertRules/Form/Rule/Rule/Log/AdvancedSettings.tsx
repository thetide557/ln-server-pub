import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Space, Form, InputNumber } from 'antd';
import { RightOutlined, DownOutlined } from '@ant-design/icons';
import _ from 'lodash';

// 第六步 第4段 W1-日志组（阶段 1）：字段路径适配，做法与阶段 0 的 ck 样板同一模式
//（两条规矩见 第六步-流水线/第4段/顾问问答-大顾问.md Q1 第二节）。
// 这个文件在 fe v9.1.0 里其实是**死代码**：唯一的调用点
// src/pages/alertRules/Form/Rule/Rule/index.tsx:62 是被注释掉的（`{/* ... <AdvancedSettings /> */}`），
// 而且它写的 `delay` 字段在 fe 与 pub 的告警规则表单里都没有第二处读写（可重跑：
// `git -C fe grep -n delay v9.1.0 -- src/pages/alertRules` 只命中本文件）。
// 改它只是为了两件事：①和同目录的 loki 编辑器一套写法；②让大顾问第七节的自检 grep 归零。
interface IProps {
  field?: any; // 羚牛策略级 Form.List 给的 field；不传 = fe 原状（顶层 name='delay'）
  cate?: string; // 数据源类型。fe 里从表单顶层 watch，羚牛的 cate 在每条策略上，所以改成由调用处传进来
  // 收下但不用：pub 在 src/pages/alertRules/Form/index.tsx:184 写的是 <Form ... disabled={disabled}>，
  // antd 4.21.0 会顺着 context 把禁用状态发给表单里所有控件，InputNumber 自己不用再传一遍。
  disabled?: boolean;
}

export default function AdvancedSettings({ field, cate: cateProp }: IProps = {}) {
  const { t } = useTranslation('alertRules');
  const [collapsed, setCollapsed] = useState(false);
  // hook 不能写在条件里，所以先照 fe 原样 watch 顶层，再让传进来的 cate 优先（同 Triggers.tsx 的写法）。
  const watchedCate = Form.useWatch('cate');
  const cate = cateProp ?? watchedCate;
  // `delay` 不在 rule_config 里，它是规则本身的字段；羚牛把规则拆成了 strategies[n]，
  // 所以相对前缀只有 [field.name] 这一层（不带 rule_config）。不传 field 时是 []，name 拼出来还是 ['delay']，
  // 与 fe 的 name='delay' 等价（antd 会把字符串 name 归一成单段路径）。
  const prefixField = field ? _.omit(field, 'key') : {};
  const prefixName: (string | number)[] = field ? [field.name] : [];

  if (cate !== 'elasticsearch') return null;

  return (
    <div>
      <div>
        <Space
          onClick={() => {
            setCollapsed(!collapsed);
          }}
          style={{
            cursor: 'pointer',
          }}
        >
          {t('datasource:es.alert.advancedSettings')}
          {collapsed ? <DownOutlined /> : <RightOutlined />}
        </Space>
      </div>
      <div
        style={{
          display: collapsed ? 'block' : 'none',
        }}
      >
        <Form.Item
          {...prefixField}
          name={[...prefixName, 'delay']}
          label={
            <Space>
              {t('datasource:es.alert.delay')}({t('common:time.second')})
            </Space>
          }
        >
          <InputNumber min={0} />
        </Form.Item>
      </div>
    </div>
  );
}

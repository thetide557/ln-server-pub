/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React from 'react';
import { Form, Space, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

interface IProps {
  triggersKey: string;
  // 第六步 第4段 W0（lead 拍板-11 ①）：rule_config 的**绝对**路径，缺省 ['rule_config'] = 原来的行为。
  // 背景：羚牛把告警表单改成了「一条规则最多 5 个策略」（Form/index.tsx:198 的 Form.List name="strategies"），
  // 每条策略自己一份 rule_config；本组件却一直读写顶层的 ['rule_config', ...]，取到的永远是 undefined，
  // 所以 triggers.length > 1 这个条件永远不成立，「抑制」开关在多策略表单里从来没显示过。
  // 这里只给组件加一个可选参数（缺省行为一字不变），由调用方决定传不传；
  // pub 自己的 Prometheus / XHindex / Host 三处调用**本轮不动**，行为与现在完全一致。
  prefixName?: (string | number)[];
}

export default function index(props: IProps) {
  const { t } = useTranslation('alertRules');
  const { triggersKey, prefixName = ['rule_config'] } = props;

  return (
    <Form.Item shouldUpdate noStyle>
      {({ getFieldValue, setFields }) => {
        const triggers = getFieldValue([...prefixName, triggersKey]);
        if (triggers && triggers.length > 1) {
          return (
            <Space>
              {t('inhibit')}
              <Switch
                checked={getFieldValue([...prefixName, 'inhibit'])}
                onChange={(checked) => {
                  // 第六步 第4段 W0：原来这里用 setFieldsValue 写了一整个顶层 rule_config 对象——
                  // 那样写只能写顶层，而且会把 rule_config 里别的键一起替换掉。改成按全路径只写 inhibit 这一个键。
                  setFields([
                    {
                      name: [...prefixName, 'inhibit'],
                      value: checked,
                    },
                  ]);
                }}
              />
            </Space>
          );
        }
      }}
    </Form.Item>
  );
}

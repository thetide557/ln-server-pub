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
import { Form, Row, Col, InputNumber } from 'antd';
import { useTranslation } from 'react-i18next';

interface IProps {
  intervalTip?: (value?: number) => string;
  durationTip?: (value?: number) => string;
  field?: any;
}

export default function index({ intervalTip, durationTip, field }: IProps) {
  const { t } = useTranslation('alertRules');
  return (
    // <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.cate !== curValues.cate} noStyle>
    <Form.Item shouldUpdate={(prevValues, curValues) => prevValues?.strategies[field.name]?.cate !== curValues?.strategies[field.name]?.cate} noStyle>
      {({ getFieldValue }) => {
        // const cate = getFieldValue('cate');
        return (
          <Row gutter={10}>
            <Col span={12}>
              {/* <Form.Item name='prom_eval_interval' label={t('prom_eval_interval')} tooltip={intervalTip ? intervalTip(getFieldValue('prom_eval_interval')) : undefined}> */}
              {/* ---- N36 批 H1 第 4 条（后端第九份第二节 4、第十份第二节 7）：加一行提示，**不改默认值**。
                  告警求值不传时间范围，取数窗口只有查询里那个「时间间隔」（`rule_config.queries[0].interval`）那么宽，
                  默认 60 秒；SQL 型数据源（mysql / pgsql / doris / ck / tdengine）如果数据不是秒级持续写入，
                  每个周期都查 0 行，于是「面板出图、告警永不触发」，或者事件冒出来几十秒后又自动恢复（看着像在抖）。
                  这不是缺陷，是窗口太窄，解法是把时间间隔按数据写入频率调大。
                  放在这里而不是放在「时间间隔」输入框旁边，是因为羚牛各 SQL 源的告警编辑器里只有 doris 把
                  「时间间隔」做成了可见输入框（`src/plugins/doris/AlertRule/Query.tsx:187`），
                  mysql / pgsql / ck / tdengine 都没有这个可见项；而「执行频率」这一项每条规则都看得见。
                  doris 那个输入框的 tooltip 同时也补了一句（`src/plugins/doris/locale/*.ts` 的 `query.interval_tip`）。
                  已登记 `拿不准-H1.md` U-01。 */}
              <Form.Item {...field}
              name={[field.name, 'prom_eval_interval']} label={t('prom_eval_interval')} tooltip={intervalTip ? intervalTip(getFieldValue(['strategies', field.name, 'prom_eval_interval'])) : undefined}
              extra={<span className='second-color'>{t('prom_eval_interval_sql_tip')}</span>}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              {/* <Form.Item name='prom_for_duration' label={t('prom_for_duration')} tooltip={durationTip ? durationTip(getFieldValue('prom_for_duration')) : undefined}> */}
              <Form.Item  {...field}
              name={[field.name, 'prom_for_duration']} label={t('prom_for_duration')} tooltip={durationTip ? durationTip(getFieldValue(['strategies', field.name, 'prom_for_duration'])) : undefined}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        );
      }}
    </Form.Item>
  );
}

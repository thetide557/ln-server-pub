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

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input, Select, Card, Row, Col, Tag, Tooltip } from 'antd';
import { panelBaseProps } from '../constants';
import { getAssetsByCondition } from '@/services/assets';
import queryString from 'query-string';
import { useLocation } from 'react-router-dom';
import localeCompare from '@/pages/dashboard/Renderer/utils/localeCompare';
import _ from 'lodash';
import { buildPromVisualQueryFromPromQL, renderQuery } from '@/components/PromQueryBuilder';
import { PromVisualQueryLabelFilter } from '@/components/PromQueryBuilder/types';
// 校验单个标签格式是否正确
function isTagValid(tag) {
  const contentRegExp = /^[a-zA-Z_][\w]*={1}[^=]+$/;
  return {
    isCorrectFormat: contentRegExp.test(tag.toString()),
    isLengthAllowed: tag.toString().length <= 64,
  };
}

export default function Base({ type, form, assetId, onAssetChange }) {
  const { t } = useTranslation('alertRules');
  // type = 1;
  const { search } = useLocation();
  const [assetList, setAssetList] = useState<any>({});
  const [assetOptions, setAssetOptions] = useState<any[]>([]);
  const [assetIp, setAssetIp] = useState<string>('');
  const [showExcludes, setShowExcludes] = useState(true);
  const { asset_id } = form.getFieldsValue();
  

  useEffect(() => {
    let param = {};
    window.localStorage.removeItem('select_monitor_asset_id');

    if (type == 1) {
      param['limit'] = -1;
      getAssetsByCondition(param).then((res) => {
        let options = new Array();
        res.dat.list.map((v) => {
          assetList[v.id] = v;
          options.push({
            value: v.id,
            label: `[${v.type}]-[${v.ip}]-${v.name}`,
          });
        });
        options = options.sort((a, b) => localeCompare(a.label, b.label));
        setAssetOptions(options);
        setAssetList({ ...assetList });
        let ipOptions = new Array();
        res.dat.list.map((v) => {
          ipOptions.push({
            value: v.id,
            label: v.ip,
          });
        });
      });
    }
    let ip = window.localStorage.getItem('select_monitor_asset_ip');
    setAssetIp(ip ? ip : '');
    if (assetId > 0) {
      form.setFieldsValue({ asset_id: assetId });
    }
  }, []);

  function buildPromqlWithAsset(assets) {
    // console.log('form.getFieldsValue()', form.getFieldsValue());
    const { rule_config, asset_id, excludes } = form.getFieldsValue();

    const labels: PromVisualQueryLabelFilter[] = [];
    if (asset_id && asset_id !== 0) {
      labels.push({
        label: 'asset_id',
        op: '=',
        value: asset_id,
      });
    } else if (excludes) {
      excludes.forEach((v) => {
        labels.push({
          label: 'asset_id',
          op: '!=',
          value: v,
        });
      });
    }

    rule_config.queries.forEach((e) => {
      const metric = buildPromVisualQueryFromPromQL(e.prom_ql, []).query.metric;
      e.prom_ql = renderQuery(buildPromVisualQueryFromPromQL(metric || '', labels).query);
    });

    form.setFieldsValue({
      rule_config: { ...rule_config },
    });
  }

  // 渲染标签
  function tagRender(content) {
    const { isCorrectFormat, isLengthAllowed } = isTagValid(content.value);
    return isCorrectFormat && isLengthAllowed ? (
      <Tag closable={content.closable} onClose={content.onClose}>
        {content.value}
      </Tag>
    ) : (
      <Tooltip title={isCorrectFormat ? t('append_tags_msg1') : t('append_tags_msg2')}>
        <Tag color='error' closable={content.closable} onClose={content.onClose} style={{ marginTop: '2px' }}>
          {content.value}
        </Tag>
      </Tooltip>
    );
  }

  // 校验所有标签格式
  function isValidFormat() {
    return {
      validator(_, value) {
        const isInvalid =
          value &&
          value.some((tag) => {
            const { isCorrectFormat, isLengthAllowed } = isTagValid(tag);
            if (!isCorrectFormat || !isLengthAllowed) {
              return true;
            }
          });
        return isInvalid ? Promise.reject(new Error(t('append_tags_msg'))) : Promise.resolve();
      },
    };
  }
  return (
    <Card {...panelBaseProps} className='rule-card' title={t('basic_configs')}>
      {type == 1 && (
        <Row gutter={10}>
          <Col span={8}>
            <Form.Item label={'告警规则名称'} name='name' rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label={t('关联资产')} name='asset_id' rules={[{ required: true }]} initialValue={0}>
              <Select
                showSearch
                options={[{ label: '全部', value: 0 }].concat(assetOptions)}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                onChange={(v) => {
                  onAssetChange({
                    includes: v !== 0 ? [v] : [],
                    excludes: form.getFieldValue('excludes'),
                  });
                  buildPromqlWithAsset({});
                  setShowExcludes(v === 0);
                }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label={t('排除资产')} name='excludes' initialValue={[]}>
              <Select
                disabled={!showExcludes || asset_id > 0}
                allowClear
                showSearch
                mode='multiple'
                options={assetOptions}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                onChange={(v) => {
                  onAssetChange({
                    includes: [form.getFieldValue('asset_id')],
                    excludes: v,
                  });
                  buildPromqlWithAsset({});
                }}
              />
            </Form.Item>
          </Col>
        </Row>
      )}
      <Row gutter={10}>
        <Col span={12}>
          <Form.Item label={t('append_tags')} name='append_tags' rules={[isValidFormat]}>
            <Select mode='tags' tokenSeparators={[' ']} open={false} placeholder={t('append_tags_placeholder')} tagRender={tagRender} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={t('note')} name='note'>
            <Input />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}

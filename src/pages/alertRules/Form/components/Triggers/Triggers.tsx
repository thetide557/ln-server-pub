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

import React, { useContext, useEffect } from "react";
import { Form, Card, Space, Switch, Button } from "antd";
import {
  PlusOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import _ from "lodash";
import { useTranslation } from "react-i18next";

import { CommonStateContext } from "@/App";
import Inhibit from "@/pages/alertRules/Form/components/Inhibit";

import Trigger from "./Trigger";
import NodataTrigger from "./NodataTrigger";
import AnomalyTrigger from "./AnomalyTrigger";

interface IProps {
  defaultActiveKey: string;
  prefixField?: any;
  fullPrefixName?: string[]; // 完整的前置字段名，用于 getFieldValue 获取指定字段的值
  prefixName?: string[]; // 列表字段名
  queries: any[];
  disabled?: boolean;
  initialValue?: any;
}

export default function index(props: IProps) {
  const { t } = useTranslation("alertRules");
  const { feats } = useContext(CommonStateContext);
  const {
    defaultActiveKey,
    prefixField = {},
    fullPrefixName = [],
    prefixName = [],
    queries,
    disabled,
    initialValue,
  } = props;
  const [activeKey, setActiveKey] = React.useState(defaultActiveKey);
  const cate = Form.useWatch(["cate"]);
  const exp_trigger_disable = Form.useWatch([
    ...prefixName,
    "exp_trigger_disable",
  ]);
  const nodata_trigger_enable = Form.useWatch([
    ...prefixName,
    "nodata_trigger",
    "enable",
  ]);
  const anomaly_trigger_enable = Form.useWatch([
    ...prefixName,
    "anomaly_trigger",
    "enable",
  ]);

  return (
    <Form.List
      {...prefixField}
      name={[...prefixName, "triggers"]}
      initialValue={initialValue}
    >
      {(fields, { add, remove }) => (
        <Card
          title={
            <Space>
              {/* 告警条件 */}
              <span>{t("metric.query.title")}</span>
              <PlusCircleOutlined
                onClick={() =>
                  add({
                    mode: 0,
                    expressions: [
                      {
                        ref: queries?.[0]?.ref || "A",
                        comparisonOperator: "==",
                        logicalOperator: "&&",
                      },
                    ],
                    severity: 2,
                  })
                }
              />
              <Inhibit triggersKey="queries" />
            </Space>
          }
          size="small"
        >
          <div className="alert-rule-triggers-container">
            {fields.map((field) => {
              return (
                <div key={field.key} style={{ position: "relative" }}>
                  <Trigger
                    prefixField={_.omit(field, "key")}
                    fullPrefixName={[...prefixName, "triggers", field.name]}
                    prefixName={[field.name]}
                    queries={queries}
                    disabled={disabled}
                  />
                  {fields.length > 1 && (
                    <CloseCircleOutlined
                      style={{ position: "absolute", right: -4, top: -4 }}
                      onClick={() => {
                        remove(field.name);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </Form.List>
  );
}

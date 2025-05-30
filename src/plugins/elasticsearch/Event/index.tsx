import React, { useState } from "react";
import _ from "lodash";
import i18next from "i18next";
import { EventLogs } from "@/plugins/elasticsearch";
import { Button } from "antd";

interface IProps {
  eventDetail: any;
  isHistory: boolean;
  esDetailVisible: boolean;
  setEsDetailVisible: (visible: boolean) => void;
  selectedQuery: any;
  setSelectedQuery: (query: any) => void;
}

export default function ElasticsearchDetail(props: IProps) {
  const {
    eventDetail,
    isHistory,
    esDetailVisible,
    setEsDetailVisible,
    selectedQuery,
    setSelectedQuery,
  } = props;

  return [
    {
      // 查询条件
      // label: i18next.t('datasource:es.value'),
      label: "查询条件",
      key: "rule_config",
      render(val) {
        const queries = _.get(val, "queries", []);
        return (
          <div>
            {_.map(queries, (item) => {
              return (
                <div key={item.ref}>
                  <span className="pr16">
                    {i18next.t("datasource:es.ref")}: {item.ref}
                  </span>
                  <span className="pr16">
                    {i18next.t("datasource:es.index")}: {item.index}
                  </span>
                  {item.filter && (
                    <span className="pr16">
                      {i18next.t("datasource:es.filter")}: {item.filter}
                    </span>
                  )}
                  <span className="pr16">
                    {i18next.t("datasource:es.date_field")}: {item.date_field}
                  </span>
                  <span className="pr16">
                    {i18next.t("datasource:es.interval")}: {item.interval}s
                  </span>
                  <span className="pr16">
                    {i18next.t("datasource:es.func")}: {item.value?.func}
                  </span>
                  {item.value?.func !== "count" && (
                    <span className="pr16">
                      {i18next.t("datasource:es.funcField")}:{" "}
                      {item.value?.field}
                    </span>
                  )}
                  {_.map(item.group_by, (item) => {
                    return (
                      <span className="pr16">
                        {i18next.t("datasource:es.event.groupBy", {
                          field: item.field,
                          size: item.size,
                          min_value: item.min_value,
                        })}
                      </span>
                    );
                  })}
                  {/* ES日志详情，当前告警页面显示 */}
                  {!isHistory && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        setEsDetailVisible(true);
                        setSelectedQuery(item);
                      }}
                    >
                      日志详情
                    </Button>
                  )}
                </div>
              );
            })}
            <EventLogs
              visible={esDetailVisible}
              datasource_id={eventDetail.datasource_id}
              query={selectedQuery}
              destroy={() => setEsDetailVisible(false)}
            />
          </div>
        );
      },
    },
    {
      // 告警条件
      label: i18next.t("datasource:es.alert.trigger.title"),
      key: "rule_config",
      render(val) {
        const trigger_type = _.get(val, "trigger_type");
        const triggers = _.get(val, "triggers", []);
        const nodata_trigger = _.get(val, "nodata_trigger", {});

        if (trigger_type === "nodata") {
          return (
            <div className="n9e-fill-color-3" style={{ padding: 8 }}>
              <span style={{ paddingRight: 4 }}>
                {i18next.t("alertRules:nodata_trigger.title")}
              </span>
              <span>
                {i18next.t("AlertCurEvents:detail.trigger")}{" "}
                {`${i18next.t(`common:severity.${nodata_trigger?.severity}`)}`}
              </span>
            </div>
          );
        }

        return _.map(triggers, (item, idx) => {
          return (
            <div key={idx} className="n9e-fill-color-3" style={{ padding: 8 }}>
              <span style={{ paddingRight: 4 }}>{item.exp}</span>
              <span>
                {i18next.t("AlertCurEvents:detail.trigger")}{" "}
                {`${i18next.t(`common:severity.${item?.severity}`)}`}
              </span>
            </div>
          );
        });
      },
    },
  ];
}

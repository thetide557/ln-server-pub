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
import React, { useContext, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import moment from 'moment';
import _ from 'lodash';
import queryString from 'query-string';
import { Button, Card, message, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { getAlertEventsById, getHistoryEventsById } from '@/services/warning';
import { priorityColor, DatasourceCateEnum } from '@/utils/constant';
import { deleteAlertEventsModal } from '.';
import { parseValues } from '@/pages/alertRules/utils';
import { CommonStateContext } from '@/App';
// @ts-ignore
import plusEventDetail from 'plus:/parcels/Event/eventDetail';
// @ts-ignore
import PlusPreview from 'plus:/parcels/Event/Preview';
// @ts-ignore
import PlusLogsDetail from 'plus:/parcels/Event/LogsDetail';
import PrometheusDetail from './Detail/Prometheus';
import Host from './Detail/Host';
// ---- N19 W-A：告警事件详情「按源回查」。照 fe ee48e701 src/pages/event/DetailNG/eventDetailByCate.tsx
// 的分发表，把各数据源的 Event 组件接进本页下面的 descriptionInfo 数组（老结构：按 cate 展开一段详情项）。
// 不走 `import { Event as X } from '@/plugins/<源>'` 的聚合导出（羚牛各插件 index.ts 形态不一、es 连 index.ts 都没有），
// 一律直接 import 文件，风格照上面 PrometheusDetail 那行。
import ElasticsearchDetail from '@/plugins/elasticsearch/Event';
import TDengineDetail from '@/plugins/TDengine/Event';
import LokiDetail from './Detail/Loki';
import MySQLDetail from '@/plugins/mysql/Event';
import PgsqlDetail from '@/plugins/pgsql/Event';
import DorisDetail from '@/plugins/doris/Event';
import VictorialogsDetail from '@/plugins/victorialogs/Event';
// clickhouse 这一格上游开源自己不分发（fe ee48e701 的 eventDetailByCate.tsx 没有 ck 分支，
// 组件只被 plugins/clickHouse/index.ts:9 导出、零消费，开源把 ck 的事件回查甩给了商业 parcel）。
// 羚牛这里主动接上，立场与 ck / doris 的既有口径一致（拍板 D-1）。
import ClickHouseDetail from '@/plugins/clickHouse/Event';
import { getESIndexPatterns } from '@/pages/log/IndexPatterns/services';
// 各插件自己的词条由 src/plugins/<源>/locale/index.ts 调 addResourceBundle 注册，而那几个文件
// 原先只被告警规则表单、仪表盘编辑器 import（见 src/pages/alertRules/Form/Rule/Rule/Metric/index.tsx:53-59），
// 本页不经过 —— 所以这里逐个补只做注册的 import，写法照那个文件。
import '@/plugins/TDengine/locale';
import '@/plugins/mysql/locale';
import '@/plugins/pgsql/locale';
import '@/plugins/clickHouse/locale';
// es 组件里用到 `alertRules:nodata_trigger.title`，而 alertRules 这个命名空间只在
// src/pages/alertRules/index.tsx:30 注册，本页的 import 链不经过它 —— 这里补一行只做注册的 import。
import '@/pages/alertRules/locale';
import './detail.less';
import { getStrategiesByRuleIds } from '@/services/warning';
import Solution from './Solution'
import { AiButton } from '@/components/AiChatNG/FlashAiButton';
import { buildPageFrom, getAlertEventDetailPrompts } from '@/components/AiChatNG/recommend';
import { NAME_SPACE as AI_CHAT_NS } from '@/components/AiChatNG/constants';
const { Paragraph } = Typography;
const EventDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation('AlertCurEvents');
  const { t: tAiChat } = useTranslation(AI_CHAT_NS);
  const { busiId, eventId } = useParams<{ busiId: string; eventId: string }>();
  const tagsHelpDescription = '告警发生时，系统自动采集并附加在告警事件上的结构化标签信息，用于完整描述告警的上下文环境、关联资产和监控指标维度。';
  const renderHelpLabel = (label: React.ReactNode, field: React.ReactNode, description: React.ReactNode) => (
    <span className='desc-label-help'>
      <span>{label}</span>
      <Tooltip
        placement='top'
        title={
          <div className='desc-label-help-tooltip'>
            <div className='desc-label-help-tooltip-field'>{field}</div>
            <div className='desc-label-help-tooltip-description'>{description}</div>
          </div>
        }
      >
        <span
          className='desc-label-help-icon'
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <QuestionCircleOutlined />
        </span>
      </Tooltip>
    </span>
  );
  const commonState = useContext(CommonStateContext);
  const { busiGroups, datasourceList } = commonState;
  const handleNavToWarningList = (id) => {
    if (busiGroups.find((item) => item.id === id)) {
      history.push(`/alert-rules?id=${id}`);
    } else {
      message.error(t('detail.buisness_not_exist'));
    }
  };
  const history = useHistory();
  const isHistory = history.location.pathname.includes('alert-his-events');
  const [eventDetail, setEventDetail] = useState<any>();
  // ---- N19 W-A：ES 事件详情要把 index_pattern 的 id 换成名字显示，所以先把索引模式列表拉下来。
  // 照 fe ee48e701 src/pages/event/DetailNG/index.tsx:46-61，但羚牛这张老详情页没有分享链接的 token 场景，
  // 所以不带 params、直接调羚牛已有的 getESIndexPatterns（src/pages/log/IndexPatterns/services.ts:20）。
  const [indexPatterns, setIndexPatterns] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    if (eventDetail?.cate === DatasourceCateEnum.elasticsearch) {
      getESIndexPatterns().then((res) => {
        setIndexPatterns(res);
      });
    }
  }, [eventDetail?.cate]);
  if (eventDetail) eventDetail.cate = eventDetail.cate || 'prometheus'; // TODO: 兼容历史的告警事件
  const parsedEventDetail = parseValues(eventDetail);
  const descriptionInfo = [
    {
      label: '告警规则名称',
      key: 'rule_name',
      render(content, { rule_id }) {
        const eventIdNum = Number(eventId);
        return (
          <Space>
            <div style={{ color: '#2B7EE5', cursor: 'pointer' }} onClick={(e) => {
              history.push("/alert-rules/edit/" + eventDetail.strategy_id + "?mode=view")
            }}>{content}</div>
            <AiButton
              size='small'
              queryPageFrom={buildPageFrom({ param: { event_id: eventIdNum } })}
              queryAction={{
                content: tAiChat('flash_button.event_analysis_content'),
                prefillOnly: false,
                key: 'troubleshooting',
                param: { event_id: eventIdNum },
              }}
              promptList={getAlertEventDetailPrompts(i18n.language)}
              initialMessage={getAlertEventDetailPrompts(i18n.language)[0]}
            >
              {tAiChat('flash_button.event_analysis')}
            </AiButton>
          </Space>
        );
      },
    },
    // 告警策略名称
    {
      label: '策略名称',
      key: 'strategy_name',
      align: 'center',
      render: (strategy_name, { strategy_id }) => {
        // return <div style={{ color: '#2B7EE5', cursor: 'pointer' }} onClick={(e) => {
        //   history.push(`/alert-rules/edit/${strategy_id}?mode=view`)
        // }}>{strategy_name}</div>;
        return strategy_name || '-';
      },
    },

    {
      label: '资产名称',
      key: 'asset_name',
      align: 'center',
      render: (asset_name, { asset_id }) => {
        return <div style={{ color: '#2B7EE5', cursor: 'pointer' }} onClick={(e) => {
          history.push(`/xh/monitor/add?type=monitor&id=${asset_id}&asset_id=${asset_id}&action=asset&prom=1`)
        }}>{asset_name}</div>;
      },
    },
    {
      label: 'IP地址',
      key: 'asset_ip',
      align: 'center',
      render: (asset_ip, { asset_id }) => {
        return <div style={{ color: '#2B7EE5', cursor: 'pointer' }} onClick={(e) => {
          history.push(`/xh/monitor/add?type=monitor&id=${asset_id}&asset_id=${asset_id}&action=asset&prom=1`)
        }}>{asset_ip}</div>;
      },
    },
    {
      label: t('detail.group_name'),
      key: 'group_name',
      render(content, { group_id }) {
        return (
          <Button size='small' type='link' className='rule-link-btn' onClick={() => handleNavToWarningList(group_id)}>
            {content}
          </Button>
        );
      }
    },
    {
      label: t('detail.severity'),
      key: 'severity',
      render: (severity) => {
        return <Tag color={priorityColor[severity - 1]}>{severity == 1 ? '紧急告警' : severity == 2 ? '重要告警' : severity == 3 ? '一般告警' : ''}</Tag>;
      },
    },
    {
      label: '告警状态',
      key: 'is_recovered',
      render(isRecovered) {
        return <Tag color={isRecovered ? 'green' : 'red'}>{isRecovered ? '已修复' : '未修复'}</Tag>;
      },
    },
    {
      label: renderHelpLabel(t('detail.tags'), t('detail.tags'), tagsHelpDescription),
      key: 'tags',
      render(tags) {
        return tags
          ? tags.map((tag) => (
            <Tag color='purple' key={tag}>
              {tag}
            </Tag>
          ))
          : '';
      },
    },
    // ...(!_.includes(['firemap', 'northstar'], eventDetail?.rule_prod) ? [{ label: t('detail.target_note'), key: 'target_note' }] : [false]),
    // {
    //   label: t('detail.trigger_time'),
    //   key: 'trigger_time',
    //   render(time) {
    //     return moment(time * 1000).format('YYYY-MM-DD HH:mm:ss');
    //   },
    // },
    {
      label: t('detail.trigger_value'),
      key: 'trigger_value',
      render(val) {
        return (
          <span>
            {val}
            <PlusLogsDetail data={eventDetail} />
          </span>
        );
      },
    },
    {
      label: t('detail.trigger_time'),
      key: 'trigger_time',
      render(time) {
        return moment((time || 0) * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      label: t('detail.recover_time'),
      key: 'recover_time',
      render(time) {
        return moment((time || 0) * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    // {
    //   label: t('detail.rule_algo'),
    //   key: 'rule_algo',
    //   render(text) {
    //     if (text) {
    //       return t('detail.rule_algo_anomaly');
    //     }
    //     return t('detail.rule_algo_threshold');
    //   },
    // },
    // {
    //   label: t('detail.cate'),
    //   key: 'cate',
    // },
    ...(eventDetail?.cate === 'prometheus'
      ? PrometheusDetail({
        eventDetail,
        history,
      })
      : [false]),
    // ---- N19 W-A：按源回查的分发分支，顺序与写法照 fe ee48e701 eventDetailByCate.tsx:38-56。
    // 用 DatasourceCateEnum 而不是字面量，是为了 clickhouse 那条不写错成 'clickhouse'（真值是 'ck'）。
    ...(eventDetail?.cate === DatasourceCateEnum.elasticsearch ? ElasticsearchDetail({ indexPatterns }) : [false]),
    ...(eventDetail?.cate === DatasourceCateEnum.opensearch ? ElasticsearchDetail() : [false]),
    ...(eventDetail?.cate === DatasourceCateEnum.tdengine ? TDengineDetail(t) : [false]),
    ...(eventDetail?.cate === DatasourceCateEnum.loki ? LokiDetail({ eventDetail, history }) : [false]),
    ...(eventDetail?.cate === DatasourceCateEnum.mysql ? MySQLDetail() : [false]),
    ...(eventDetail?.cate === DatasourceCateEnum.pgsql ? PgsqlDetail() : [false]),
    ...(eventDetail?.cate === DatasourceCateEnum.doris ? DorisDetail() : [false]),
    ...(eventDetail?.cate === DatasourceCateEnum.victorialogs ? VictorialogsDetail() : [false]),
    ...(eventDetail?.cate === DatasourceCateEnum.ck ? ClickHouseDetail() : [false]),
    // ...(eventDetail?.cate === 'host' ? Host(t, commonState) : [false]),
    // ...(plusEventDetail(eventDetail?.cate, t) || []),
    {
      label: t('detail.prom_eval_interval'),
      key: 'prom_eval_interval',
      render(content) {
        return `${content} s`;
      },
    },
    {
      label: '屏蔽状态',
      key: 'is_muted',
      render(mute) {
        return <Tag color={mute ? 'green' : 'red'}>{mute ? '已屏蔽' : '未屏蔽'}</Tag>;
      },
    },
    // 添加屏蔽开始时间显示，仅在is_muted为1时显示
    ...(eventDetail?.is_muted === 1 ? [{
      label: '屏蔽开始时间',
      key: 'mute_start_time',
      render(time) {
        return time;
      },
    }] : []),
    // 添加屏蔽结束时间显示，仅在is_muted为1时显示
    ...(eventDetail?.is_muted === 1 ? [{
      label: '屏蔽结束时间',
      key: 'mute_end_time',
      render(time) {
        return time;
      },
    }] : []),

    // {
    //   label: t('detail.prom_for_duration'),
    //   key: 'prom_for_duration',
    //   render(content) {
    //     return `${content} s`;
    //   },
    // },
    // {
    //   label: t('detail.notify_channels'),
    //   key: 'notify_channels',
    //   render(channels) {
    //     return channels.join(' ');
    //   },
    // },
    // {
    //   label: t('detail.notify_groups_obj'),
    //   key: 'notify_groups_obj',
    //   render(groups) {
    //     return groups ? groups.map((group) => <Tag color='purple'>{group.name}</Tag>) : '';
    //   },
    // },
    // {
    //   label: t('detail.callbacks'),
    //   key: 'callbacks',
    //   render(callbacks) {
    //     return callbacks
    //       ? callbacks.map((callback) => (
    //         <Tag>
    //           <Paragraph copyable style={{ margin: 0 }}>
    //             {callback}
    //           </Paragraph>
    //         </Tag>
    //       ))
    //       : '';
    //   },
    // },
  ];

  if (eventDetail?.annotations) {
    _.forEach(eventDetail.annotations, (value, key) => {
      descriptionInfo.push({
        label: key,
        key,
        render: () => {
          if (value.indexOf('http') === 0) {
            return (
              <a href={value} target='_blank'>
                {value}
              </a>
            );
          }
          return <span>{value}</span>;
        },
      });
    });
  }

  useEffect(() => {
    const requestPromise = isHistory ? getHistoryEventsById(eventId) : getAlertEventsById(eventId);
    requestPromise.then(async (res) => {
      let detailInfo = res.dat;
      let ruleIds = new Array<number>();
      ruleIds.push(detailInfo.rule_id)
      await getStrategiesByRuleIds(ruleIds).then((result) => {
        let rules = {};
        result.dat.forEach(rule => {
          return rules[rule.id] = rule;
        });
        if (rules[detailInfo.rule_id]) {
          detailInfo["rule_config_cn"] = rules[detailInfo.rule_id].rule_config_cn;
          detailInfo["strategy_id"] = rules[detailInfo.rule_id].strategy_id;
        }
      })
      setEventDetail(detailInfo);
    }).catch(() => {
      setTimeout(() => {
        history.push('/alert-cur-events');
      }, 1500);
    });
  }, [busiId, eventId]);

  return (
    // <PageLayout title={t('detail.title')} showBack backPath={isHistory ? '/alert-his-events' : '/alert-cur-events'}>
    <PageLayout title={t('detail.title')} showBack>
      <div className='event-detail-container'>

        <Spin spinning={!eventDetail}>
          <Card
            size='small'
            className='desc-container'
            title={t('detail.card_title')}
            actions={[
              <div className='alert_detail_action-btns'>
                <Space>
                  {
                    eventDetail?.is_muted != 1 && <Button
                      type='primary'
                      onClick={() => {
                        history.push({
                          pathname: '/alert-mutes/add',
                          search: queryString.stringify({
                            busiGroup: eventDetail.group_id,
                            prod: eventDetail.rule_prod,
                            cate: eventDetail.cate,
                            datasource_ids: [eventDetail.datasource_id],
                            tags: eventDetail.tags,
                            ruleName: eventDetail.rule_name
                          }),
                        });
                      }}
                    >
                      {t('shield')}
                    </Button>
                  }
                  {/* {!isHistory && ( */}
                  <Button
                    // danger
                    onClick={() => {
                      history.goBack()
                      // history.push(
                      //   isHistory ?'/alert-his-events':'/alert-cur-events'
                      // )

                    }}
                  >
                    返回
                  </Button>
                  {/* )} */}
                </Space>
              </div>,
            ]}
          >
            {eventDetail && (
              <div>
                <PlusPreview data={parsedEventDetail} />
                {descriptionInfo
                  .filter((item: any) => {
                    if (!item) return false;
                    return parsedEventDetail.is_recovered ? true : item.key !== 'recover_time';
                  })
                  .map(({ label, key, render }: any, i) => {

                    return (
                      <div className='desc-row' key={key + i}>
                        <div className='desc-label'>{label}：</div>
                        <div className='desc-content'>{render ? render(parsedEventDetail[key], parsedEventDetail) : parsedEventDetail[key]}</div>
                      </div>
                    );
                  })}
                <Solution ruleId={eventDetail.rule_id} />
              </div>
            )}
          </Card>
        </Spin>
      </div>
    </PageLayout>
  );
};

export default EventDetailPage;

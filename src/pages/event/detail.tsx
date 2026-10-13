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
import { QuestionCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { getAlertEventsById, getHistoryEventsById } from '@/services/warning';
import { priorityColor } from '@/utils/constant';
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
import './detail.less';
import { getStrategiesByRuleIds } from '@/services/warning';
import Solution from './Solution'
const { Paragraph } = Typography;
const EventDetailPage: React.FC = () => {
  const { t } = useTranslation('AlertCurEvents');
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
  const isHistory = history.location.pathname.includes('alert-his-events') || history.location.pathname.includes('alert-events-shanshu-his');
  const isShanshuRoute = history.location.pathname.includes('alert-events-shanshu');
  const [eventDetail, setEventDetail] = useState<any>();
  if (eventDetail) eventDetail.cate = eventDetail.cate || 'prometheus'; // TODO: 兼容历史的告警事件
  const parsedEventDetail = parseValues(eventDetail);

  /**
   * 将 tags 数组（如 ["asset_type=交换机", "asset_name=xxx", ...]）解析为 key-value 对象
   */
  const parseTags = (tags: string[]): Record<string, string> => {
    const result: Record<string, string> = {};
    if (!tags || !Array.isArray(tags)) return result;
    tags.forEach((tag) => {
      const idx = tag.indexOf('=');
      if (idx > 0) {
        const key = tag.substring(0, idx).trim();
        const value = tag.substring(idx + 1).trim();
        result[key] = value;
      }
    });
    return result;
  };

  /**
   * 渲染回放按钮
   * 数据来源：rule_config.queries（原始 PromQL，不替换 $asset_id）
   * 与原 PromQL脚本 字段后的回放按钮逻辑保持一致
   */
  const renderReplayBtn = () => {
    let queries = _.get(eventDetail?.rule_config, 'queries', []);
    if (!queries || queries.length === 0) return null;
    return (
      <Space style={{ marginLeft: 8 }}>
        {_.map(queries, (query, index) => {
          const { prom_ql } = query;
          if (!prom_ql) return null;
          return (
            <Button
              key={prom_ql + index}
              type='ghost'
              size='small'
              onClick={() => {
                history.push({
                  pathname: '/metric/explorer',
                  search: queryString.stringify({
                    prom_ql,
                    data_source_name: 'prometheus',
                    data_source_id: eventDetail.datasource_id,
                    mode: 'graph',
                    start: moment.unix(eventDetail.trigger_time).subtract(30, 'minutes').unix(),
                    end: moment.unix(eventDetail.trigger_time).add(30, 'minutes').unix(),
                  }),
                });
              }}
            >
              回放{queries.length > 1 ? index + 1 : ''}
              <PlayCircleOutlined style={{ marginLeft: 2 }} />
            </Button>
          );
        })}
      </Space>
    );
  };

  /**
   * 根据资产类型将 tags + 触发值拼成一句可读的事件描述
   * 参考指标合并简表，按资产类型选取关键标签字段组合语句
   *
   * 标签字段映射（来自指标合并简表）：
   * - 网络设备(交换机/路由器/防火墙): ifname(接口名), ip(管理地址)
   * - 物理服务器带外(IPMI): collector(采集器如bmc), name(传感器名), type(传感器类型)
   * - 主机/服务器: instance(实例地址), interface(网卡名)
   * - 数据库(MySQL/达梦): address(服务实例地址)
   * - RabbitMQ: node(节点), exchange(交换机名), vhost(虚拟主机)
   * - HTTP/Ping探测: target(探测目标), method(请求方法)
   */
  const renderEventContent = (tags: string[]) => {
    const tagMap = parseTags(tags);
    const assetType = tagMap['asset_type'] || '';
    const assetName = tagMap['asset_name'] || eventDetail?.asset_name || '';
    const ruleName = tagMap['rulename'] || eventDetail?.rule_name || '';
    const triggerValue = eventDetail?.trigger_value || '';

    let sentence = '';
    switch (assetType) {
      case '交换机':
      case '防火墙':
      case 'waf': {
        // 网络设备：资产名(管理地址) ifname 接口产生了什么告警
        const ifname = tagMap['ifname'];
        const ip = tagMap['ip'];
        const ipInfo = ip ? `(ip:${ip})` : '';
        sentence = `${assetName}${ifname ? ` ${ifname} 接口` : ''}产生了 ${ruleName} 告警`;
        break;
      }
      case '物理服务器带外': {
        // IPMI 带外管理：区分传感器告警(ipmi_sensor_state)和远控状态告警(ipmi_up)
        const sensorName = tagMap['name'];
        const collector = tagMap['collector'];

        if (sensorName) {
          // 传感器类告警：ipmi_sensor_state
          sentence = `${assetName}的${sensorName}传感器 产生了 ${ruleName} 告警`;
        } else if (collector) {
          // 远控状态类告警：ipmi_up
          sentence = `${assetName}的${collector}采集模块 产生了 ${ruleName} 告警`;
        } else {
          sentence = `${assetName}产生了 ${ruleName} 告警`;
        }
        break;
      }
      case '物理服务器':
      case '服务器':
      case '主机': {
        // 主机/物理服务器：资产名的 name(磁盘) 或 interface(网卡) 产生了什么告警
        const deviceName = tagMap['name'];
        const iface = tagMap['interface'];
        if (deviceName) {
          sentence = `${assetName}的 ${deviceName} 产生了 ${ruleName} 告警`;
        } else if (iface) {
          sentence = `${assetName}的 ${iface} 网卡产生了 ${ruleName} 告警`;
        } else {
          sentence = `${assetName}产生了 ${ruleName} 告警`;
        }
        break;
      }
      case 'MySQL': {
        // MySQL：MySQL 资产名(address)产生了什么告警
        const address = tagMap['address'];
        sentence = `${assetName}${address ? `(${address})` : ''}产生了 ${ruleName} 告警`;
        break;
      }
      case '达梦':
      case '达梦数据库': {
        // 达梦/数据库：数据库 资产名(target或host:port)产生了什么告警
        const target = tagMap['target'];
        const host = tagMap['host'];
        const port = tagMap['port'];
        const address = target || (host ? `${host}${port ? `:${port}` : ''}` : '');
        const dbType = assetType === '达梦' || assetType === '达梦数据库' ? '达梦数据库' : '数据库';
        sentence = `${assetName}${address ? `(${address})` : ''}产生了 ${ruleName} 告警`;
        break;
      }
      case 'Redis': {
        const address = tagMap['address'];
        sentence = `${assetName}${address ? `(${address})` : ''}产生了 ${ruleName} 告警`;
        break;
      }
      case 'RabbitMQ': {
        // RabbitMQ：根据标签判断是节点级还是交换机级告警
        const node = tagMap['node'];
        const exchange = tagMap['exchange'];
        const vhost = tagMap['vhost'];
        const exchangeType = tagMap['type'];
        const url = tagMap['url'];
        const parts = [`RabbitMQ ${assetName}`];
        if (url) parts.push(`(${url})`);
        if (node) parts.push(`的 ${node} 节点`);
        if (exchange) {
          let exchangeInfo = exchange;
          if (exchangeType) exchangeInfo += `(类型：${exchangeType})`;
          parts.push(`的 ${exchangeInfo} 交换机`);
        }
        if (vhost) parts.push(`，vhost：${vhost}`);
        sentence = `${parts.join('')}产生了 ${ruleName} 告警`;
        break;
      }
      default: {
        // 通用兜底：尝试用 target 定位，资产名产生了什么告警
        const target = tagMap['target'];
        if (assetName && ruleName) {
          sentence = `${assetName}${target ? `(${target})` : ''}产生了 ${ruleName} 告警`;
        } else if (ruleName) {
          sentence = ruleName;
        }
        break;
      }
    }
    if (triggerValue) {
      sentence += `，当前值: ${triggerValue}`;
    }

    return (
      <span style={{ lineHeight: '1.8', display: 'flex', alignItems: 'center' }}>
        {sentence || '-'}
        { !isShanshuRoute && renderReplayBtn()}
      </span>
    );
  };

  const descriptionInfo = [
    {
      label: '告警规则名称',
      key: 'rule_name',
      render(content, { rule_id, asset_name }) {
        const displayName = asset_name ? `[${asset_name}] ${content}` : content;
        return <div style={{ color: '#2B7EE5', cursor: 'pointer' }} onClick={(e) => {
          !isShanshuRoute && history.push("/alert-rules/edit/" + eventDetail.strategy_id + "?mode=view")
        }}>{displayName}</div>;
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
          !isShanshuRoute &&history.push(`/xh/monitor/add?type=monitor&id=${asset_id}&asset_id=${asset_id}&action=asset&prom=1`)
        }}>{asset_name}</div>;
      },
    },
    {
      label: '资产IP',
      key: 'asset_ip',
      align: 'center',
      render: (asset_ip, { asset_id }) => {
        return <div style={{ color: '#2B7EE5', cursor: 'pointer' }} onClick={(e) => {
          !isShanshuRoute && history.push(`/xh/monitor/add?type=monitor&id=${asset_id}&asset_id=${asset_id}&action=asset&prom=1`)
        }}>{asset_ip}</div>;
      },
    },
    {
      label: t('detail.group_name'),
      key: 'group_name',
      render(content, { group_id }) {
        return (
          <Button size='small' type='link' className='rule-link-btn' onClick={() => !isShanshuRoute && handleNavToWarningList(group_id)}>
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
      label: '事件内容',
      key: 'tags',
      render(tags) {
        return renderEventContent(tags);
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
    // ...(eventDetail?.cate === 'host' ? Host(t, commonState) : [false]),
    // ...(plusEventDetail(eventDetail?.cate, t) || []),
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
        if (isShanshuRoute) {
          history.push('/alert-events-shanshu-cur');
        } else {
          history.push('/alert-cur-events');
        } 
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
                    eventDetail?.is_muted != 1 && !isShanshuRoute && <Button
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

import React, { useEffect, useState, useLayoutEffect, useRef, useImperativeHandle, useContext } from 'react';
import { Button, Row, Col, Drawer, Tag, Table, Dropdown, Menu, Tooltip } from 'antd';
import { useHistory, Link } from 'react-router-dom';
import { ReactNode } from 'react-markdown/lib/react-markdown';
import _, { throttle } from 'lodash';
import moment from 'moment';
import { useDebounceFn } from 'ahooks';
import queryString from 'query-string';
import { useTranslation } from 'react-i18next';
import { getAlertCards, getCardDetail } from '@/services/warning';
import { CommonStateContext } from '@/App';
import { SeverityColor, SeverityFont, deleteAlertEventsModal } from './index';
import CardLeft from './cardLeft';
import './index.less';
import { getStrategiesByRuleIds } from '@/services/warning';

// @ts-ignore
import BatchAckBtn from 'plus:/parcels/Event/Acknowledge/BatchAckBtn';
// @ts-ignore
import AckBtn from 'plus:/parcels/Event/Acknowledge/AckBtn';

interface Props {
  filter: any;
  header: ReactNode;
  refreshFlag: string;
}

interface CardType {
  severity: number;
  title: string;
  total: number;
  event_ids: number[];
}

function containerWidthToColumn(width: number): number {
  if (width > 1500) {
    return 4;
  } else if (width > 1000) {
    return 6;
  } else if (width > 850) {
    return 8;
  } else {
    return 12;
  }
}

function Card(props: Props, ref) {
  const { t } = useTranslation('AlertCurEvents');
  const { filter, header, refreshFlag } = props;
  const { groupedDatasourceList, busiGroups } = useContext(CommonStateContext);
  const groupIds = busiGroups?.map(item => item.id)
  const Ref = useRef<HTMLDivElement>(null);
  const history = useHistory();
  const [span, setSpan] = useState<number>(4);
  const [groupId, setGroupId] = useState<string>();
  const [cardList, setCardList] = useState<CardType[]>();
  const [openedCard, setOpenedCard] = useState<CardType>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [drawerList, setDrawerList] = useState<any>();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    reloadCard();
  }, [filter, groupId, refreshFlag]);

  const { run: reloadCard } = useDebounceFn(
    () => {
      console.log('reloadCard');
      if (!groupId) return;
      if (filter.query == null || filter.query.length == 0) {
        delete filter.query;
      }
      if (filter.start <= 0) {
        delete filter.start;
      }
      if (filter.end <= 0) {
        delete filter.end;
      }
      filter['group_id'] = groupId.trim();
      filter['gid'] = groupIds?.toString()
      getAlertCards(filter).then((res) => {
        setCardList(res.dat);
      });
    },
    {
      wait: 500,
    },
  );

  useLayoutEffect(() => {
    function updateSize() {
      const width = Ref.current?.offsetWidth;
      width && setSpan(containerWidthToColumn(width));
    }
    const debounceNotify = throttle(updateSize, 400);

    window.addEventListener('resize', debounceNotify);
    updateSize();
    return () => window.removeEventListener('resize', debounceNotify);
  }, []);

  const onClose = () => {
    setVisible(false);
  };

  const columns: any = [
    {
      title: t('告警规则名称'),
      dataIndex: 'rule_name',
      width: 180,
      render(title, { id, tags }) {
        return (
          <>
            <div>
              <Link to={`/alert-cur-events/${id}`}>{title}</Link>
            </div>
          </>
        );
      },
    },
    {
      title: '资产名称',
      dataIndex: 'asset_name',
      width: 100,
      ellipsis: true,
      render(name, record, index) {
        return (
          <div
            style={{ color: '#2B7EE5', cursor: 'pointer' }}
            onClick={(e) => {
              history.push(`/xh/monitor/add?type=monitor&id=${record.asset_id}&asset_id=${record.asset_id}&action=asset&prom=1`);

            }}
          >
            {name}
          </div>
        );
      },
    },
    {
      title: 'IP地址',
      dataIndex: 'asset_ip',
      width: 100,
      align: 'center',
      render(name, record, index) {
        return (
          <div
            style={{ color: '#2B7EE5', cursor: 'pointer' }}
            onClick={(e) => {
              history.push(`/xh/monitor/add?type=monitor&id=${record.asset_id}&asset_id=${record.asset_id}&action=asset&prom=1`);
            }}
          >
            {name}
          </div>
        );
      },
    },
    {
      title: '告警级别',
      dataIndex: 'severity',
      align: 'center',
      width: 100,
      render(val, record) {
        return (
          <>
            <Tag color={SeverityColor[val - 1]}>{SeverityFont[val - 1]}</Tag>
          </>
        );
      },
      sorter: (a, b) => {
        return a.rule_name.localeCompare(b.rule_name);
      },
    },
    // {
    //   title: t('prod'),
    //   dataIndex: 'rule_prod',
    //   width: 100,
    //   render: (value) => {
    //     return t(`AlertHisEvents:rule_prod.${value}`);
    //   },
    // },
    // {
    //   title: t('common:datasource.name'),
    //   dataIndex: 'datasource_id',
    //   render: (value, record) => {
    //     if (value === 0) {
    //       return (
    //         <Tag color='purple' key={value}>
    //           $all
    //         </Tag>
    //       );
    //     }
    //     const name = _.find(groupedDatasourceList[record.cate], { id: value })?.name;
    //     if (!name) return null;
    //     return (
    //       <Tag color='purple' key={value}>
    //         {_.find(groupedDatasourceList[record.cate], { id: value })?.name}
    //       </Tag>
    //     );
    //   },
    // },
    {
      title: t('trigger_time'),
      dataIndex: 'trigger_time',
      width: 120,
      render(value) {
        return moment(value * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      dataIndex: 'operate',
      title: '操作',
      width: 180,
      align: 'center',
      render(value, record) {
        return (
          <>
            <AckBtn
              data={record}
              onOk={() => {
                fetchCardDetail(openedCard!);
              }}
            />
            {
              record?.is_muted != 1 ? <Button
                size='small'
                type='link'
                onClick={() => {
                  history.push({
                    pathname: '/alert-mutes/add',
                    search: queryString.stringify({
                      busiGroup: record.group_id,
                      prod: record.rule_prod,
                      cate: record.cate,
                      datasource_ids: [record.datasource_id],
                      tags: record.tags,
                      ruleName: record.rule_name
                    }),
                  });
                }}
              >
                {t('shield')}
              </Button> : <Button
                size='small'
                type='link'
                disabled
              >
                {t('shield')}
              </Button>
            }
            <Button
              size='small'
              type='link'
              danger
              onClick={() =>
                deleteAlertEventsModal(
                  [record.id],
                  () => {
                    setSelectedRowKeys(selectedRowKeys.filter((key) => key !== record.id));
                    fetchCardDetail(openedCard!);
                  },
                  t,
                )
              }
            >
              {t('common:btn.delete')}
            </Button>
          </>
        );
      },
    },
  ];

  if (import.meta.env.VITE_IS_PRO === 'true') {
    columns.splice(4, 0, {
      title: t('status'),
      dataIndex: 'status',
      width: 100,
      render: (value) => {
        return t(`status_${value}`) as string;
      },
    });
  }

  const fetchCardDetail = (card: CardType) => {
    setVisible(true);
    setOpenedCard(card);
    getCardDetail(card.event_ids).then(async (res) => {
      let list = res.dat;
      if (list != null) {
        let ruleIds = Array.from(new Set(list.map((obj) => obj.rule_id)));
        await getStrategiesByRuleIds(ruleIds).then((res) => {
          let rules = {};
          res.dat.forEach((rule) => {
            return (rules[rule.id] = rule);
          });
          list.forEach((item) => {
            if (rules[item.rule_id]) {
              item['rule_config_cn'] = rules[item.rule_id].rule_config_cn;
              return item;
            }
          });
        });
      }

      setDrawerList(list);
    });
  };

  useImperativeHandle(ref, () => ({
    reloadCard,
  }));

  return (
    <div className='event-content cur-events' style={{ display: 'flex', height: '100%' }} ref={Ref}>
      <CardLeft onRefreshRule={setGroupId} />
      <div style={{  flex: 1, padding: 16, overflowY: 'auto' }}>
        {header}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {cardList?.map((card, i) => (
            <Col span={span} key={i}>
              <div className={`event-card ${SeverityColor[card.severity - 1]} ${SeverityColor[card.severity - 1]}-left-border`} onClick={() => fetchCardDetail(card)}>
                <div className='event-card-title'>告警级别：{card.severity == 1 ? '紧急告警' : card.severity == 2 ? '重要告警' : card.severity == 3 ? '一般告警' : ''}</div>
                <div className='event-card-num'>{card.total}</div>
              </div>
            </Col>
          ))}
        </Row>
      </div>
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{openedCard?.title}</span>
            <Dropdown
              disabled={selectedRowKeys.length === 0}
              overlay={
                <Menu>
                  <Menu.Item
                    disabled={selectedRowKeys.length === 0}
                    onClick={() =>
                      deleteAlertEventsModal(
                        selectedRowKeys,
                        () => {
                          setSelectedRowKeys([]);
                          fetchCardDetail(openedCard!);
                        },
                        t,
                      )
                    }
                  >
                    {t('common:btn.batch_delete')}{' '}
                  </Menu.Item>
                  <BatchAckBtn
                    selectedIds={selectedRowKeys}
                    onOk={() => {
                      setSelectedRowKeys([]);
                      fetchCardDetail(openedCard!);
                    }}
                  />
                </Menu>
              }
              trigger={['click']}
            >
              <Button style={{ marginRight: 8 }}>{t('batch_btn')}</Button>
            </Dropdown>
          </div>
        }
        placement='right'
        onClose={onClose}
        visible={visible}
        width={960}
      >
        <Table
          tableLayout='fixed'
          size='small'
          rowKey={'id'}
          bordered
          // className='card-event-drawer'
          rowClassName={(record: { severity: number }) => {
            return SeverityColor[record.severity - 1] + '-left-border';
          }}
          rowSelection={{
            selectedRowKeys: selectedRowKeys,
            onChange(selectedRowKeys, selectedRows) {
              setSelectedRowKeys(selectedRowKeys.map((key) => Number(key)));
            },
          }}
          dataSource={drawerList}
          columns={columns}
        />
      </Drawer>
    </div>
  );
}

export default React.forwardRef(Card);

import React from 'react';
import _ from 'lodash';
import { Row, Col, Button, Space } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import queryString from 'query-string';
import moment from 'moment';
import PromQLInput from '@/components/PromQLInput';

interface IProps {
  eventDetail: any;
  history: any;
}

export default function PrometheusDetail(props: IProps) {
  const { eventDetail, history } = props;
  // console.log(eventDetail);
  // console.log(history);
  

  return [
    {
      label: 'PromQL脚本',
      key: 'rule_config',
      render(ruleConfig) {
        const queries = _.get(ruleConfig, 'queries', []);
        return (
          <div style={{ width: '100%' }}>
            {_.map(queries, (query) => {
              const { prom_ql } = query;
              return (
                <div className='promql-row' key={prom_ql}>
                  <Space>
                    <PromQLInput value={prom_ql} readonly />
                    <Button
                      className='run-btn'
                      type='ghost'
                      size="small"
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
                    >回放
                      <PlayCircleOutlined className='run-con' />
                    </Button>
                  </Space>
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      label: '回放PromQL',
      key: 'rule_replay',
      render(rulePlay) {
        // console.log(222, rulePlay);
        
        let queries = _.get(rulePlay, 'queries', []);
        queries.forEach(item => {
          item.prom_ql = item.prom_ql.replace(/\$asset_id/g, eventDetail.asset_id)
        })
        // console.log(555, queries);
        
        return (
          <div style={{ width: '100%' }}>
            {_.map(queries, (query) => {
              const { prom_ql } = query;
              return (
                <div className='promql-row' key={prom_ql}>
                  <Space>
                    <PromQLInput value={prom_ql} readonly />
                    <Button
                      className='run-btn'
                      type='ghost'
                      size="small"
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
                    >回放
                      <PlayCircleOutlined className='run-con' />
                    </Button>
                  </Space>
                </div>
              );
            })}
          </div>
        );
      },
    },
  ];
}

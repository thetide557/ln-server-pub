import React, { useState, useEffect , useRef} from 'react';
import { Drawer, Table, Space, Input, Select } from 'antd';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import moment from 'moment';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
// import CodeMirror from '@/components/CodeMirror';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { json } from '@codemirror/lang-json';
import { defaultHighlightStyle } from '@codemirror/highlight';
import TimeRangePicker, { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';
import { getEventLogQuery } from '@/services/warning';
import ModalHOC, { ModalWrapProps } from '@/pages/dashboard/Components/ModalHOC';
import { getLogsQuery } from '@/pages/explorer/Elasticsearch/services';
import { normalizeLogsQueryRequestBody } from '@/pages/explorer/Elasticsearch/utils';
import './style.less'


interface IProps {
  // id: string;
  // start: number;
  // end: number;
  datasource_id:number;
  query: {
    date_field: string;
    filter: string; 
    index: string;
    interval: number;
    ref: string;
    unit: string;
    value: any; 
    group_by: any[]; 
    trigger_value : any // 告警条件
  } ;
  visible?: boolean;
  destroy?: () => void;
}

interface IJSON {
  [key: string]: string | IJSON;
}

function localeCompareFunc(a, b) {
  return a.localeCompare(b);
}

function index(props: IProps ) {
  const { t } = useTranslation('datasource');
  const { datasource_id,query, visible, destroy } = props;
  const [range, setRange] = useState<IRawTimeRange>({
    start: moment(),
    end: moment(),
  });
  const [limit, setLimit] = useState(10);
  const [fields, setFields] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>();
  const [data, setData] = useState<
    {
      id: string;
      fields: {
        [key: string]: string[];
      };
      json: IJSON;
    }[]
  >([]);

  useEffect(() => {
    if (!_.isEmpty(query)) {
      console.log('日志详情查询条件', query);
      const end = Math.floor(Date.now() / 1000);
      const start = end - query.interval;
      setRange({
        start: moment.unix(start),
        end: moment.unix(end),
      });
    }
  }, [query]);
  
  useEffect(() => {
    if (_.isEmpty(query)) {
      return;
    }
    const parsedRange = parseRange(range);
    const start = moment(parsedRange.start).valueOf();
    const end = moment(parsedRange.end).valueOf();
    getLogsQuery(
      datasource_id,
      normalizeLogsQueryRequestBody({
        start,
        end,
        index: query.index,
        filter: query.filter,
        date_field: query.date_field,
        limit,
        func: query.value?.func,
        funcField: query.value?.field,
        groupBy: query.group_by,
        alertCondition: query.trigger_value,
      })
    ).then((res) => {
      query.group_by.forEach((item) => {
        const field = item.field;
        const value = res.aggres[`terms_${item.field}`].buckets[0].key;
        if (field && value) {
          getLogsQuery(
            datasource_id,
            normalizeLogsQueryRequestBody({
              start,
              end,
              index: query.index,
              filter: query.filter,
              date_field: query.date_field,
              limit,
              termsKey: field,
              termsValue: value,
            })
          ).then((res) => {
            let allFields: string[] = [];
            const newData = _.map(res.list, (item) => {
              const keys = _.keys(item._source);
              allFields = _.union(_.concat(allFields, keys));
              return {
                id: _.uniqueId(),
                fields: item.fields,
                json: item._source,
              };
            });
            setData(newData);
            setFields(allFields);
          });
        }
      });
    });
  }, [JSON.stringify(query), JSON.stringify(range), limit]);

  return (
    // 日志详情
    <Drawer title={t('es.event.logs.title')} width={960} placement='right' onClose={destroy} visible={visible}>
      <div style={{ marginBottom: 10 }}>
        <Space>
          <TimeRangePicker dateFormat='YYYY-MM-DD HH:mm:ss' value={range} onChange={setRange} />
          <Input.Group>
            <span className='ant-input-group-addon'>{t('es.event.logs.size')}</span>
            <Select
              value={limit}
              onChange={(val) => {
                setLimit(val);
              }}
              style={{ minWidth: 60 }}
            >
              <Select.Option value={10}>10</Select.Option>
              <Select.Option value={20}>20</Select.Option>
              <Select.Option value={50}>50</Select.Option>
              <Select.Option value={100}>100</Select.Option>
              <Select.Option value={500}>500</Select.Option>
            </Select>
          </Input.Group>
          <Input.Group>
            <span className='ant-input-group-addon'>{t('es.event.logs.fields')}</span>
            <Select
              mode='multiple'
              value={selectedFields}
              onChange={(val) => {
                setSelectedFields(val);
              }}
              style={{ minWidth: 410 }}
              maxTagCount='responsive'
            >
              {fields.map((item) => {
                return (
                  <Select.Option key={item} value={item}>
                    {item}
                  </Select.Option>
                );
              })}
            </Select>
          </Input.Group>
        </Space>
      </div>
      <Table
        size='small'
        className='n9e-event-logs-table'
        tableLayout='fixed'
        rowKey='id'
        columns={
          _.isEmpty(selectedFields)
            ? [
                {
                  title: 'Document',
                  dataIndex: 'fields',
                  render(text) {
                    return (
                      <dl className='event-logs-row'>
                        {_.map(text, (val, key) => {
                          return (
                            <React.Fragment key={key}>
                              <dt>{key}:</dt> <dd>{_.isString(val) ? val : JSON.stringify(val)}</dd>
                            </React.Fragment>
                          );
                        })}
                      </dl>
                    );
                  },
                },
              ]
            : _.map(selectedFields, (item) => {
                return {
                  title: item,
                  dataIndex: 'fields',
                  render(fields) {
                    const val = fields[item];
                    if (_.isString(fields[item])) {
                      return val;
                    }
                    return JSON.stringify(val);
                  },
                  sorter: (a, b) => localeCompareFunc(_.join(_.get(a, `fields[${item}]`, '')), _.join(_.get(b, `fields[${item}]`, ''))),
                };
              })
        }
        dataSource={data}
        expandable={{
          expandedRowRender: (record) => {
            let value = '';
            try {
              value = JSON.stringify(record.json, null, 4);
            } catch (e) {
              console.error(e);
              value = t('es.event.logs.jsonParseError');
            }
            return (
              <CodeMirror
                value={value}
                height='auto'
                basicSetup={false}
                editable={false}
                extensions={[
                  defaultHighlightStyle.fallback,
                  json(),
                  EditorView.lineWrapping,
                  EditorView.theme({
                    '&': {
                      backgroundColor: '#F6F6F6 !important',
                    },
                    '&.cm-editor.cm-focused': {
                      outline: 'unset',
                    },
                  }),
                ]}
              />
            );
          },
          expandIcon: ({ expanded, onExpand, record }) =>
            expanded ? <DownOutlined onClick={(e) => onExpand(record, e)} /> : <RightOutlined onClick={(e) => onExpand(record, e)} />,
        }}
      />
    </Drawer>
  );
}

export default index;

import React from 'react';
import { Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';

import { NAME_SPACE as mysqlNS } from '@/plugins/mysql/constants';

import { NAME_SPACE } from '../constants';
import { DataSourceType } from './types';

interface Props {
  data: DataSourceType;
}
export default function MysqlLike(props: Props) {
  const { t } = useTranslation();
  const { data } = props;
  const obj: {
    string?: string;
  } = {};
  const type = NAME_SPACE;

  data.settings[`${type}.tables`] &&
    data.settings[`${type}.tables`].forEach((item) => {
      if (!item || !item[`${type}.table.source`] || !item[`${type}.table.target`]) return;

      if (obj[item[`${type}.table.target`]]) {
        obj[item[`${type}.table.target`]] += ' + ' + item[`${type}.table.source`] + ` ( ${item[`${type}.table.op`] === 'EQ' ? t(`${mysqlNS}:精确`) : t(`${mysqlNS}:正则`)} ) `;
      } else {
        obj[item[`${type}.table.target`]] = item[`${type}.table.source`] + ` ( ${item[`${type}.table.op`] === 'EQ' ? t(`${mysqlNS}:精确`) : t(`${mysqlNS}:正则`)} ) `;
      }
    });

  return (
    <div>
      <div className='page-title'>{t(`${NAME_SPACE}:datasource.shards.title`)}</div>
      <div className='flash-cat-block'>
        {data.settings[`${type}.shards`].map((item, i) => (
          <div className='flash-cat-block' key={i}>
            <Row gutter={16}>
              <Col span={12}>{t(`${NAME_SPACE}:datasource.shards.addr`)}</Col>
              <Col span={12}>{t(`${NAME_SPACE}:datasource.shards.user`)}</Col>
              <Col span={12} className='second-color'>
                {item[`${type}.addr`]}
              </Col>
              <Col span={12} className='second-color'>
                {item[`${type}.user`]}
              </Col>
              {/* 「数据库」这一列羚牛比上游 fe v9.1.0 多一列：批 A 给 pgsql 分片表单补了 `pgsql.db` 输入框
                  （src/components/DBSettings/Shard.tsx:60-67，pgsql 必填——库名为空时后端第一次真查询就报
                  `empty pgsql database`，ln-server dskit/postgres/postgres.go:75-77），
                  既然表单里填了，详情抽屉就得能看见，否则「填没填、填的是哪个库」在界面上查不出来。
                  标签复用 mysql 命名空间已有的 `datasource.shards.db` 键（src/plugins/mysql/locale/zh_CN.ts:46），
                  和批 A 那个输入框的标签取法一致，不新增词条。
                  上游 fe 的 pgsql Detail 没有这一列，比对上游时这里会多出一段，属羚牛自修。 */}
              <Col span={24}>{t(`${mysqlNS}:datasource.shards.db`)}</Col>
              <Col span={24} className='second-color'>
                {item[`${type}.db`] || '-'}
              </Col>
              <Col span={24}>{t(`${mysqlNS}:datasource.timeout`)}</Col>
              <Col span={24} className='second-color'>
                {item[`${type}.timeout`] || '-'}
              </Col>
              <Col span={24}>{t(`${mysqlNS}:datasource.max_query_rows`)}</Col>
              <Col span={24} className='second-color'>
                {item[`${type}.max_query_rows`] || '-'}
              </Col>
              <Col span={24}>{t(`${mysqlNS}:datasource.max_idle_conns`)}</Col>
              <Col span={24} className='second-color'>
                {item[`${type}.max_idle_conns`] || '-'}
              </Col>
              <Col span={24}>{t(`${mysqlNS}:datasource.max_open_conns`)}</Col>
              <Col span={24} className='second-color'>
                {item[`${type}.max_open_conns`] || '-'}
              </Col>
              <Col span={24}>{t(`${mysqlNS}:datasource.conn_max_lifetime`)}</Col>
              <Col span={24} className='second-color'>
                {item[`${type}.conn_max_lifetime`] || '-'}
              </Col>
            </Row>
          </div>
        ))}
      </div>
      <div className='page-title'>{t('datasourceManage:form.other')}</div>
      <div className='flash-cat-block'>
        <Row gutter={16}>
          <Col span={24}>{t('datasourceManage:form.cluster')}</Col>
          <Col span={24} className='second-color'>
            {data.settings[`${type}.cluster_name`] || '-'}
          </Col>
        </Row>
      </div>
    </div>
  );
}

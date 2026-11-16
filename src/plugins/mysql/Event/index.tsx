import React from 'react';
import _ from 'lodash';
import i18next from 'i18next';

import { NAME_SPACE } from '../constants';

export const SQL_FOLD_THRESHOLD = 120;

const inlineActionStyle: React.CSSProperties = {
  border: 0,
  padding: '0 6px',
  background: 'transparent',
  color: '#2b7ee5',
  cursor: 'pointer',
  font: 'inherit',
  whiteSpace: 'nowrap',
};

export function FoldableSqlRow({ queryRef, sql }: { queryRef?: string; sql?: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const rawSql = sql === undefined || sql === null ? '' : String(sql);
  const foldable = rawSql.length > SQL_FOLD_THRESHOLD || /[\r\n]/.test(rawSql);

  if (!foldable) {
    return (
      <div style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        ${queryRef}: {rawSql}
      </div>
    );
  }

  const singleLineSql = rawSql.replace(/\s+/g, ' ').trim();
  const previewSql =
    singleLineSql.length > SQL_FOLD_THRESHOLD ? `${singleLineSql.slice(0, SQL_FOLD_THRESHOLD)}…` : `${singleLineSql}…`;

  return (
    <div style={{ lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
      <span
        style={{
          whiteSpace: expanded ? 'pre-wrap' : 'normal',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
        }}
      >
        ${queryRef}: {expanded ? rawSql : previewSql}
      </span>
      <button
        type='button'
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        style={inlineActionStyle}
      >
        {expanded ? '收起' : '展开'}
      </button>
    </div>
  );
}

export default function EventDetail() {
  return [
    {
      label: i18next.t(`${NAME_SPACE}:query.query`),
      key: 'rule_config',
      render(val) {
        const queries = _.get(val, 'queries', []);
        return (
          <div style={{ minWidth: 0, width: '100%' }}>
            {_.map(queries, (item, idx) => {
              return <FoldableSqlRow key={item?.ref ?? idx} queryRef={item?.ref} sql={item?.sql} />;
            })}
          </div>
        );
      },
    },
    {
      label: i18next.t(`${NAME_SPACE}:trigger.title`),
      key: 'rule_config',
      render(val) {
        const triggers = _.get(val, 'triggers', []);
        const trigger = _.get(triggers, '[0]');
        return `${trigger?.exp} ${i18next.t('AlertCurEvents:detail.trigger')} ${i18next.t(`common:severity.${trigger?.severity}`)}`;
      },
    },
  ];
}

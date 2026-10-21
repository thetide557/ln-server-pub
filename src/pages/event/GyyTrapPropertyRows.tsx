import React, { useEffect, useRef, useState } from 'react';
import {
  getGyyTrapProperties, GyyTrapProperty, GyyTrapPropertyPage, GyyTrapReadError, GyyTrapReadFailure,
} from '@/services/gyyTrapProperties';
import './gyyTrapProperties.less';

function propertyText(property: GyyTrapProperty): string {
  if (property.type === 'absent') return '未提供（缺失）';
  if (property.type === 'null') return 'null（空值）';
  if (property.type === 'bytes') {
    const encoded = typeof property.value === 'string' ? property.value : JSON.stringify(property.value, null, 2);
    return `${property.encoding || 'base64'}: ${encoded}`;
  }
  if (property.value === '') return '""（空字符串）';
  if (typeof property.value === 'object') return JSON.stringify(property.value, null, 2);
  return String(property.value);
}

export function GyyTrapPropertyValue({ property }: { property: GyyTrapProperty }) {
  const [expanded, setExpanded] = useState(false);
  const text = propertyText(property);
  const foldable = text.length > 300 || property.type === 'object' || property.type === 'array';
  // Only the preview is shortened; expanding renders the complete value as text, never HTML/links.
  return (
    <div className='gyy-trap-value'>
      <span className='gyy-trap-value-text'>{foldable && !expanded ? text.slice(0, 300) + (text.length > 300 ? '…' : '') : text}</span>
      {foldable && <button type='button' className='gyy-trap-inline-action' aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? '收起' : '展开完整值'}
      </button>}
    </div>
  );
}

const failureText: Record<GyyTrapReadFailure, string> = {
  unauthorized: '登录后可读取附加属性，原详情仍可查看。',
  forbidden: '无权读取附加属性，原详情仍可查看。',
  unavailable: '附加属性暂时无法读取，原详情仍可查看。',
  invalid: '附加属性响应格式异常，尚未完整加载。',
};

/** Returns sibling desc-row elements; there is intentionally no section/card/tab wrapper. */
function PagedPropertyRows({ eventId, isHistory }: { eventId: string; isHistory: boolean }) {
  const [pages, setPages] = useState<GyyTrapPropertyPage[]>([]);
  const [cursor, setCursor] = useState('0');
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<GyyTrapReadFailure>();
  const alive = useRef(true);
  const inFlight = useRef(false);
  const requestController = useRef<AbortController>();
  const loadedRecords = useRef(new Set<string>());

  const requestPage = async (afterSeq: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true);
    setFailure(undefined);
    try {
      const page = await getGyyTrapProperties(eventId, isHistory, afterSeq, controller.signal);
      if (!alive.current) return;
      if (page.status === 'unavailable') throw new GyyTrapReadError('unavailable');
      if (page.status === 'none') {
        setPages([]);
        setHasMore(false);
        loadedRecords.current.clear();
        return;
      }
      if (!page.record || loadedRecords.current.has(page.record.record_id)) throw new GyyTrapReadError('invalid');
      loadedRecords.current.add(page.record.record_id);
      setPages((previous) => [...previous, page]);
      setCursor(page.next_after_seq || page.record.seq);
      setHasMore(page.has_more);
    } catch (error) {
      if (!alive.current) return;
      const kind = error instanceof GyyTrapReadError ? error.kind : 'unavailable';
      if (kind === 'unauthorized' || kind === 'forbidden') {
        setPages([]);
        setCursor('0');
        setHasMore(false);
        loadedRecords.current.clear();
      }
      setFailure(kind);
    } finally {
      if (alive.current) {
        inFlight.current = false;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    requestPage('0');
    return () => {
      alive.current = false;
      requestController.current?.abort();
    };
  }, []);

  return <>
    {pages.map((page) => page.properties.map((property) => {
      const source = property.source;
      const sourceText = source ? [source.kind, source.name, source.oid, source.index === undefined ? undefined : `序号 ${source.index}`].filter((part) => part !== undefined && part !== '').join(' / ') : '';
      return <div className='desc-row gyy-trap-property-row' key={`${page.record!.record_id}:${property.key}`}>
        <div className='desc-label'>{property.label}：</div>
        <div className='desc-content'>
          <GyyTrapPropertyValue property={property} />
          <div className='gyy-trap-property-meta'>
            类型：{property.type}{sourceText ? `；来源：${sourceText}` : ''}；接收时间：{page.record!.received_at}
          </div>
        </div>
      </div>;
    }))}
    {(loading || failure || hasMore) && <div className='desc-row gyy-trap-property-row'>
      <div className='desc-label'>附加属性：</div>
      <div className='desc-content' aria-live='polite'>
        {loading ? '正在加载附加属性…' : failure ? <>
          <span>{failureText[failure]}</span>
          <button type='button' className='gyy-trap-inline-action' onClick={() => requestPage(cursor)}>重试</button>
        </> : <button type='button' className='gyy-trap-inline-action' onClick={() => requestPage(cursor)}>加载下一条接收记录</button>}
      </div>
    </div>}
  </>;
}

/** The scope key unmounts old requests/values immediately when eid or current/history changes. */
export default function GyyTrapPropertyRows({ eventId, isHistory, enabled }: { eventId: string; isHistory: boolean; enabled?: boolean }) {
  return enabled === true ? <PagedPropertyRows key={`${isHistory ? 'history' : 'current'}:${eventId}`} eventId={eventId} isHistory={isHistory} /> : null;
}

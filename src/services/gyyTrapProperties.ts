import Cookies from 'js-cookie';
import i18next from 'i18next';

export type GyyTrapPropertyType = 'string' | 'integer' | 'decimal' | 'boolean' | 'null' | 'bytes' | 'object' | 'array' | 'absent';
export type GyyTrapJsonValue = string | number | boolean | null | GyyTrapJsonValue[] | { [key: string]: GyyTrapJsonValue };
export interface GyyTrapProperty {
  key: string;
  label: string;
  type: GyyTrapPropertyType;
  value?: GyyTrapJsonValue;
  encoding?: string;
  source?: { kind: string; name?: string; index?: number; oid?: string };
}
export interface GyyTrapRecord {
  record_id: string;
  seq: string;
  role: string;
  received_at: string;
}
export interface GyyTrapPropertyPage {
  status: 'ok' | 'none' | 'unavailable';
  record?: GyyTrapRecord;
  properties: GyyTrapProperty[];
  has_more: boolean;
  next_after_seq?: string;
}
export type GyyTrapReadFailure = 'unauthorized' | 'forbidden' | 'unavailable' | 'invalid';
export class GyyTrapReadError extends Error {
  constructor(public kind: GyyTrapReadFailure) {
    // Do not copy server exception text or a response body into UI/logs.
    super('GYY Trap properties: ' + kind);
    this.name = 'GyyTrapReadError';
  }
}

const decimalSequence = /^(0|[1-9][0-9]*)$/;
export function compareGyyTrapSeq(left: string, right: string): number {
  // seq can exceed Number.MAX_SAFE_INTEGER. Compare decimal strings without conversion.
  if (left.length !== right.length) return left.length < right.length ? -1 : 1;
  return left === right ? 0 : left < right ? -1 : 1;
}

/** Validate the page envelope; all association/authorization/filtering remains server-owned. */
export function parseGyyTrapPropertyPage(body: any, afterSeq: string): GyyTrapPropertyPage {
  const invalid = () => { throw new GyyTrapReadError('invalid'); };
  if (!body || body.err !== '' || !body.dat) return invalid();
  const data = body.dat;
  if (data.status === 'none') return { status: 'none', properties: [], has_more: false };
  if (data.status === 'unavailable') return { status: 'unavailable', properties: [], has_more: false };
  const record = data.record;
  if (data.status !== 'ok' || !record || typeof record.record_id !== 'string' || !record.record_id ||
      typeof record.seq !== 'string' || !decimalSequence.test(record.seq) || compareGyyTrapSeq(record.seq, afterSeq) <= 0 ||
      typeof record.role !== 'string' || typeof record.received_at !== 'string' ||
      !Array.isArray(data.properties) || typeof data.has_more !== 'boolean') return invalid();
  if (data.has_more && (typeof data.next_after_seq !== 'string' || data.next_after_seq !== record.seq)) return invalid();
  const types: string[] = ['string', 'integer', 'decimal', 'boolean', 'null', 'bytes', 'object', 'array', 'absent'];
  const keys = new Set<string>();
  for (const property of data.properties) {
    if (!property || typeof property.key !== 'string' || !property.key || keys.has(property.key) ||
        typeof property.label !== 'string' || !types.includes(property.type)) return invalid();
    keys.add(property.key);
    if (['string', 'integer', 'decimal'].includes(property.type) && typeof property.value !== 'string') return invalid();
    if (property.type === 'boolean' && typeof property.value !== 'boolean') return invalid();
    if (property.type === 'null' && property.value !== null) return invalid();
    if (property.type === 'array' && !Array.isArray(property.value)) return invalid();
    if (property.type === 'object' && (!property.value || typeof property.value !== 'object' || Array.isArray(property.value))) return invalid();
    if (property.type === 'bytes' && typeof property.value !== 'string' && (!property.value || typeof property.value !== 'object')) return invalid();
  }
  return { status: 'ok', record, properties: data.properties, has_more: data.has_more, next_after_seq: data.next_after_seq };
}

/** Supplemental reads must never redirect an otherwise viewable (including shared) detail page. */
export async function getGyyTrapProperties(
  eventId: string,
  isHistory: boolean,
  afterSeq = '0',
  signal?: AbortSignal,
): Promise<GyyTrapPropertyPage> {
  if (!/^[1-9][0-9]*$/.test(eventId) || !decimalSequence.test(afterSeq)) throw new GyyTrapReadError('invalid');
  const token = Cookies.get('access_token');
  if (!token) throw new GyyTrapReadError('unauthorized');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, 15000);
  try {
    const path = isHistory ? 'alert-his-events' : 'alert-cur-events';
    // Same token/header convention as utils/request.ts. No source_token, SQL or client-derived reference.
    const response = await fetch(`/api/takin/${path}/${eventId}/gyy-trap-properties?after_seq=${afterSeq}`, {
      method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'X-Language': i18next.language, 'Bg-debug': '1' },
    });
    if (response.status === 401) throw new GyyTrapReadError('unauthorized');
    if (response.status === 403) throw new GyyTrapReadError('forbidden');
    if (!response.ok) throw new GyyTrapReadError('unavailable');
    return parseGyyTrapPropertyPage(await response.json(), afterSeq);
  } catch (error) {
    if (error instanceof GyyTrapReadError) throw error;
    throw new GyyTrapReadError('unavailable');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

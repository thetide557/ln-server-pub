import Cookies from 'js-cookie';
import { getGyyTrapProperties, parseGyyTrapPropertyPage } from '@/services/gyyTrapProperties';

jest.mock('js-cookie', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('i18next', () => ({ __esModule: true, default: { language: 'zh_CN' } }));
const fetchMock = jest.fn();
const originalFetch = global.fetch;
const fixture = () => ({ err: '', dat: { status: 'ok', record: { record_id: 'fixture-id', seq: '9007199254740993', role: 'raise', received_at: '2026-10-21T02:00:00.123456Z' }, properties: [{ key: 'varbind:7', label: '发生报文 · 未知OID', type: 'integer', value: '18446744073709551615' }], has_more: true, next_after_seq: '9007199254740993' } });
beforeEach(() => { fetchMock.mockReset(); (Cookies.get as jest.Mock).mockReturnValue('fixture-session'); global.fetch = fetchMock; });
afterAll(() => { global.fetch = originalFetch; });

it.each([false, true])('uses the exact protected plural endpoint, history=%s', async (isHistory) => {
  fetchMock.mockResolvedValue({ status: 200, ok: true, json: async () => fixture() });
  const value = await getGyyTrapProperties('18446744073709551615', isHistory, '9007199254740992');
  expect(fetchMock.mock.calls[0][0]).toBe(`/api/takin/${isHistory ? 'alert-his-events' : 'alert-cur-events'}/18446744073709551615/gyy-trap-properties?after_seq=9007199254740992`);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error', headers: { Authorization: 'Bearer fixture-session', 'X-Language': 'zh_CN' } });
  expect(value.properties[0].value).toBe('18446744073709551615');
  expect(value.next_after_seq).toBe('9007199254740993');
});

it('without a login session it does not send an anonymous/source_token request', async () => {
  (Cookies.get as jest.Mock).mockReturnValue(undefined);
  await expect(getGyyTrapProperties('1', false)).rejects.toMatchObject({ kind: 'unauthorized' });
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([[401, 'unauthorized'], [403, 'forbidden'], [404, 'unavailable'], [500, 'unavailable']])('classifies HTTP%s without forwarding server data or redirecting', async (status, kind) => {
  const json = jest.fn(() => ({ err: 'must not be displayed' }));
  fetchMock.mockResolvedValue({ status, ok: false, json });
  await expect(getGyyTrapProperties('1', false)).rejects.toMatchObject({ kind });
  expect(json).not.toHaveBeenCalled();
});
it('does not leak parsing/network errors into the attribute row', async () => {
  fetchMock.mockRejectedValue(new Error('private connection information'));
  await expect(getGyyTrapProperties('1', false)).rejects.toMatchObject({ kind: 'unavailable', message: 'GYY Trap properties: unavailable' });
});
it.each(['0', '../2', '1?rule=9', '1/2'])('rejects invalid eid %s before sending', async (eventId) => {
  await expect(getGyyTrapProperties(eventId, false)).rejects.toMatchObject({ kind: 'invalid' });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('rejects an invalid cursor instead of adding arbitrary client references', async () => {
  await expect(getGyyTrapProperties('1', false, '-1')).rejects.toMatchObject({ kind: 'invalid' });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('rejects an unchanging/backward cursor to prevent endless or mixed pagination', () => {
  const body = fixture();
  expect(() => parseGyyTrapPropertyPage(body, '9007199254740993')).toThrow();
  body.dat.next_after_seq = '1';
  expect(() => parseGyyTrapPropertyPage(body, '0')).toThrow();
});
it('rejects unsafe numeric integers rather than silently rounding the display', () => {
  const body: any = fixture(); body.dat.properties[0].value = 18446744073709551615;
  expect(() => parseGyyTrapPropertyPage(body, '0')).toThrow();
});
it('duplicate OID entries with different property keys stay ordered', () => {
  const body = fixture(); body.dat.properties.push({ ...body.dat.properties[0], key: 'varbind:8', value: '2' });
  expect(parseGyyTrapPropertyPage(body, '0').properties.map(x => x.key)).toEqual(['varbind:7', 'varbind:8']);
});
it('rejects duplicate keys within a record, which would reuse a rendered row', () => {
  const body = fixture(); body.dat.properties.push({ ...body.dat.properties[0] });
  expect(() => parseGyyTrapPropertyPage(body, '0')).toThrow();
});
it('passes through none/unavailable as distinct states', () => {
  expect(parseGyyTrapPropertyPage({ err: '', dat: { status: 'none' } }, '0').status).toBe('none');
  expect(parseGyyTrapPropertyPage({ err: '', dat: { status: 'unavailable' } }, '0').status).toBe('unavailable');
});

it('aborts the supplemental fetch when the caller changes event', async () => {
  fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  const controller = new AbortController();
  const pending = getGyyTrapProperties('1', false, '0', controller.signal);
  controller.abort();
  await expect(pending).rejects.toMatchObject({ kind: 'unavailable' });
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
});
it('times out without exposing response details or hanging the original page', async () => {
  jest.useFakeTimers();
  try {
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('private timeout detail')));
    }));
    const pending = getGyyTrapProperties('1', false);
    jest.advanceTimersByTime(15000);
    await expect(pending).rejects.toMatchObject({ kind: 'unavailable', message: 'GYY Trap properties: unavailable' });
  } finally {
    jest.useRealTimers();
  }
});

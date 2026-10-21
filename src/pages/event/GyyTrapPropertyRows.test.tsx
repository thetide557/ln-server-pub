import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import GyyTrapPropertyRows from './GyyTrapPropertyRows';
import { getGyyTrapProperties, GyyTrapReadError, GyyTrapPropertyPage } from '@/services/gyyTrapProperties';
jest.mock('@/services/gyyTrapProperties', () => ({
  ...jest.requireActual('@/services/gyyTrapProperties'), getGyyTrapProperties: jest.fn(),
}));
const request = getGyyTrapProperties as jest.Mock;
const page = (seq = '10', more = false): GyyTrapPropertyPage => ({
  status: 'ok', record: { record_id: 'fixture-' + seq, seq, role: 'raise', received_at: '2026-10-21T02:00:00.123456Z' },
  properties: [{ key: 'device', label: '发生报文 · 设备名称', type: 'string', value: 'fixture-node' }],
  has_more: more, ...(more ? { next_after_seq: seq } : {}),
});
const deferred = () => {
  let resolve!: (page: GyyTrapPropertyPage) => void;
  const promise = new Promise<GyyTrapPropertyPage>((done) => { resolve = done; });
  return { promise, resolve };
};
beforeEach(() => request.mockReset());

it('old/non-Trap details do not issue supplemental requests or render empty containers', () => {
  const { container, rerender } = render(<GyyTrapPropertyRows eventId='1' isHistory={false} />);
  expect(container.childElementCount).toBe(0);
  rerender(<GyyTrapPropertyRows eventId='1' isHistory={false} enabled={false} />);
  expect(request).not.toHaveBeenCalled();
});

it.each([false, true])('appends sibling rows after existing properties, history=%s, without sections/tags', async (isHistory) => {
  const data = page();
  data.properties.push(
    { key: 'oid:0', label: '发生报文 · 1.2.3', type: 'integer', value: '18446744073709551615', source: { kind: 'varbind', index: 0, oid: '1.2.3' } },
    { key: 'oid:1', label: '发生报文 · 1.2.3', type: 'string', value: '重复OID第二值', source: { kind: 'varbind', index: 1, oid: '1.2.3' } },
  );
  request.mockResolvedValue(data);
  const { container } = render(<div className='desc-container'>
    <div className='desc-row'>原平台属性</div><GyyTrapPropertyRows eventId='13' isHistory={isHistory} enabled />
  </div>);
  await screen.findByText('18446744073709551615');
  const parent = container.firstElementChild!;
  expect(parent.children).toHaveLength(4);
  expect(Array.from(parent.children).every((row) => row.classList.contains('desc-row'))).toBe(true);
  expect(parent.firstElementChild!.textContent).toBe('原平台属性');
  expect(screen.getAllByText('发生报文 · 1.2.3：')).toHaveLength(2);
  expect(container.querySelector('.ant-card, .ant-tag, [role=tab], section, h1, h2, h3')).toBeNull();
  expect(container.textContent).not.toContain('原始Trap信息');
  expect(request).toHaveBeenCalledWith('13', isHistory, '0', expect.anything());
});

it('preserves zero, false, empty, null, absent, nested values and byte encoding as plain text', async () => {
  const data = page();
  data.properties = [
    { key: 'zero', label: '零', type: 'integer', value: '0' },
    { key: 'false', label: '布尔', type: 'boolean', value: false },
    { key: 'empty', label: '空串', type: 'string', value: '' },
    { key: 'null', label: '空值', type: 'null', value: null },
    { key: 'absent', label: '缺失', type: 'absent' },
    { key: 'bytes', label: '二进制', type: 'bytes', encoding: 'base64', value: '/wAB' },
    { key: 'object', label: '对象', type: 'object', value: { counter: '18446744073709551615', list: [0, false, null, ''] } },
    { key: 'array', label: '数组', type: 'array', value: ['a', 'b', 'a'] },
    { key: 'html', label: '源文字', type: 'string', value: '<img src=x onerror=alert(1)>https://example.invalid/' },
  ];
  request.mockResolvedValue(data);
  const { container } = render(<GyyTrapPropertyRows eventId='1' isHistory={false} enabled />);
  await screen.findByText('false');
  for (const value of ['0', 'false', '""（空字符串）', 'null（空值）', '未提供（缺失）', 'base64: /wAB']) expect(screen.getByText(value)).toBeInTheDocument();
  expect(container.textContent).toContain('18446744073709551615');
  expect(container.querySelector('img, a, script')).toBeNull();
  expect(screen.getByText('<img src=x onerror=alert(1)>https://example.invalid/')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: '展开完整值' })).toHaveLength(2);
});

it('expands the complete long value within its own row', async () => {
  const text = '消息正文'.repeat(200) + '尾部必须保留';
  const data = page(); data.properties[0].value = text;
  request.mockResolvedValue(data);
  const { container } = render(<GyyTrapPropertyRows eventId='1' isHistory={false} enabled />);
  const button = await screen.findByRole('button', { name: '展开完整值' });
  expect(container.textContent).not.toContain('尾部必须保留');
  fireEvent.click(button);
  expect(screen.getByText(text)).toBeInTheDocument();
  expect(button.closest('.desc-row')).toBe(container.firstElementChild);
  fireEvent.click(screen.getByRole('button', { name: '收起' }));
  expect(container.textContent).not.toContain('尾部必须保留');
});

it('loads one message per click with lossless cursor and preserves previous rows on retry', async () => {
  const first = page('9007199254740993', true), second = page('9007199254740994');
  second.record!.role = 'clear'; second.properties[0].label = '恢复报文 · 设备名称';
  request.mockResolvedValueOnce(first).mockRejectedValueOnce(new Error('private server detail')).mockResolvedValueOnce(second);
  render(<GyyTrapPropertyRows eventId='7' isHistory enabled />);
  fireEvent.click(await screen.findByRole('button', { name: '加载下一条接收记录' }));
  await screen.findByRole('button', { name: '重试' });
  expect(screen.getByText('发生报文 · 设备名称：')).toBeInTheDocument();
  expect(screen.queryByText('private server detail')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '重试' }));
  await screen.findByText('恢复报文 · 设备名称：');
  expect(request.mock.calls.map((call) => call[2])).toEqual(['0', '9007199254740993', '9007199254740993']);
  expect(screen.queryByRole('button', { name: '加载下一条接收记录' })).not.toBeInTheDocument();
});

it.each(['none', 'unavailable'])('handles status=%s without losing original details', async (status) => {
  request.mockResolvedValue({ status, properties: [], has_more: false });
  const { container } = render(<div><div className='desc-row'>原平台时间</div><GyyTrapPropertyRows eventId='1' isHistory={false} enabled /></div>);
  await waitFor(() => expect(screen.queryByText('正在加载附加属性…')).not.toBeInTheDocument());
  expect(screen.getByText('原平台时间')).toBeInTheDocument();
  expect(container.querySelectorAll('.desc-row')).toHaveLength(status === 'none' ? 1 : 2);
  if (status === 'unavailable') expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
});

it.each(['unauthorized', 'forbidden'] as const)('keeps original detail and shows a safe %s row', async (kind) => {
  request.mockRejectedValue(new GyyTrapReadError(kind));
  render(<div><div>原详情</div><GyyTrapPropertyRows eventId='1' isHistory={false} enabled /></div>);
  await screen.findByRole('button', { name: '重试' });
  expect(screen.getByText('原详情')).toBeInTheDocument();
  expect(screen.getByText(/原详情仍可查看/)).toBeInTheDocument();
});

it('discards already loaded properties if pagination loses authorization', async () => {
  request.mockResolvedValueOnce(page('10', true)).mockRejectedValueOnce(new GyyTrapReadError('forbidden'));
  render(<GyyTrapPropertyRows eventId='1' isHistory={false} enabled />);
  fireEvent.click(await screen.findByRole('button', { name: '加载下一条接收记录' }));
  await screen.findByText(/无权读取附加属性/);
  expect(screen.queryByText('fixture-node')).not.toBeInTheDocument();
});

it('ignores a late response when switching eid and current/history', async () => {
  const old = deferred(); request.mockReturnValueOnce(old.promise).mockResolvedValueOnce(page('20'));
  const { rerender } = render(<GyyTrapPropertyRows eventId='1' isHistory={false} enabled />);
  const oldSignal = request.mock.calls[0][3];
  rerender(<GyyTrapPropertyRows eventId='2' isHistory enabled />);
  await screen.findByText('fixture-node');
  const stale = page('10'); stale.properties[0].value = '旧事件不得混入';
  await act(async () => { old.resolve(stale); });
  expect(oldSignal.aborted).toBe(true);
  expect(request).toHaveBeenLastCalledWith('2', true, '0', expect.anything());
  expect(screen.queryByText('旧事件不得混入')).not.toBeInTheDocument();
});

it('clears rows when changing table with the same eid', async () => {
  const history = deferred(); request.mockResolvedValueOnce(page()).mockReturnValueOnce(history.promise);
  const { rerender } = render(<GyyTrapPropertyRows eventId='7' isHistory={false} enabled />);
  await screen.findByText('fixture-node');
  rerender(<GyyTrapPropertyRows eventId='7' isHistory enabled />);
  expect(screen.queryByText('fixture-node')).not.toBeInTheDocument();
  expect(request).toHaveBeenLastCalledWith('7', true, '0', expect.anything());
  await act(async () => history.resolve({ status: 'none', properties: [], has_more: false }));
});

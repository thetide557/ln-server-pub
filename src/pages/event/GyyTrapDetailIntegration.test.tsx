import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Router, Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';

jest.mock('@/App', () => ({ CommonStateContext: require('react').createContext({ busiGroups: [], datasourceList: [] }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh_CN' } }) }));
jest.mock('antd', () => {
  const React = require('react');
  const box = ({ children }: any) => React.createElement('div', null, children);
  return { Button: ({ children, onClick }: any) => React.createElement('button', { onClick }, children), Card: ({ children }: any) => React.createElement('div', { className: 'ant-card' }, children),
    Space: box, Spin: box, Tag: ({ children }: any) => React.createElement('span', { className: 'ant-tag' }, children), Tooltip: box,
    Typography: { Paragraph: box }, message: { error: jest.fn() } };
});
jest.mock('@ant-design/icons', () => ({ QuestionCircleOutlined: () => null, PlayCircleOutlined: () => null }));
jest.mock('@/components/pageLayout', () => ({ __esModule: true, default: ({ children }: any) => <main>{children}</main> }));
jest.mock('@/pages/event', () => ({ deleteAlertEventsModal: jest.fn() }));
jest.mock('@/pages/alertRules/utils', () => ({ parseValues: (value: any) => value || {} }));
jest.mock('plus:/parcels/Event/eventDetail', () => ({ __esModule: true, default: () => [] }));
jest.mock('plus:/parcels/Event/Preview', () => ({ __esModule: true, default: () => null }));
jest.mock('plus:/parcels/Event/LogsDetail', () => ({ __esModule: true, default: () => null }));
jest.mock('@/pages/event/Detail/Prometheus', () => ({ __esModule: true, default: () => [] }));
jest.mock('@/pages/event/Detail/Host', () => ({ __esModule: true, default: () => [] }));
jest.mock('@/plugins/elasticsearch/Event', () => ({ __esModule: true, default: () => [] }));
jest.mock('@/plugins/TDengine/Event', () => ({ __esModule: true, default: () => [] }));
jest.mock('@/pages/event/Detail/Loki', () => ({ __esModule: true, default: () => [] }));
jest.mock('@/plugins/mysql/Event', () => ({ __esModule: true, default: () => [] }));
jest.mock('@/plugins/pgsql/Event', () => ({ __esModule: true, default: () => [] }));
jest.mock('@/plugins/doris/Event', () => ({ __esModule: true, default: () => [] }));
jest.mock('@/plugins/victorialogs/Event', () => ({ __esModule: true, default: () => [] }));
jest.mock('@/plugins/clickHouse/Event', () => ({ __esModule: true, default: () => [] }));
jest.mock('@/plugins/TDengine/locale', () => ({}));
jest.mock('@/plugins/mysql/locale', () => ({}));
jest.mock('@/plugins/pgsql/locale', () => ({}));
jest.mock('@/plugins/clickHouse/locale', () => ({}));
jest.mock('@/pages/alertRules/locale', () => ({}));
jest.mock('@/pages/log/IndexPatterns/services', () => ({ getESIndexPatterns: jest.fn() }));
jest.mock('@/pages/event/Solution', () => ({ __esModule: true, default: () => <div>原解决方案位置</div> }));
jest.mock('@/components/AiChatNG/FlashAiButton', () => ({ AiButton: () => null }));
jest.mock('@/components/AiChatNG/recommend', () => ({ buildPageFrom: () => ({}), getAlertEventDetailPrompts: () => ['fixture'] }));
jest.mock('@/components/AiChatNG/constants', () => ({ NAME_SPACE: 'fixture-ai' }));
jest.mock('@/services/warning', () => ({ getAlertEventsById: jest.fn(), getHistoryEventsById: jest.fn(), getStrategiesByRuleIds: jest.fn() }));
jest.mock('@/services/gyyTrapProperties', () => ({ ...jest.requireActual('@/services/gyyTrapProperties'), getGyyTrapProperties: jest.fn() }));

import EventDetail from './detail';
import { getAlertEventsById, getHistoryEventsById, getStrategiesByRuleIds } from '@/services/warning';
import { getGyyTrapProperties } from '@/services/gyyTrapProperties';
const current = getAlertEventsById as jest.Mock, historical = getHistoryEventsById as jest.Mock;
const properties = getGyyTrapProperties as jest.Mock;
const details = (marker: boolean | undefined = true, name = '原事件名称') => ({ dat: {
  id: 7, rule_id: 2, rule_name: name, cate: 'host', group_id: 1, tags: [], trigger_time: 1,
  is_muted: 0, is_recovered: false, has_gyy_trap_properties: marker, annotations: { '原末尾属性': '原末尾属性值' },
} });
const supplemental = () => ({ status: 'ok', record: { record_id: 'fixture-record', seq: '10', role: 'raise', received_at: '2026-10-21T02:00:00.123456Z' },
  properties: [{ key: 'new-field', label: '发生报文 · 新字段', type: 'string', value: '新增属性内容' }], has_more: false });
function mount(path: string) {
  const history = createMemoryHistory({ initialEntries: [path] });
  const view = render(<Router history={history}><Route path={['/alert-cur-events/:eventId', '/alert-his-events/:eventId', '/alert-events-shanshu-cur/:eventId', '/alert-events-shanshu-his/:eventId']}><EventDetail /></Route></Router>);
  return { ...view, history };
}
beforeEach(() => {
  current.mockReset().mockResolvedValue(details()); historical.mockReset().mockResolvedValue(details());
  (getStrategiesByRuleIds as jest.Mock).mockReset().mockResolvedValue({ dat: [] });
  properties.mockReset().mockResolvedValue(supplemental());
});
it.each(['/alert-cur-events/7', '/alert-his-events/7', '/alert-events-shanshu-cur/7', '/alert-events-shanshu-his/7'])('integrates continuous property rows on %s', async (path) => {
  const { container } = mount(path);
  await screen.findByText('新增属性内容');
  const originalRow = screen.getByText('原末尾属性值').closest('.desc-row')!;
  const extraRow = screen.getByText('新增属性内容').closest('.desc-row')!;
  expect(originalRow.nextElementSibling).toBe(extraRow);
  expect(extraRow.parentElement).toBe(originalRow.parentElement);
  expect(extraRow.querySelector('.ant-tag')).toBeNull();
  expect(container.querySelectorAll('.ant-card')).toHaveLength(1);
  expect(properties).toHaveBeenCalledWith('7', path.includes('-his'), '0', expect.anything());
});
it.each([undefined, false])('does not query new attributes when the main detail marker is %s', async (marker) => {
  current.mockResolvedValue({ dat: { ...details().dat, has_gyy_trap_properties: marker } });
  mount('/alert-cur-events/7');
  await screen.findByText('原末尾属性值');
  expect(properties).not.toHaveBeenCalled();
});
it('supplemental failure preserves all existing detail rows', async () => {
  properties.mockRejectedValue(new Error('private failure'));
  mount('/alert-cur-events/7');
  await screen.findByRole('button', { name: '重试' });
  expect(screen.getByText('原末尾属性值')).toBeInTheDocument();
  expect(screen.getByText('原解决方案位置')).toBeInTheDocument();
  expect(screen.queryByText('private failure')).not.toBeInTheDocument();
});
it('same eid current→history fetches history detail and ignores the old detail response', async () => {
  let finishCurrent!: (value: any) => void;
  current.mockReturnValue(new Promise((resolve) => { finishCurrent = resolve; }));
  historical.mockResolvedValue(details(true, '历史事件名称'));
  const { history } = mount('/alert-cur-events/7');
  await waitFor(() => expect(current).toHaveBeenCalledWith('7'));
  act(() => history.push('/alert-his-events/7'));
  await screen.findAllByText('历史事件名称');
  await act(async () => finishCurrent(details(true, '迟到当前事件')));
  expect(screen.queryByText('迟到当前事件')).not.toBeInTheDocument();
  expect(historical).toHaveBeenCalledWith('7');
  expect(properties).toHaveBeenCalledTimes(1);
  expect(properties).toHaveBeenCalledWith('7', true, '0', expect.anything());
});

/**
 * L5 测试二 —— AI 配置三个列表页的「白屏级」冒烟：整棵组件树 renderToString 一遍，不抛异常。
 *
 * 照 samples/dsList.render.test.tsx 抄：renderToString 不跑 useEffect、不发请求，
 * 只要有 import 错、context 少字段、组件签名对不上，就会当场抛出来。
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));
// react-markdown 只发 ESM，jest 默认不转译 node_modules（见 step6d/README.md「已知坑」最后一条），
// skills 列表页经 DocumentPreviewPanel → @/components/Markdown 引到它。这里把 Markdown 换成一个纯壳，
// 只影响本测试；pub 线上用的还是真组件。
jest.mock('@/components/Markdown', () => ({
  __esModule: true,
  default: ({ content }: { content: string }) => require('react').createElement('div', { className: 'markdown-stub' }, content),
}));
jest.mock('@/pages/aiConfig/agents/services', () => ({
  __esModule: true,
  getList: jest.fn(() => Promise.resolve([])),
  getItem: jest.fn(() => Promise.resolve({})),
  postItem: jest.fn(() => Promise.resolve({})),
  putItem: jest.fn(() => Promise.resolve({})),
  deleteItem: jest.fn(() => Promise.resolve({})),
  getMCPServers: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/pages/aiConfig/llmConfigs/services', () => ({
  __esModule: true,
  getList: jest.fn(() => Promise.resolve([])),
  getItem: jest.fn(() => Promise.resolve({})),
  postItem: jest.fn(() => Promise.resolve({})),
  putItem: jest.fn(() => Promise.resolve({})),
  deleteItem: jest.fn(() => Promise.resolve({})),
  testConnection: jest.fn(() => Promise.resolve({ duration_ms: 1, success: true })),
}));
jest.mock('@/pages/aiConfig/skills/services', () => ({
  __esModule: true,
  getList: jest.fn(() => Promise.resolve([])),
  getItem: jest.fn(() => Promise.resolve({})),
  postItem: jest.fn(() => Promise.resolve({})),
  putItem: jest.fn(() => Promise.resolve({})),
  deleteItem: jest.fn(() => Promise.resolve({})),
  importItem: jest.fn(() => Promise.resolve({})),
  importItemToUpdate: jest.fn(() => Promise.resolve({})),
  getFile: jest.fn(() => Promise.resolve({})),
  deleteFile: jest.fn(() => Promise.resolve({})),
  gitInstall: jest.fn(() => Promise.resolve({})),
  gitReplaceConfig: jest.fn(() => Promise.resolve({})),
  gitUpdate: jest.fn(() => Promise.resolve({})),
}));

import '@/i18n';
import '@/pages/aiConfig/agents/locale';
import '@/pages/aiConfig/llmConfigs/locale';
import '@/pages/aiConfig/skills/locale';
import AgentList from '@/pages/aiConfig/agents/pages/List';
import LLMConfigList from '@/pages/aiConfig/llmConfigs/pages/List';
import SkillList from '@/pages/aiConfig/skills/pages/List';

function renderPage(path: string, node: React.ReactElement) {
  let html = '';
  expect(() => {
    html = renderToString(<StaticRouter location={path}>{node}</StaticRouter>);
  }).not.toThrow();
  expect(html.length).toBeGreaterThan(0);
  // PageLayout 的外壳（src/components/pageLayout/index.tsx）
  expect(html).toContain('page-wrapper');
  return html;
}

describe('L5：AI 配置三个列表页 renderToString 冒烟', () => {
  it('Agent 列表页能渲染出字符串，不抛异常', () => {
    const html = renderPage('/ai-config/agents', <AgentList />);
    // 词条来自 agents/locale/zh_CN.ts:2 title
    expect(html).toContain('Agent');
  });

  it('LLM 配置列表页能渲染出字符串，不抛异常', () => {
    const html = renderPage('/ai-config/llm-configs', <LLMConfigList />);
    // 词条来自 llmConfigs/locale/zh_CN.ts:3 title
    expect(html).toContain('LLM 配置');
  });

  it('Skill 列表页能渲染出字符串，不抛异常', () => {
    const html = renderPage('/ai-config/skills', <SkillList />);
    // 词条来自 skills/locale/zh_CN.ts:2 title
    expect(html).toContain('Skill 管理');
  });
});

/**
 * L5 测试一 —— LLM 配置「新建」抽屉：填字段 → 点保存 → 断言请求体里有后端认的六个字段。
 *
 * 后端契约（`nightingale-B/第二步-Scope清单/07-前端契约名.md:80-90`，源头
 * `ln:center/router/router_ai_llm_config.go:117-122`）：POST body 顶层六个 json 字段
 * `name` / `api_type` / `api_url` / `api_key` / `model` / `extra_config`。
 * 路由是 `ln:center/router/router.go:1309` 的 `POST /ai-llm-configs`（挂权限点 /ai-config/llm-configs）。
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// 三行 mock 照 samples/esForm.test.tsx
jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));

import request from '@/utils/request';
import '@/i18n';
import '@/pages/aiConfig/llmConfigs/locale';
import AddDrawer from '@/pages/aiConfig/llmConfigs/pages/AddDrawer';
import { adjustSubmitValues } from '@/pages/aiConfig/llmConfigs/utils/adjustFormValues';

const requestMock = request as unknown as jest.Mock;

function setInput(id: string, value: string) {
  const el = document.querySelector(`#${id}`) as HTMLInputElement;
  expect(el).toBeTruthy();
  fireEvent.change(el, { target: { value } });
}

describe('L5：LLM 配置新建抽屉提交', () => {
  beforeEach(() => {
    requestMock.mockClear();
    requestMock.mockImplementation(() => Promise.resolve({ dat: {}, data: {} }));
  });

  it('填完必填项点保存，POST /api/takin/ai-llm-configs 的请求体带后端认的六个字段', async () => {
    const onOk = jest.fn();
    render(
      <MemoryRouter initialEntries={['/ai-config/llm-configs']}>
        <AddDrawer visible onOk={onOk} onClose={jest.fn()} />
      </MemoryRouter>,
    );

    // Drawer 渲染在 portal 里，从 document 上找
    await waitFor(() => {
      expect(document.querySelector('#name')).toBeTruthy();
    });
    expect(document.querySelector('#api_url')).toBeTruthy();
    expect(document.querySelector('#api_key')).toBeTruthy();
    expect(document.querySelector('#model')).toBeTruthy();

    setInput('name', 'l5_llm_test');
    setInput('api_url', 'https://api.openai.com/v1');
    setInput('api_key', 'sk-l5-test-key');
    setInput('model', 'gpt-4o-mini');
    // api_type 是 Select，Form.Item 的 initialValue='openai'（llmConfigs/pages/Form.tsx:46），不用填

    // footer 里三个按钮：取消 / 测试连接 / 保存（保存是 type=primary）
    const saveBtn = document.querySelector('.ant-drawer-footer .ant-btn-primary') as HTMLButtonElement;
    expect(saveBtn).toBeTruthy();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalled();
    });

    const [url, options] = requestMock.mock.calls[0];
    const body = options.data;

    // eslint-disable-next-line no-console
    console.log('[step6d][L5] llm-config url =', JSON.stringify(url));
    // eslint-disable-next-line no-console
    console.log('[step6d][L5] llm-config body =', JSON.stringify(body, null, 2));

    expect(url).toBe('/api/takin/ai-llm-configs');
    // RequestMethod.Post 的字面量是 'Post'（src/store/common.ts:63 起）
    expect(options.method).toBe('Post');

    // 后端认的六个字段
    expect(body.name).toBe('l5_llm_test');
    expect(body.api_type).toBe('openai');
    expect(body.api_url).toBe('https://api.openai.com/v1');
    expect(body.api_key).toBe('sk-l5-test-key');
    expect(body.model).toBe('gpt-4o-mini');
    // extra_config 由 llmConfigs/utils/adjustFormValues.ts:33-38 兜底成 { custom_params: {} }
    expect(Object.keys(body)).toEqual(expect.arrayContaining(['name', 'api_type', 'api_url', 'api_key', 'model', 'extra_config']));
    expect(typeof body.extra_config).toBe('object');

    await waitFor(() => {
      expect(onOk).toHaveBeenCalled();
    });
  });

  it('adjustSubmitValues 把表单里的 custom_headers / custom_params 拧成后端要的形状', () => {
    // 后端 `LLMExtraConfig.custom_headers` 是 map[string]string、`custom_params` 是 map[string]any
    // （`nightingale-B/第二步-Scope清单/07-前端契约名.md:196-197`）；表单里前者是数组、后者是 JSON 文本。
    const body = adjustSubmitValues({
      name: 'l5_llm_test',
      api_type: 'openai',
      api_url: 'https://api.openai.com/v1',
      api_key: 'sk-l5-test-key',
      model: 'gpt-4o-mini',
      extra_config: {
        timeout_seconds: 30,
        skip_tls_verify: true,
        custom_headers: [{ key: 'X-Foo', value: 'bar' }],
        custom_params: '{"top_p": 0.9}',
      },
    } as any);

    expect(body.extra_config?.custom_headers).toEqual({ 'X-Foo': 'bar' });
    expect(body.extra_config?.custom_params).toEqual({ top_p: 0.9 });
    expect(body.extra_config?.timeout_seconds).toBe(30);
    expect(body.extra_config?.skip_tls_verify).toBe(true);
    // 六个字段一个不少
    expect(Object.keys(body)).toEqual(expect.arrayContaining(['name', 'api_type', 'api_url', 'api_key', 'model', 'extra_config']));
  });
});

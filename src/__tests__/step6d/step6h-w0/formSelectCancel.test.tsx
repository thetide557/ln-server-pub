/**
 * N28（2026-10-07）改写：这份用例原本钉的是「补信息表单上有一个『取消』按钮」。
 *
 * 原由：阶段 II · W0 小修② 给 `FormSelectContentBlock.tsx` 的补信息视图手工加过一个 default 型
 * 「取消」按钮，点了发 `param.approval = 2`（背景见 `ln-server/…/阶段5b/点击测试/前端交接-2026-09-06.md`
 * 第 2 节 OBS-5、判定门《缺口清单-AI面》5.1 表 R6）。
 *
 * 为什么改：N26（B）把 `AiChatNG` 整块升到夜莺 fe `ee48e701`，`FormSelectContentBlock.tsx` 按
 * 统一尺子 2.3 表 #4「收上游」整文件换成上游版本，而上游的补信息视图从来只画一个「确定」
 * （`src/components/AiChatNG/ContentRenderer/FormSelectContentBlock.tsx:244-268`），那个手工加的
 * 「取消」按钮随之没了。用户 M229 ② 已拍「按钮去掉、跟上上游」，所以这里**改测试、不改组件**。
 * locale 的 `form_select.cancel` 键还留着（`locale/zh_CN.ts:100`），只是组件不再用它。
 *
 * 改完这份用例钉三件事（都是上游 `ee48e701` 的实际行为）：
 *   1. 补信息视图只有「确定」、**没有**「取消」——将来谁又把取消按钮加回来，这条会先红；
 *   2. 补信息视图的正向路径还在：候选带 `is_default` 时初值自动选上 → 「确定」可点 →
 *      onConfirm 收到 `busi_group_id` / `datasource_id` 和非空 content，且**不带** `approval`；
 *   3. 原用例关心的「用户有退出这一步的路」在上游并没有消失，而是挪到了 **approval 二选一视图**：
 *      后端下发带 `approval` 字段的 payload 时，组件按候选原样画两个按钮，点「取消」发 `approval = 2`
 *      （`FormSelectContentBlock.tsx:91-125`）。这条替代了原用例的核心意图。
 *
 * 上游没有 `FormSelectContentBlock.test.tsx` 可照抄
 * （`git -C …/fe ls-tree -r --name-only HEAD src/components/AiChatNG | grep -i test` 的 8 个文件里没有它），
 * 所以断言是按组件现有代码逐行核出来写的，不是照搬。
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/App', () => require('../helpers/appMock'));
jest.mock('@/utils/request', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })),
}));

import '@/i18n';
import '@/components/AiChatNG/locale';
import FormSelectContentBlock from '@/components/AiChatNG/ContentRenderer/FormSelectContentBlock';

// 后端 form_select 内容块的原样形状（aiagent/form.go 下发）：补信息表单没有 approval 字段。
// 这一份的候选都不带 is_default，所以组件初值为空、「确定」是灰的。
const FORM_FIELDS_PAYLOAD = JSON.stringify({
  skill_name: 'create-alert-rule',
  fields: [
    {
      key: 'busi_group_id',
      type: 'single',
      candidates: [
        { id: 1, name: '默认业务组' },
        { id: 2, name: '另一个业务组' },
      ],
    },
    {
      key: 'datasource_id',
      type: 'single',
      candidates: [{ id: 1, name: 'default' }],
    },
  ],
});

// 同一张表单，但候选带 is_default —— 上游 `getDefaultCandidateId` 会把它选成初值，
// 于是不用在 jsdom 里去点 antd 的 Select 下拉也能走通「确定」这条正向路径。
const FORM_FIELDS_PAYLOAD_WITH_DEFAULT = JSON.stringify({
  skill_name: 'create-alert-rule',
  fields: [
    {
      key: 'busi_group_id',
      type: 'single',
      candidates: [
        { id: 1, name: '默认业务组', is_default: true },
        { id: 2, name: '另一个业务组' },
      ],
    },
    {
      key: 'datasource_id',
      type: 'single',
      candidates: [{ id: 1, name: 'default', is_default: true }],
    },
  ],
});

// 带 approval 字段 → 走 FormApprovalView（二选一门）。候选名由后端下发，前端原样当按钮文案。
const FORM_APPROVAL_PAYLOAD = JSON.stringify({
  skill_name: 'create-alert-rule',
  fields: [
    {
      key: 'approval',
      type: 'single',
      candidates: [
        { id: 1, name: '确认' },
        { id: 2, name: '取消' },
      ],
    },
  ],
});

// antd 4 会给「两个汉字」的按钮文案中间插一个空格（确定 → 「确 定」），
// 所以按文字找按钮时要先把空白去掉再比。
function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) => (b.textContent || '').replace(/\s/g, '') === text);
}

describe('N28 · 补信息表单跟上上游 ee48e701：只有「确定」，取消挪到 approval 视图', () => {
  it('补信息视图只有「确定」、没有「取消」，且未选完时「确定」是灰的', () => {
    const onConfirm = jest.fn();
    const { container } = render(<FormSelectContentBlock responseContent={FORM_FIELDS_PAYLOAD} onConfirm={onConfirm} />);

    // 走的确实是补信息视图（不是 approval 二选一门）
    expect(screen.getByText('请先补充以下信息后继续：')).toBeInTheDocument();

    // ① 取消按钮没了（上游本来就没有）
    expect(findButtonByText(container, '取消')).toBeUndefined();

    // ② 整个视图只剩一个按钮，就是「确定」
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.length).toBe(1);
    const confirmButton = findButtonByText(container, '确定') as HTMLButtonElement;
    expect(confirmButton).toBeDefined();

    // ③ 一个下拉都没选（候选不带 is_default），「确定」按 disabled 条件变灰
    expect(confirmButton.disabled).toBe(true);

    // ④ 既然点不动，就不该有任何回调
    fireEvent.click(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('候选带 is_default 时「确定」可点，回传 busi_group_id / datasource_id 与非空 content，且不带 approval', () => {
    const onConfirm = jest.fn();
    const { container } = render(<FormSelectContentBlock responseContent={FORM_FIELDS_PAYLOAD_WITH_DEFAULT} onConfirm={onConfirm} />);

    const confirmButton = findButtonByText(container, '确定') as HTMLButtonElement;
    expect(confirmButton).toBeDefined();
    expect(confirmButton.disabled).toBe(false);

    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const result = onConfirm.mock.calls[0][0];
    expect(result.param.busi_group_id).toBe(1);
    expect(result.param.datasource_id).toBe(1);
    // 补信息视图不发 approval（它是 approval 视图那条路才有的字段）
    expect(result.param.approval).toBeUndefined();
    // content 非空，且把选中的名字带上了（后端拿它当这一轮的用户发言）
    expect(typeof result.content).toBe('string');
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content).toContain('默认业务组');
    expect(result.content).toContain('default');
  });

  it('approval 二选一视图里「取消」还在：点它发 approval=2 且 content 非空（原用例的核心意图）', () => {
    const onConfirm = jest.fn();
    const { container } = render(<FormSelectContentBlock responseContent={FORM_APPROVAL_PAYLOAD} onConfirm={onConfirm} />);

    // 走的是 approval 门，不是补信息视图
    expect(screen.getByText('请确认是否执行以上操作：')).toBeInTheDocument();
    expect(screen.queryByText('请先补充以下信息后继续：')).not.toBeInTheDocument();

    // 上游把 id=1（确认）排到最后，所以 DOM 顺序是「取消」在前、「确认」在后
    const buttonTexts = Array.from(container.querySelectorAll('button')).map((b) => (b.textContent || '').replace(/\s/g, ''));
    expect(buttonTexts).toEqual(['取消', '确认']);

    const cancelButton = findButtonByText(container, '取消') as HTMLButtonElement;
    expect(cancelButton).toBeDefined();
    expect(cancelButton.disabled).toBe(false);

    fireEvent.click(cancelButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const result = onConfirm.mock.calls[0][0];
    expect(result.param.approval).toBe(2);
    expect(typeof result.content).toBe('string');
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content).toBe('取消');
    // 取消不该顺手把业务组 / 数据源塞进去
    expect(result.param.busi_group_id).toBeUndefined();
    expect(result.param.datasource_id).toBeUndefined();
  });
});

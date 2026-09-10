/**
 * 阶段 II · W0 小修②：AI「补信息表单」卡片补一个「取消」按钮。
 *
 * 背景：AI 弹「请先补充以下信息后继续」（业务组 / 数据源下拉）时，上游 fe v9.1.0 只画了一个「确定」，
 * 用户没有退出这一步的路（`ln-server/…/阶段5b/点击测试/前端交接-2026-09-06.md` 第 2 节 OBS-5、
 * 判定门《缺口清单-AI面》5.1 表 R6）。本轮照同文件 :110-120 审批门的写法加一个 default 型按钮，
 * 点了发 `param.approval = 2` + 非空 `content`（content 为空后端返 400 `query.content is required`）。
 *
 * 这份测试钉住三件事：
 *   1. 补信息表单上「取消」按钮在；
 *   2. 点它 → onConfirm 收到 `param.approval === 2`，且 `content` 非空；
 *   3. 「取消」不受 disabled（表单一个字段都没选）约束——测试里故意不选任何下拉就点。
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

// antd 4 会给「两个汉字」的按钮文案中间插一个空格（确定 → 「确 定」），
// 所以按文字找按钮时要先把空白去掉再比。
function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) => (b.textContent || '').replace(/\s/g, '') === text);
}

describe('step6h W0 小修② · 补信息表单的「取消」按钮', () => {
  it('取消按钮在，点了发 approval=2 且 content 非空，且不受表单未填完影响', () => {
    const onConfirm = jest.fn();
    const { container } = render(<FormSelectContentBlock responseContent={FORM_FIELDS_PAYLOAD} onConfirm={onConfirm} />);

    // 走的确实是补信息视图（不是 approval 二选一门）
    expect(screen.getByText('请先补充以下信息后继续：')).toBeInTheDocument();

    // ① 取消按钮在
    const cancelButton = findButtonByText(container, '取消');
    expect(cancelButton).toBeDefined();
    // ③ 一个下拉都没选（disabled 条件成立：确定按钮是灰的），取消按钮照样能点
    const confirmButton = findButtonByText(container, '确定') as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);
    expect((cancelButton as HTMLButtonElement).disabled).toBe(false);

    // ② 点取消
    fireEvent.click(cancelButton as HTMLElement);
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

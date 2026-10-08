/**
 * N36 批 E：从上游 fe 逐字搬进来的「prometheus 即时查询页的 AI 查询停靠栏」接线 hook。
 *
 * 出处：`git -C /home/mcpops/Programs/nightingale-AI-About/fe show ee48e701:src/pages/explorer/Prometheus/aiDock.tsx`（63 行）。
 * 改动只有两处（都是 N26 定下的开关口径，见 `第六步-流水线/n26/统一尺子.md` 第一节）：
 *   1. `import { IS_ENT } from '@/utils/constant'` → `import { ENABLE_AI_QUERY_DOCK }`；
 *   2. `chatButton: IS_ENT ? undefined : …` → `chatButton: ENABLE_AI_QUERY_DOCK ? undefined : …`。
 * 为什么要换：羚牛不是 FlashCat 企业版，`IS_ENT` 恒为 `false`（`src/utils/constant.ts:91`），
 * 照抄会让「停靠栏入口」和「右上角 AI 浮窗按钮」同时出现。换成局部开关之后，
 * 开关开 = 停靠栏替代浮窗按钮，开关关 = 停靠栏不渲染、浮窗按钮照旧。
 * 其余 61 行与上游逐字相同（含注释与英文措辞）。
 */
import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ENABLE_AI_QUERY_DOCK } from '@/utils/constant';
import type { PromGraphControl } from '@/components/PromGraphCpt';
import { AiButton } from '@/components/AiChatNG/FlashAiButton';
import { buildPageFrom, getExplorerPrompts } from '@/components/AiChatNG/recommend';
import { NAME_SPACE as AI_CHAT_NS } from '@/components/AiChatNG/constants';
import { useAiQueryDock } from '@/components/AiQueryDock/useAiQueryDock';
import type { AiQueryDockAdapter } from '@/components/AiQueryDock/useAiQueryDock';

// How this panel's statement is named to the assistant.
const PROMQL_DOCK: AiQueryDockAdapter = {
  datasourceType: 'prometheus',
  statementParam: 'promql',
  action: {
    name: 'set_metric_query',
    argument: 'promql',
    language: 'PromQL expression',
    followUpExample: '改成按 env 分组取平均',
    page: { title: 'Metric explorer', summary: 'The user writes PromQL and reads its results in a single query panel.' },
  },
  prompts: ['dock.prompt_cpu', 'dock.prompt_memory', 'dock.prompt_disk'],
};

interface Options {
  datasourceValue: number;
  /** The user reached for the assistant, which is taking over the panel just like editing it by hand. */
  onTakeOver: () => void;
  /** The open-source chat button hands back a query for the box. */
  onQuery: (promql: string) => void;
}

/**
 * The assistant on one metric query panel.
 *
 * The Flashcat enterprise build gets the dock: `trigger` for the box, `dock`
 * under it, and `controlRef` for the graph to expose its box through. The
 * open-source and Nightingale commercial builds keep the chat button they
 * always had, as `chatButton`.
 */
export function usePrometheusAiDock({ datasourceValue, onTakeOver, onQuery }: Options) {
  const { i18n } = useTranslation(AI_CHAT_NS);
  // This panel's own box: panels on one page can each be on a different data
  // source, so the assistant is handed the box, not a page-wide lookup.
  const controlRef = useRef<PromGraphControl | null>(null);
  const ai = useAiQueryDock(PROMQL_DOCK, { datasourceValue, getControl: () => controlRef.current, onToggle: onTakeOver });
  const chatPageFrom = useMemo(() => buildPageFrom({ param: { datasource_type: 'prometheus', datasource_id: datasourceValue } }), [datasourceValue]);
  return {
    controlRef,
    trigger: ai.trigger,
    dock: ai.dock,
    onUserContextChange: ai.invalidateUndo,
    chatButton: ENABLE_AI_QUERY_DOCK ? undefined : (
      <AiButton
        queryPageFrom={chatPageFrom}
        queryAction={{ key: 'query_generator', param: { datasource_type: 'prometheus', datasource_id: datasourceValue } }}
        promptList={getExplorerPrompts(i18n.language)}
        onExecuteQueryForQueryContent={(promql) => onQuery(promql)}
      />
    ),
  };
}

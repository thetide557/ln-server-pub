import React from 'react';

export type AiChatPageType = 'dashboards' | 'alert' | 'record' | 'explorer' | 'alert_rule' | 'alert_history' | 'active_alert' | 'notify_tpl' | 'datasource';

export interface IAiChatPageInfo {
  /**
   * 当前页面 url（不含域名），仅包含 pathname + search
   * 例如：/explorer/metric?ids=1
   */
  url: string;
  param?: Record<string, unknown>;
}

export interface IAiChatAction {
  key?: string;
  param?: IAiChatActionParam;
}

export interface IAiChatActionParam {
  datasource_type?: string;
  datasource_id?: number;
  database_name?: string;
  table_name?: string;
  [key: string]: unknown;
}

export interface IAiChatAction {
  content?: string;
  prefillOnly?: boolean; // 是否仅预填充内容，禁止自动发送消息
  key?: string;
  param?: IAiChatActionParam;
}

export interface IAiChatMessageQuery {
  content: string;
  action?: IAiChatAction;
  page_from: IAiChatPageInfo;
}

export enum EAiChatContentType {
  Thinking = 'thinking',
  Reasoning = 'reasoning',
  Markdown = 'markdown',
  Hint = 'hint',
  Query = 'query',
  FormSelect = 'form_select',
  AlertRule = 'alert_rule',
  Dashboard = 'dashboard',
  // ---- n20 W-5 加（doris AiQueryDock）：羚牛这版缺 PageAction 这个枚举值。
  // 谁要它：src/components/AiQueryDock/index.tsx:100 `lastResponseType(message) === EAiChatContentType.PageAction`。
  // 值照 fe ee48e701 src/components/AiChatNG/types.ts:51-53 逐字抄（只加这一个值，fe 另有的 ToolGroup / InputRequest 没谁要，不跟着加）。
  /** The model asking the page to run one of the actions it declared. Always
   *  the last segment of a message: the turn ends on it. */
  PageAction = 'page_action',
}

export interface IAiChatStreamSegment {
  kind: 'thinking' | 'text';
  content: string;
  done: boolean;
}

export interface IAiChatMessageResponse {
  content_type: string;
  content: string;
  stream_id?: string;
  is_finish?: boolean;
  is_from_ai?: boolean;
  hint_text?: string;
  // ---- n20 W-5 加（doris AiQueryDock）：羚牛这版缺 param。
  // 谁要它：src/components/AiQueryDock/index.tsx:196 `response?.param as IAiChatInputRequest | undefined`。
  // 类型照 fe ee48e701 src/components/AiChatNG/types.ts:107-108 逐字抄。
  /** Segment-specific payload; `page_action` carries an IAiChatPageActionRequest. */
  param?: unknown;
}

export interface IAiChatMessage {
  chat_id: string;
  seq_id: number;
  query: IAiChatMessageQuery;
  response?: IAiChatMessageResponse[];
  cur_step?: string;
  is_finish?: boolean;
  recommend_action?: IAiChatAction[];
  err_code?: number;
  err_title?: string;
  err_msg?: string;
  executed_tools?: boolean;
}

export interface IAiChatHistoryItem {
  chat_id: string;
  title: string;
  last_update: number;
  page_from?: IAiChatPageInfo;
  recommend_action?: IAiChatAction[];
  user_id?: number;
  is_new?: boolean;
}

export interface IAiChatCreateChatRequest extends IAiChatPageInfo {}

export interface IAiChatSendMessageRequest {
  chat_id: string;
  query: IAiChatMessageQuery;
}

export interface IAiChatSendMessageResponse {
  chat_id: string;
  seq_id: number;
}

export interface IAiChatMessageLocator {
  chat_id: string;
  seq_id: number;
}

export interface IAiChatMessageHistoryRequest {
  chat_id: string;
}

export interface IAiChatStreamChunk {
  type: 'thinking' | 'text' | 'tool_call' | 'tool_result' | 'done' | 'error' | string;
  content?: string;
  delta?: string;
  done?: boolean;
  error?: string;
  timestamp?: number;
  p?: 'content' | 'reason' | string;
  v?: string;
}

export interface IAiChatHiddenFeature {
  history?: boolean;
  closeIcon?: boolean;
  prompt?: boolean;
  header?: boolean;
}

export interface IAiChatQueryContentContext {
  message: IAiChatMessage;
  response: IAiChatMessageResponse;
}

export type AiChatExecuteQueryForQueryContent = (query: string, context: IAiChatQueryContentContext) => void;

export interface IAiChatProps {
  className?: string;
  placeholder?: string;
  chatId?: string;
  queryPageFrom: IAiChatPageInfo;
  queryAction?: IAiChatAction;
  welcomeSlot?: React.ReactNode;
  promptList?: string[];
  initialMessage?: string;
  onExecuteQueryForQueryContent?: AiChatExecuteQueryForQueryContent;
  onChatChange?: (chat?: IAiChatHistoryItem) => void;
  onError?: (error: Error) => void;
  // ---- n20 W-5 加（doris AiQueryDock）：下面 10 个可选成员，羚牛这版 AiChatNG 比 fe 老，都缺。
  // 谁要它们：src/components/AiQueryDock/index.tsx 的 <ChatPanel> 逐个传进来（:251-310）、:31 还索引了 IAiChatProps['prepareTurn']。
  // 类型照 fe ee48e701 src/components/AiChatNG/types.ts:120-153 同名成员逐字抄；只加不删不改已有行。
  // 注意：羚牛这版 ChatPanel.tsx:25 不读这 9 个（它只解构 placeholder / chatId / queryPageFrom / queryAction /
  // promptList / initialMessage / onExecuteQueryForQueryContent / onChatChange / onError / welcomeSlot），所以加上这 10 个只是让
  // AiQueryDock 编得过；面板真要按这些 prop 做事，得把 ChatPanel 也升到 fe 那版——见 W-5-拿不准 U-02。
  /** Slim only: text Tab fills into an empty composer — the host's suggested next message. */
  suggestion?: string;
  /**
   * `slim` is the panel embedded under a page's own input: one-line input row
   * with room for the host's status and controls, and a message list that
   * floats below it instead of filling a column. Defaults to `full`.
   */
  variant?: 'full' | 'slim';
  /** Slim only: hide the message list, keep the input row. */
  collapsed?: boolean;
  /** Slim only: rendered inside the input row, before the text box. */
  inputPrefix?: React.ReactNode;
  /** Slim only: rendered inside the input row, after the send button. */
  inputSuffix?: React.ReactNode;
  /** Fires as a turn starts, progresses and ends. */
  onTurn?: (turn: IAiChatTurn) => void;
  prepareTurn?: () => IAiChatTurnScope | undefined;
  onBusyChange?: (busy: boolean) => void;
  /** Closing an embedded surface stops its active turn but preserves history. */
  active?: boolean;
  /** Reference this skill in the first accepted message of a conversation. */
  initialSkill?: string;
}

export type AiChatMode = 'drawer' | 'floating';

// ---- n20 块 5（doris 新日志浏览 + AiQueryDock）在这里加的，只加不改（统一尺子第一节 B 类；D-16 公共类型不改宽）----
// 谁要它们：src/components/AiQueryDock/index.tsx:3,7、src/components/AiQueryDock/useQueryDockActions.ts:5。
// fe 出处：fe ee48e701 src/components/AiChatNG/types.ts，逐字照抄（每段上方标 fe 行号）。
// src/components/AiChatNG/index.tsx:13 本来就是 `export * from './types'`，所以这里加完就自动从
// @/components/AiChatNG 这个入口导出，index.tsx 一个字都不用改（估量第七节 #10 / U-4 的答案）。

// fe types.ts:15-16
/** Page info, or a reader for it: the page's current state is read when a message is sent. */
export type AiChatPageFromSource = IAiChatPageInfo | (() => IAiChatPageInfo);

// fe types.ts:80-85
/** `param` of an `input_request` segment. */
export interface IAiChatInputRequest {
  question: string;
  options?: { id: string; label: string }[];
  allow_custom?: boolean;
}

// fe types.ts:87-94 —— 下面 IAiChatTurnScope.executePageAction 的参数要它
/** `param` of a `page_action` segment. Mirrors the backend's PageActionRequest. */
export interface IAiChatPageActionRequest {
  call_id: string;
  name: string;
  /** The page's own description of the action, so the card needs no lookup. */
  description: string;
  args: Record<string, unknown>;
}

// fe types.ts:186-194 —— AiQueryDock/index.tsx:7 从 @/components/AiChatNG 取 IAiChatTurn，羚牛那版也缺（见 W-5-拿不准 U-01）
/** One user turn as the panel sees it: running from the moment the message is
 *  accepted, done once the backend marks it finished, stopped or failed. */
export interface IAiChatTurn {
  phase: 'running' | 'done';
  message: IAiChatMessage;
  /** Why a done turn ended, when not by finishing on its own. */
  reason?: 'stopped' | 'error';
  actionOutcome?: ActionResponse;
}

// fe types.ts:196-201
/** A page captures the target before a turn sends any asynchronous request. */
export interface IAiChatTurnScope {
  executePageAction(request: IAiChatPageActionRequest): Promise<ActionResponse>;
  cancel(): void;
  finish?(): void;
}

// fe types.ts:203-211
export interface IAiQueryProgress {
  phase: 'idle' | 'applying' | 'querying' | 'success' | 'empty' | 'failed' | 'changed' | 'stopped' | 'undone';
  stage?: 'unchanged' | 'filled' | 'queried';
  message?: string;
  /** The model's one-line suggestion for the next refinement, shown as the composer placeholder after delivery. */
  followUp?: string;
  /** Series the page's own query returned, when it reported one. */
  count?: number;
}

// 上面 IAiChatTurn / IAiChatTurnScope 里的 ActionResponse 要这个 import。放文件末尾（ESM 会把 import 提升，
// 与放在文件头等价），这样 types.ts 这个边界文件的 diff 里只有加行、没有删行（照 W-0 在 src/App.tsx 末尾的做法）。
// fe 出处：fe types.ts:2 `import type { ActionManifestEntry, ActionResponse } from '@flashcatcloud/ai-kit/actions';`
// —— 只取 ActionResponse；ActionManifestEntry 羚牛这版没有谁要，不跟着加（不改宽，D-16）。
import type { ActionResponse } from '@flashcatcloud/ai-kit/actions';

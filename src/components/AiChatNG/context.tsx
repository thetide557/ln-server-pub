import React from 'react';

import { AiChatMode, AiChatExecuteQueryForQueryContent, IAiChatPageInfo, IAiChatAction } from './types';
import { buildPageFrom } from './recommend';
import { cleanShareParamsFromUrl } from './share';
import { CommonStateContext } from '@/App';

const AI_CHAT_MODE_STORAGE_KEY = 'ai-chat-mode';
// 本地缓存的 AI 会话 id（登出 / 切用户 / 收 forbidden|chat not found 时要清，见 todo①）；export 供登出调用处复用，别重复写字面串
export const AI_CHAT_CACHED_SESSION_KEY = 'ai-chat-last-session-id';

function getInitialMode(): AiChatMode {
  if (typeof window === 'undefined') {
    return 'drawer';
  }

  const cachedMode = window.localStorage.getItem(AI_CHAT_MODE_STORAGE_KEY);
  if (cachedMode === 'floating' || cachedMode === 'drawer') {
    return cachedMode;
  }

  return 'drawer';
}

interface IAiChatContextValue {
  visible: boolean;
  mode: AiChatMode;
  promptList?: string[];
  onExecuteQueryForQueryContent?: AiChatExecuteQueryForQueryContent;
  queryPageFrom?: IAiChatPageInfo;
  queryAction?: IAiChatAction;
  shareReadonly: boolean;
  shareChatId?: string;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setMode: React.Dispatch<React.SetStateAction<AiChatMode>>;
  setPromptList: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  setOnExecuteQueryForQueryContent: React.Dispatch<React.SetStateAction<AiChatExecuteQueryForQueryContent | undefined>>;
  setQueryPageFrom: React.Dispatch<React.SetStateAction<IAiChatPageInfo | undefined>>;
  setQueryAction: React.Dispatch<React.SetStateAction<IAiChatAction | undefined>>;
  setShareReadonly: React.Dispatch<React.SetStateAction<boolean>>;
  setShareChatId: React.Dispatch<React.SetStateAction<string | undefined>>;
  initialMessage?: string;
  setInitialMessage: React.Dispatch<React.SetStateAction<string | undefined>>;
  cachedSessionId?: string;
  setCachedSessionId: React.Dispatch<React.SetStateAction<string | undefined>>;
  pendingChatId?: string;
  setPendingChatId: React.Dispatch<React.SetStateAction<string | undefined>>;
  openAiChat: (options?: {
    mode?: AiChatMode;
    chatId?: string;
    promptList?: string[];
    initialMessage?: string;
    onExecuteQueryForQueryContent?: AiChatExecuteQueryForQueryContent;
    queryPageFrom?: IAiChatPageInfo;
    queryAction?: IAiChatAction;
  }) => void;
  closeAiChat: () => void;
}

interface IAiChatProviderProps {
  children: React.ReactNode;
}

const noop = () => undefined;

export const AiChatContext = React.createContext<IAiChatContextValue>({
  visible: false,
  mode: 'drawer',
  promptList: undefined,
  initialMessage: undefined,
  onExecuteQueryForQueryContent: undefined,
  queryPageFrom: undefined,
  queryAction: undefined,
  shareReadonly: false,
  shareChatId: undefined,
  setVisible: noop as React.Dispatch<React.SetStateAction<boolean>>,
  setMode: noop as React.Dispatch<React.SetStateAction<AiChatMode>>,
  setPromptList: noop as React.Dispatch<React.SetStateAction<string[] | undefined>>,
  setInitialMessage: noop as React.Dispatch<React.SetStateAction<string | undefined>>,
  setOnExecuteQueryForQueryContent: noop as React.Dispatch<React.SetStateAction<AiChatExecuteQueryForQueryContent | undefined>>,
  setQueryPageFrom: noop as React.Dispatch<React.SetStateAction<IAiChatPageInfo | undefined>>,
  setQueryAction: noop as React.Dispatch<React.SetStateAction<IAiChatAction | undefined>>,
  setShareReadonly: noop as React.Dispatch<React.SetStateAction<boolean>>,
  setShareChatId: noop as React.Dispatch<React.SetStateAction<string | undefined>>,
  cachedSessionId: undefined,
  setCachedSessionId: noop as React.Dispatch<React.SetStateAction<string | undefined>>,
  pendingChatId: undefined,
  setPendingChatId: noop as React.Dispatch<React.SetStateAction<string | undefined>>,
  openAiChat: noop,
  closeAiChat: noop,
});

export function AiChatProvider(props: IAiChatProviderProps) {
  const { children } = props;
  const { profile } = React.useContext(CommonStateContext);
  const prevProfileIdRef = React.useRef<number | undefined>(undefined);
  const [visible, setVisible] = React.useState(false);
  const [mode, setMode] = React.useState<AiChatMode>(getInitialMode);
  const [promptList, setPromptList] = React.useState<string[] | undefined>(undefined);
  const [shareReadonly, setShareReadonly] = React.useState(false);
  const [shareChatId, setShareChatId] = React.useState<string | undefined>(undefined);
  const [initialMessage, setInitialMessage] = React.useState<string | undefined>(undefined);
  const [onExecuteQueryForQueryContent, setOnExecuteQueryForQueryContent] = React.useState<AiChatExecuteQueryForQueryContent | undefined>(undefined);
  const [queryPageFrom, setQueryPageFrom] = React.useState<IAiChatPageInfo | undefined>(undefined);
  const [queryAction, setQueryAction] = React.useState<IAiChatAction | undefined>(undefined);
  const [cachedSessionId, setCachedSessionId] = React.useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return window.localStorage.getItem(AI_CHAT_CACHED_SESSION_KEY) || undefined;
  });
  const [pendingChatId, setPendingChatId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(AI_CHAT_MODE_STORAGE_KEY, mode);
  }, [mode]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (cachedSessionId) {
      window.localStorage.setItem(AI_CHAT_CACHED_SESSION_KEY, cachedSessionId);
    } else {
      window.localStorage.removeItem(AI_CHAT_CACHED_SESSION_KEY);
    }
  }, [cachedSessionId]);

  // 切换登录用户时清掉本地缓存的会话 id（上一次有值且与当前不同），避免拿旧账号的 chatId 去问新账号 → forbidden（todo①）
  React.useEffect(() => {
    const currentId = profile?.id;
    const prevId = prevProfileIdRef.current;
    prevProfileIdRef.current = currentId;
    if (prevId !== undefined && currentId !== undefined && prevId !== currentId) {
      setCachedSessionId(undefined);
    }
  }, [profile?.id]);

  const openAiChat = React.useCallback(
    (options?: {
      mode?: AiChatMode;
      chatId?: string;
      promptList?: string[];
      initialMessage?: string;
      onExecuteQueryForQueryContent?: AiChatExecuteQueryForQueryContent;
      queryPageFrom?: IAiChatPageInfo;
      queryAction?: IAiChatAction;
    }) => {
      const ensuredPageFrom = options?.queryPageFrom?.url ? options.queryPageFrom : buildPageFrom();
      if (options?.mode !== undefined) {
        setMode(options.mode);
      }
      if (options?.onExecuteQueryForQueryContent !== undefined) {
        setOnExecuteQueryForQueryContent(() => options.onExecuteQueryForQueryContent);
      } else {
        setOnExecuteQueryForQueryContent(undefined);
      }
      setQueryPageFrom(ensuredPageFrom);
      if (options?.queryAction !== undefined) {
        setQueryAction(options.queryAction);
      } else {
        setQueryAction(undefined);
      }
      setShareReadonly(false);
      setShareChatId(undefined);
      setPromptList(options?.promptList);
      setInitialMessage(options?.initialMessage);
      if (options?.chatId !== undefined) {
        setPendingChatId(options.chatId);
      } else {
        setPendingChatId(undefined);
      }
      setVisible(true);
    },
    [setMode, setOnExecuteQueryForQueryContent, setQueryPageFrom, setQueryAction, setPromptList, setInitialMessage, setVisible],
  );

  const closeAiChat = React.useCallback(() => {
    setVisible(false);
    setShareReadonly(false);
    setShareChatId(undefined);
    cleanShareParamsFromUrl();
  }, []);

  const value = React.useMemo(
    () => ({
      visible,
      mode,
      promptList,
      shareReadonly,
      shareChatId,
      initialMessage,
      onExecuteQueryForQueryContent,
      queryPageFrom,
      queryAction,
      setVisible,
      setMode,
      setPromptList,
      setInitialMessage,
      setOnExecuteQueryForQueryContent,
      setQueryPageFrom,
      setQueryAction,
      setShareReadonly,
      setShareChatId,
      cachedSessionId,
      setCachedSessionId,
      pendingChatId,
      setPendingChatId,
      openAiChat,
      closeAiChat,
    }),
    [
      visible,
      mode,
      promptList,
      initialMessage,
      onExecuteQueryForQueryContent,
      queryPageFrom,
      queryAction,
      shareReadonly,
      shareChatId,
      cachedSessionId,
      setCachedSessionId,
      pendingChatId,
      setPendingChatId,
      openAiChat,
      closeAiChat,
    ],
  );

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
}

export function useAiChatContext() {
  return React.useContext(AiChatContext);
}

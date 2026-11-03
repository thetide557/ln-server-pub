import { useCallback, useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import i18next from 'i18next';
// N26 合并：basePrefix 取自 @/utils/basePrefix（羚牛的 @/App 不导出它），token 用 cookie 里的 access_token
import { basePrefix } from '@/utils/basePrefix';
import { IAiChatStreamChunk } from './types';
import { parseStreamEntry } from './utils';

interface IUseAiChatStreamOptions {
  onChunk?: (chunk: IAiChatStreamChunk) => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
  /** The connection ended before the finish frame: a proxy's idle limit, a dropped network. The turn may still be running. */
  onClose?: () => void;
}

export function useAiChatStream(options: IUseAiChatStreamOptions = {}) {
  const { onChunk, onFinish, onError, onClose } = options;
  const abortControllerRef = useRef<AbortController | null>(null);
  const [streaming, setStreaming] = useState(false);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStreaming(false);
  }, []);

  const start = useCallback(
    async (streamId: string) => {
      if (!streamId) return;
      stop();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setStreaming(true);

      try {
        // N26 合并：羚牛只有开源后端，流固定走 /api/n9e/stream（不保留上游的 IS_ENT ? fc-model 分支）；
        // credentials 用 'omit'（羚牛不靠 cookie 认证，带上反而会被网关当跨站请求）；
        // Authorization 从 cookie 取 access_token（羚牛的 token 存在 cookie，不在 localStorage）；
        // 多发一个 'Bg-debug' 头（羚牛后端用它开调试日志）。
        const response = await fetch(`${basePrefix}/api/n9e/stream`, {
          method: 'POST',
          credentials: 'omit',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            Authorization: `Bearer ${Cookies.get('access_token') || ''}`,
            'X-Language': i18next.language,
            'Bg-debug': '1',
          },
          body: JSON.stringify({ stream_id: streamId }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`stream request failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let finished = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() || '';

          chunks.forEach((entry) => {
            try {
              const parsed = parseStreamEntry(entry);
              const { chunk } = parsed;
              if (chunk) onChunk?.(chunk);
              if (parsed.finished || chunk?.done || chunk?.type === 'done') {
                finished = true;
                onFinish?.();
                stop();
              }
            } catch (error) {
              onError?.(error instanceof Error ? error : new Error('stream parse failed'));
            }
          });
        }
        if (!finished) {
          stop();
          onClose?.();
        }
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
          return;
        }
        const nextError = error instanceof Error ? error : new Error('stream error');
        onError?.(nextError);
        stop();
      }
    },
    [onChunk, onClose, onError, onFinish, stop],
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    streaming,
    start,
    stop,
  };
}

/*
 * Copyright 2024 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

// Consent screen for the built-in MCP/A2A OAuth Authorization Server.
//
// The backend GET /oauth/authorize validates the request and 302-redirects the
// browser here with a signed `req` ticket. Because n9e uses a header/Bearer
// session (no cookie), the consent decision is taken in the SPA: this page is
// inside the authenticated routes, so an unauthenticated visit round-trips
// through /login (incl. SSO) first; once authenticated it POSTs the decision to
// the protected API which mints the authorization code, then navigates the
// browser back to the client's redirect_uri.
//
// ---- N33 批 E（搬进羚牛时的唯一改动）：上游这页的排版全用 tailwind 原子类，
// 但羚牛 tailwind.config.js 的 content 清单（:13-35）是按目录白名单列的、不含
// src/pages/oauthConsent/**，不列进去这些类根本不会被生成——tsc 全绿、build 成功、
// 页面打开是一堆没样式的裸元素且没有任何报错。按批 E 任务书二-2 的口径：
// **不改 tailwind 配置**，把 className 换成等价的内联样式 / antd 的 bodyStyle。
// 换算（tailwind 默认刻度）：h-full→height:'100%'、min-h-[70vh]→minHeight:'70vh'、
// w-[460px]→width:460、p-7→padding:28（1.75rem）、text-[22px]→fontSize:22、
// m-0→margin:0、mb-0→marginBottom:0、mb-1.5→marginBottom:6（0.375rem）、
// w-full→width:'100%'、justify-end→justifyContent:'flex-end'。
// 逻辑、接口、文案、DOM 结构一律未动。
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import queryString from 'query-string';
import { Card, Button, Space, Typography, Result } from 'antd';
import { ApiOutlined } from '@ant-design/icons';

import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { CommonStateContext } from '@/App';

import { NAME_SPACE } from './constants';

const { Paragraph, Text } = Typography;

// 原 tailwind 类 `flex items-center justify-center h-full min-h-[70vh]` 的等价内联样式
const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  minHeight: '70vh',
};

// decodeJwtPayload reads a JWT's payload for display only (no signature check —
// the backend re-verifies the signed ticket when the decision is submitted).
function decodeJwtPayload(token?: string | string[] | null): Record<string, any> {
  if (!token || typeof token !== 'string') return {};
  try {
    const seg = token.split('.')[1];
    if (!seg) return {};
    let b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return JSON.parse(decodeURIComponent(escape(window.atob(b64))));
  } catch {
    return {};
  }
}

function hostOf(uri?: string): string {
  if (!uri) return '';
  try {
    return new URL(uri).host;
  } catch {
    return uri;
  }
}

export default function OAuthConsent() {
  const { t } = useTranslation(NAME_SPACE);
  const location = useLocation();
  const { profile } = useContext(CommonStateContext);
  const req = queryString.parse(location.search).req as string | undefined;
  const claims = useMemo(() => decodeJwtPayload(req), [req]);
  const [submitting, setSubmitting] = useState<'allow' | 'deny' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientName = claims.client_name || t('unknownApp');
  const redirectHost = hostOf(claims.redirect_uri);
  const scope = claims.scope || 'mcp';
  // 该 scope 对 MCP 与 A2A 两类接口一视同仁放行（后端不按 scope 细分鉴权），
  // 显式标注 mcp/a2a，避免被误读为仅授权 MCP。
  const scopeDisplay = scope === 'mcp' ? 'mcp/a2a' : scope;

  // 整合版本中 .App 容器有 min-width 限制，此页面不希望受其影响，
  // 挂载时取消，卸载时恢复。
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.App');
    if (!el) return;
    const saved = el.style.minWidth;
    el.style.minWidth = '';
    return () => {
      el.style.minWidth = saved;
    };
  }, []);

  if (!req) {
    return (
      <div style={centerStyle}>
        <Result status='error' title={t('title')} subTitle={t('invalid')} />
      </div>
    );
  }

  const decide = (decision: 'allow' | 'deny') => {
    setSubmitting(decision);
    setError(null);
    request('/api/n9e/mcp/oauth/authorize', {
      method: RequestMethod.Post,
      data: { req, decision },
    })
      .then((res) => {
        const redirect = res?.dat?.redirect;
        if (redirect) {
          window.location.href = redirect;
        } else {
          setError(t('failed'));
          setSubmitting(null);
        }
      })
      .catch(() => {
        setError(t('failed'));
        setSubmitting(null);
      });
  };

  return (
    <div style={centerStyle}>
      <Card style={{ width: 460 }} bodyStyle={{ padding: 28 }}>
        <Space direction='vertical' size={16} style={{ width: '100%' }}>
          <Space align='center'>
            <ApiOutlined style={{ fontSize: 22 }} />
            <Typography.Title level={4} style={{ margin: 0 }}>
              {t('title')}
            </Typography.Title>
          </Space>

          <Paragraph style={{ marginBottom: 0 }}>{t('intro')}</Paragraph>

          <Card size='small' type='inner' title={<Text strong>{clientName}</Text>}>
            <Paragraph style={{ marginBottom: 6 }}>
              <Text type='secondary'>{t('asUser')}</Text>
              <Text strong>{profile?.nickname || profile?.username || '-'}</Text>
            </Paragraph>
            <Paragraph style={{ marginBottom: 6 }}>
              <Text type='secondary'>{t('scope')}</Text>
              <Text code>{scopeDisplay}</Text>
            </Paragraph>
            {redirectHost ? (
              <Paragraph style={{ marginBottom: 0 }}>
                <Text type='secondary'>{t('redirectTo')}</Text>
                <Text>{redirectHost}</Text>
              </Paragraph>
            ) : null}
          </Card>

          {error ? <Text type='danger'>{error}</Text> : null}

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => decide('deny')} loading={submitting === 'deny'} disabled={submitting !== null}>
              {t('deny')}
            </Button>
            <Button type='primary' onClick={() => decide('allow')} loading={submitting === 'allow'} disabled={submitting !== null}>
              {t('allow')}
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}

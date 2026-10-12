/*
 * Copyright 2022 Nightingale Team
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
import request from "@/utils/request";
import { RequestMethod } from "@/store/common";
import Cookies from 'js-cookie';

// 登录
export const authLogin = function (
  username: string,
  password: string,
  captchaid?: string,
  verifyvalue?: string
) {
  return request(`/api/takin/auth/login`, {
    method: RequestMethod.Post,
    data: { username, password, captchaid, verifyvalue },
  });
};

// ldap登录
export const authLoginLdap = function (
  username: string,
  password: string,
  captchaid?: string,
  verifyvalue?: string
) {
  return request(`/api/takin/auth/login/ldap`, {
    method: RequestMethod.Post,
    data: { username, password, captchaid, verifyvalue },
  });
};


export const getCaptcha = function () {
  return request("/api/takin/auth/captcha", {
    method: RequestMethod.Post,
  });
};
export const getSystemTheme = function () {
  return request("/api/takin/auth/login/title", {
    method: RequestMethod.Get,
    silence: true,
  });
};

export const ifShowCaptcha = function () {
  return request("/api/takin/auth/ifshowcaptcha", {
    method: RequestMethod.Get,
    silence: true,
  });
};

// 刷新accessToken
export const UpdateAccessToken = function () {
  return request(`/api/takin/auth/refresh`, {
    method: RequestMethod.Post,
    data: {
      refresh_token: Cookies.get("refresh_token"),
    },
  });
};

// 更改密码
export const UpdatePwd = function (oldpass: string, newpass: string) {
  return request(`/api/takin/self/password`, {
    method: RequestMethod.Put,
    data: { oldpass, newpass },
  });
};

// 获取csrf token
export const GenCsrfToken = function () {
  return request(`/api/takin/csrf`, {
    method: RequestMethod.Get,
  });
};

// 退出
export const Logout = function () {
  return request(`/api/takin/auth/logout`, {
    method: RequestMethod.Post,
  });
};

/**
 * N36 批 A（A-2b）：这三个「取 SSO 跳出地址」的接口照上游补一个 `redirect` 参数——
 * 它是「登录完请把我送回哪一页」，后端 `center/router/router_login.go` 取它
 * （`loginRedirect` OIDC :1049 起、`loginRedirectCas` :1226 起、`loginRedirectOauth` :1392 起），
 * 先过自己那道 `isSafeInternalRedirect`（:36-50）判出 `valid`，再原样回给前端，
 * SSO 走完一圈回调时才拿得到。上游写法：`ee48e701:src/services/login.ts:73/87/101`
 * 三个函数都是 `function (redirect: string)` + `params: { redirect }`。
 *
 * 与上游差的两点，都是故意的：
 *  1. **写成可选** `redirect?: string`：羚牛这三个函数在 `loginSso.tsx` 之外还有没有别的调用点
 *     不在本批的改动面内，留默认值才不会逼着别处一起改（改前全仓只有 `loginSso.tsx` 这三处在调）。
 *  2. **空的时候整个查询参数都不发**（`params: redirect ? { redirect } : undefined`），
 *     而不是发 `redirect=undefined`：umi-request 会把 `{ redirect: undefined }` 里的
 *     undefined 丢掉，但 `{ redirect: 'undefined' }` 这种字符串不会——真发出去的话后端
 *     `ginx.QueryStr(c, "redirect", "/")` 会拿到字符串 "undefined" 当成路径。不发，后端就用默认 `/`。
 *
 * 安全点（lead 拍板 D-N36-2）：调用方传进来的值必须是**过了白名单**的站内路径
 * （`src/pages/login/redirect.ts:86` 的 `getSafeRedirect`），不能把地址栏里的原值直接塞进来。
 * 因为后端「用户已经登录」那条分支会把收到的 `redirect` **原样回传**
 * （`router_login.go:1241-1248`），前端判到有地址就跳——没过滤就等于谁都能构造一条
 * `/login?redirect=https://evil.example` 的链接，把已登录用户送去外站（开放重定向）。
 */
export const getRedirectURL = function (redirect?: string) {
  return request("/api/takin/auth/redirect", {
    method: RequestMethod.Get,
    params: redirect ? { redirect } : undefined,
  });
};

export const authCallback = function (params) {
  return request("/api/takin/auth/callback", {
    method: RequestMethod.Get,
    params,
  });
};

// `redirect` 的来历与「空就不发」的理由同上面 `getRedirectURL`（N36 批 A · A-2b）。
export const getRedirectURLCAS = function (redirect?: string) {
  return request("/api/takin/auth/redirect/cas", {
    method: RequestMethod.Get,
    params: redirect ? { redirect } : undefined,
  });
};

export const authCallbackCAS = function (params) {
  return request("/api/takin/auth/callback/cas", {
    method: RequestMethod.Get,
    params,
  });
};

// `redirect` 的来历与「空就不发」的理由同上面 `getRedirectURL`（N36 批 A · A-2b）。
export const getRedirectURLOAuth = function (redirect?: string) {
  return request("/api/takin/auth/redirect/oauth", {
    method: RequestMethod.Get,
    params: redirect ? { redirect } : undefined,
  });
};

export const authCallbackOAuth = function (params) {
  return request("/api/takin/auth/callback/oauth", {
    method: RequestMethod.Get,
    params,
  });
};

export const getSsoConfig = function () {
  return request("/api/takin/auth/sso-config", {
    method: RequestMethod.Get,
  });
};

export const getRSAConfig = function () {
  return request("/api/takin/auth/rsa-config", {
    method: RequestMethod.Get,
  });
};

// ai的token
export function getDeepseektoken() {
  return request(`/api/takin/auth/deepseektoken`, {
    method: RequestMethod.Get,
  });
}

// 是否开启sso
export const ifShowSso = function () {
  return request("/api/takin/auth/ifShowSso", {
    method: RequestMethod.Get,
    silence: true,
  });
};

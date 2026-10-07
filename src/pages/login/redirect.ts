/**
 * 登录成功后的「回跳」：把用户送回他被踢出来之前那一页。
 *
 * 为什么要有这个文件
 * ------------------
 * 请求收到 401 时，`src/utils/request.ts:69-72`（`combineLoginURL`）会把当前地址
 * 编一次码挂在登录页后面：`/login?redirect=encodeURIComponent(pathname + search)`。
 * 上游夜莺登录成功后就一句 `window.location.href = redirect || '/'`
 * （`ee48e701:src/pages/login/index.tsx:189`，基线 `v9.1.0:...:144` 同），
 * 羚牛重写登录页时把这一支丢了（三处入口都只是读了 `redirect` 却没用），
 * 结果任何未登录直接打开的深链接，登录完都落在首页 —— 典型受害者是
 * OAuth 同意页 `/oauth-consent?req=<票据>`：票据丢了，用户要回客户端重新发起。
 *
 * 为什么要白名单（不能照抄一句 `location.href = redirect`）
 * --------------------------------------------------------
 * `redirect` 的值是从地址栏来的，任何人都能构造。如果不挑就跳，站点就成了
 * 「开放重定向」（open redirect）跳板：攻击者发一条 `/login?redirect=https://evil.example`
 * 的链接，受害者看到的是我们自己的域名、登录完却被送到外站仿冒页。
 * 所以这里只放行**站内相对路径**，判法照后端同一套
 * （`ln-server:center/router/router_login.go:36-50` 的 `isSafeInternalRedirect`），
 * 前后端两道一致，少一处理解偏差。
 *
 * 出处：N33 批 F。上游写法 `ee48e701:src/pages/login/index.tsx:189`。
 */

/**
 * 判一个**已经解过码**的 `redirect` 值能不能跳；能跳返回它本身，不能跳返回 `undefined`。
 *
 * 放行条件（全部满足才放行）：
 *  1. 非空；
 *  2. 不含 ASCII 控制字符（`< 0x20` 或 `0x7f`）—— 浏览器按 WHATWG URL 规范会**先把
 *     TAB / 换行整个删掉再解析**，所以 `/<TAB>//evil.example` 看着像站内路径，
 *     删掉 TAB 之后是 `///evil.example`，照协议相对 URL 跳外站。这一条必须在判前缀
 *     之前拒（与后端 `router_login.go:41-45` 同一个理由）；
 *  3. 以 `/` 开头 —— 挡掉 `javascript:alert(1)`、`https://evil.example`、
 *     带前导空格的 ` //evil.example`（浏览器会把前导空白去掉）这些；
 *  4. 不以 `//` 开头 —— 协议相对 URL，浏览器按当前协议跳外站；
 *  5. 不含反斜杠 `\` —— 浏览器把 `\` 当 `/` 看，`/\evil.example` 会被归一成
 *     `//evil.example`。站内路径本来也不该有反斜杠，所以整条值里一个都不许有
 *     （比后端只拒 `/\` 前缀更严，没有副作用）；
 *  6. 不含 `://` —— 绝对 URL；
 *  7. 不含 `..` 路径段 —— `/..//evil.example` 这类值，浏览器归一之后是
 *     `//evil.example`（host 还是我们自己，所以其实跳不出去），但一个正常的回跳
 *     地址不会带 `..`（`request.ts:71` 拿的是浏览器已经归一过的 `location.pathname`），
 *     拒掉零误伤，还省得将来有人去推敲归一顺序。**这一条比后端那边严**，
 *     是本文件自己加的；
 *  8. 不以 `/login` 开头 —— 防「登录页套娃」。注意这一条把 `/loginCallback/...`
 *     也一起拒了：回跳到任何登录相关的页面都没有意义，宁可严一点；
 *  9. 不等于 `/` —— `/` 不携带「用户原来在哪」的信息，它恰好是后端
 *     （`router_login.go:1050`、`:1205`）在拿不到 `redirect` 时填的默认值；
 *     而 `request.ts:71` 自己也只在 `pathname != '/'` 时才挂 `redirect`，
 *     也就是说真正的回跳需求里不会出现 `/`。把它当「没有回跳」处理，
 *     好处是羚牛原来那套「先查有没有大屏，有就进 `/screenView`」的默认逻辑
 *     不会被一个空洞的 `/` 挤掉。
 */
export function sanitizeRedirect(value?: string | null): string | undefined {
  if (!value) return undefined;
  // 2. 控制字符（必须最先判）
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return undefined;
  }
  if (value.charAt(0) !== '/') return undefined; // 3
  if (value.startsWith('//')) return undefined; // 4
  if (value.indexOf('\\') !== -1) return undefined; // 5
  if (value.indexOf('://') !== -1) return undefined; // 6
  // 7. 任何 ".." 路径段（"/..", "/../x", "/x/../y"），含结尾的 "/.."
  if (value === '..' || value.indexOf('/..') !== -1) return undefined;
  if (value.startsWith('/login')) return undefined; // 8
  if (value === '/') return undefined; // 9
  return value;
}

/**
 * 从一段 query 串里取出能跳的 `redirect`；取不到或不合法返回 `undefined`。
 *
 * @param search 形如 `?redirect=%2Foauth-consent%3Freq%3Dabc`（带不带开头的 `?` 都行）。
 *               不传则取当前地址栏的 `window.location.search`。
 *
 * 解码只做一次，由 `URLSearchParams.get()` 完成 —— 它本身就会做一次
 * percent-decoding，正好解开 `request.ts:71` 那一次 `encodeURIComponent`。
 * **故意不再补一次 `decodeURIComponent`**：那等于双重解码，
 * `%252F%252Fevil.example` 这种值会在「检查之后」才变回 `//evil.example`，
 * 把上面第 4 条绕过去。
 */
export function getSafeRedirect(search?: string): string | undefined {
  const raw = typeof search === 'string' ? search : typeof window !== 'undefined' ? window.location.search : '';
  if (!raw) return undefined;
  let value: string | null = null;
  try {
    value = new URLSearchParams(raw).get('redirect');
  } catch (e) {
    return undefined;
  }
  return sanitizeRedirect(value);
}

/**
 * 登录成功后该去哪：有合法的 `redirect` 就回那一页，否则执行 `fallback`
 * （羚牛原来的「查大屏 → `/screenView` 或 `/home`」那一段）。
 *
 * @param fallback       没有合法 `redirect` 时跑的原逻辑。
 * @param search         页面地址栏的 query 串，一般传 `location.search`。
 * @param serverRedirect 次选来源：SSO 回调接口回的 `res.dat.redirect`
 *                       （后端 `router_login.go:1205-1214`，它那边已经过了一遍
 *                       `isSafeInternalRedirect`，这里仍然再过一遍本文件的白名单，
 *                       不把「对面检查过了」当免检理由）。
 */
export function goAfterLogin(fallback: () => void, search?: string, serverRedirect?: string | null): void {
  const target = getSafeRedirect(search) || sanitizeRedirect(serverRedirect);
  if (target) {
    window.location.href = target;
    return;
  }
  fallback();
}

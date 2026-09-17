# step6d 测试脚手架（jest + jsdom + testing-library）

## 怎么跑

在 `pub-step6d/` 下：`yarn test` 跑全部，`yarn test esForm` 只跑某个文件，`npx tsc -p tsconfig.json` 做类型检查（测试目录已被 `exclude` 掉，不参与）。只有 `src/__tests__/step6d/**/*.test.ts(x)` 会被当成测试（`jest.config.ts` 的 `testMatch`）。

## 两个样板各证明了什么

| 文件 | 证明的事 |
|---|---|
| `samples/esForm.test.tsx` | jsdom 里能把 antd 4 的数据源表单渲染出来、填字段、点提交、点掉二次确认弹窗，并且能从 mock 的 `@/utils/request` 里把**请求体原样捞出来断言**（含 aes 加密后的密码）。 |
| `samples/dsList.render.test.tsx` | `react-dom/server` 的 `renderToString` 能把数据源列表页整棵组件树渲染成字符串、不抛异常，i18n 词条也确实翻出来了。适合当「白屏级」冒烟。 |

`esForm` 实测打出来的请求体（跑测试时 `console.log('[step6d][样板A] upsert body')` 会原样打印，也抄在 `进度-P2.md` 里）：`POST /api/n9e/datasource/upsert`，body = `{ name, http:{url,timeout,tls:{},headers:{}}, auth:{basic_auth_user,basic_auth_password}, settings:{version,max_shard,min_interval}, plugin_type:'elasticsearch', is_enable:true, is_test:true }`。

## 写新测试照哪几行抄

1. **顶部三行 mock**（顺序无所谓，ts-jest 会把 `jest.mock` 提到 import 之前）：
   - `jest.mock('@/App', () => require('../helpers/appMock'));` —— `src/App.tsx` 会 import 整个路由树，太重；`helpers/appMock.tsx` 只给 `CommonStateContext`。要往 context 里塞别的字段就改 `defaultCommonState`。
   - `jest.mock('@/utils/request', () => ({ __esModule: true, default: jest.fn(() => Promise.resolve({ dat: {}, data: {} })) }));` —— `src/utils/request.ts` 是 umi-request 封装，默认导出一个函数。
   - 列表页那种一进来就发请求的，再 mock 掉对应的 `services`（见 `dsList.render.test.tsx`）。
2. **包 Router**：表单页靠 `useParams` 拿 action / type，用 `<MemoryRouter initialEntries={['/help/source/add/<类型>']}><Route path='/help/source/:action/:type/:id?'>…`；`renderToString` 用 `<StaticRouter location=…>`。
3. **填字段**：按 antd 自动生成的 input id 选，`name` 是数组时用下划线连——`['http','url']` → `#http_url`，`['auth','basic_auth_user']` → `#auth_basic_auth_user`。比按 label 文字找稳，不受 i18n 改词影响。
4. **拿请求体**：`(request as unknown as jest.Mock).mock.calls[0]` → `[url, { method, data }]`，`data` 就是请求体。注意 `method` 是 `'Post'`（首字母大写，`src/store/common.ts:63` 的 `RequestMethod`）。
5. **i18n**：测试里 `import '@/i18n'` 初始化，再 `import '@/pages/datasource/locale'` 挂上该页的词条，否则 `t('title')` 只会吐出键名。

## 已知坑

- **`import.meta`**：vite 代码里到处是 `import.meta.env`，CommonJS 下 Node 不认。`transformers/tsJestImportMeta.js` 在编译前把它换成全局变量 `__VITE_IMPORT_META__`（在 `setupTests.ts` 里造）。想验「专业版分支」，测试里改 `(globalThis as any).__VITE_IMPORT_META__.env.VITE_IS_PRO = 'true'`。
- **ts-jest 的配置只认 `createTransformer()` 的入参**，不看 jest 传进 `process()` 的 `transformerConfig`。所以 `jest.config.ts` 里 `transform` 的第二个参数是由 `tsJestImportMeta.js` 自己取出来（并把 `<rootDir>` 换成真路径）再喂给 ts-jest 的。删掉那段 `getInner()` 会导致 `tsconfig.test.json` 的 `esModuleInterop` 失效，`import i18n from 'i18next'` 拿到 `undefined`。
- **`tsconfig.json` 的 `paths` 里那条 `parse5`**：jsdom 带进来 parse5@7，它的 `.d.ts` 用 TS4.4+ 语法，本仓库 typescript 锁 4.3.2 读不懂，`tsc` 会报一片 `TS1005`。指回本来就有的 `@types/parse5@6` 就好（详见 `第六步-流水线/多数据源/拿不准-P2.md` #1）。
- **`transformIgnorePatterns`**：默认整个 `node_modules` 不转译。将来 import 到只发 ESM 的包（`react-markdown`、`lodash-es`、`d3-*`）会报 `SyntaxError: Unexpected token 'export'`，把包名加进 `jest.config.ts` 里注释掉的那条白名单。
- **日志里那串 `async-validator: [ 'CODE_LOGIC_ERROR' ]`**：URL 没填时 `src/pages/datasource/components/items/HTTP.tsx:24` 的 `value.includes(' ')` 对 `undefined` 抛错。只是噪音，`required` 规则照样拦住了。fe v9.1.0 那边写的是 lodash 的 `_.includes(value, ' ')`（不怕 undefined）——详见 `拿不准-P2.md` #2。

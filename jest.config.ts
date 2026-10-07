/**
 * step6d 的 jest 配置。骨架抄自 fe v9.1.0 的 jest.config.ts
 * （`git -C ../fe show v9.1.0:jest.config.ts`），改了四处：
 *   1. testEnvironment 从 'node' 换成 'jsdom'（我们要在 node 里模拟浏览器 DOM 渲染 antd 表单）；
 *   2. testMatch 以 src/__tests__/step6d/ 为主，另按 N36 批 C 放宽到三个 AI 组件目录（见下面 testMatch 那一段）；
 *   3. moduleNameMapper 补了 plus:/、less/css、图片三类（fe 只有 @/）；
 *   4. transform 换成本目录下的 tsJestImportMeta.js —— ts-jest 外面套一层，把 `import.meta` 换掉。
 */
import type { Config } from 'jest';

const config: Config = {
  clearMocks: true,
  coverageProvider: 'v8',

  // node 里模拟浏览器 DOM
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    // antd / react-router 有些代码要读 location，给个像样的地址
    url: 'http://localhost/',
  },

  // N36 批 C：原来只认 src/__tests__/step6d/ 下的用例（当时是故意收窄，不去碰仓库里别的东西），
  // 代价是 N20 / N26 从上游 fe 逐字搬进来的 AI 组件测试一直没被跑过（N28 拿不准 U-N28-2）。
  // 用户 2026-10-07 拍：AI 相关这三个目录必须进来（共 7 个用例文件、81 条用例，本批已全绿）；
  // 其余 36 个（logExplorer / plugins/* 的 ExplorerNG / 几个表格组件 / aiConfig）按目录逐个试跑，
  // 全绿的才追加进来，有红的只登记待办不进——见 n36/改动清单-C.md 的目录试跑表。
  testMatch: [
    '<rootDir>/src/__tests__/step6d/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/AiChatNG/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/AiQueryDock/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/QueryBoxPrefix/**/*.test.{ts,tsx}',
    // 下面九个目录是本批逐个试跑、**全绿**才加进来的（命令行覆盖试跑，不改配置；逐目录数字见改动清单-C.md）。
    '<rootDir>/src/plugins/clickHouse/**/*.test.{ts,tsx}',
    '<rootDir>/src/plugins/doris/**/*.test.{ts,tsx}',
    '<rootDir>/src/plugins/elasticsearch/**/*.test.{ts,tsx}',
    '<rootDir>/src/plugins/loki/**/*.test.{ts,tsx}',
    '<rootDir>/src/plugins/victorialogs/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/TableTags/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/TableColumnSelect/**/*.test.{ts,tsx}',
    '<rootDir>/src/components/DatasourceSelect/**/*.test.{ts,tsx}',
    '<rootDir>/src/pages/aiConfig/**/*.test.{ts,tsx}',
  ],
  // 还有两个目录**没**加进来，各有几条红，本批按任务书只登记不修（见 n36/拿不准-C.md U-N36-C-2 / U-N36-C-3）：
  //   - src/pages/logExplorer（12 个文件，10 绿 2 红）：红在 utils/getDefaultDatasourceCate.test.ts 与
  //     utils/createLogExplorerTabItem.test.ts，共 3 条断言。羚牛 N20（拍板 M239 ②）在
  //     utils/datasourceAvailability.ts:25-27 特地放行了 ck / doris，上游那两份测试还在断言
  //     「开源版里 ck 是商业版专属、应当被挡掉」。
  //   - src/components/EnhancedTable（3 个文件，2 绿 1 红）：红在 inlineActionPages.test.ts，
  //     它按文件名去读四个页面的源码，而那四个页面（embeddedProduct / notificationRules /
  //     variableConfigs / warning/shield）羚牛没有，readFileSync 直接 ENOENT。
  testPathIgnorePatterns: ['/node_modules/'],

  // 顺序有讲究：样式和图片要排在 ^@/ 前面，
  // 否则 `@/xx/index.less` 会先被 ^@/ 规则改写成真实路径，jest 再去读 less 源码就炸了。
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg|jpeg|gif|webp|bmp|ico|woff|woff2|ttf|eot|mp3|mp4)$': '<rootDir>/src/__tests__/step6d/mocks/fileMock.tsx',
    // vite 插件 plugins/plusResolve.ts 在非 advanced 模式下把 plus:/xxx 解析到 PlusPlaceholder，这里照做
    '^plus:/(.*)$': '<rootDir>/plugins/PlusPlaceholder.tsx',
    '^@/store/eventWallInterface$': '<rootDir>/src/Packages/EventWall/interface/index.ts',
    // N36 批 C：RTL 12（React 17 这一代）没有 renderHook，上游搬来的两个 hook 测试要用它。
    // 垫片原样透传其余导出，只补这一个函数；原由与删除条件见该文件头注释。
    '^@testing-library/react$': '<rootDir>/src/__tests__/step6d/shims/testingLibraryReact.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  setupFilesAfterEnv: ['<rootDir>/src/__tests__/step6d/setupTests.ts'],

  transform: {
    // step6f（ES 升级轮）：正则里加了 js|jsx。搬进来的 src/components/KQLInput/grammar/parser.js
    // 是一个用 ESM 语法写的 .js 文件（`import { LRParser } from '@lezer/lr'`），
    // 原来的 `^.+\\.(ts|tsx)$` 不匹配它，jest 直接按 CommonJS 读就报
    // 「Cannot use import statement outside a module」。ts-jest 的 allowJs 已经是开的。
    '^.+\\.(ts|tsx|js|jsx)$': [
      '<rootDir>/src/__tests__/step6d/transformers/tsJestImportMeta.js',
      {
        // 注意：这份配置由 tsJestImportMeta.js 取出来喂给 ts-jest 的 createTransformer()，
        // ts-jest 不会自己去读 jest 传进来的 transformerConfig（那份文件顶部有说明）。
        tsconfig: '<rootDir>/tsconfig.test.json',
        // 只转译不做类型检查：类型的事交给 `npx tsc -p tsconfig.json` 管，这里只要链路跑通。
        // （isolatedModules 写在 tsconfig.test.json 里，ts-jest 29 已经不收这个同名选项了。）
        diagnostics: false,
      },
    ],
  },

  // 默认不转译 node_modules。将来若有只发 ESM 的包（react-markdown、lodash-es、d3-* 这类）
  // 报 `SyntaxError: Unexpected token 'export'`，把包名加进下面这条白名单：
  // transformIgnorePatterns: ['/node_modules/(?!(react-markdown|lodash-es)/)'],
  transformIgnorePatterns: ['/node_modules/'],

  // antd 4 的组件树很深，给宽一点
  testTimeout: 30000,
};

export default config;

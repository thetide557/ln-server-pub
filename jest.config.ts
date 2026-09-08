/**
 * step6d 的 jest 配置。骨架抄自 fe v9.1.0 的 jest.config.ts
 * （`git -C ../fe show v9.1.0:jest.config.ts`），改了四处：
 *   1. testEnvironment 从 'node' 换成 'jsdom'（我们要在 node 里模拟浏览器 DOM 渲染 antd 表单）；
 *   2. testMatch 收窄到 src/__tests__/step6d/ 下，不去碰仓库里别的东西；
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

  testMatch: ['<rootDir>/src/__tests__/step6d/**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/'],

  // 顺序有讲究：样式和图片要排在 ^@/ 前面，
  // 否则 `@/xx/index.less` 会先被 ^@/ 规则改写成真实路径，jest 再去读 less 源码就炸了。
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(svg|png|jpg|jpeg|gif|webp|bmp|ico|woff|woff2|ttf|eot|mp3|mp4)$': '<rootDir>/src/__tests__/step6d/mocks/fileMock.tsx',
    // vite 插件 plugins/plusResolve.ts 在非 advanced 模式下把 plus:/xxx 解析到 PlusPlaceholder，这里照做
    '^plus:/(.*)$': '<rootDir>/plugins/PlusPlaceholder.tsx',
    '^@/store/eventWallInterface$': '<rootDir>/src/Packages/EventWall/interface/index.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  setupFilesAfterEnv: ['<rootDir>/src/__tests__/step6d/setupTests.ts'],

  transform: {
    '^.+\\.(ts|tsx)$': [
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

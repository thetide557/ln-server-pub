/**
 * step6d 专用的 jest transformer：ts-jest 外面套一层，专治 `import.meta`。
 *
 * 为什么要它：vite 项目里到处写 `import.meta.env.XXX`（本仓库 23 个文件里有，
 * 例如 src/pages/datasource/services.ts:40、src/components/AdvancedWrap/index.tsx:26），
 * 而 ts-jest 把代码编成 CommonJS，Node 在 CommonJS 里根本不认 `import.meta`，
 * 一跑就是 “Cannot use 'import.meta' outside a module”。
 *
 * 做法：编译前把源码里的 `import.meta` 整个换成全局变量 `__VITE_IMPORT_META__`，
 * 这个全局变量在 setupTests.ts 里造好（形状是 `{ env: {...} }`）。换完再交给 ts-jest 正常编译。
 *
 * 坑（踩过）：ts-jest 的配置**只认 createTransformer() 的入参**，
 * 不看 jest 传进 process() 的 transformOptions.transformerConfig
 * （见 node_modules/ts-jest/dist/legacy/ts-jest-transformer.js 的 _configsFor，
 * 它用的是 this.transformerOptions）。所以这里要自己把 jest.config.ts 里写的那份配置
 * 取出来、把 `<rootDir>` 换成真路径，再交给 createTransformer。
 * 少了这一步，tsconfig.test.json 里的 esModuleInterop 不会生效，
 * `import i18n from 'i18next'` 会拿到 undefined。
 */
const tsJest = require('ts-jest').default;

let inner = null;

function resolveRootDir(value, rootDir) {
  if (typeof value === 'string' && rootDir) {
    return value.replace('<rootDir>', rootDir);
  }
  return value;
}

function getInner(options) {
  if (inner) return inner;
  const rootDir = options && options.config && options.config.rootDir;
  const raw = (options && options.transformerConfig) || {};
  const cfg = Object.assign({}, raw);
  if (cfg.tsconfig) {
    cfg.tsconfig = resolveRootDir(cfg.tsconfig, rootDir);
  }
  inner = tsJest.createTransformer(cfg);
  return inner;
}

const IMPORT_META = /import\.meta/g;

function patch(sourceText) {
  if (typeof sourceText !== 'string' || sourceText.indexOf('import.meta') === -1) {
    return sourceText;
  }
  return sourceText.replace(IMPORT_META, '__VITE_IMPORT_META__');
}

module.exports = {
  process(sourceText, sourcePath, options) {
    return getInner(options).process(patch(sourceText), sourcePath, options);
  },
  processAsync(sourceText, sourcePath, options) {
    return getInner(options).processAsync(patch(sourceText), sourcePath, options);
  },
  getCacheKey(sourceText, sourcePath, options) {
    // 加个后缀，避免和没打补丁时的缓存串味
    return getInner(options).getCacheKey(patch(sourceText), sourcePath, options) + '_importmeta1';
  },
  getCacheKeyAsync(sourceText, sourcePath, options) {
    return Promise.resolve(getInner(options).getCacheKeyAsync(patch(sourceText), sourcePath, options)).then((k) => k + '_importmeta1');
  },
};

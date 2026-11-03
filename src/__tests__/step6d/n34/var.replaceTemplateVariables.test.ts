/**
 * N34-var：仪表盘面板 SQL 里的看板自定义变量要能被替换成当前值。
 *
 * 背景：新套 `src/pages/dashboard/Variables/utils/replaceTemplateVariables.ts` 读
 * `getGlobalState('variablesWithOptions')` 拿当前变量。羚牛这边这个导出原来是个空垫片（恒回 `[]`），
 * 所以 clickHouse / doris / mysql / pgsql 面板 SQL 里写的 `${var}` / `$var` / `[[var]]` 不会被替换，
 * 原文直接发给数据库。N34-var 把垫片改成真的存储（`Variables/utils/n9eShim.ts`），
 * 由 `Renderer/datasource/useQuery.tsx` 与 `Detail/Detail.tsx` 往里写。
 *
 * 这份测试直接往垫片存储里写变量，再核 `replaceTemplateVariables` 的输出，
 * 覆盖三种写法（`${var}` / `$var` / `[[var]]`）、单选、多选、全选，外加「不写就不替换」这条对照。
 * 形状借自上游 `git -C fe show ee48e701:src/pages/dashboard/Variables/utils/__tests__/replaceTemplateVariables.test.ts`，
 * 区别是上游 mock 掉 `getGlobalState`，我们这里用真的垫片存储，连桥一起测。
 */
// rc-picker 的 es/ 目录是 ESM，jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 指回等价的 CommonJS 版 lib/。replaceTemplateVariables -> @/components/TimeRangePicker 会用到。
// 写法同 ../l4/ck.alertRule.submit.test.ts。
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));

// 先初始化 i18next 再 import 下面的东西：@/components/TimeRangePicker 的 locale/index.ts 一进来就调
// i18next.addResourceBundle，没先跑过 @/i18n 的话拿到的默认导出还不是 i18next 实例（../README.md 第三节第 5 条）。
import '@/i18n';

import replaceTemplateVariables from '@/pages/dashboard/Variables/utils/replaceTemplateVariables';
import { setGlobalState, toVariablesWithOptions } from '@/pages/dashboard/Variables/utils/n9eShim';

// 老套 VariableConfig 存出来的变量对象：options 是 string[]（见 VariableConfig/definition.ts:27）
const legacyHostVariable = {
  name: 'host',
  type: 'query',
  definition: 'label_values(cpu_usage_idle, ident)',
  datasource: { cate: 'prometheus', value: 1 },
  options: ['a', 'b', 'c'],
  value: 'a',
};

function putVariables(variables: any[]) {
  setGlobalState('variablesWithOptions', toVariablesWithOptions(variables));
}

describe('N34-var 仪表盘变量替换（接通 n9eShim 的 getGlobalState）', () => {
  beforeEach(() => {
    setGlobalState('variablesWithOptions', []);
  });

  afterAll(() => {
    setGlobalState('variablesWithOptions', []);
  });

  test('没有变量时，${var} 原样留着（这是改之前的全部行为）', () => {
    expect(replaceTemplateVariables('select * from t where h=${host}')).toBe('select * from t where h=${host}');
  });

  test('${var} 单选：换成当前值', () => {
    putVariables([legacyHostVariable]);
    expect(replaceTemplateVariables('select * from t where h=${host}')).toBe('select * from t where h=a');
  });

  test('$var 写法同样生效', () => {
    putVariables([legacyHostVariable]);
    expect(replaceTemplateVariables('select * from t where h=$host')).toBe('select * from t where h=a');
  });

  test('[[var]] 写法同样生效', () => {
    putVariables([legacyHostVariable]);
    expect(replaceTemplateVariables('select * from t where h=[[host]]')).toBe('select * from t where h=a');
  });

  test('多选：按变量所属数据源类型的分隔符拼起来（prometheus 是 |）', () => {
    putVariables([{ ...legacyHostVariable, multi: true, value: ['a', 'b'] }]);
    expect(replaceTemplateVariables('select * from t where h=${host}')).toBe('select * from t where h=(a|b)');
  });

  test('多选只选了一个：不加括号', () => {
    putVariables([{ ...legacyHostVariable, multi: true, value: ['b'] }]);
    expect(replaceTemplateVariables('select * from t where h=${host}')).toBe('select * from t where h=b');
  });

  test('全选（value 是 ["all"]）：把 options 全拼上 —— 老套 options 是 string[]，靠桥上的 toVariablesWithOptions 转成 { label, value }[] 才认得出来', () => {
    putVariables([{ ...legacyHostVariable, multi: true, allOption: true, value: ['all'] }]);
    expect(replaceTemplateVariables('select * from t where h=${host}')).toBe('select * from t where h=(a|b|c)');
  });

  test('全选且配了 allValue：用 allValue', () => {
    putVariables([{ ...legacyHostVariable, multi: true, allOption: true, allValue: '.*', value: ['all'] }]);
    expect(replaceTemplateVariables('select * from t where h=${host}')).toBe('select * from t where h=.*');
  });

  test('一条 SQL 里多个变量、以及没定义的变量保持原样', () => {
    putVariables([legacyHostVariable, { ...legacyHostVariable, name: 'db', options: ['d1'], value: 'd1' }]);
    expect(replaceTemplateVariables('select * from ${db}.t where h=$host and x=${nope}')).toBe('select * from d1.t where h=a and x=${nope}');
  });

  test('custom / textbox 类型（没有 datasource 字段）也能替换', () => {
    putVariables([{ name: 'topn', type: 'textbox', definition: '', defaultValue: '10', value: '20' }]);
    expect(replaceTemplateVariables('select * from t limit ${topn}')).toBe('select * from t limit 20');
  });

  test('内置 $__from / $__to 不受影响（显式传 range）', () => {
    putVariables([legacyHostVariable]);
    const result = replaceTemplateVariables('select * from t where ts between ${__from} and ${__to} and h=${host}', {
      range: { start: '2026-10-07T00:00:00.000Z', end: '2026-10-07T01:00:00.000Z' },
    });
    expect(result).toBe('select * from t where ts between 1791331200000 and 1791334800000 and h=a');
  });
});

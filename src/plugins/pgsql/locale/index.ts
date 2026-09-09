// 第六步 第4段 W3a（阶段 1 收尾，拍板-23）：文件从 fe v9.1.0 `src/plugins/pgsql/locale/` 原样搬来，
// 但这个 index.ts 必须改写——fe 的 i18n 用 import.meta.glob 自动收集 **/locale/index.ts 里的
// `export default resources`（fe src/i18n.ts:58），pub 的 i18n 是静态 resources（src/i18n.ts:19-22）、不自动收集，
// 原样搬过来 `import '@/plugins/pgsql/locale'` 什么都不会注册。改成 pub 的惯例：自己调 i18next.addResourceBundle
//（写法逐字照 src/plugins/victorialogs/locale/index.ts:14-16 与 src/plugins/mysql/locale/index.ts:13-15）。
// 语言只留 pub 支持的三种（zh_CN / en_US / zh_HK），fe 的 ja_JP / ru_RU 两个文件照搬保留但不注册。
// 命名空间取 NAME_SPACE（= 'pgsql'，../constants.ts:3），与 fe 原文件里 resources 的键一字不差；
// pgsql 的告警编辑器（AlertRule/Queries/index.tsx:38、components/AdvancedSettings.tsx:26）就是按这个命名空间取词条的。
import i18next from 'i18next';

import { NAME_SPACE } from '../constants';
import en_US from './en_US';
import zh_CN from './zh_CN';
import zh_HK from './zh_HK';

i18next.addResourceBundle('en_US', NAME_SPACE, en_US);
i18next.addResourceBundle('zh_CN', NAME_SPACE, zh_CN);
i18next.addResourceBundle('zh_HK', NAME_SPACE, zh_HK);

// 第六步 B1（多数据源补搬轮）：fe 的 i18n 用 import.meta.glob 自动收集 **/locale/index.ts 里的
// `export default resources`（fe src/i18n.ts:58），pub 的 i18n 是静态 resources（src/i18n.ts:19-22），
// 不自动收集——所以这里改成 pub 的惯例：自己调 i18next.addResourceBundle
// （写法照 src/plugins/iotdb/locale/index.ts，L3 已用同一写法）。
// 语言只留 pub 支持的三种（zh_CN / en_US / zh_HK），fe 的 ja_JP / ru_RU 文件保留但不注册。
// 命名空间取 NAME_SPACE（= 'victorialogs'），与 fe 原文件里 resources 的键一字不差。
import i18next from 'i18next';

import { NAME_SPACE } from '../constants';
import en_US from './en_US';
import zh_CN from './zh_CN';
import zh_HK from './zh_HK';

i18next.addResourceBundle('en_US', NAME_SPACE, en_US);
i18next.addResourceBundle('zh_CN', NAME_SPACE, zh_CN);
i18next.addResourceBundle('zh_HK', NAME_SPACE, zh_HK);

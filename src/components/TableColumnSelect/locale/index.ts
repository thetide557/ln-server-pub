// N20 块 0（新日志浏览）：fe 的 i18n 用 import.meta.glob 自动收集 **/{{locale,locales}}/index.ts 里的
// `export default resources`（fe src/i18n.ts:78），pub 的 i18n 是静态 resources（src/i18n.ts:19-22），
// 不自动收集——所以这里改成 pub 的惯例：自己调 i18next.addResourceBundle
// （写法照 src/plugins/TDengine/locale/index.ts:7-14）。
// 语言只留 pub 支持的三种（zh_CN / en_US / zh_HK），fe 的 ja_JP / ru_RU / pt_BR / es_ES / id_ID /
// ko_KR / fr_FR 七个文件保留但不注册。
// 命名空间 tableColumnSelect，与 fe 原文件里 resources 的键一字不差；消费端 ../index.tsx 顶部显式 import 本目录。
import i18next from 'i18next';
import en_US from './en_US';
import zh_CN from './zh_CN';
import zh_HK from './zh_HK';

i18next.addResourceBundle('en_US', 'tableColumnSelect', en_US);
i18next.addResourceBundle('zh_CN', 'tableColumnSelect', zh_CN);
i18next.addResourceBundle('zh_HK', 'tableColumnSelect', zh_HK);

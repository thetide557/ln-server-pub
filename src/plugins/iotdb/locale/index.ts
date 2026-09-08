// 第六步 L3（多数据源）：fe 的 i18n 用 import.meta.glob 自动收集 **/locale/index.ts 里的
// `export default resources`（fe src/i18n.ts:58），pub 的 i18n 是静态 resources（src/i18n.ts:19-22），
// 不自动收集——所以这里改成 pub 的惯例：自己调 i18next.addResourceBundle
// （写法照 src/components/AiChatNG/locale/index.ts:9-11）。
// 语言只留 pub 支持的三种（zh_CN / en_US / zh_HK），fe 的 ja_JP / ru_RU 文件保留但不注册。
// 命名空间 db_iotdb，与 fe 原文件里 resources 的键一字不差。
import i18next from 'i18next';
import en_US from './en_US';
import zh_CN from './zh_CN';
import zh_HK from './zh_HK';

i18next.addResourceBundle('en_US', 'db_iotdb', en_US);
i18next.addResourceBundle('zh_CN', 'db_iotdb', zh_CN);
i18next.addResourceBundle('zh_HK', 'db_iotdb', zh_HK);

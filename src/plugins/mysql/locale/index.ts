// 第六步 L1（多数据源）：fe 的 i18n 会自动扫描 **/locale/index.ts 并把 `export default resources` 收进去，
// pub 的 i18n 是静态 resources（src/i18n.ts:19-22），不自动收集——所以这里改成 pub 的惯例：
// 自己调 i18next.addResourceBundle（写法照 src/components/AiChatNG/locale/index.ts:9-11）。
// 语言只留 pub 支持的三种（zh_CN / en_US / zh_HK），fe 的 ja_JP / ru_RU 没有搬。
// 挂上去的命名空间是 n9e-mysql（../constants.ts 的 NAME_SPACE），
// mysql 数据源表单的 Conn.tsx / Shard.tsx 用它。
import i18next from 'i18next';
import { NAME_SPACE } from '../constants';
import en_US from './en_US';
import zh_CN from './zh_CN';
import zh_HK from './zh_HK';

i18next.addResourceBundle('en_US', NAME_SPACE, en_US);
i18next.addResourceBundle('zh_CN', NAME_SPACE, zh_CN);
i18next.addResourceBundle('zh_HK', NAME_SPACE, zh_HK);

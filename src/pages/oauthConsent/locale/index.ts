// N33 批 E（OAuth 同意页）：fe 的 i18n 用 import.meta.glob 自动收集 **/locale/index.ts 里 export 出来的
// resources（fe ee48e701:src/i18n.ts:78），pub 没这套（pub src/i18n.ts:19 只读 src/locales/resources），
// 所以照 pub 别的页面的写法改成自己 addResourceBundle（例 src/pages/datasource/locale/index.ts:6-8、
// src/pages/aiConfig/agents/locale/index.ts）。上游那份注册 10 国语言，pub 只有 en_US / zh_CN / zh_HK 三语，
// 其余 7 国的词条文件不搬。这个文件由 src/routers/index.tsx 顶部 side-effect import 拉起
// （照 src/routers/index.tsx:130-132 的 aiConfig 三页写法），所以 index.tsx 不用改。
import i18next from 'i18next';

import { NAME_SPACE } from '../constants';
import en_US from './en_US';
import zh_CN from './zh_CN';
import zh_HK from './zh_HK';

i18next.addResourceBundle('en_US', NAME_SPACE, en_US);
i18next.addResourceBundle('zh_CN', NAME_SPACE, zh_CN);
i18next.addResourceBundle('zh_HK', NAME_SPACE, zh_HK);

import i18next from 'i18next';
import { NS } from '../constants';
import en_US from './en_US';
import zh_CN from './zh_CN';
import zh_HK from './zh_HK';

// 第六步d：pub 的 i18n 不像 fe 那样用 import.meta.glob 自动收集词条，得自己注册（照 src/components/AiChatNG/locale/index.ts:9-11）。
// pub 只有 zh_CN / en_US / zh_HK 三种语言，fe 带来的 ja_JP / ru_RU 文件保留但不注册。
i18next.addResourceBundle('en_US', NS, en_US);
i18next.addResourceBundle('zh_CN', NS, zh_CN);
i18next.addResourceBundle('zh_HK', NS, zh_HK);

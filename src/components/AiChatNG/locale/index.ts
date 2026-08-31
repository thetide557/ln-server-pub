import i18next from 'i18next';
import { NAME_SPACE } from '../constants';
import en_US from './en_US';
import zh_CN from './zh_CN';
import zh_HK from './zh_HK';

// 第六步：pub 的 i18n 不像 fe 那样用 import.meta.glob 自动收集，组件词条要自己注册；
// pub 只有 zh_CN / en_US / zh_HK 三种语言，ja_JP / ru_RU 文件保留但不注册。
i18next.addResourceBundle('en_US', NAME_SPACE, en_US);
i18next.addResourceBundle('zh_CN', NAME_SPACE, zh_CN);
i18next.addResourceBundle('zh_HK', NAME_SPACE, zh_HK);

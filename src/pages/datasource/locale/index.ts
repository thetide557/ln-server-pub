import i18next from 'i18next';
import en_US from './en_US';
import zh_CN from './zh_CN';
import zh_HK from './zh_HK';

i18next.addResourceBundle('en_US', 'datasourceManage', en_US);
i18next.addResourceBundle('zh_CN', 'datasourceManage', zh_CN);
i18next.addResourceBundle('zh_HK', 'datasourceManage', zh_HK);

// ---- 第六步 L1（多数据源）：九张新表单要用、pub 原来没有的 13 个键。
// 第 4 个参数 deep=true 表示按层级合并、第 5 个 overwrite=false 表示已有的键不覆盖，
// 所以上面三行挂的 pub 原词条优先，这里只补空缺。
import step6d_en_US from './step6d.en_US';
import step6d_zh_CN from './step6d.zh_CN';
import step6d_zh_HK from './step6d.zh_HK';

i18next.addResourceBundle('en_US', 'datasourceManage', step6d_en_US, true, false);
i18next.addResourceBundle('zh_CN', 'datasourceManage', step6d_zh_CN, true, false);
i18next.addResourceBundle('zh_HK', 'datasourceManage', step6d_zh_HK, true, false);

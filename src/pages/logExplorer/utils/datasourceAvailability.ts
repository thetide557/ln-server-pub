import _ from 'lodash';

import { allCates } from '@/components/AdvancedWrap/utils';
import type { Cate } from '@/components/AdvancedWrap/utils';
import { IS_PLUS, DatasourceCateEnum } from '@/utils/constant';

interface DatasourceItem {
  plugin_type?: string;
  [key: string]: any;
}

export function isLogExplorerDatasourceCateSupported(cate?: string, cates: Pick<Cate, 'value' | 'type' | 'graphPro'>[] = allCates, isPlus = IS_PLUS) {
  if (!cate) {
    return false;
  }

  const cateData = _.find(cates, { value: cate });
  if (!cateData || !_.includes(cateData.type, 'logging')) {
    return false;
  }

  // N20（羚牛比上游多走一步，拍板 M239 ②）：ck / doris 的 ExplorerNG 在 fe 仓库里有代码，但上游开源构建把它们标成
  // graphPro（商业版）、靠下面这一行挡在数据源下拉之外。羚牛把两源的 ExplorerNG 搬进来了（第 3 轮），这里放行它们；
  // 不整句改成 return true，否则 opensearch 等真没有实现的源也会进下拉、选中后撞「不支持的数据源类型」。
  if (cate === DatasourceCateEnum.ck || cate === DatasourceCateEnum.doris) {
    return true;
  }
  return cateData.graphPro ? isPlus : true;
}

export function filterLogExplorerDatasourceList<T extends DatasourceItem>(list: T[], cates: Pick<Cate, 'value' | 'type' | 'graphPro'>[] = allCates, isPlus = IS_PLUS) {
  return _.filter(list, (item) => isLogExplorerDatasourceCateSupported(item.plugin_type, cates, isPlus));
}

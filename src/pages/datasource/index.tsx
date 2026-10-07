import React, { useEffect, useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import { baseCates } from '@/components/AdvancedWrap/utils';
import { sourceLogoMap } from './config';
import { getDataSourcePluginList } from './services';
import SourceCards from './components/SourceCards';
import TableSource from './components/TableSource';
import Detail from './Detail';
import Form from './Form';
import './locale';

export { Form };

/** sourceLogoMap 里没有的类型，用 baseCates 上的 logo 路径渲染一张小图；都没有就返回 undefined（卡片上留空，与改前一致）。 */
function renderCateLogo(pluginType: string) {
  const logo = _.find(baseCates, { value: pluginType })?.logo;
  return logo ? <img src={logo} alt='' className='datasource-logo' height='45' /> : undefined;
}

export default function index() {
  const { t } = useTranslation('datasourceManage');
  const [pluginList, setPluginList] = useState<any[]>();
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState();

  useEffect(() => {
    getDataSourcePluginList().then((res) => {
      setPluginList(
        _.map(res, (item) => {
          return {
            name: item.plugin_type_name,
            category: item.category,
            type: item.plugin_type,
            // N33 批 B（B-2 十一种图标）：原来只有这一句 `sourceLogoMap[item.plugin_type]`，
            // 而 sourceLogoMap（./config.tsx:3-12）只有 8 个键，mysql / pgsql / doris / loki /
            // tdengine / iotdb / victorialogs 这七种取不到图、卡片上那块 45px 高的位置是空的
            // （components/SourceCards/index.tsx:27，n29/前端共同层.md §2.2）。
            // 照 fe v9.1.0 的取法（同文件 :49 `getCateByValue(item.plugin_type)?.logo`）兜底：
            // 先用羚牛自己的 sourceLogoMap（既有 8 种的样子一点不变），取不到再去 baseCates 拿 logo 路径
            // （@/components/AdvancedWrap/utils.ts，本批给 11 条都填上了 '/image/logos/<value>.png'）。
            // 羚牛这边没有导出的 getCateByValue（只有私有的 getCateByValueForNG），所以直接 _.find。
            // 这 11 张 png 都是方图，给 height='45' 配合卡片那块 45px 高的位置、宽度按比例自适应。
            logo: sourceLogoMap[item.plugin_type] ?? renderCateLogo(item.plugin_type),
          };
        }),
      );
    });
  }, []);

  return (
    <PageLayout title={t('title')}>
      <div className='srm'>
        <SourceCards sourceMap={pluginList} urlPrefix='help/source' />
        <div className='page-title'>{t('list_title')}</div>
        {pluginList && (
          <TableSource
            pluginList={pluginList}
            nameClick={(record) => {
              setDetailVisible(true);
              setDetailData(record);
            }}
          />
        )}
        {detailVisible && (
          <Detail
            visible={detailVisible}
            data={detailData}
            onClose={() => {
              setDetailVisible(false);
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}

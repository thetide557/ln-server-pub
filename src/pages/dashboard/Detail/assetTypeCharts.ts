/*
 * 工作台看板「网络设备专属指标集」
 * 看板已配置原生变量 asset_type（Query 型，选项动态来自 label_values(asset_type)，见看板 configs.var），
 * 主机类指标查询已直接引用 $asset_type 由平台完成变量过滤。
 * 网络设备族资产（采集插件 switch_legacy）没有主机指标（cpu_usage_active 等），
 * 当变量选中的资产类型全部属于网络设备族时，将「CPU利用率 到 流量错误包(出)」的 Top 图表
 * 在渲染层整体替换为 switch_legacy 专属指标集。
 *
 * 网络图表的自定义（标题/查询/单位等）持久化在看板 configs.assetTypeChartOverrides：
 * - override 保存「定义类」字段（name/type/targets/options），仅作用于网络设备视图
 * - 布局与 custom（TopN/聚合方式等）始终共享原始主机面板，主机视图不受影响
 */
import _ from 'lodash';

// 资产类型变量名（与看板 configs.var 中已配置的原生变量保持一致）
export const ASSET_TYPE_VAR_NAME = 'asset_type';

// 网络图表自定义在看板 configs 中的存储字段
export const ASSET_TYPE_OVERRIDES_KEY = 'assetTypeChartOverrides';

// 参与整体切换的面板名（按布局从上到下、从左到右的顺序承载网络图表集）
export const SWITCHABLE_PANEL_NAMES = [
  'CPU利用率',
  '内存利用率',
  '磁盘利用率',
  '磁盘读',
  '磁盘写',
  '接口流量(入)',
  '接口流量(出)',
  '节点丢包率',
  '流量错误包(入)',
  '流量错误包(出)',
];

// 网络设备族资产使用的采集插件
const NETWORK_PLUGINS = ['switch_legacy'];

export function isNetworkPlugin(plugin?: string): boolean {
  return !!plugin && NETWORK_PLUGINS.indexOf(plugin) > -1;
}

export interface IChartTemplate {
  name: string;
  expr: string;
  legend: string;
  standardOptions: Record<string, any>;
}

// 网络设备专属图表集（基于 switch_legacy 插件实际可用指标）
// 查询引用原生变量 $asset_type：变量切换（多选/all）由平台替换机制动态生效
export const NETWORK_CHART_TEMPLATES: IChartTemplate[] = [
  {
    name: 'CPU利用率',
    expr: 'max by (asset_name) (switch_legacy_cpu_util{asset_type=~"$asset_type"})',
    legend: '{{asset_name}}',
    standardOptions: { util: 'percent' },
  },
  {
    name: '内存利用率',
    expr: 'max by (asset_name) (switch_legacy_mem_util{asset_type=~"$asset_type"})',
    legend: '{{asset_name}}',
    standardOptions: { util: 'percent' },
  },
  {
    name: '接口带宽占用(入)',
    expr: 'max by (asset_name) (switch_legacy_if_in_speed_percent{asset_type=~"$asset_type"})',
    legend: '{{asset_name}}',
    standardOptions: { util: 'percent' },
  },
  {
    name: '接口带宽占用(出)',
    expr: 'max by (asset_name) (switch_legacy_if_out_speed_percent{asset_type=~"$asset_type"})',
    legend: '{{asset_name}}',
    standardOptions: { util: 'percent' },
  },
  {
    name: '接口CRC错误包',
    expr: 'max by (asset_name) (rate(switch_legacy_if_crc_errors_total{asset_type=~"$asset_type"}[5m]))',
    legend: '{{asset_name}}',
    standardOptions: { customized: true, customizedUnit: '个/s' },
  },
  {
    name: '运行时间',
    expr: 'max by (asset_name) (switch_legacy_uptime{asset_type=~"$asset_type"})/100/3600/24',
    legend: '{{asset_name}}',
    standardOptions: { customized: true, customizedUnit: '天' },
  },
];

export interface INetworkChartOverride {
  name?: string;
  type?: string;
  targets?: any[];
  options?: Record<string, any>;
}

/**
 * 渲染层生成网络设备版面板：
 * - 按布局序将前 NETWORK_CHART_TEMPLATES.length 个可切换面板替换为专属图表（标题/查询/单位），其余仅渲染层隐藏
 * - 已有用户自定义（configs.assetTypeChartOverrides）的面板，以自定义覆盖模板定义（name/type/targets/options）
 * - 布局与 custom（TopN/聚合方式）始终取原始面板，保证拖拽/TopN 调整在两套视图下行为一致
 * - 返回的是拷贝，不改动 panels 原对象与看板存储配置
 */
export function buildNetworkChartRender(panels: any[], overrides?: Record<string, INetworkChartOverride>): any[] {
  const switchable = _.orderBy(
    _.filter(panels, (p) => p.type !== 'row' && SWITCHABLE_PANEL_NAMES.indexOf(p.name) > -1),
    [(p) => p.layout?.y ?? 0, (p) => p.layout?.x ?? 0],
    ['asc', 'asc'],
  );
  if (_.isEmpty(switchable)) {
    return panels;
  }
  const overrideMap = new Map<string, any>();
  _.forEach(switchable, (panel, idx) => {
    if (idx < NETWORK_CHART_TEMPLATES.length) {
      const tpl = NETWORK_CHART_TEMPLATES[idx];
      const userOverride = overrides?.[panel.id];
      overrideMap.set(panel.id, {
        ...panel,
        name: userOverride?.name ?? tpl.name,
        type: userOverride?.type ?? panel.type,
        targets: userOverride?.targets ?? [
          {
            refId: 'A',
            expr: tpl.expr,
            legend: tpl.legend,
          },
        ],
        options: {
          ...panel.options,
          ...(userOverride?.options ?? {
            standardOptions: {
              ...panel.options?.standardOptions,
              ...tpl.standardOptions,
            },
          }),
        },
      });
    } else {
      // 网络设备图表集数量少于占位面板：多余面板仅渲染层隐藏
      overrideMap.set(panel.id, { ...panel, hidden: true });
    }
  });
  return _.map(panels, (p) => overrideMap.get(p.id) || p);
}

/**
 * 从编辑器保存值提取网络图表 override（仅定义类字段；custom/layout 由调用方写回原始面板）
 */
export function extractNetworkChartOverride(values: any): INetworkChartOverride {
  return {
    name: values?.name,
    type: values?.type,
    targets: values?.targets,
    options: values?.options,
  };
}

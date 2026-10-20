export const HW_SW_OPTIONS = [
  { label: '硬件', value: '硬件' },
  { label: '软件', value: '软件' },
];

export type ScopeValues = Record<string, string | number>;

export interface ScopeTreeNode {
  id: string;
  name: string;
  node_type: string;
  count?: number;
  group_level: number;
  scopeValues: ScopeValues;
  sub_groups: ScopeTreeNode[];
  type_list: any[];
  isScopeTreeNode: true;
}

const SCOPE_KEYS = ['region', 'hw_sw', 'tenant', 'asset_category', 'cpu_arch'];

export function getScopeSearchParams(filter: string, query: unknown): Record<string, string> {
  const value = query == null ? '' : String(query).trim();
  return value && filter ? { filter, query: value } : {};
}

function normalizeNode(node: any, parentId: string, index: number, level: number, parentValues: ScopeValues): ScopeTreeNode {
  const nodeType = node.node_type || node.nodeType || '';
  const value = String(node.key ?? node.value ?? node[nodeType] ?? node.label ?? node.name ?? '');
  // Backend keys identify values within a branch; the complete path identifies a UI node.
  const id = `${parentId}/${nodeType}:${encodeURIComponent(value)}:${index}`;
  const scopeValues = { ...parentValues };
  if (SCOPE_KEYS.includes(nodeType)) {
    scopeValues[nodeType] = value;
  }
  if (nodeType === 'hw_sw') scopeValues.hw_sw_set = '1';
  if (nodeType === 'tenant') scopeValues.tenant_set = '1';
  const children = node.children || node.sub_groups || node.nodes || [];
  return {
    id,
    name: String(node.label ?? node.name ?? node.title ?? value),
    node_type: nodeType,
    count: node.count,
    group_level: level,
    scopeValues,
    sub_groups: Array.isArray(children) ? children.map((child, childIndex) => normalizeNode(child, id, childIndex, level + 1, scopeValues)) : [],
    type_list: [],
    isScopeTreeNode: true,
  };
}

export function normalizeScopeTreeData(data: any): ScopeTreeNode[] {
  let nodes = data?.nodes || data?.list || data?.tree || (Array.isArray(data) ? data : []);
  nodes = Array.isArray(nodes) ? nodes : [];
  const suppliedRoot = nodes.length === 1 && nodes[0].node_type === 'root' ? nodes[0] : undefined;
  if (suppliedRoot) nodes = suppliedRoot.children || suppliedRoot.sub_groups || suppliedRoot.nodes || [];
  const rootId = 'scope-all-assets';
  return [{
    id: rootId,
    name: '陕西工业云',
    node_type: 'root',
    count: suppliedRoot?.count,
    group_level: 1,
    scopeValues: {},
    sub_groups: nodes.map((node, index) => normalizeNode(node, rootId, index, 2, {})),
    type_list: [],
    isScopeTreeNode: true,
  }];
}

export function collectScopeTreeExpandedIds(nodes: ScopeTreeNode[]): string[] {
  return nodes.reduce<string[]>((ids, node) => ids.concat(node.id, collectScopeTreeExpandedIds(node.sub_groups)), []);
}

export function findScopeTreeNode(nodes: ScopeTreeNode[], values: ScopeValues): ScopeTreeNode | undefined {
  for (const node of nodes) {
    const keys = Object.keys(values);
    if (keys.length === Object.keys(node.scopeValues).length && keys.every((key) => values[key] === node.scopeValues[key])) return node;
    const child = findScopeTreeNode(node.sub_groups, values);
    if (child) return child;
  }
}

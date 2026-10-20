const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const filename = path.join(__dirname, '../src/pages/xh/assetmgt/scopeTree.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
new Function('module', 'exports', compiled)(loaded, loaded.exports);
const { normalizeScopeTreeData, findScopeTreeNode, getScopeSearchParams } = loaded.exports;

const node = (node_type, key, children = []) => ({ node_type, key, label: key, children, count: 0 });
const branch = (region) => node('region', region, [
  node('hw_sw', '硬件', [node('tenant', '同名租户', [node('asset_category', 'server', [node('cpu_arch', 'x86_64')])])]),
  node('hw_sw', '__UNASSIGNED_HW_SW__', [node('tenant', '__UNASSIGNED__')]),
]);
const tree = normalizeScopeTreeData({ nodes: [branch('区域一'), branch('区域二')] });
const firstTenant = tree[0].sub_groups[0].sub_groups[0].sub_groups[0];
const secondTenant = tree[0].sub_groups[1].sub_groups[0].sub_groups[0];
assert.notEqual(firstTenant.id, secondTenant.id);
assert.deepEqual(firstTenant.scopeValues, {
  region: '区域一', hw_sw: '硬件', hw_sw_set: '1', tenant: '同名租户', tenant_set: '1',
});
const cpu = firstTenant.sub_groups[0].sub_groups[0];
assert.deepEqual(cpu.scopeValues, { ...firstTenant.scopeValues, asset_category: 'server', cpu_arch: 'x86_64' });
assert.equal(cpu.group_level, 6);
assert.equal(cpu.count, 0);
const unassigned = tree[0].sub_groups[0].sub_groups[1].sub_groups[0];
assert.deepEqual(unassigned.scopeValues, {
  region: '区域一', hw_sw: '__UNASSIGNED_HW_SW__', hw_sw_set: '1', tenant: '__UNASSIGNED__', tenant_set: '1',
});
const reordered = normalizeScopeTreeData({ nodes: [branch('区域二'), branch('区域一')] });
assert.deepEqual(findScopeTreeNode(reordered, cpu.scopeValues).scopeValues, cpu.scopeValues);
assert.equal(findScopeTreeNode(normalizeScopeTreeData({ nodes: [] }), cpu.scopeValues), undefined);
assert.equal(normalizeScopeTreeData({ nodes: [] })[0].sub_groups.length, 0);
assert.equal(normalizeScopeTreeData({ nodes: [node('root', '后端根名称', [branch('区域一')])] })[0].name, '陕西工业云');
assert.deepEqual(getScopeSearchParams('ip', ' 172.16 '), { filter: 'ip', query: '172.16' });
assert.deepEqual(getScopeSearchParams('status', 0), { filter: 'status', query: '0' });
assert.deepEqual(getScopeSearchParams('ip', ''), {});
assert.deepEqual(getScopeSearchParams('ip', null), {});

async function verifyServices() {
  const calls = [];
  const serviceSource = fs.readFileSync(path.join(__dirname, '../src/services/assets.ts'), 'utf8');
  const services = { exports: {} };
  const serviceCode = ts.transpileModule(serviceSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const fakeRequest = async (url, options) => {
    calls.push({ url, ...options });
    if (url.endsWith('/region/list')) {
      const { page, limit } = options.params;
      return { dat: { list: Array.from({ length: page === 1 ? limit : 1 }, (_, i) => ({ id: (page - 1) * limit + i + 1, name: `region-${page}-${i}`, status: 1 })), total: 101 } };
    }
    return { err: '' };
  };
  const mockRequire = (id) => {
    if (id === '@/utils/request') return { default: fakeRequest };
    if (id === '@/store/common') return { RequestMethod: { Get: 'GET', Post: 'POST', Put: 'PUT' } };
    throw new Error(`Unexpected service dependency: ${id}`);
  };
  new Function('module', 'exports', 'require', serviceCode)(services, services.exports, mockRequire);
  const api = services.exports;
  const regions = await api.getAssetRegionOptions();
  assert.equal(regions.length, 101);
  assert.deepEqual(calls.slice(0, 2).map(call => call.params.page), [1, 2]);
  await api.createAssetRegion({ name: '新区域', sort: 0, status: 1 });
  assert.deepEqual(calls.at(-1).data, { name: '新区域', sort: 0, status: 1, parent_id: 0, level: 1 });
  const payload = { region: '新区域', hw_sw: '硬件' };
  await api.insertXHAsset(payload);
  assert.equal(calls.at(-1).url, '/api/takin/xh/assets/');
  assert.equal(calls.at(-1).method, 'POST');
  assert.deepEqual(calls.at(-1).data, payload);
  await api.updateXHAsset(payload);
  assert.equal(calls.at(-1).method, 'PUT');
  await api.getAssetScopeTree({ filter: 'hw_sw', query: '软件' });
  assert.equal(calls.at(-1).url, '/api/takin/assets/scope-tree');
  assert.deepEqual(calls.at(-1).params, { filter: 'hw_sw', query: '软件' });
  await api.getAssetScopeTreeAssets(cpu.scopeValues);
  assert.equal(calls.at(-1).url, '/api/takin/assets/scope-tree/assets');
  assert.deepEqual(calls.at(-1).params, cpu.scopeValues);
}

verifyServices().then(() => console.log('Asset scope tree and service regression checks passed.')).catch(error => {
  console.error(error);
  process.exitCode = 1;
});

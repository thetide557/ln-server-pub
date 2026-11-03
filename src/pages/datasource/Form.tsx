import React, { useState, useEffect } from 'react';
import { message, Spin, Modal } from 'antd';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import { createGlobalState } from 'react-hooks-global-state';
import PageLayout from '@/components/pageLayout';
import BreadCrumb from '@/components/BreadCrumb';
import { getDataSourceDetailById, submitRequest } from './services';
import Form from './Datasources/Form';
import './index.less';
import { aesDecrypt, CIPHER_PREFIX } from '@/utils/aes';

// ---- N33 批 A-2：两个保存按钮（「测试连通性并保存」/「不测试连通性直接保存」）。
// 照 fe v9.1.0 src/pages/datasource/Form.tsx:19-23——按钮在 components/items/Footer.tsx 里，
// 它点下去时把 saveMode 写进这份全局状态，这里读出来决定提交体里的 force_save。
// 用全局状态而不是 props，是因为 Footer 被 12 张表单共用、每张表单的 onFinish 都走这里，
// 中间隔着 Datasources/Form.tsx 的类型分发，一层层传 props 要改 13 个文件。
// fe 还搬了一个 NextStepModal（保存后的接入向导），本批按 lead 拍板 L-02 不搬。
export const { useGlobalState } = createGlobalState<{
  saveMode: string;
}>({
  saveMode: 'saveAndTest',
});

// ---- N33 批 A-4 B-1：类型 → 表单里 settings 的键前缀。
// 绝大多数类型两者相同，只有 opensearch 的表单用 'os' 当前缀
//（src/plugins/opensearch/Datasource/Form.tsx:28 `const cate = 'os'`，
// 于是 header 填在 settings['os.headers']、集群填在 settings['os.cluster_name']）。
// 下面那两处 header 数组↔对象的转换原本按 `${plugin_type}.headers` = 'opensearch.headers' 找，
// 对不上就整段跳过：发出去的 header 还是数组，后端 datasource/opensearch/opensearch.go:41
// 要的是 map[string]string，json.Unmarshal 解不进去 → 只打一条 warning、不落库、也不写响应体，
// 而前端的 .then 照样弹「新增成功」（N29 结论正本 B-1 / 前端补充-opensearch.md N-os-02）。
// 上游 fe 同病（v9.1.0 与 ee48e701 的 src/pages/datasource/Form.tsx:59-64 都用 `${type}.headers`，
// 而它的 type 也是 plugin_type），所以这里是羚牛自修，上游没有可照抄的版本（lead 拍板 L-04）。
// victorialogs 核过：src/plugins/victorialogs/Datasource/Form.tsx:19 `const cate = DatasourceCateEnum.victorialogs`
// 就等于 plugin_type，不用进映射。
const settingsPrefixOf = (pluginType: string) => (pluginType === 'opensearch' ? 'os' : pluginType);

export default function FormCpt() {
  const { t } = useTranslation('datasourceManage');
  const history = useHistory();
  const params = useParams<{ action: string; type: string; id: string }>();
  const { action } = params;
  const id = action === 'edit' ? params.id : undefined;
  const [type, setType] = useState(action === 'add' ? params.type : '');
  const [data, setData] = useState<any>();
  const [formRenderKey, setFormRenderKey] = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [saveMode] = useGlobalState('saveMode');
  const onFinish = async (values: any) => {
    setSubmitLoading(true);
    // 转换 http.headers 格式
    if (type === 'influxdb') {
      _.set(
        values,
        ['settings', 'influxdb.headers'],
        _.transform(
          values?.settings?.['influxdb.headers'],
          (result, item) => {
            result[item.key] = item.value;
          },
          {},
        ),
      );
    } else {
      _.set(
        values,
        'http.headers',
        _.transform(
          values?.http?.headers,
          (result, item) => {
            result[item.key] = item.value;
          },
          {},
        ),
      );
    }
    // ---- 第六步 L1（多数据源）：opensearch / victorialogs 用新套 itemsNG/Headers，
    // header 填在 settings['<type>.headers'] 里、形状是 [{key,value}] 数组，提交前要转成对象。
    // 照 fe v9.1.0 src/pages/datasource/Form.tsx:59-71；这里另起一个 if（不动上面的 if/else），
    // 现有类型（prometheus / elasticsearch / jaeger / influxdb）没有这个字段，走不到这块。
    // N33 批 A-4 B-1：键前缀改走 settingsPrefixOf（opensearch 的表单前缀是 'os'，见文件顶部注释）
    const settingsPrefix = settingsPrefixOf(type);
    if (_.get(values, ['settings', `${settingsPrefix}.headers`])) {
      _.set(
        values,
        ['settings', `${settingsPrefix}.headers`],
        _.transform(
          values?.settings?.[`${settingsPrefix}.headers`],
          (result, item) => {
            result[item.key] = item.value;
          },
          {},
        ),
      );
    }
    return submitRequest({
      ...values,
      plugin_type: type,
      id: data?.id,
      is_enable: data ? undefined : true,
      // N33 批 A-2：原来写死的 is_test: true 去掉了——后端认的键是 force_save，
      // `git -C ln-server grep -n 'is_test\|IsTest' <分支> -- center/router/router_datasource.go models/datasource.go`
      // 零命中，is_test 一直是个没人读的字段；force_save 在 models/datasource.go:50 `json:"force_save"`。
      // 点「不测试连通性直接保存」时 force_save=true，后端 router_datasource.go:170 一次探活都不发。
      force_save: saveMode === 'save',
    })
      .then((dat: any) => {
        // N33 批 A-2：把后端回的 verification 显示出来。
        // 后端 center/router/router_datasource.go:303-305 返回 {id, verification}，
        // verification 形状见同文件 :309-313（state / stage / latency_ms / message）；
        // services.ts:52 的 submitRequest 回的是 res.data，而后端 Render（center/router/router.go:1566）
        // 包的是 {data, error}，所以这里的 dat 就是 {id, verification}。
        // 只有「存进去了、但探活或版本探测没过」才需要提示——探活失败后端是直接报错（请求会 reject，走不到这里），
        // 真正会落到这里的是 es 留空版本号而自动探测失败那条路（resolveElasticsearchVersion，不阻断保存，只记 message）。
        const verification = _.get(dat, 'verification');
        const verificationMessage = _.get(verification, 'message');
        if (_.get(verification, 'state') === 'force_saved_failed' || verificationMessage) {
          Modal.warning({
            title: t('verification_failed_title'),
            content: verificationMessage || t('verification_failed_content'),
            onOk: () => {
              history.push({
                pathname: '/help/source',
              });
            },
          });
          return;
        }
        message.success(action === 'add' ? t('common:success.add') : t('common:success.modify'));
        setTimeout(() => {
          history.push({
            pathname: '/help/source',
          });
        }, 2000);
      })
      .finally(() => {
        setSubmitLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    if (action === 'edit' && id !== undefined) {
      getDataSourceDetailById(id).then((res: any) => {
        _.set(res, 'http.headers', _.map(res?.http?.headers, (value, key) => ({ key, value })) || []);
        // ---- 第六步 L1（多数据源）：与提交时那块对称，把 settings['<type>.headers'] 从对象转回数组，
        // 否则编辑 opensearch / victorialogs 时 header 显示不出来。照 fe v9.1.0 同文件 :111-113。
        // N33 批 A-4 B-1：与提交侧对称，键前缀也走 settingsPrefixOf
        const resSettingsPrefix = settingsPrefixOf(res.plugin_type);
        if (_.get(res, ['settings', `${resSettingsPrefix}.headers`])) {
          _.set(
            res,
            ['settings', `${resSettingsPrefix}.headers`],
            _.map(_.get(res, ['settings', `${resSettingsPrefix}.headers`]), (value, key) => ({ key, value })) || [],
          );
        }
        const pwd = _.get(res, ['auth', 'basic_auth_password']);
        if (_.isString(pwd) && pwd && pwd.startsWith(CIPHER_PREFIX)) {
          _.set(res, ['auth', 'basic_auth_password'], aesDecrypt(pwd));
        }
        if (cancelled) return;
        setData(res);
        setType(res.plugin_type);
        setFormRenderKey((k) => k + 1);
      });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageLayout
      title={
        <div>
          {type}
          <BreadCrumb
            crumbs={[
              {
                text: t('title'),
                link: '/help/source',
              },
              {
                text: type!,
              },
            ]}
          />
        </div>
      }
    >
      <div className='srm'>
        {action === 'edit' && data === undefined ? (
          <Spin spinning={true} />
        ) : (
          <Form
            key={formRenderKey}
            // ---- 第六步 L1：九张新表单的卡片标题是 t(`${action}_title`)，需要这个 prop；
            // 照 fe v9.1.0 src/pages/datasource/Form.tsx:147。pub 原有的三张表单不读它，没有行为变化。
            action={action}
            data={data}
            onFinish={(values, clusterInstance) => {
              if (
                (type === 'prometheus' && !values.cluster_name) ||
                (type === 'elasticsearch' && !values.cluster_name) ||
                (type === 'influxdb' && !values.cluster_name) ||
                (type === 'ck' && !values.cluster_name) ||
                (type === 'aliyun-sls' && !values.cluster_name)
              ) {
                Modal.confirm({
                  title: t('form.cluster_confirm'),
                  okText: t('form.cluster_confirm_ok'),
                  cancelText: t('form.cluster_confirm_cancel'),
                  onOk: () => {
                    onFinish(values);
                  },
                  onCancel: () => {
                    if (clusterInstance && clusterInstance.focus) {
                      clusterInstance.focus();
                    }
                  },
                });
              } else {
                onFinish(values);
              }
            }}
            submitLoading={submitLoading}
          />
        )}
      </div>
    </PageLayout>
  );
}

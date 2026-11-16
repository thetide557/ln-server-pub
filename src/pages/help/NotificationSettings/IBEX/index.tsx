import React, { useEffect, useContext } from 'react';
import { Form, Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import PageLayout from '@/components/pageLayout';
import { CommonStateContext } from '@/App';
import { getNotifyConfig, putNotifyConfig } from '../services';

export default function index() {
  const [form] = Form.useForm();
  const { t } = useTranslation('notificationSettings');
  // N36 批 A（A-1）：保存按钮的门从「Admin 角色 **或** `/ibex-settings/save` 权限点」收成「只认 Admin 角色」。
  // 理由见后端第八份交接第二节 1：`/ibex-settings/save` 这个权限点在羚牛基线、公司 2.1、n9e 主线后端
  // 三边全仓零命中，角色权限种子 65 条里也没有，只有本文件自判——也就是说它永远是 false，留着也没人能满足；
  // 而这个按钮发的 `PUT /notify-config`（`../services`）在 u-sec 安全批之后已经收成仅 Admin 可写
  // （ln-server `center/router/router.go:843` 的 `rt.admin()`），同接口还管着 SMTP 与 ibex 回调的账号密码。
  // 判法与 N33 批 D 给另外 5 个通知配置页定的口径一致（只认 `profile.roles` 含 `Admin`，不夹权限点那一半）。
  // 这里是 UI 层的「别让人白点」，不是权限控制：真正拦请求的还是后端的 `rt.admin()`。
  // `permList` 原来只服务这一处判断（改前全文仅 :13 解构、:58 使用），一并从解构里去掉。
  const { profile } = useContext(CommonStateContext);

  useEffect(() => {
    getNotifyConfig('ibex_server').then((res) => {
      form.setFieldsValue({
        ckey: 'ibex_server',
        cval: res,
      });
    });
  }, []);

  return (
    <PageLayout title={t('ibex.title')}>
      <div>
        {/* <div style={{ position: 'relative' }}> */}
        <div
          style={{
            padding: 10,
          }}
        >
          <Form form={form} layout='vertical'>
            <Form.Item name='ckey' hidden>
              <div />
            </Form.Item>
            <Form.Item name='cval'>
              <CodeMirror
                height='400px'
                theme='light'
                basicSetup
                editable
                extensions={[
                  EditorView.lineWrapping,
                  EditorView.theme({
                    '&': {
                      backgroundColor: '#F6F6F6 !important',
                    },
                    '&.cm-editor.cm-focused': {
                      outline: 'unset',
                    },
                  }),
                ]}
              />
            </Form.Item>
            {/* <div style={{ position: 'absolute', bottom: 0, right: 0, margin: '16px' }}> */}
            {
              profile.roles?.includes("Admin") && <div>
                <Button
                  type='primary'
                  onClick={() => {
                    form.validateFields().then((values) => {
                      putNotifyConfig(values).then(() => {
                        message.success(t('common:success.save'));
                      });
                    });
                  }}
                >
                  {t('common:btn.save')}
                </Button>
              </div>
            }
          </Form>
        </div>
      </div>
    </PageLayout>
  );
}

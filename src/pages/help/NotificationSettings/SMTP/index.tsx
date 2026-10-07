import React, { useEffect } from 'react';
import { Form, Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { CommonStateContext } from '@/App';
import { getNotifyConfig, putNotifyConfig } from '../services';

export default function index() {
  const [form] = Form.useForm();
  const { t } = useTranslation('notificationSettings');
  // 第六步 N33-D (d)（拍板 L-07）：后端第七份交接 6.1 把 `PUT /notify-config` 改成**仅 Admin 可写**
  // （证据：ln-server `center/router/router.go:843` → `pages.PUT("/notify-config", rt.auth(), rt.admin(), rt.notifyConfigPut)`）。
  // 这里只把「会发那条 PUT 的入口」藏起来，**不是权限控制**——接口仍由后端 `rt.admin()` 拦，非 Admin 硬发请求照样 403。
  // 判法只认 Admin 角色、**不夹权限点那一半**（羚牛别处常写「Admin 角色 或 某个权限点」，这里不这么写），
  // 因为后端 6.1 只认角色、不认权限点。
  // SMTP 配置文本框对非 Admin 仍可看、可编辑（不加只读属性）：保存按钮没了就改不到后端。
  // 同目录 `IBEX/index.tsx:58` 也发这条 PUT，它早有自己的门（判法是「Admin 角色 或 /ibex-settings/save 权限点」），本批不动。
  const { profile } = React.useContext(CommonStateContext);
  const isAdmin = profile?.roles?.includes('Admin');

  useEffect(() => {
    getNotifyConfig('smtp_config').then((res) => {
      form.setFieldsValue({
        ckey: 'smtp_config',
        cval: res,
      });
    });
  }, []);

  return (
    <div>
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
        {/* 第六步 N33-D (d)：唯一会发 `PUT /notify-config` 的控件就是这个保存按钮，非 Admin 不渲染。 */}
        {isAdmin ? (
          <div>
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
        ) : null}
      </Form>
    </div>
  );
}

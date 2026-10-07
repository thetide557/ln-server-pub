import React, { useEffect } from 'react';
import _ from 'lodash';
import { Form, Input, InputNumber, Switch, Radio, Space, Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { CommonStateContext } from '@/App';
import { getNotifyScript, putNotifyScript } from './services';

export default function Script() {
  const [form] = Form.useForm();
  const { t } = useTranslation('notificationSettings');
  // 第六步 N33-D (d)（拍板 L-07）：后端第七份交接 6.1 把 `PUT /notify-script` 改成**仅 Admin 可写**
  // （证据：ln-server `center/router/router.go:834` → `pages.PUT("/notify-script", rt.auth(), rt.admin(), rt.notifyScriptPut)`）。
  // 这里只把「会发那条 PUT 的入口」藏起来，**不是权限控制**——接口仍由后端 `rt.admin()` 拦，非 Admin 硬发请求照样 403。
  // 判法只认 Admin 角色、**不夹权限点那一半**（羚牛别处常写「Admin 角色 或 某个权限点」，这里不这么写），
  // 因为后端 6.1 只认角色、不认权限点。
  // 表单本体（启停开关、超时、脚本内容）对非 Admin 仍可看、可填（不加只读属性）：保存按钮没了就改不到后端。
  const { profile } = React.useContext(CommonStateContext);
  const isAdmin = profile?.roles?.includes('Admin');

  useEffect(() => {
    getNotifyScript().then((res) => {
      form.setFieldsValue(res);
    });
  }, []);

  return (
    <div>
      <Form form={form} layout='vertical'>
        <div style={{ marginBottom: 10 }}>
          <Space align='baseline'>
            {t('script.enable')}
            <Form.Item name='enable' noStyle valuePropName='checked'>
              <Switch />
            </Form.Item>
          </Space>
        </div>
        <Form.Item label={t('script.timeout')} name='timeout'>
          <InputNumber style={{ width: '100%' }} defaultValue={5} />
        </Form.Item>
        <Form.Item name='type'>
          <Radio.Group optionType='button'>
            <Radio value={0}>{t('script.type.0')}</Radio>
            <Radio value={1}>{t('script.type.1')}</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item shouldUpdate noStyle>
          {() => {
            const type = form.getFieldValue('type');
            if (type === 0) {
              return (
                <Form.Item label={t('script.content')} name='content'>
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
              );
            }
            if (type === 1) {
              return (
                <>
                  <Form.Item label={t('script.path')} name='content'>
                    <Input />
                  </Form.Item>
                </>
              );
            }
          }}
        </Form.Item>
        {/* 第六步 N33-D (d)：唯一会发 `PUT /notify-script` 的控件就是这个保存按钮，非 Admin 不渲染。 */}
        {isAdmin ? (
          <div>
            <Button
              type='primary'
              onClick={() => {
                form.validateFields().then((values) => {
                  putNotifyScript(values).then(() => {
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

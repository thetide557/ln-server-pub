import React from 'react';
import { Button, Space } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useGlobalState } from '../../Form';

interface IProps {
  id?: number | string;
  submitLoading: boolean;
}

export default function Footer(props: IProps) {
  const { t } = useTranslation('datasourceManage');
  const history = useHistory();
  const [, setSaveMode] = useGlobalState('saveMode');

  return (
    // 外壳保持羚牛自己的 settings-source-form-footer（fe v9.1.0 这里包了 Affix + Card，
    // 换过来会把 12 张表单的底部样式全改掉，按 lead 拍板 L-02「保持羚牛样子、只加按钮」）。
    <div className='settings-source-form-footer'>
      <Space>
        {props.id !== undefined ? (
          <Button
            onClick={() => {
              history.go(-1);
            }}
          >
            {t('common:btn.back')}
          </Button>
        ) : null}
        {/* N33 批 A-2：两个按钮都是 htmlType='submit'，走同一个 onFinish；
            差别只在点下去时把 saveMode 写成什么，外壳 ../../Form.tsx 读它决定 force_save。
            照 fe v9.1.0 src/pages/datasource/components/items/Footer.tsx:34-52。
            两个按钮都在 <Form> 里面（12 张表单逐个核过），submit 才有效。 */}
        <Button
          type='primary'
          htmlType='submit'
          loading={props.submitLoading}
          onClick={() => {
            setSaveMode('saveAndTest');
          }}
        >
          {t('test_and_save_btn')}
        </Button>
        <Button
          htmlType='submit'
          loading={props.submitLoading}
          onClick={() => {
            setSaveMode('save');
          }}
        >
          {t('save_btn')}
        </Button>
      </Space>
    </div>
  );
}

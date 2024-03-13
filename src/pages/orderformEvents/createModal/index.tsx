/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React, { useRef, useState } from 'react';
import { Modal, message, Button, Input, Form, Space } from 'antd';
import { solveEvents, closeEvents } from '../services';
import { CommonProps } from '@/store/manageInterface';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';

const { TextArea } = Input;

const CreateModal: React.FC<CommonProps> = (props: CommonProps) => {
  const { t } = useTranslation('user');
  const { visible, action, onClose, id, isRecovered, width } = props;
  const params = { remark: '' };
  const [form] = Form.useForm()
  const history = useHistory();

  //处理操作（确认、取消）
  const onOk = () => {
    params.remark = form.getFieldValue('remark');
    if (action === 'solve') {
      solveEvents(id, params).then((res) => {
        console.log(res);
        message.success(t('common:success.modify'));
        onClose(true);
        history.goBack();
      });
    }
    if (action === 'close') {
      closeEvents(id, params).then((_) => {
        message.success(t('common:success.modify'));
        onClose(true);
        history.goBack();
      });
    }
  };

  const modal = (
    <div>
      <div className='modal-backdrop fade'></div>
      <div className='modal fade'>
        <div className='modal-dialog '>
          <div className='modal-content'>
            <div className='modal-header'>
              <Form form={form} onFinish={onOk}>
                <Form.Item name='remark' rules={[{ required: true }]}>
                  <TextArea rows={3} cols={68} required></TextArea>
                </Form.Item>
                <Space align='end'>
                  <Button htmlType='submit' type='primary'>
                    {t('common:btn.ok')}
                  </Button>
                  <Button
                    onClick={() => {
                      onClose(true);
                    }}
                  >
                    {t('取消')}
                  </Button>
                </Space>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Modal title={'填写处理意见'} visible={visible} width={width ? width : 700} onCancel={onClose} destroyOnClose={true} footer={null}>
      {modal}
    </Modal>
  );
};

export default CreateModal;

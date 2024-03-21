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
import { Modal, message, Button, Form, Input, Space } from 'antd';
import {} from '@/services/manage';
import { ModalProps, User, Team, UserType, ActionType, Contacts, ApplyProps } from '@/store/manageInterface';
import { useTranslation } from 'react-i18next';
import form from '../form';
import { useForm } from 'antd/lib/form/Form';

const CreateModal: React.FC<ApplyProps> = (props: ApplyProps) => {
  const { t } = useTranslation('user');
  const { visible,width , onClose, action, keyId } = props;
  const userRef = useRef(null as any);
  const [form] = useForm()
  const onOk = async (val?: string) => {

    
  };

  const actionLabel = () => {
      return t('填写审批意见');
  };

  return (
    <Modal
      title={actionLabel()}
      visible={visible}
      width={width ? width : 700}
      onCancel={onClose}
      destroyOnClose={true}
      footer={null}
    >
      <div>
      <div className="modal-backdrop fade"></div>
      <div className="modal fade">
        <div className="modal-dialog ">
          <div className="modal-content">
            <div className="modal-header">
              <Form form={form} onFinish={onOk}>
                <Form.Item name="remark" rules={[{ required: true }]}>
                  <Input.TextArea rows={3} cols={68} required></Input.TextArea>
                </Form.Item>
                <Space align='end'>
                  <Button htmlType="submit" type='primary' >
                    {t('common:btn.ok')}
                  </Button>
                  <Button onClick={() => { onClose(true) }}>
                    {t('取消')}
                  </Button>
                </Space>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Modal>
  );
};

export default CreateModal;

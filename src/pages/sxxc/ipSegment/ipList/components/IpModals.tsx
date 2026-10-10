/**
 * IP 明细页操作弹窗集合
 * 对应原型：IP地址段管理-IP 页面的行操作弹窗
 * 查看 / 回收提醒 / 预留IP / 分配IP / 变更IP
 */
import React, { useEffect } from 'react';
import { AutoComplete, Descriptions, Form, Input, Modal } from 'antd';
import { IpItem, ipAllocStatusMap, ipOnlineStatusMap, ipUseStatusMap } from '../../types';

// ==================== 查看IP ====================
export function IpViewModal(props: { visible: boolean; ip?: IpItem; onClose: () => void }) {
  const { visible, ip } = props;
  if (!ip) return null;
  const alloc = ipAllocStatusMap[ip.allocStatus];
  const use = ipUseStatusMap[ip.useStatus];
  const online = ipOnlineStatusMap[ip.onlineStatus];
  return (
    <Modal title='查看IP' visible={visible} footer={null} onCancel={props.onClose} width={620}>
      <div className='ip-view-descriptions'>
        <Descriptions bordered size='small' column={2}>
          <Descriptions.Item label='IP地址'>{ip.ip}</Descriptions.Item>
          <Descriptions.Item label='地址段'>{ip.segment}</Descriptions.Item>
          <Descriptions.Item label='归属'>{ip.groupName}</Descriptions.Item>
          <Descriptions.Item label='IP分配状态'>{alloc?.text}</Descriptions.Item>
          <Descriptions.Item label='IP使用状态'>{use?.text}</Descriptions.Item>
          <Descriptions.Item label='资产在线状态'>{online?.text}</Descriptions.Item>
          <Descriptions.Item label='资产名称'>{ip.assetName || '-'}</Descriptions.Item>
          <Descriptions.Item label='MAC地址'>{ip.mac || '-'}</Descriptions.Item>
          <Descriptions.Item label='接入端口'>{ip.port || '-'}</Descriptions.Item>
          <Descriptions.Item label='临时IP'>{ip.isTempIp === -1 ? '-' : ip.isTempIp === 1 ? '是' : '否'}</Descriptions.Item>
          <Descriptions.Item label='网关'>{ip.isGateway === -1 ? '-' : ip.isGateway === 1 ? '是' : '否'}</Descriptions.Item>
          <Descriptions.Item label='最后在线时间'>{ip.lastOnlineTime || '-'}</Descriptions.Item>
          <Descriptions.Item label='闲置天数'>{ip.idleDays === undefined ? '-' : ip.idleDays}</Descriptions.Item>
          <Descriptions.Item label='备注' span={2}>
            {ip.note || '-'}
          </Descriptions.Item>
        </Descriptions>
      </div>
    </Modal>
  );
}

// ==================== 回收IP（单个） ====================
export function IpRecycleModal(props: {
  visible: boolean;
  ip?: IpItem;
  onClose: () => void;
  onOk: (values: { reason: string }) => Promise<void>;
}) {
  const { visible, ip } = props;
  const [form] = Form.useForm();
  useEffect(() => {
    if (visible) form.resetFields();
  }, [visible]);
  if (!ip) return null;
  return (
    <Modal
      title='回收提醒'
      visible={visible}
      onCancel={props.onClose}
      onOk={async () => {
        const values = await form.validateFields();
        await props.onOk(values);
      }}
      destroyOnClose
    >
      <Form form={form} labelCol={{ flex: '90px' }}>
        <Form.Item label='IP地址'>{ip.ip}</Form.Item>
        <Form.Item
          label='回收原因'
          name='reason'
          rules={[{ required: true, message: '请输入回收原因' }]}
        >
          <Input.TextArea placeholder='请输入回收原因' maxLength={200} autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
        <div className='recycle-ip-tip'>
          回收后该地址状态为未分配，资产「{ip.assetName || '-'}」的IP绑定将同步解绑并不再使用。
        </div>
      </Form>
    </Modal>
  );
}

// ==================== 预留IP ====================
export function IpReserveModal(props: {
  visible: boolean;
  ip?: IpItem;
  onClose: () => void;
  onOk: (values: { owner: string; note?: string }) => Promise<void>;
}) {
  const { visible, ip } = props;
  const [form] = Form.useForm();
  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({ owner: '' });
    }
  }, [visible]);
  if (!ip) return null;
  return (
    <Modal
      title='预留IP'
      visible={visible}
      onCancel={props.onClose}
      onOk={async () => {
        const values = await form.validateFields();
        await props.onOk(values);
      }}
      destroyOnClose
    >
      <Form form={form} labelCol={{ flex: '90px' }}>
        <Form.Item label='归属'>{ip.groupName}</Form.Item>
        <Form.Item label='地址段'>{ip.segment}</Form.Item>
        <Form.Item label='IP地址'>{ip.ip}</Form.Item>
        <Form.Item label='责任人' name='owner' rules={[{ required: true, message: '请输入责任人' }]}>
          <Input placeholder='请输入责任人' maxLength={20} />
        </Form.Item>
        <Form.Item label='备注' name='note'>
          <Input.TextArea placeholder='请输入备注' maxLength={200} autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ==================== 分配IP ====================
/** mock 资产选项 */
const mockAssets = ['门户服务器-01', '应用服务器-02', '数据库服务器-03', '堡垒机-01'];

export function IpAssignModal(props: {
  visible: boolean;
  ip?: IpItem;
  onClose: () => void;
  onOk: (values: { assetName: string; mac?: string; owner?: string; note?: string }) => Promise<void>;
}) {
  const { visible, ip } = props;
  const [form] = Form.useForm();
  useEffect(() => {
    if (visible) form.resetFields();
  }, [visible]);
  if (!ip) return null;
  return (
    <Modal
      title='分配IP'
      visible={visible}
      onCancel={props.onClose}
      onOk={async () => {
        const values = await form.validateFields();
        await props.onOk(values);
      }}
      destroyOnClose
    >
      <Form form={form} labelCol={{ flex: '90px' }}>
        <Form.Item label='IP地址'>{ip.ip}</Form.Item>
        <Form.Item label='归属'>{ip.groupName}</Form.Item>
        <Form.Item label='资产名称' name='assetName' rules={[{ required: true, message: '请选择或输入资产名称' }]}>
          <AutoComplete options={mockAssets.map((item) => ({ value: item }))} style={{ width: '100%' }} placeholder='请选择或输入资产名称' filterOption={(input, option) => (option?.value as string).indexOf(input) > -1} />
        </Form.Item>
        <Form.Item label='MAC地址' name='mac'>
          <Input placeholder='请输入MAC地址' maxLength={30} />
        </Form.Item>
        <Form.Item label='责任人' name='owner' rules={[{ required: true, message: '请输入责任人' }]}>
          <Input placeholder='请输入责任人' maxLength={20} />
        </Form.Item>
        <Form.Item label='备注' name='note'>
          <Input.TextArea placeholder='请输入备注' maxLength={200} autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ==================== 变更IP（换绑资产） ====================
export function IpChangeModal(props: {
  visible: boolean;
  ip?: IpItem;
  onClose: () => void;
  onOk: (values: { assetName: string; mac?: string; note?: string }) => Promise<void>;
}) {
  const { visible, ip } = props;
  const [form] = Form.useForm();
  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({ assetName: ip?.assetName, mac: ip?.mac, note: ip?.note });
    }
  }, [visible, ip]);
  if (!ip) return null;
  return (
    <Modal
      title='变更IP'
      visible={visible}
      onCancel={props.onClose}
      onOk={async () => {
        const values = await form.validateFields();
        await props.onOk(values);
      }}
      destroyOnClose
    >
      <Form form={form} labelCol={{ flex: '90px' }}>
        <Form.Item label='IP地址'>{ip.ip}</Form.Item>
        <Form.Item label='当前资产'>{ip.assetName || '-'}</Form.Item>
        <Form.Item label='资产名称' name='assetName' rules={[{ required: true, message: '请选择或输入资产名称' }]}>
          <AutoComplete options={mockAssets.map((item) => ({ value: item }))} style={{ width: '100%' }} placeholder='请选择或输入资产名称' filterOption={(input, option) => (option?.value as string).indexOf(input) > -1} />
        </Form.Item>
        <Form.Item label='MAC地址' name='mac'>
          <Input placeholder='请输入MAC地址' maxLength={30} />
        </Form.Item>
        <Form.Item label='备注' name='note'>
          <Input.TextArea placeholder='请输入备注' maxLength={200} autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

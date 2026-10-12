/**
 * IP 明细页操作弹窗集合
 * 对应原型：IP地址段管理-IP 页面的行操作弹窗
 * 查看 / 回收提醒 / 预留IP / 分配IP / 变更IP
 */
import React, { useEffect, useState } from 'react';
import { AutoComplete, Button, Col, Form, Input, InputNumber, message, Modal, Radio, Row, Select, Switch, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { IpItem, ipAllocStatusMap, ipOnlineStatusMap, ipUseStatusMap } from '../../types';
import { downloadIpImportTemplate, exportIpsToFile, IpExportType } from '../../ipExport';

// ==================== 查看IP ====================
// 查看仍用表单形态展示，但所有控件禁用（只读），与预留/分配等弹窗风格一致
export function IpViewModal(props: { visible: boolean; ip?: IpItem; onClose: () => void }) {
  const { visible, ip } = props;
  if (!ip) return null;
  const alloc = ipAllocStatusMap[ip.allocStatus];
  const use = ipUseStatusMap[ip.useStatus];
  const online = ipOnlineStatusMap[ip.onlineStatus];
  return (
    <Modal title='查看IP' visible={visible} footer={null} onCancel={props.onClose} width={620}>
      <Form labelCol={{ flex: '90px' }} disabled className='ip-view-form'>
        <Form.Item label='IP地址'>
          <Input value={ip.ip} />
        </Form.Item>
        <Form.Item label='地址段'>
          <Input value={ip.segment} />
        </Form.Item>
        <Form.Item label='归属'>
          <Input value={ip.groupName} />
        </Form.Item>
        <Form.Item label='IP分配状态'>
          <Input value={alloc?.text} />
        </Form.Item>
        <Form.Item label='IP使用状态'>
          <Input value={use?.text} />
        </Form.Item>
        <Form.Item label='资产在线状态'>
          <Input value={online?.text} />
        </Form.Item>
        <Form.Item label='资产名称'>
          <Input value={ip.assetName || '-'} />
        </Form.Item>
        <Form.Item label='MAC地址'>
          <Input value={ip.mac || '-'} />
        </Form.Item>
        <Form.Item label='接入端口'>
          <Input value={ip.port || '-'} />
        </Form.Item>
        <Form.Item label='临时IP'>
          <Input value={ip.isTempIp === -1 ? '-' : ip.isTempIp === 1 ? '是' : '否'} />
        </Form.Item>
        <Form.Item label='网关'>
          <Input value={ip.isGateway === -1 ? '-' : ip.isGateway === 1 ? '是' : '否'} />
        </Form.Item>
        <Form.Item label='最后在线时间'>
          <Input value={ip.lastOnlineTime || '-'} />
        </Form.Item>
        <Form.Item label='闲置天数'>
          <Input value={ip.idleDays === undefined ? '-' : String(ip.idleDays)} />
        </Form.Item>
        <Form.Item label='备注'>
          <Input.TextArea value={ip.note || '-'} autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
      </Form>
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
/** 预留/使用时长单位（原型：天、月） */
const DURATION_UNITS = ['天', '月'];

export function IpReserveModal(props: {
  visible: boolean;
  ip?: IpItem;
  onClose: () => void;
  onOk: (values: { reason: string; duration?: number; durationUnit?: string; gateway?: boolean; tempIp?: boolean; note?: string }) => Promise<void>;
}) {
  const { visible, ip } = props;
  const [form] = Form.useForm();
  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({ durationUnit: '天', gateway: false, tempIp: false });
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
      width={520}
    >
      <Form form={form} labelCol={{ flex: '90px' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label='归属' style={{ marginBottom: 8 }}>
              <span style={{ lineHeight: '32px' }}>{ip.groupName}</span>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label='责任人' style={{ marginBottom: 8 }}>
              <span style={{ lineHeight: '32px' }}>{ip.owner || '-'}</span>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label='地址段' style={{ marginBottom: 8 }}>
              <span style={{ lineHeight: '32px' }}>{ip.segment}</span>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label='IP地址' style={{ marginBottom: 8 }}>
              <span style={{ lineHeight: '32px' }}>{ip.ip}</span>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label='设为网关' name='gateway' valuePropName='checked' style={{ marginBottom: 8 }}>
              <Switch size='small' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label='设为临时IP' name='tempIp' valuePropName='checked' style={{ marginBottom: 8 }}>
              <Switch size='small' />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label='预留说明' name='reason' rules={[{ required: true, message: '请输入预留说明' }]}>
          <Input.TextArea placeholder='请输入备注' maxLength={200} autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
        <Form.Item label='预留时长' required>
          <div style={{ display: 'flex', columnGap: 8 }}>
            <Form.Item name='duration' noStyle rules={[{ required: true, message: '请输入预留时长' }]}>
              <InputNumber min={1} max={36500} placeholder='请输入' style={{ width: '90%' }} />
            </Form.Item>
            <Form.Item name='durationUnit' noStyle>
              <Select style={{ width: 80 }} options={_.map(DURATION_UNITS, (u) => ({ value: u, label: u }))} />
            </Form.Item>
          </div>
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
  onOk: (values: {
    assetName: string;
    mac?: string;
    port?: string;
    gateway?: boolean;
    tempIp?: boolean;
    duration?: number;
    durationUnit?: string;
    note?: string;
  }) => Promise<void>;
}) {
  const { visible, ip } = props;
  const [form] = Form.useForm();
  useEffect(() => {
    if (visible) {
      form.resetFields();
      // 未分配但已使用（扫描发现资产在用）的 IP，分配时自动带出已有资产信息
      form.setFieldsValue({
        assetName: ip?.assetName,
        mac: ip?.mac,
        port: ip?.port && ip.port !== '-' ? ip.port : undefined,
        durationUnit: '天',
        gateway: false,
        tempIp: false,
        note: ip?.note,
      });
    }
  }, [visible, ip]);
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
      width={520}
    >
      <Form form={form} labelCol={{ flex: '90px' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label='归属' style={{ marginBottom: 8 }}>
              <span style={{ lineHeight: '32px' }}>{ip.groupName}</span>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label='责任人' style={{ marginBottom: 8 }}>
              <span style={{ lineHeight: '32px' }}>{ip.owner || '-'}</span>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label='地址段' style={{ marginBottom: 8 }}>
              <span style={{ lineHeight: '32px' }}>{ip.segment}</span>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label='IP地址' style={{ marginBottom: 8 }}>
              <span style={{ lineHeight: '32px' }}>{ip.ip}</span>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label='设为网关' name='gateway' valuePropName='checked' style={{ marginBottom: 8 }}>
              <Switch size='small' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label='设为临时IP' name='tempIp' valuePropName='checked' style={{ marginBottom: 8 }}>
              <Switch size='small' />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label='资产名称' name='assetName' rules={[{ required: true, message: '请输入资产名称' }]}>
          <Input placeholder='请输入' maxLength={50} />
        </Form.Item>
        <Form.Item label='MAC地址' name='mac' rules={[{ required: true, message: '请输入MAC地址' }]}>
          <Input placeholder='请输入' maxLength={30} />
        </Form.Item>
        <Form.Item label='端口' name='port'>
          <Input placeholder='请输入' maxLength={20} />
        </Form.Item>
        <Form.Item label='使用时长' required>
          <div style={{ display: 'flex', columnGap: 8 }}>
            <Form.Item name='duration' noStyle rules={[{ required: true, message: '请输入使用时长' }]}>
              <InputNumber min={1} max={36500} placeholder='请输入' style={{ width: '90%' }} />
            </Form.Item>
            <Form.Item name='durationUnit' noStyle>
              <Select style={{ width: 80 }} options={_.map(DURATION_UNITS, (u) => ({ value: u, label: u }))} />
            </Form.Item>
          </div>
        </Form.Item>
        <Form.Item label='备注' name='note'>
          <Input.TextArea placeholder='请输入备注' maxLength={200} autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ==================== 批量导入（参考资产清单「导入设备」弹窗） ====================
export function IpImportModal(props: { visible: boolean; onClose: () => void; onImported: () => void }) {
  const { visible } = props;
  const [fileName, setFileName] = useState<string>();
  const [fileList, setFileList] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      setFileName(undefined);
      setFileList([]);
    }
  }, [visible]);

  const beforeUpload = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
      setFileName(file.name);
      setFileList([file]);
    } else {
      message.error('文件格式错误，系统支持excel格式xls、xlsx、csv');
    }
    return false;
  };

  const handleOk = () => {
    if (!fileList.length) {
      message.error('请选择要导入的文件');
      return;
    }
    // mock 阶段不解析文件，后端导入接口就绪后替换为 FormData 上传
    message.success('批量导入成功');
    props.onImported();
  };

  return (
    <Modal title='数据导入' visible={visible} onOk={handleOk} onCancel={props.onClose} destroyOnClose>
      <Form labelCol={{ flex: '90px' }}>
        <Form.Item label='选择文件' required>
          <div style={{ display: 'inline-flex', alignItems: 'center', columnGap: 8 }}>
            <Input value={fileName} style={{ width: 150 }} />
            <Upload showUploadList={false} fileList={fileList} beforeUpload={beforeUpload}>
              <Button type='primary' icon={<UploadOutlined />}>
                浏览
              </Button>
            </Upload>
            <Button type='link' style={{ padding: 0, color: '#40A2EC' }} onClick={() => downloadIpImportTemplate()}>
              下载模板
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ==================== 批量导出（参考操作日志「批量导出」弹窗） ====================
export function IpExportModal(props: { visible: boolean; records: IpItem[]; onClose: () => void }) {
  const { visible, records, onClose } = props;
  const [fileType, setFileType] = useState<IpExportType>(1);

  useEffect(() => {
    if (visible) setFileType(1);
  }, [visible]);

  return (
    <Modal
      title='IP信息导出'
      visible={visible}
      onOk={() => {
        exportIpsToFile(records, fileType);
        onClose();
      }}
      onCancel={onClose}
      destroyOnClose
    >
      <Radio.Group
        value={fileType}
        onChange={(e) => setFileType(e.target.value)}
        style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
      >
        <Radio value={1}>Excel</Radio>
        <Radio value={2}>XML</Radio>
        <Radio value={3}>TXT</Radio>
      </Radio.Group>
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

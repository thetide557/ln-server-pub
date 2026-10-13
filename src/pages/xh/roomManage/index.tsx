import React, { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Input,
  Space,
  Table,
  Modal,
  Form,
  Upload,
  InputNumber,
  Collapse,
  Row,
  Col,
  message,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  MinusOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import PageLayout from '@/components/pageLayout';
import { useAntdResizableHeader } from 'use-antd-resizable-header';
import {
  getRoomList,
  addRoom,
  updateRoom,
  deleteRoom,
  getRoomDetail,
  uploadRoomPicture,
  importRoomExcel,
  downloadRoomTemplate,
} from '@/services/assets/dc-room';
import moment from 'moment';

/** 机房对象 —— 字段对齐接口文档 DcRoom */
interface DcRoom {
  id: number | string;
  room_code: string;
  room_name: string;
  idc_name?: string;
  building_name?: string;
  floor_name?: string;
  owner_name?: string;
  image_url?: string;
  voltage_v?: number;
  current_a?: number;
  max_rows?: number;
  max_cols?: number;
  load_capacity_kg_per_sqm?: number;
  rated_power_kw?: number;
  area_sqm?: number;
  cabinet_capacity?: number;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

// 主表单布局（全宽字段，label 短）
const formItemLayout = { labelCol: { span: 5 }, wrapperCol: { span: 19 } };
// 扩展区布局（两列并排，label 较长，用 12/12 各占一半 Col 的空间）
const expandFormItemLayout = { labelCol: { span: 12 }, wrapperCol: { span: 12 } };

const RoomManage: React.FC = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState<DcRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState({ room_name: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editId, setEditId] = useState<number | string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);
  const [importing, setImporting] = useState(false);

  // 加载列表（useCallback 避免每次渲染生成新引用）
  const loadData = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize, params = query) => {
      setLoading(true);
      try {
        const res = await getRoomList({ p: page, limit: pageSize, query: params.room_name });
        if (res.err) { message.error(res.err); return; }
        const list = res?.dat?.list || [];
        const total = res?.dat?.total || 0;
        setData(Array.isArray(list) ? list : []);
        setPagination({ current: page, pageSize, total });
      } catch (error) {
        console.error('加载机房列表失败:', error);
        message.error('加载机房列表失败');
      } finally {
        setLoading(false);
      }
    },
    [pagination.current, pagination.pageSize, query],
  );

  // 搜索
  const handleSearch = () => {
    loadData(1, pagination.pageSize, query);
  };

  // 重置
  const handleReset = () => {
    const q = { room_name: '' };
    setQuery(q);
    loadData(1, pagination.pageSize, q);
  };

  // 打开新增弹窗
  const handleAdd = () => {
    setModalMode('add');
    setEditId(null);
    setFileList([]);
    form.resetFields();
    form.setFieldsValue({ duty_persons: [''] });
    setModalVisible(true);
  };

  // 打开编辑/查看弹窗
  // 辅助：后端 image_url 是存储相对路径（如 etc/picture/xxx.png），
  // 实际访问需去掉 etc/ 前缀并加代理前缀：/api/takin/picture/xxx.png
  const getFullImgUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const normalized = url.replace(/^etc\//, '');
    if (normalized.startsWith('/')) return normalized;
    return `/api/takin/${normalized}`;
  };

  const handleEdit = async (record: DcRoom, mode: 'edit' | 'view') => {
    setModalMode(mode);
    setEditId(record.id);
    try {
      const res = await getRoomDetail(record.id);
      if (res.err) { message.error(res.err); return; }
      const detail = res?.dat || record;
      form.resetFields();
      form.setFieldsValue({
        room_name: detail.room_name,
        room_code: detail.room_code,
        idc_name: detail.idc_name,
        building_name: detail.building_name,
        floor_name: detail.floor_name,
        duty_persons: detail.owner_name ? detail.owner_name.split(',') : [''],
        voltage_v: detail.voltage_v,
        current_a: detail.current_a,
        max_rows: detail.max_rows,
        max_cols: detail.max_cols,
        load_capacity_kg_per_sqm: detail.load_capacity_kg_per_sqm,
        rated_power_kw: detail.rated_power_kw,
        area_sqm: detail.area_sqm,
        cabinet_capacity: detail.cabinet_capacity,
        image_url: detail.image_url,
      });
      if (detail.image_url) {
        setFileList([
          {
            uid: '-1',
            name: '机房图片',
            status: 'done',
            url: getFullImgUrl(detail.image_url),
          },
        ]);
      } else {
        setFileList([]);
      }
      setModalVisible(true);
    } catch (error) {
      console.error('获取机房详情失败:', error);
      message.error('获取机房详情失败');
    }
  };

  // 图片上传前校验 —— 走后端上传接口
  const handleBeforeUpload = async (file: File) => {
    setUploading(true);
    try {
      // 校验格式和大小
      const allowedTypes = ['image/bmp', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        message.error('仅支持 bmp/jpeg/jpg/png 格式');
        return Upload.LIST_IGNORE;
      }
      if (file.size / 1024 / 1024 > 5) {
        message.error('图片大小不能超过 5MB');
        return Upload.LIST_IGNORE;
      }
      const res = await uploadRoomPicture(file);
      if (res.err) { message.error(res.err); return Upload.LIST_IGNORE; }
      // 上传成功后，把 image_url 写入表单
      form.setFieldsValue({ image_url: res.dat });
      message.success('图片上传成功');
    } catch (error) {
      console.error('图片上传失败:', error);
      message.error('图片上传失败');
      return Upload.LIST_IGNORE;
    } finally {
      setUploading(false);
    }
    return false; // 阻止 Upload 组件自动上传，我们已经处理了
  };

  // 确认提交
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // 校验图片（接口文档：新增机房 image_url 必填）
      if (!values.image_url) {
        message.error('请先上传机房图片');
        return;
      }
      // 责任人数组转逗号分隔字符串
      const submitData = {
        ...values,
        owner_name: (values.duty_persons || []).filter(Boolean).join(','),
      };
      delete submitData.duty_persons;
      if (modalMode === 'add') {
        const res = await addRoom(submitData);
        if (res.err) { message.error(res.err); return; }
        message.success('新增成功');
      } else if (modalMode === 'edit' && editId) {
        const res = await updateRoom({ ...submitData, id: editId });
        if (res.err) { message.error(res.err); return; }
        message.success('修改成功');
      }
      setModalVisible(false);
      loadData(1, pagination.pageSize, query);
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  // 删除
  const handleDelete = (record: DcRoom) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除机房"${record.room_name}"吗？删除后编码不可复用。`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await deleteRoom(record.id);
          if (res.err) { message.error(res.err); return; }
          message.success('删除成功');
          loadData(1, pagination.pageSize, query);
        } catch (error) {
          console.error('删除失败:', error);
        }
      },
    });
  };

  // 打开导入弹窗
  const handleOpenImport = () => {
    setImportFileList([]);
    setImportModalVisible(true);
  };

  // 下载导入模板
  const handleDownloadTemplate = async () => {
    try {
      const res: any = await downloadRoomTemplate();
      const blob = new Blob([res], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `机房导入模板_${moment().format('MMDDHHmmss')}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载模板失败:', error);
    }
  };

  // 导入文件前校验
  const handleImportBeforeUpload = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
    if (ext !== 'xls' && ext !== 'xlsx') {
      message.error('文件格式错误，系统支持 excel 格式 xls、xlsx');
      return Upload.LIST_IGNORE;
    }
    setImportFileList([
      {
        uid: '-1',
        name: file.name,
        status: 'done',
        originFileObj: file,
      } as UploadFile,
    ]);
    return false;
  };

  // 确认导入
  const handleImportSubmit = async () => {
    if (importFileList.length === 0) {
      message.error('请选择要导入的文件');
      return;
    }
    const file = importFileList[0].originFileObj as File;
    if (!file) {
      message.error('请选择要导入的文件');
      return;
    }
    setImporting(true);
    try {
      const res: any = await importRoomExcel(file);
      if (res.err) {
        message.error(res.err);
        return;
      }
      message.success(`成功导入 ${res.dat ?? 0} 条`);
      setImportModalVisible(false);
      setImportFileList([]);
      loadData(1, pagination.pageSize, query);
    } catch (error) {
      console.error('导入失败:', error);
    } finally {
      setImporting(false);
    }
  };

  // ========== 表格列 —— 对齐接口文档字段 ==========
  const columns = useMemo(
    () => [
      { title: '机房名称', dataIndex: 'room_name', key: 'room_name', width: 160 },
      { title: '机房编码', dataIndex: 'room_code', key: 'room_code', width: 140 },
      { title: '所属楼座', dataIndex: 'building_name', key: 'building_name', width: 100 },
      { title: '所属楼层', dataIndex: 'floor_name', key: 'floor_name', width: 100 },
      { title: '责任人', dataIndex: 'owner_name', key: 'owner_name', width: 100 },
      { title: '更新人', dataIndex: 'updated_by', key: 'updated_by', width: 100 },
      { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 180, render: (v) => v ? moment(v).format('YYYY-MM-DD HH:mm:ss') : '-' },
      {
        title: '操作',
        key: 'action',
        width: 200,
        fixed: 'right' as const,
        render: (_: any, record: DcRoom) => (
          <Space>
            <Button type="link" size="small" onClick={() => handleEdit(record, 'view')}>
              查看
            </Button>
            <Button type="link" size="small" onClick={() => handleEdit(record, 'edit')}>
              修改
            </Button>
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleDelete(record)}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [],
  );

  const { resizableColumns, components, tableWidth } = useAntdResizableHeader({
    columns,
    columnsState: {
      persistenceType: 'localStorage',
      persistenceKey: 'dashboard-table-resizable-room-manage',
    },
  });

  // 初始化加载
  React.useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isView = modalMode === 'view';

  // 【关键修复】pagination 对象也用 useMemo 保持引用稳定
  const tablePagination = useMemo(
    () => ({
      ...pagination,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total: number) => `共 ${total} 条`,
      onChange: (page: number, pageSize: number) => loadData(page, pageSize, query),
    }),
    [pagination, loadData, query],
  );

  return (
    <PageLayout title="机房管理">
      <div className="task-manage-content">
        <div className="task-content">
          {/* 搜索栏 */}
          <Form layout="inline" style={{ marginBottom: 16 }}>
            <Space wrap size={16}>
              <Form.Item label="机房名称">
                <Input
                  placeholder="请输入机房名称"
                  value={query.room_name}
                  onChange={(e) => setQuery({ ...query, room_name: e.target.value })}
                  onPressEnter={handleSearch}
                  style={{ width: 200 }}
                  allowClear
                />
              </Form.Item>
              <Form.Item>
                <Space size={8}>
                  <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                    查询
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    重置
                  </Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    新增
                  </Button>
                  <Button icon={<UploadOutlined />} onClick={handleOpenImport}>
                    导入
                  </Button>
                </Space>
              </Form.Item>
            </Space>
          </Form>

          {/* 表格 */}
          <Table
            size="small"
            rowKey="id"
            loading={loading}
            dataSource={data}
            columns={resizableColumns}
            components={components}
            tableLayout="fixed"
            scroll={{ x: tableWidth }}
            pagination={tablePagination}
          />
        </div>

        {/* 弹窗 */}
        <Modal
          title={
            modalMode === 'add'
              ? '新增机房'
              : modalMode === 'edit'
              ? '修改机房'
              : '查看机房'
          }
          visible={modalVisible}
          onOk={handleOk}
          onCancel={() => setModalVisible(false)}
          okText="确定"
          cancelText="取消"
          width={800}
        >
          <Form
            form={form}
            disabled={isView}
            preserve={false}
            {...formItemLayout}
          >
            <Form.Item
              label="机房名称"
              name="room_name"
              rules={[{ required: true, message: '请输入机房名称' }]}
            >
              <Input placeholder="请输入机房名称" />
            </Form.Item>
            <Form.Item
              label="机房编码"
              name="room_code"
              rules={[{ required: true, message: '请输入机房编码' }]}
            >
              <Input placeholder="请输入机房编码" />
            </Form.Item>
            <Form.Item
              label="所在IDC"
              name="idc_name"
              rules={[{ required: true, message: '请输入所在IDC' }]}
            >
              <Input placeholder="请输入所在IDC" />
            </Form.Item>
            <Form.Item
              label="所属楼座"
              name="building_name"
              rules={[{ required: true, message: '请输入所属楼座' }]}
            >
              <Input placeholder="请输入所属楼座" />
            </Form.Item>
            <Form.Item
              label="所属楼层"
              name="floor_name"
              rules={[{ required: true, message: '请输入所属楼层' }]}
            >
              <Input placeholder="请输入所属楼层" />
            </Form.Item>
            <Form.Item label="责任人" required>
              <Form.List
                name="duty_persons"
                rules={[
                  {
                    validator: async (_rule, value) => {
                      if (!value || value.length === 0) throw new Error('请至少添加一个责任人');
                    },
                  },
                ]}
              >
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      // Form.Item 必须直接包裹受控组件，div 放外层，否则 value 无法注入 Input
                      <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Form.Item {...field} noStyle rules={[{ required: true, message: '请输入责任人' }]}>
                          <Input placeholder="请输入责任人" style={{ flex: 1 }} />
                        </Form.Item>
                        {!isView && (
                          <Button
                            size="small"
                            shape="circle"
                            style={{ color: '#fff', backgroundColor: '#1C76FD', borderColor: '#1C76FD' }}
                            onClick={() => add()}
                            icon={<PlusOutlined />}
                          />
                        )}
                        {fields.length > 1 && !isView ? (
                          <Button
                            size="small"
                            shape="circle"
                            danger
                            onClick={() => remove(field.name)}
                            icon={<MinusOutlined />}
                          />
                        ) : null}
                      </div>
                    ))}
                  </>
                )}
              </Form.List>
            </Form.Item>

            {/* 机房图片（必传，先上传拿到 image_url） */}
            <Form.Item label="机房图片" name="image_url" hidden>
              <Input />
            </Form.Item>
            <Form.Item
              label="机房图片"
              required
              rules={[
                {
                  validator: async (_rule: any, value: any) => {
                    const url = form.getFieldValue('image_url');
                    if (!url) throw new Error('请上传机房图片');
                  },
                },
              ]}
            >
              <Upload
                listType="picture-card"
                maxCount={1}
                accept="image/bmp,image/jpeg,image/jpg,image/png"
                beforeUpload={handleBeforeUpload}
                fileList={fileList}
                onChange={({ fileList: newList }) => setFileList(newList)}
                disabled={isView || uploading}
                // 预览：新上传的 file.url 为空且 thumbUrl 是 base64（Chrome 禁止新窗口打开 data: 地址会 about:blank），
                // 因此本地文件用 blob URL 打开；回显时 file.url 是服务端地址直接开
                onPreview={(file) => {
                  const url =
                    file.url ||
                    (file.originFileObj
                      ? URL.createObjectURL(file.originFileObj as File)
                      : file.thumbUrl);
                  if (url) window.open(url);
                }}
                onRemove={() => {
                  form.setFieldsValue({ image_url: undefined });
                }}
              >
                {fileList.length >= 1 ? null : (
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>上传照片</div>
                  </div>
                )}
              </Upload>
            </Form.Item>

            {/* 扩展信息（默认展开）—— Ant Design v4 写法 */}
            <Collapse ghost defaultActiveKey={['expand']}>
              <Collapse.Panel header={<span style={{ fontWeight: 600 }}>扩展信息</span>} key="expand">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="电压(V)" name="voltage_v" {...expandFormItemLayout}>
                      <InputNumber placeholder="请输入电压" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="电流(A)" name="current_a" {...expandFormItemLayout}>
                      <InputNumber placeholder="请输入电流" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="最大行数" name="max_rows" {...expandFormItemLayout}>
                      <InputNumber min={0} placeholder="请输入最大行数" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="最大列数" name="max_cols" {...expandFormItemLayout}>
                      <InputNumber min={0} placeholder="请输入最大列数" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="机房承重(kg/m²)" name="load_capacity_kg_per_sqm" {...expandFormItemLayout}>
                      <InputNumber placeholder="请输入机房承重" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="机房面积(m²)" name="area_sqm" {...expandFormItemLayout}>
                      <InputNumber placeholder="请输入机房面积" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="额定功率(kW)" name="rated_power_kw" {...expandFormItemLayout}>
                      <InputNumber placeholder="请输入额定功率" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="可容纳机柜数" name="cabinet_capacity" {...expandFormItemLayout}>
                      <InputNumber min={0} placeholder="请输入可容纳机柜数" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Collapse.Panel>
            </Collapse>
          </Form>
        </Modal>

        {/* 导入弹窗 */}
        <Modal
          title="导入机房"
          visible={importModalVisible}
          onOk={handleImportSubmit}
          onCancel={() => setImportModalVisible(false)}
          okText="确定"
          cancelText="取消"
          confirmLoading={importing}
          destroyOnClose
        >
          <div style={{ marginBottom: 12 }}>
            <Button type="link" onClick={handleDownloadTemplate} style={{ padding: 0 }}>
              下载导入模板
            </Button>
          </div>
          <Upload
            beforeUpload={handleImportBeforeUpload}
            fileList={importFileList}
            maxCount={1}
            accept=".xls,.xlsx"
            onRemove={() => setImportFileList([])}
          >
            <Button icon={<UploadOutlined />}>选择文件</Button>
          </Upload>
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
            仅支持 .xls / .xlsx 格式，请按模板填写后上传
          </div>
        </Modal>
      </div>
    </PageLayout>
  );
};

export default RoomManage;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Modal,
  Form,
  Row,
  Col,
  message,
  Upload,
  Tag,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  MinusOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import moment from 'moment';
import PageLayout from '@/components/pageLayout';
import { useAntdResizableHeader } from 'use-antd-resizable-header';
import { getRoomList } from '@/services/assets/dc-room';
import {
  getCabinetGroupList,
  getCabinetGroupDetail,
  addCabinetGroup,
  updateCabinetGroup,
  deleteCabinetGroup,
  importCabinetGroupExcel,
  downloadCabinetGroupTemplate,
} from '@/services/assets/cabinet-group';

/** 机柜组对象 —— 字段对齐接口文档 DcCabinetGroup */
interface DcCabinetGroup {
  id: number | string;
  group_code: string;
  group_type?: string;
  room_id?: number | string;
  room_name?: string;
  /** 方向：ROW 固定行跨列 / COLUMN 固定列跨行 */
  orientation?: 'ROW' | 'COLUMN' | null;
  row_no?: number | null;
  start_col_no?: number | null;
  end_col_no?: number | null;
  col_no?: number | null;
  start_row_no?: number | null;
  end_row_no?: number | null;
  purpose_note?: string;
  owner_name?: string;
  updated_by?: string;
  updated_at?: string;
  [key: string]: any;
}

/** 方向选项（对齐文档 3.1 方向规则） */
const ORIENTATION_OPTIONS = [
  { label: '固定行跨列（ROW）', value: 'ROW' },
  { label: '固定列跨行（COLUMN）', value: 'COLUMN' },
];

/** 机柜组类型选项 */
const GROUP_TYPE_OPTIONS = [
  { label: '通用机柜组', value: '通用机柜组' },
  { label: '高密度机柜组', value: '高密度机柜组' },
  { label: '网络机柜组', value: '网络机柜组' },
  { label: '存储机柜组', value: '存储机柜组' },
];

/** 查询字段选项 —— 对齐后端 query_field 参数 */
const QUERY_FIELD_OPTIONS = [
  { label: '机柜组编号', value: 'group_code' },
  { label: '机柜组类型', value: 'group_type' },
];

const CabinetGroupManage: React.FC = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState<DcCabinetGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState({
    roomId: undefined as number | string | undefined,
    /** 查询维度：group_code（默认按编号模糊查）/ group_type（按类型模糊查）/ all（编号或类型任一匹配）*/
    queryField: 'group_code' as 'group_code' | 'group_type',
    keyword: '',
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editId, setEditId] = useState<number | string | null>(null);
  const [roomOptions, setRoomOptions] = useState<{ label: string; value: number | string }[]>([]);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);
  const [importing, setImporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // 加载机房下拉（用列表接口拉全量，字段对齐 DcRoom）
  const loadRoomOptions = async () => {
    try {
      const res: any = await getRoomList({ p: 1, limit: -1 });
      if (res.err) {
        message.error(res.err);
        return;
      }
      const list = res?.dat?.list || [];
      const opts = (Array.isArray(list) ? list : []).map((r: any) => ({
        label: r.room_name || `机房 ${r.id}`,
        value: r.id,
      }));
      setRoomOptions(opts);
    } catch (error) {
      console.error('加载机房列表失败:', error);
    }
  };

  // 加载列表
  const loadData = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize, params = query) => {
      setLoading(true);
      try {
        const res: any = await getCabinetGroupList({
          p: page,
          limit: pageSize,
          room_id: params.roomId,
          query_field: params.queryField,
          query: params.keyword,
        });
        if (res.err) {
          message.error(res.err);
          return;
        }
        const list = res?.dat?.list || [];
        const total = res?.dat?.total || 0;
        setData(Array.isArray(list) ? list : []);
        setPagination({ current: page, pageSize, total });
      } catch (error) {
        console.error('加载机柜组列表失败:', error);
      } finally {
        setLoading(false);
      }
    },
    [pagination.current, pagination.pageSize, query],
  );

  // 搜索
  const handleSearch = () => loadData(1, pagination.pageSize, query);
  // 重置
  const handleReset = () => {
    const q = { roomId: undefined, queryField: 'group_code' as const, keyword: '' };
    setQuery(q);
    loadData(1, pagination.pageSize, q);
  };

  const handleAdd = () => {
    setModalMode('add');
    setEditId(null);
    form.resetFields();
    form.setFieldsValue({ duty_persons: [''] });
    setModalVisible(true);
  };

  // 打开编辑/查看弹窗 —— 整体覆盖更新，须先 GET 详情回填再全字段提交
  const handleEdit = async (record: DcCabinetGroup, mode: 'edit' | 'view') => {
    setModalMode(mode);
    setEditId(record.id);
    try {
      const res: any = await getCabinetGroupDetail(record.id);
      if (res.err) {
        message.error(res.err);
        return;
      }
      const detail = res?.dat || record;
      form.resetFields();
      form.setFieldsValue({
        group_code: detail.group_code,
        group_type: detail.group_type,
        room_id: detail.room_id,
        col_no: detail.col_no,
        start_row_no: detail.start_row_no,
        end_row_no: detail.end_row_no,
        purpose_note: detail.purpose_note,
        duty_persons: detail.owner_name ? detail.owner_name.split(',') : [''],
      });
      setModalVisible(true);
    } catch (error) {
      console.error('获取机柜组详情失败:', error);
      message.error('获取机柜组详情失败');
    }
  };

  // 确认提交 —— orientation 固定传 COLUMN，互斥字段置 null
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload: any = {
        group_code: values.group_code,
        group_type: values.group_type,
        room_id: values.room_id,
        orientation: 'COLUMN',
        col_no: values.col_no,
        start_row_no: values.start_row_no,
        end_row_no: values.end_row_no,
        purpose_note: values.purpose_note,
        owner_name: (values.duty_persons || []).filter(Boolean).join(','),
      };
      if (modalMode === 'add') {
        const res: any = await addCabinetGroup(payload);
        if (res.err) {
          message.error(res.err);
          return;
        }
        message.success('新增成功');
      } else if (modalMode === 'edit' && editId) {
        const res: any = await updateCabinetGroup({ ...payload, id: editId });
        if (res.err) {
          message.error(res.err);
          return;
        }
        message.success('修改成功');
      }
      setModalVisible(false);
      loadData(1, pagination.pageSize, query);
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  // 删除 —— 文档 3.6：机柜组下存在未删除的机柜时后端会报错禁止删除
  const handleDelete = (record: DcCabinetGroup) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除机柜组"${record.group_code}"吗？删除后编码不可复用。`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res: any = await deleteCabinetGroup(record.id);
          if (res.err) {
            message.error(res.err);
            return;
          }
          message.success('删除成功');
          loadData(1, pagination.pageSize, query);
        } catch (error) {
          console.error('删除失败:', error);
        }
      },
    });
  };

  // ========== 导入 ==========
  // 打开导入弹窗
  const handleOpenImport = () => {
    setImportFileList([]);
    setImportModalVisible(true);
  };

  // 下载导入模板
  const handleDownloadTemplate = async () => {
    try {
      const res: any = await downloadCabinetGroupTemplate();
      const blob = new Blob([res], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `机柜组导入模板_${moment().format('MMDDHHmmss')}.xls`);
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
      const res: any = await importCabinetGroupExcel(file);
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
      { title: '机柜组编号', dataIndex: 'group_code', key: 'group_code', width: 160 },
      { title: '机柜组类型', dataIndex: 'group_type', key: 'group_type', width: 140 },
      {
        title: '所属机房',
        dataIndex: 'room_name',
        key: 'room_name',
        width: 140,
        render: (text: string, record: DcCabinetGroup) =>
          text || roomOptions.find((r) => r.value === record.room_id)?.label || '-',
      },
      {
        title: '列',
        dataIndex: 'col_no',
        key: 'col_no',
        width: 70,
        align: 'center' as const,
        render: (val: number | null) => val ?? '-',
      },
      {
        title: '开始行',
        dataIndex: 'start_row_no',
        key: 'start_row_no',
        width: 80,
        align: 'center' as const,
        render: (val: number | null) => val ?? '-',
      },
      {
        title: '结束行',
        dataIndex: 'end_row_no',
        key: 'end_row_no',
        width: 80,
        align: 'center' as const,
        render: (val: number | null) => val ?? '-',
      },

      { title: '更新人', dataIndex: 'updated_by', key: 'updated_by', width: 120 },
      { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 180, render: (v) => v ? moment(v).format('YYYY-MM-DD HH:mm:ss') : '-' },
      {
        title: '操作',
        key: 'action',
        width: 200,
        fixed: 'right' as const,
        render: (_: any, record: DcCabinetGroup) => (
          <Space>
            <Button type="link" size="small" onClick={() => handleEdit(record, 'view')}>
              查看
            </Button>
            <Button type="link" size="small" onClick={() => handleEdit(record, 'edit')}>
              修改
            </Button>
            <Button type="link" size="small" danger onClick={() => handleDelete(record)}>
              删除
            </Button>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomOptions],
  );

  const { resizableColumns, components, tableWidth } = useAntdResizableHeader({
    columns,
    columnsState: {
      persistenceType: 'localStorage',
      persistenceKey: 'dashboard-table-resizable-cabinet-group',
    },
  });

  useEffect(() => {
    loadRoomOptions();
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isView = modalMode === 'view';

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
    <PageLayout title="机柜组管理">
      <div className="task-manage-content" ref={tableRef}>
        <div className="task-content">
          {/* 搜索栏 */}
          <Form layout="inline" style={{ marginBottom: 16 }}>
            <Space wrap size={16}>
              <Form.Item label="所属机房">
                <Select
                  placeholder="全部"
                  allowClear
                  style={{ width: 180 }}
                  value={query.roomId}
                  onChange={(val) => setQuery({ ...query, roomId: val })}
                  options={roomOptions}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
              <Form.Item>
                <Space size={0}>
                  <Select
                    style={{ width: 130 }}
                    value={query.queryField}
                    onChange={(val) => setQuery({ ...query, queryField: val })}
                    options={QUERY_FIELD_OPTIONS}
                  />
                  <Input
                    placeholder="请输入"
                    value={query.keyword}
                    onChange={(e) => setQuery({ ...query, keyword: e.target.value })}
                    onPressEnter={handleSearch}
                    style={{ width: 150 }}
                    allowClear
                  />
                </Space>
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

        {/* 新增/编辑/查看弹窗 */}
        <Modal
          title={modalMode === 'add' ? '新增机柜组' : modalMode === 'edit' ? '修改机柜组' : '查看机柜组'}
          visible={modalVisible}
          onOk={handleOk}
          onCancel={() => setModalVisible(false)}
          okText="确定"
          cancelText="取消"
          width={600}
        >
          <Form form={form} disabled={isView} preserve={false} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
            <Form.Item
              label="机柜组编号"
              name="group_code"
              rules={[{ required: true, message: '请输入机柜组编号' }]}
            >
              <Input placeholder="请输入机柜组编号" />
            </Form.Item>
            <Form.Item
              label="机柜组类型"
              name="group_type"
              rules={[{ required: true, message: '请输入机柜组类型' }]}
            >
              <Input placeholder="请输入机柜组类型" />
            </Form.Item>
            <Form.Item
              label="所属机房"
              name="room_id"
              rules={[{ required: true, message: '请选择所属机房' }]}
            >
              <Select
                placeholder="请选择所属机房"
                allowClear
                showSearch
                options={roomOptions}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
            <Form.Item
              label="列"
              name="col_no"
              rules={[{ required: true, message: '请输入列' }]}
            >
              <InputNumber min={1} placeholder="请输入列" style={{ width: '100%' }} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="开始行"
                  name="start_row_no"
                  rules={[{ required: true, message: '请输入开始行' }]}
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                >
                  <InputNumber min={1} placeholder="请输入开始行" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="结束行"
                  name="end_row_no"
                  dependencies={['start_row_no']}
                  rules={[
                    { required: true, message: '请输入结束行' },
                    ({ getFieldValue }) => ({
                      validator: (_rule, value) => {
                        const start = getFieldValue('start_row_no');
                        if (value != null && start != null && value < start) {
                          return Promise.reject(new Error('结束行不能小于开始行'));
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                  labelCol={{ span: 12 }}
                  wrapperCol={{ span: 12 }}
                >
                  <InputNumber min={1} placeholder="请输入结束行" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
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
            <Form.Item label="用途说明" name="purpose_note">
              <Input.TextArea rows={3} placeholder="请输入用途说明" />
            </Form.Item>
          </Form>
        </Modal>

        {/* 导入弹窗 */}
        <Modal
          title="导入机柜组"
          visible={importModalVisible}
          onOk={handleImportSubmit}
          onCancel={() => setImportModalVisible(false)}
          okText="确定"
          cancelText="取消"
          confirmLoading={importing}
          destroyOnClose
        >
          <div style={{ marginBottom: 12 }}>
            <Button type="link" onClick={handleDownloadTemplate} style={{ padding: 0 }} icon={<DownloadOutlined />}>
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

export default CabinetGroupManage;

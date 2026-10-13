import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Input,
  Select,
  Space,
  Table,
  Modal,
  Form,
  InputNumber,
  Collapse,
  Row,
  Col,
  Upload,
  Tag,
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
import { useHistory } from 'react-router-dom';
import { useAntdResizableHeader } from 'use-antd-resizable-header';
import { getRoomList } from '@/services/assets/dc-room';
import { getCabinetGroupList } from '@/services/assets/cabinet-group';
import {
  getCabinetPageList,
  getCabinetDetail,
  addCabinet,
  updateCabinet,
  deleteCabinet,
  uploadCabinetPicture,
  importCabinetExcel,
  downloadCabinetTemplate,
} from '@/services/assets/dc-cabinet';
import moment from 'moment';

/** 机柜对象 —— 字段对齐接口文档 DcCabinet */
interface DcCabinet {
  id: number | string;
  cabinet_code: string;
  cabinet_name?: string;
  room_id?: number | string;
  room_name?: string;
  group_id?: number | string;
  group_name?: string;
  cabinet_type?: string;
  business_zone?: string;
  row_no?: number;
  col_no?: number;
  u_capacity?: number;
  owner_name?: string;
  image_url?: string;
  main_power_source?: string;
  backup_power_source?: string;
  power_supply_mode?: string;
  power_consumption_kw?: number;
  rated_voltage_v?: number;
  rated_power_kw?: number;
  power_plug_count?: number;
  weight_kg?: number;
  area_sqm?: number;
  u_used_rate?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  [key: string]: any;
}

// 主表单布局（全宽字段，label 短）
const formItemLayout = { labelCol: { span: 4 }, wrapperCol: { span: 20 } };
// 扩展区布局（两列并排，label 较长，用 12/12 各占一半 Col 的空间）
const expandFormItemLayout = { labelCol: { span: 8 }, wrapperCol: { span: 16 } };

/** 查询字段选项 —— 对齐后端 query_field 参数（不传时后端默认 all：编号或名称任一匹配） */
const QUERY_FIELD_OPTIONS = [
  { label: '机柜名称', value: 'cabinet_name' },
  { label: '机柜编号', value: 'cabinet_code' },
  { label: '责任人', value: 'owner_name' },
];

const CabinetManage: React.FC = () => {
  const history = useHistory();
  const [form] = Form.useForm();
  const [data, setData] = useState<DcCabinet[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState({
    roomId: undefined as number | string | undefined,
    /** 查询维度：cabinet_name（默认按名称模糊查）/ cabinet_code（按编号模糊查）/ owner_name（按责任人模糊查）*/
    queryField: 'cabinet_name' as 'cabinet_name' | 'cabinet_code' | 'owner_name',
    keyword: '',
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [editId, setEditId] = useState<number | string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [roomOptions, setRoomOptions] = useState<{ label: string; value: number | string }[]>([]);
  const [cabinetGroupOptions, setCabinetGroupOptions] = useState<
    { label: string; value: number | string; room_id?: number | string }[]
  >([]);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);
  const [importing, setImporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // 加载机房下拉
  const loadRoomOptions = async () => {
    try {
      const res: any = await getRoomList({ p: 1, limit: -1 });
      if (res.err) {
        message.error(res.err);
        return;
      }
      const list = res?.dat?.list || res?.dat || [];
      const opts = (Array.isArray(list) ? list : []).map((r: any) => ({
        label: r.room_name || `机房 ${r.id}`,
        value: r.id,
      }));
      setRoomOptions(opts);
    } catch (error) {
      console.error('加载机房列表失败:', error);
    }
  };

  // 加载机柜组下拉
  const loadCabinetGroupOptions = async (roomId?: number | string) => {
    try {
      const res: any = await getCabinetGroupList({ p: 1, limit: -1, room_id: roomId });
      if (res.err) {
        message.error(res.err);
        return;
      }
      const list = res?.dat?.list || [];
      const opts = (Array.isArray(list) ? list : []).map((g: any) => ({
        label: g.group_code || `机柜组 ${g.id}`,
        value: g.id,
        room_id: g.room_id,
      }));
      setCabinetGroupOptions(opts);
    } catch (error) {
      console.error('加载机柜组列表失败:', error);
    }
  };

  // 加载列表
  const loadData = useCallback(
    async (
      page = pagination.current,
      pageSize = pagination.pageSize,
      params = query,
    ) => {
      setLoading(true);
      try {
        const res: any = await getCabinetPageList({
          p: page,
          limit: pageSize,
          room_id: params.roomId,
          query_field: params.queryField,
          query: params.keyword || undefined,
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
        console.error('加载机柜列表失败:', error);
      } finally {
        setLoading(false);
      }
    },
    [pagination.current, pagination.pageSize, query],
  );

  // 搜索
  const handleSearch = () => {
    setPagination((p) => ({ ...p, current: 1 }));
    loadData(1, pagination.pageSize, query);
  };

  // 重置 —— 恢复默认维度（机柜名称）并清空关键字
  const handleReset = () => {
    const q = {
      roomId: undefined,
      queryField: 'cabinet_name' as const,
      keyword: '',
    };
    setQuery(q);
    setPagination((p) => ({ ...p, current: 1 }));
    loadData(1, pagination.pageSize, q);
  };

  // 打开新增弹窗
  const handleAdd = () => {
    setModalMode('add');
    setEditId(null);
    setFileList([]);
    form.resetFields();
    form.setFieldsValue({ duty_persons: [''] });
    loadCabinetGroupOptions();
    setModalVisible(true);
  };

  // 辅助：后端 image_url 是存储相对路径（如 etc/picture/xxx.png），
  // 实际访问需去掉 etc/ 前缀并加代理前缀：/api/takin/picture/xxx.png
  const getFullImgUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const normalized = url.replace(/^etc\//, '');
    if (normalized.startsWith('/')) return normalized;
    return `/api/takin/${normalized}`;
  };

  // 打开编辑/查看弹窗 —— PUT 整体覆盖，先 GET 详情回填再全字段提交
  const handleEdit = async (record: DcCabinet, mode: 'edit' | 'view') => {
    setModalMode(mode);
    setEditId(record.id);
    try {
      const res: any = await getCabinetDetail(record.id);
      if (res.err) {
        message.error(res.err);
        return;
      }
      const detail = res?.dat || record;
      await loadCabinetGroupOptions(detail.room_id);
      form.resetFields();
      form.setFieldsValue({
        cabinet_code: detail.cabinet_code,
        cabinet_name: detail.cabinet_name,
        room_id: detail.room_id,
        group_id: detail.group_id,
        row_no: detail.row_no,
        col_no: detail.col_no,
        u_capacity: detail.u_capacity,
        cabinet_type: detail.cabinet_type,
        business_zone: detail.business_zone,
        duty_persons: detail.owner_name ? detail.owner_name.split(',') : [''],
        main_power_source: detail.main_power_source,
        backup_power_source: detail.backup_power_source,
        power_supply_mode: detail.power_supply_mode,
        power_consumption_kw: detail.power_consumption_kw,
        rated_voltage_v: detail.rated_voltage_v,
        power_plug_count: detail.power_plug_count,
        rated_power_kw: detail.rated_power_kw,
        area_sqm: detail.area_sqm,
        weight_kg: detail.weight_kg,
        image_url: detail.image_url,
      });
      if (detail.image_url) {
        setFileList([
          {
            uid: '-1',
            name: '机柜图片',
            status: 'done',
            url: getFullImgUrl(detail.image_url),
          },
        ]);
      } else {
        setFileList([]);
      }
    } catch (error) {
      console.error('获取机柜详情失败:', error);
      message.error('获取机柜详情失败');
    }
    setModalVisible(true);
  };

  // 机房变化时，清空机柜组并重新加载对应机柜组下拉
  const handleRoomChange = (roomId: number | string | undefined) => {
    form.setFieldsValue({ group_id: undefined });
    loadCabinetGroupOptions(roomId);
  };

  // 图片上传前校验 —— 走后端上传接口
  const handleBeforeUpload = async (file: File) => {
    setUploading(true);
    try {
      const allowedTypes = ['image/bmp', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        message.error('仅支持 bmp/jpeg/jpg/png 格式');
        return Upload.LIST_IGNORE;
      }
      if (file.size / 1024 / 1024 > 5) {
        message.error('图片大小不能超过 5MB');
        return Upload.LIST_IGNORE;
      }
      const res: any = await uploadCabinetPicture(file);
      if (res.err) { message.error(res.err); return Upload.LIST_IGNORE; }
      form.setFieldsValue({ image_url: res.dat });
      message.success('图片上传成功');
    } catch (error) {
      console.error('图片上传失败:', error);
      message.error('图片上传失败');
      return Upload.LIST_IGNORE;
    } finally {
      setUploading(false);
    }
    return false;
  };

  // 确认提交 —— 组装文档 4.4 全字段 payload
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // 校验图片（接口文档：新增/编辑机柜 image_url 必填）
      if (!values.image_url) {
        message.error('请先上传机柜图片');
        return;
      }
      const payload = {
        cabinet_code: values.cabinet_code,
        cabinet_name: values.cabinet_name,
        room_id: values.room_id,
        group_id: values.group_id,
        row_no: values.row_no,
        col_no: values.col_no,
        u_capacity: values.u_capacity,
        cabinet_type: values.cabinet_type,
        business_zone: values.business_zone,
        owner_name: (values.duty_persons || []).filter(Boolean).join(','),
        image_url: values.image_url,
        main_power_source: values.main_power_source,
        backup_power_source: values.backup_power_source,
        power_supply_mode: values.power_supply_mode,
        power_consumption_kw: values.power_consumption_kw,
        rated_voltage_v: values.rated_voltage_v,
        rated_power_kw: values.rated_power_kw,
        power_plug_count: values.power_plug_count,
        weight_kg: values.weight_kg,
        area_sqm: values.area_sqm,
      };
      if (modalMode === 'add') {
        const res: any = await addCabinet(payload);
        if (res.err) { message.error(res.err); return; }
        message.success('新增成功');
      } else if (modalMode === 'edit' && editId) {
        const res: any = await updateCabinet({ ...payload, id: editId });
        if (res.err) { message.error(res.err); return; }
        message.success('修改成功');
      }
      setModalVisible(false);
      loadData(1, pagination.pageSize, query);
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  // 删除 —— 文档 4.7：存在占用/预留/故障 U 位时后端报错禁止删除
  const handleDelete = (record: DcCabinet) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除机柜"${record.cabinet_name || record.cabinet_code}"吗？删除后编码不可复用。`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res: any = await deleteCabinet(record.id);
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
      const res: any = await downloadCabinetTemplate();
      const blob = new Blob([res], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `机柜导入模板_${moment().format('MMDDHHmmss')}.xls`);
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
      const res: any = await importCabinetExcel(file);
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

  // 【关键修复】useMemo 保持 columns 引用稳定
  const columns = useMemo(
    () => [
      { title: '机柜编号', dataIndex: 'cabinet_code', key: 'cabinet_code', width: 140 },
      { title: '机柜名称', dataIndex: 'cabinet_name', key: 'cabinet_name', width: 140 },
      { title: '所属机房', dataIndex: 'room_name', key: 'room_name', width: 140 },
      { title: '所属机柜组', dataIndex: 'group_name', key: 'group_name', width: 140 },
      { title: '机柜U数', dataIndex: 'u_capacity', key: 'u_capacity', width: 90, align: 'center' as const },
      {
        title: 'U位使用率',
        dataIndex: 'u_used_rate',
        key: 'u_used_rate',
        width: 120,
        align: 'center' as const,
        render: (val: number | undefined) => {
          const rate = val != null ? Math.round(val * 100) : 0;
          return <Tag color={rate >= 80 ? 'red' : rate >= 50 ? 'orange' : 'green'}>{rate}%</Tag>;
        },
      },
      { title: '责任人', dataIndex: 'owner_name', key: 'owner_name', width: 100 },
      { title: '更新人', dataIndex: 'updated_by', key: 'updated_by', width: 100 },
      { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 180, render: (v) => v ? moment(v).format('YYYY-MM-DD HH:mm:ss') : '-' },
      {
        title: '操作',
        key: 'action',
        width: 240,
        fixed: 'right' as const,
        render: (_: any, record: DcCabinet) => (
          <Space>
            <Button type="link" size="small" onClick={() => handleEdit(record, 'view')}>
              查看
            </Button>
            <Button type="link" size="small" onClick={() => history.push(`/xh/roomOverview?cabinetId=${record.id}&tab=uview`)}>
              U位
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
    [],
  );

  const { resizableColumns, components, tableWidth } = useAntdResizableHeader({
    columns,
    columnsState: {
      persistenceType: 'localStorage',
      persistenceKey: 'dashboard-table-resizable-cabinet-manage',
    },
  });

  // 初始化
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
    <PageLayout title="机柜管理">
      <div className="task-manage-content">
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
                  {/* TODO：导入按钮先隐藏 */}
                  {/* <Button icon={<UploadOutlined />} onClick={handleOpenImport}>
                    导入
                  </Button> */}
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

        <Modal
          title={
            modalMode === 'add' ? '新增机柜' : modalMode === 'edit' ? '修改机柜' : '查看机柜'
          }
          visible={modalVisible}
          onOk={handleOk}
          onCancel={() => setModalVisible(false)}
          okText="确定"
          cancelText="取消"
          width={640}
        >
          <Form form={form} disabled={isView} preserve={false} {...formItemLayout}>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="机柜编号"
                  name="cabinet_code"
                  rules={[{ required: true, message: '请输入机柜编号' }]}
                >
                  <Input placeholder="请输入机柜编号" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="机柜名称"
                  name="cabinet_name"
                  rules={[{ required: true, message: '请输入机柜名称' }]}
                >
                  <Input placeholder="请输入机柜名称" />
                </Form.Item>
              </Col>
              <Col span={24}>
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
                    onChange={handleRoomChange}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="所属机柜组"
                  name="group_id"
                  rules={[{ required: true, message: '请选择所属机柜组' }]}
                >
                  <Select
                    placeholder="请选择所属机柜组"
                    allowClear
                    showSearch
                    options={cabinetGroupOptions}
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="所在行"
                  name="row_no"
                  rules={[{ required: true, message: '请输入所在行' }]}
                  {...expandFormItemLayout}
                >
                  <InputNumber min={0} placeholder="请输入所在行" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="所在列"
                  name="col_no"
                  rules={[{ required: true, message: '请输入所在列' }]}
                  {...expandFormItemLayout}
                >
                  <InputNumber min={0} placeholder="请输入所在列" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="U位数"
                  name="u_capacity"
                  rules={[{ required: true, message: '请输入U数' }]}
                >
                  <InputNumber
                    min={1}
                    placeholder="请输入机柜U数，≥1"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="机柜类型"
                  name="cabinet_type"
                  rules={[{ required: true, message: '请输入机柜类型' }]}
                  {...expandFormItemLayout}
                >
                  <Input placeholder="请输入机柜类型" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="业务分区"
                  name="business_zone"
                  rules={[{ required: true, message: '请输入业务分区' }]}
                  {...expandFormItemLayout}
                >
                  <Input placeholder="请输入业务分区" />
                </Form.Item>
              </Col>
              <Col span={24}>
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
              </Col>
              <Col span={24}>
                {/* 机柜图片（必填，先上传拿到 image_url） */}
                <Form.Item label="机柜图片" name="image_url" hidden>
                  <Input />
                </Form.Item>
                <Form.Item
                  label="机柜图片"
                  required
                  rules={[
                    {
                      validator: async (_rule: any, value: any) => {
                        const url = form.getFieldValue('image_url');
                        if (!url) throw new Error('请上传机柜图片');
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
              </Col>
            </Row>

            {/* 扩展信息——默认展开 */}
            <Collapse ghost defaultActiveKey={['expand']}>
              <Collapse.Panel header={<span style={{ fontWeight: 600 }}>扩展信息</span>} key="expand">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="主用供电来源" name="main_power_source" {...expandFormItemLayout}>
                      <Input placeholder="请输入主用供电来源" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="临时供电来源" name="backup_power_source" {...expandFormItemLayout}>
                      <Input placeholder="请输入临时供电来源" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="供电方式" name="power_supply_mode" {...expandFormItemLayout}>
                      <Input placeholder="请输入供电方式" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="电源功耗(kW)" name="power_consumption_kw" {...expandFormItemLayout}>
                      <Input placeholder="请输入电源功耗" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="额定电压(V)" name="rated_voltage_v" {...expandFormItemLayout}>
                      <Input placeholder="请输入额定电压" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="电源插头数量" name="power_plug_count" {...expandFormItemLayout}>
                      <Input placeholder="请输入电源插头数量" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="额定功率(kW)" name="rated_power_kw" {...expandFormItemLayout}>
                      <Input placeholder="请输入额定功率" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="机柜面积(m²)" name="area_sqm" {...expandFormItemLayout}>
                      <Input placeholder="请输入机柜面积" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="机柜承重(kg)" name="weight_kg" {...expandFormItemLayout}>
                      <Input placeholder="请输入机柜承重" />
                    </Form.Item>
                  </Col>
                </Row>
              </Collapse.Panel>
            </Collapse>
          </Form>
        </Modal>

        {/* 导入弹窗 */}
        <Modal
          title="导入机柜"
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

export default CabinetManage;

import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Button,
  Dropdown,
  Input,
  Menu,
  message,
  Modal,
  Space,
  Table,
  Form,
  Select,
  Row,
  Col,
  Switch
} from "antd";
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  PoweroffOutlined,
  SearchOutlined,
  MinusSquareOutlined,
} from "@ant-design/icons";
import { useAntdResizableHeader } from "use-antd-resizable-header";

import "./style.less";
import _ from "lodash";
import moment from "moment";
import {
  getDutyList,
  addDuty,
  getDutyDetail,
  deleteDuty,
  getPersonnelStatus,
  updateDutyPersonnelStatus,
  editDuty,
} from "@/services/sxxc/dutyManage";
import { OperationModal } from "./OperationModal";
import RefreshIcon from "@/components/RefreshIcon";
import { useLocalStorage } from "react-use";
import { CommonStateContext } from "@/App";


export enum OperateType {
  Enable = "enable",
  Disable = "disable",
  Delete = "delete",
  Import = "import",
  None = "none",
}

export default function () {
  const [list, setList] = useState<any[]>([]);
  const [operateType, setOperateType] = useState<OperateType>(OperateType.None);
  const [selectedDutyIds, setSelectedDutyIds] = useState<number[]>([]);
  const [selectedDutyNames, setSelectedDutyNames] = useState<string[]>([]);
  const [current, setCurrent] = useState<any>(1);
  const [pageSize, setPageSize] = useLocalStorage<any>(
    "duty_manage_list_page",
    10
  );
  const [refreshKey, setRefreshKey] = useState(_.uniqueId("refreshKey_"));
  const [total, setTotal] = useState<number>(0);
  const [form] = Form.useForm();
  const [initData, setInitData] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit" | "view">("add");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [roles] = useState([
    { label: "值班负责人", value: 1 },
    { label: "一线值班", value: 2 },
    { label: "二线值班", value: 3 },
    { label: "三线值班", value: 4 },
  ]);
  const dutyTypeOptions = [
    { label: "日常常规", value: 1 },
    { label: "备班值班", value: 2 },
    { label: "重保专项", value: 3 },
  ];
  const [searchVal, setSearchVal] = useState<any>("");
  const [filterType, setFilterType] = useState<any>('input');
  const [filterParam, setFilterParam] = useState<string>("name");
  const [refreshFlag, setRefreshFlag] = useState<string>(
    _.uniqueId("refresh_flag")
  );
  const { busiGroups, profile, permList } = useContext(CommonStateContext);
  let queryFilter = [
    { name: "name", label: "姓名", type: "input" },
    { name: "role", label: "角色", type: "select" },
    { name: "phone", label: "联系方式", type: "input" },
    { name: "dutyType", label: "值班类型", type: "select" },
    { name: "email", label: "邮箱", type: "input" },
    { name: "busiGroupId", label: "值班业务组", type: "select" },
  ];
  const filterOptions = {
    role: roles,
    dutyType: [
      { value: 1, label: "日常常规" },
      { value: 2, label: "备班值班" },
      { value: 3, label: "重保专项" },
    ],
    busiGroupId: busiGroups?.map((group) => ({
      value: _.toString(group.id),
      label: group.name,
    })) || [],
  };
  const onSelectNone = () => {
    setSelectedDutyIds([]);
    setSelectedDutyNames([]);
  };

  const baseColumns: any[] = [
    {
      title: "姓名",
      dataIndex: "name",
      align: "center",
      // width: "80px",
      ellipsis: true,
      render(value, record, index) {
        return (
          <div
            style={{ color: "#2B7EE5", cursor: "pointer" }}
            onClick={(e) => {
              showModal("view", record.id);
            }}
          >
            {value}
          </div>
        );
      },
      sorter: (a, b) => {
        return (a.name || "").localeCompare(b.name || "");
      },
    },
    {
      title: "角色",
      dataIndex: "role",
      align: "center",
      ellipsis: true,
      render: (value: number) => {
        const role = roles.find((r) => r.value === value);
        return role?.label || "-";
      },
      sorter: (a, b) => {
        return a.role - b.role;
      },
    },
    {
      title: "联系方式",
      dataIndex: "phone",
      align: "center",
      ellipsis: true,
      sorter: (a, b) => {
        return (a.phone || "").localeCompare(b.phone || "");
      },
    },
    {
      title: "邮箱",
      dataIndex: "email",
      align: "center",
      ellipsis: true,
      sorter: (a, b) => {
        return (a.email || "").localeCompare(b.email || "");
      },
    },
    {
      title: "值班类型",
      dataIndex: "duty_type_configs",
      align: "center",
      ellipsis: true,
      render: (value: any[]) => {
        if (Array.isArray(value) && value.length > 0) {
          return value
            .map((config) => {
              const dt = dutyTypeOptions.find(
                (d) => d.value === config.dutyType
              );
              return dt?.label || config.dutyType;
            })
            .join("，");
        }
        return "-";
      },
    },
    {
      title: "值班业务组",
      dataIndex: "duty_type_configs",
      align: "center",
      ellipsis: true,
      render: (value: any[]) => {
        if (Array.isArray(value) && value.length > 0) {
          return value
            .map((config) => {
              const ids = config.busiGroupIds || [];
              if (ids.length === 0 || ids.includes(0)) {
                return "全部";
              }
              return ids
                .map((id: number) => {
                  const group = busiGroups?.find((g: any) => g.id === id);
                  return group?.name || id;
                })
                .join("，");
            })
            .join("；");
        }
        return "-";
      },
    },
    {
      title: "值班次数",
      dataIndex: "duty_count",

      align: "center",
      ellipsis: true,
      sorter: (a, b) => {
        return a.duty_count - b.duty_count;
      },
    },
    {
      title: "排班次数",
      dataIndex: "total_schedule_count",
      align: "center",
      ellipsis: true,
      sorter: (a, b) => {
        return a.total_schedule_count - b.total_schedule_count;
      },
    },
    // {
    //   title: "项目支撑",
    //   dataIndex: "project_support",
    //   align: "center",
    //   ellipsis: true,
    //   render(value, record, index) {
    //     return value==0?'否':'是';
    //   },
    // },
    {
      title: "状态",
      dataIndex: "status",
      width: 80,
      align: "center",
      render: (text: number) => {
        return (
          <div className="table-text">{text === 1 ? "已启用" : "已禁用"}</div>
        );
      },
      sorter: (a, b) => {
        return a.status - b.status;
      },
    },
    {
      title: "更新时间",
      dataIndex: "updated_at_str",
      width: 150,
      align: "center",
      render: (text: string) => {
        return <div className="table-text">{text || "-"}</div>;
      },
      sorter: (a, b) => {
        return (a.updatedAt || 0) - (b.updatedAt || 0);
      },
    },
    {
      title: "操作",
      width: 120,
      align: "center",
      fixed: "right",
      render: (val, record: any) => (
        <Space>
          {(profile.roles?.includes("Admin") ||
            permList.includes("/sxxc/duty_list/status")) && (
              <PoweroffOutlined
                title={record.status === 1 ? "启用" : "禁用"}
                style={{ color: record.status === 1 ? "green" : "red" }}
                onClick={async (e) => {
                  let key = new Array();
                  key.push(record.id);
                  let hasPendingTask = false;
                  hasPendingTask = await checkPersonnelStatus(record.id);
                  if (record.status !== 1) {
                    Modal.confirm({
                      title: "确认要启用当前选择值班人员？",
                      okText: "确定",
                      cancelText: "取消",
                      onOk: async () => {
                        await updateDutyPersonnelStatus("enable", key);
                        message.success("操作成功");
                        setRefreshFlag(_.uniqueId("refreshFlag_"));
                      },
                      onCancel() { },
                    });
                  } else {
                    Modal.confirm({
                      title: `${hasPendingTask
                        ? "请先在未执行的排班表中移出人员！"
                        : "禁用后，人员将不可用，确认禁用？"
                        }`,
                      okText: "确定",
                      cancelText: "取消",
                      onOk: async () => {
                        if (hasPendingTask) {
                          return;
                        }
                        await updateDutyPersonnelStatus("disable", key);
                        message.success("操作成功");
                        setRefreshFlag(_.uniqueId("refreshFlag_"));
                      },
                      onCancel() { },
                    });
                  }
                }}
              />
            )}
          {(profile.roles?.includes("Admin") ||
            permList.includes("/sxxc/duty_list/put")) && (
              <EditOutlined
                title="编辑值班人员信息"
                onClick={() => {
                  showModal("edit", record.id);
                }}
              />
            )}
          {(profile.roles?.includes("Admin") ||
            permList.includes("/sxxc/duty_list/del")) && (
              <DeleteOutlined
                title="删除值班人员信息"
                onClick={async () => {
                  let hasPendingTask = false;
                  hasPendingTask = await checkPersonnelStatus(record.id);

                  Modal.confirm({
                    title: `${hasPendingTask
                      ? "请先在未执行的排班表中移出人员！"
                      : "人员将在列表中移除，确认删除？"
                      }`,
                    okText: "确定",
                    cancelText: "取消",

                    onOk: async () => {
                      if (hasPendingTask) {
                        return;
                      }

                      await deleteDuty([record.id]);
                      message.success("删除成功");
                      setRefreshFlag(_.uniqueId("refreshFlag_"));
                    },
                    onCancel() { },
                  });
                }}
              />
            )}
        </Space>
      ),
    },
  ];

  const { components, resizableColumns, tableWidth } = useAntdResizableHeader({
    columns: useMemo(() => baseColumns, []),
    columnsState: {
      persistenceType: "localStorage",
      persistenceKey: `dashboard-table-resizable-duty-management`,
    },
  });

  useEffect(() => {
    getTableData();
  }, [searchVal, refreshFlag, refreshKey]);

  const getTableData = () => {
    const query = {
      page: current,
      limit: pageSize,
    };

    if (searchVal != null && searchVal !== "") {
      query["query"] = searchVal;
    }
    if (
      filterParam != null &&
      filterParam.length > 0 &&
      searchVal != null &&
      searchVal !== ""
    ) {
      query["filter"] = filterParam;
    }

    getDutyList(query).then(({ dat }) => {
      setList(dat.list);
      setTotal(dat.total);
    });
  };

  // 判断人员是否有待值班任务
  const checkPersonnelStatus = async (id: number) => {
    try {
      const res = await getPersonnelStatus(id);
      if (res?.dat) {
        return res.dat.has_pending_duties;
      }
    } catch (error) {
      message.error("获取数据失败");
    }
  };

  const showModal = async (type: "add" | "edit" | "view", id?: number) => {
    setModalType(type);
    setModalVisible(true);

    if (type === "edit" || type === "view") {
      try {
        setConfirmLoading(true);
        const res = await getDutyDetail(id);
        if (res?.dat.personnel) {
          const { name, role, phone, email, project_support } = res.dat.personnel;
          const dutyTypeConfigs = res.dat.duty_type_configs || [];
          const formConfigs = dutyTypeConfigs.map((config: any) => ({
            ...config,
            busiGroupIds:
              !config.busiGroupIds ||
                config.busiGroupIds.length === 0 ||
                (config.busiGroupIds.length === 1 && config.busiGroupIds[0] === 0)
                ? [0]
                : config.busiGroupIds,
          }));
          setTimeout(() => {
            form.setFieldsValue({
              name,
              role,
              phone,
              email,
              dutyTypeConfigs: formConfigs.length > 0 ? formConfigs : [{ dutyType: undefined, busiGroupIds: [] }],
            });
          }, 0);
          setInitData(res.dat.personnel);
        }
      } catch (error) {
        message.error("获取数据失败");
      } finally {
        setConfirmLoading(false);
      }
    } else {
      form.resetFields();
      form.setFieldsValue({
        dutyTypeConfigs: [{ dutyType: undefined, busiGroupIds: [] }],
      });
    }
  };
  // 表单校验规则
  const validatePhone = async (rule, value) => {
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!value) {
      return Promise.reject("请输入联系方式");
    }
    if (!phoneReg.test(value)) {
      return Promise.reject("请输入正确的联系方式格式");
    }
    return Promise.resolve();
  };

  const validateEmail = async (rule, value) => {
    if (!value) return Promise.resolve();
    const emailReg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailReg.test(value)) {
      return Promise.reject("请输入正确的邮箱格式");
    }
    return Promise.resolve();
  };
  // 表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log(values);
      setConfirmLoading(true);
      const dutyTypeConfigs = (values.dutyTypeConfigs || []).map((config: any) => {
        let busiGroupIds = config.busiGroupIds || [];
        // const hasAll = busiGroupIds.includes("all");
        // if (hasAll) {
        //   busiGroupIds = [];
        // }
        return {
          dutyType: config.dutyType,
          busiGroupIds,
        };
      });
      const submitData = [
        {
          name: values.name,
          role: values.role,
          phone: values.phone,
          email: values.email || "",
          // project_support: values.project_support? 1 : 0,
          // 新增时不需要id、status，编辑时需要
          dutyTypeConfigs,
          ...(modalType === "edit" && initData && { id: (initData as any).id, status: (initData as any).status }),
        },
      ];
      console.log(submitData);
      if (modalType === "add") {
        await addDuty(submitData);
        message.success("新增成功");
      } else if (modalType === "edit") {
        await editDuty(submitData);
        message.success("编辑成功");
      }
      setModalVisible(false);
      getTableData();
    } catch (error: any) {
      message.error(error?.message || "操作失败，请重试");
    } finally {
      setConfirmLoading(false);
    }
  };

  const onPageChange = (page: number, pageSize: number) => {
    setCurrent(page);
    setPageSize(pageSize);
    setRefreshKey(_.uniqueId("refreshKey_"));
  };

  return (
    <div className="list_view">
      <div className="operate">
        <div className="table-content">
          <Space size={"small"}>
            <RefreshIcon
              onClick={() => {
                setRefreshKey(_.uniqueId("refreshKey_"));
              }}
            />

            {/* <div className="table-handle-search"> */}
            {/* <Space> */}
            <Select
              placeholder="选择过滤器"
              style={{ width: 120 }}
              value={filterParam}
              onChange={(value) => {
                queryFilter.forEach((item) => {
                  if (item.name == value) {
                    setFilterType(item.type);
                  }
                });
                setFilterParam(value);
                setSearchVal(null);
                setCurrent(1);
              }}
            >
              {queryFilter.map((item, index) => (
                <Select.Option value={item.name} key={index}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
            {filterType == "input" && (
              <Input
                className={"searchInput"}
                value={searchVal}
                allowClear
                onChange={(e) => {
                  if (e != undefined) {
                    setSearchVal(e.target.value);
                  } else {
                    setSearchVal(null);
                  }
                  setCurrent(1);
                }}
                suffix={<SearchOutlined />}
                placeholder={"输入模糊检索关键字"}
              />
            )}
            {filterType == "select" && (
              <Select
                className={"searchInput"}
                placeholder={"选择要查询的条件"}
                value={searchVal}
                allowClear
                showSearch
                filterOption
                optionFilterProp={"label"}
                options={
                  filterOptions[filterParam]
                    ? filterOptions[filterParam]
                    : []
                }
                onChange={(val) => {
                  if (val != undefined) {
                    setSearchVal(val);
                  } else {
                    setSearchVal(null);
                  }
                  setCurrent(1);
                }}
              />
            )}
            {/* </Space> */}
            {/* </div> */}
          </Space>
          <div className="tool_right">
            {(profile.roles?.includes("Admin") ||
              permList.includes("/sxxc/duty_list/add")) && (
                <div>
                  <Button
                    className="tool_rightbtn"
                    onClick={() => {
                      showModal("add");
                    }}
                    type="primary"
                  // style={{ backgroundColor: "#2888f7", border: "none" }}
                  >
                    新增
                  </Button>
                  &nbsp; &nbsp; &nbsp;
                </div>
              )}
            {(profile.roles?.includes("Admin") ||
              permList.includes("/sxxc/duty_list/ops")) && (

                <div>
                  <Dropdown
                    trigger={["click"]}
                    overlay={
                      <Menu
                        style={{ width: "100px" }}
                        onClick={async ({ key }) => {
                          if (key == "delete") {
                            if (selectedDutyIds.length <= 0) {
                              message.error("未选中值班人员");
                              return;
                            }
                            let hasPendingTask = false;
                            for (const item of selectedDutyIds) {
                              const res = await checkPersonnelStatus(item);
                              if (res) {
                                hasPendingTask = true;
                                break;
                              }
                            }
                            // console.log("hasPendingTask", hasPendingTask);
                            Modal.confirm({
                              title: `${hasPendingTask
                                ? "请先在未执行的排班表中移出人员！"
                                : "人员将在列表中移除，确认删除？"
                                }`,
                              okText: "确定",
                              cancelText: "取消",
                              onOk: async () => {
                                if (hasPendingTask) {
                                  return;
                                }

                                deleteDuty(selectedDutyIds).then((res) => {
                                  message.success("删除成功");
                                  setRefreshFlag(_.uniqueId("refreshFlag_"));
                                });
                              },
                              onCancel() { },
                            });
                          } else if (key == "enable") {
                            if (selectedDutyIds.length <= 0) {
                              message.error("未选中值班人员");
                              return;
                            }
                            Modal.confirm({
                              title: "确认要启用当前选择值班人员？",
                              okText: "确定",
                              cancelText: "取消",
                              onOk: async () => {
                                updateDutyPersonnelStatus(
                                  "enable",
                                  selectedDutyIds
                                ).then((res) => {
                                  message.success("操作成功");
                                  setOperateType(OperateType.None);
                                  setRefreshFlag(_.uniqueId("refreshFlag_"));
                                  onSelectNone();
                                });
                              },
                              onCancel() { },
                            });
                          } else if (key == "disable") {
                            if (selectedDutyIds.length <= 0) {
                              message.error("未选中值班人员");
                              return;
                            }
                            let hasPendingTask = false;
                            for (const item of selectedDutyIds) {
                              const res = await checkPersonnelStatus(item);
                              if (res) {
                                hasPendingTask = true;
                                break;
                              }
                            }
                            // console.log("hasPendingTask", hasPendingTask);

                            Modal.confirm({
                              title: `${hasPendingTask
                                ? "请先在未执行的排班表中移出人员！"
                                : "禁用后，人员将不可用，确认禁用？"
                                }`,
                              okText: "确定",
                              cancelText: "取消",
                              onOk: async () => {
                                if (hasPendingTask) {
                                  return;
                                }

                                updateDutyPersonnelStatus(
                                  "disable",
                                  selectedDutyIds
                                ).then((res) => {
                                  message.success("操作成功");
                                  setOperateType(OperateType.None);
                                  setRefreshFlag(_.uniqueId("refreshFlag_"));
                                  onSelectNone();
                                });
                              },
                              onCancel() { },
                            });
                          } else {
                            setOperateType(key as OperateType);
                          }
                        }}
                        items={[
                          { key: OperateType.Enable, label: "批量启用" },
                          { key: OperateType.Disable, label: "批量禁用" },
                          { key: OperateType.Delete, label: "批量删除" },
                          { key: OperateType.Import, label: "批量导入" },
                        ]}
                      ></Menu>
                    }
                  >
                    <Button>
                      批量操作
                      <DownOutlined />
                    </Button>
                  </Dropdown>
                </div>
              )}
          </div>
        </div>
        <div className="renderer-table-container">
          <div className="list renderer-table-container-box">
            <Table
              dataSource={list}
              className="table-view"
              scroll={{ x: tableWidth }}
              components={components}
              columns={resizableColumns}
              bordered
              rowSelection={{
                onChange: (_, rows) => {
                  setSelectedDutyIds(rows ? rows.map(({ id }) => id) : []);
                  setSelectedDutyNames(
                    rows ? rows.map(({ name }) => name) : []
                  );
                },
                selectedRowKeys: selectedDutyIds,
              }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                current: current,
                pageSize: pageSize,
                total: total,
                onChange: onPageChange,
                showTotal: (total) => `总共 ${total} 条`,
                pageSizeOptions: [10, 20, 50, 100],
              }}
              rowKey="id"
              size="small"
            ></Table>
            <OperationModal
              operateType={operateType}
              setOperateType={setOperateType}
              // assets={selectedDutyIds}
              // names={selectedDutyNames}
              reloadList={() => {
                setRefreshKey(_.uniqueId("refreshKey_"));
              }}
            />
            {/* 新增/编辑/查看模态框 */}
            <Modal
              title={
                modalType === "add"
                  ? "新增值班人员"
                  : modalType === "edit"
                    ? "编辑值班人员"
                    : "查看值班人员"
              }
              visible={modalVisible}
              onCancel={() => setModalVisible(false)}
              confirmLoading={confirmLoading}
              footer={[
                <Button key="cancel" onClick={() => setModalVisible(false)}>
                  取消
                </Button>,
                modalType !== "view" && (
                  <Button
                    key="submit"
                    type="primary"
                    loading={confirmLoading}
                    onClick={handleSubmit}
                  >
                    确定
                  </Button>
                ),
              ]}
            >
              <Form
                form={form}
                layout="horizontal"
                disabled={modalType === "view"}
                initialValues={{ role: undefined }}
                labelAlign="right"
                labelCol={{ span: 8 }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="name"
                      label="姓名"
                      rules={[{ required: true, message: "请输入姓名" }]}
                    >
                      <Input placeholder="请输入姓名" disabled={modalType === "edit"} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="role"
                      label="角色"
                      rules={[{ required: true, message: "请选择角色" }]}
                    >
                      <Select placeholder="请选择角色">
                        {roles.map((role) => (
                          <Select.Option key={role.value} value={role.value}>
                            {role.label}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  {/* <Col span={12}>
                    <Form.Item
                      name="project_support"
                      label="项目支撑"
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="是" unCheckedChildren="否" />
                    </Form.Item>
                  </Col> */}
                  <Col span={12}>
                    <Form.Item
                      name="phone"
                      label="联系方式"
                      rules={[{ required: true, validator: validatePhone }]}
                    >
                      <Input placeholder="请输入联系方式" maxLength={11} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="email"
                      label="邮箱"
                      rules={[{ validator: validateEmail }]}
                    >
                      <Input placeholder="请输入邮箱" type="email" />
                    </Form.Item>
                  </Col>
                </Row>
                <div style={{ margin: "12px 0", fontWeight: "bold", borderBottom: "1px solid #f0f0f0", paddingBottom: 8 }}>
                  值班类型配置
                </div>
                <Form.List name="dutyTypeConfigs">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => {
                        return (
                          <Row gutter={12} key={key} align="middle" style={{ marginBottom: 12 }}>
                            <Col span={10}>
                              <Form.Item
                                noStyle
                                shouldUpdate={(prev, cur) =>
                                  JSON.stringify(prev.dutyTypeConfigs) !==
                                  JSON.stringify(cur.dutyTypeConfigs)
                                }
                              >
                                {() => {
                                  const usedDutyTypes = form
                                    .getFieldValue("dutyTypeConfigs")
                                    ?.map((item: any) => item?.dutyType)
                                    .filter((v: any) => v !== undefined);
                                  return (
                                    <Form.Item
                                      {...restField}
                                      name={[name, "dutyType"]}
                                      label="值班类型"
                                      labelCol={{ span: 10 }}
                                      wrapperCol={{ span: 14 }}
                                      rules={[{ required: true, message: "请选择值班类型" }]}
                                    >
                                      <Select placeholder="请选择值班类型">
                                        {dutyTypeOptions.map((dt) => (
                                          <Select.Option
                                            key={dt.value}
                                            value={dt.value}
                                            disabled={
                                              form.getFieldValue([
                                                "dutyTypeConfigs",
                                                name,
                                                "dutyType",
                                              ]) !== dt.value &&
                                              usedDutyTypes?.includes(dt.value)
                                            }
                                          >
                                            {dt.label}
                                          </Select.Option>
                                        ))}
                                      </Select>
                                    </Form.Item>
                                  );
                                }}
                              </Form.Item>
                            </Col>
                            <Col span={10}>
                              <Form.Item
                                {...restField}
                                name={[name, "busiGroupIds"]}
                                label="值班业务组"
                                labelCol={{ span: 10 }}
                                wrapperCol={{ span: 14 }}
                                rules={[{ required: true, message: "请选择值班业务组" }]}
                                getValueFromEvent={(val: any) => {
                                  if (val.includes(0)) {
                                    return [0];
                                  }
                                  return val;
                                }}
                              >
                                <Select
                                  mode="multiple"
                                  placeholder="请选择值班业务组"
                                  showSearch
                                  filterOption={(input, option) =>
                                    (option?.label as string)?.includes(input)
                                  }
                                  optionFilterProp="label"
                                >
                                  <Select.Option value={0} label="全部">
                                    全部
                                  </Select.Option>
                                  {busiGroups?.map((group: any) => (
                                    <Select.Option
                                      key={group.id}
                                      value={group.id}
                                      label={group.name}
                                    >
                                      {group.name}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            </Col>
                            <Col span={4} style={{ textAlign: "center" }}>
                              {fields.length > 1 && modalType !== "view" && (
                                <Button
                                  type="link"
                                  danger
                                  onClick={() => {
                                    // const currentItem =
                                    //   form.getFieldValue([
                                    //     "dutyTypeConfigs",
                                    //     name,
                                    //   ]) || {};
                                    // const dutyType = currentItem?.dutyType;
                                    // const busiGroupIds =
                                    //   currentItem?.busiGroupIds;
                                    // if (
                                    //   !dutyType &&
                                    //   (!busiGroupIds ||
                                    //     busiGroupIds.length === 0)
                                    // ) {
                                    //   remove(name);
                                    //   return;
                                    // }
                                    Modal.confirm({
                                      title: "确认删除该值班类型及值班业务组？",
                                      okText: "确定",
                                      cancelText: "取消",
                                      onOk: () => remove(name),
                                    });
                                  }}
                                  style={{ marginBottom: 18 }}
                                  icon={<MinusSquareOutlined />}
                                >
                                </Button>
                              )}
                            </Col>
                          </Row>
                        );
                      })}
                      {modalType !== "view" && (
                        <Button
                          type="dashed"
                          onClick={() => {
                            const currentConfigs =
                              form.getFieldValue("dutyTypeConfigs") || [];
                            const usedTypes = currentConfigs
                              .map((item: any) => item?.dutyType)
                              .filter((v: any) => v !== undefined);
                            const availableTypes = dutyTypeOptions.filter(
                              (dt) => !usedTypes.includes(dt.value)
                            );
                            if (availableTypes.length === 0) {
                              message.warning("所有值班类型已添加，无法新增");
                              return;
                            }
                            add({ dutyType: undefined, busiGroupIds: [] });
                          }}
                          block
                          style={{ marginTop: 8 }}
                        >
                          + 新增值班类型
                        </Button>
                      )}
                    </>
                  )}
                </Form.List>
              </Form>
            </Modal>
          </div>
        </div>
      </div>
    </div>
  );
}
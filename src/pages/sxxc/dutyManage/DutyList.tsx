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
} from "antd";
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  PoweroffOutlined,
  SearchOutlined,
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
  const [current, setCurrent] = useLocalStorage<any>(
    "duty_manage_list_current",
    1
  );
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
    { label: "值班主任", value: "值班主任" },
    { label: "一线运维", value: "一线运维" },
    { label: "二线运维", value: "二线运维" },
    { label: "三线运维", value: "三线运维" },
  ]);
  const [searchVal, setSearchVal] = useLocalStorage<any>(
    "duty_manage_filter_value",
    null
  );
  const [filterParam, setFilterParam] = useState<string>("name");
  const [refreshFlag, setRefreshFlag] = useState<string>(
    _.uniqueId("refresh_flag")
  );
  const { busiGroups, profile, permList } = useContext(CommonStateContext);
  const groupIds = busiGroups?.map((item) => item.id);
  let queryFilter = [
    { name: "name", label: "姓名", type: "input" },
    { name: "phone", label: "手机号", type: "input" },
    { name: "email", label: "邮箱", type: "input" },
  ];
  const onSelectNone = () => {
    setSelectedDutyIds([]);
    setSelectedDutyNames([]);
  };

  const baseColumns: any[] = [
    {
      title: "姓名",
      dataIndex: "Name",
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
        return a.Name.localeCompare(b.Name);
      },
    },
    {
      title: "角色",
      dataIndex: "Role",
      align: "center",
      ellipsis: true,
      sorter: (a, b) => {
        return a.Role.localeCompare(b.Role);
      },
    },
    {
      title: "手机号",
      dataIndex: "Phone",
      align: "center",
      ellipsis: true,
      sorter: (a, b) => {
        return a.Phone.localeCompare(b.Phone);
      },
    },
    {
      title: "邮箱",
      dataIndex: "Email",

      align: "center",
      ellipsis: true,
      sorter: (a, b) => {
        return a.Email.localeCompare(b.Email);
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
      title: "状态",
      dataIndex: "Status",
      width: 80,
      align: "center",
      // render: (text: number) => {
      //   return (
      //     <div className="table-text">{text === 1 ? "已启用" : "已禁用"}</div>
      //   );
      // },
      sorter: (a, b) => {
        return a.Status.localeCompare(b.Status);
      },
    },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      width: 150,
      align: "center",
      render: (text: number) => {
        return (
          <div className="table-text">
            {moment.unix(text).format("YYYY-MM-DD HH:mm:ss")}
          </div>
        );
      },
      sorter: (a, b) => {
        return a.update_at > b.update_at ? 1 : -1;
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
              title={record.Status == "启用" ? "启用" : "禁用"}
              style={{ color: record.Status == "启用" ? "green" : "red" }}
              onClick={async (e) => {
                let key = new Array();
                key.push(record.id);
                let hasPendingTask = false;
                hasPendingTask = await checkPersonnelStatus(record.id);
                if (record.Status == "禁用") {
                  Modal.confirm({
                    title: "确认要启用当前选择值班人员？",
                    okText: "确定",
                    cancelText: "取消",
                    onOk: async () => {
                      await updateDutyPersonnelStatus("enable", key);
                      message.success("操作成功");
                      setRefreshFlag(_.uniqueId("refreshFlag_"));
                    },
                    onCancel() {},
                  });
                } else {
                  Modal.confirm({
                    title: `${
                      hasPendingTask
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
                    onCancel() {},
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
                  title: `${
                    hasPendingTask
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
                  onCancel() {},
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
    const param = {
      page: current,
      limit: pageSize,
    };

    if (searchVal != null && searchVal.length > 0) {
      param["query"] = searchVal;
      param["filter"] = filterParam;
    } else {
      delete param["filter"];
      delete param["query"];
    }
    getDutyList(param).then(({ dat }) => {
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
    form.resetFields();

    if (type === "edit" || type === "view") {
      try {
        setConfirmLoading(true);
        const res = await getDutyDetail(id);
        if (res?.dat.personnel) {
          const { Name, Role, Phone, Email } = res.dat.personnel;
          const formData = {
            name: Name,
            role: Role,
            phone: Phone,
            email: Email,
          };
          form.setFieldsValue(formData);
          setInitData(res.dat.personnel);
        }
      } catch (error) {
        message.error("获取数据失败");
      } finally {
        setConfirmLoading(false);
      }
    }
  };
  // 表单校验规则
  const validatePhone = async (rule, value) => {
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!value) {
      return Promise.reject("请输入手机号");
    }
    if (!phoneReg.test(value)) {
      return Promise.reject("请输入正确的手机号格式");
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
      setConfirmLoading(true);
      // 提交数据
      const submitData = [
        {
          name: values.name,
          role: values.role,
          phone: values.phone,
          email: values.email || "",
          // 新增时不需要id、status，编辑时需要
          ...(modalType === "edit" && initData && { id: (initData as any).id, status: (initData as any).Status }),
        },
      ];

      if (modalType === "add") {
        await addDuty(submitData);
        message.success("新增成功");
      } else if (modalType === "edit") {
        await editDuty(submitData);
        message.success("编辑成功");
      }
      setModalVisible(false);
      getTableData();
    } catch (error) {
      message.error("操作失败，请重试");
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
                // queryFilter.forEach((item) => {
                //   if (item.name == value) {
                //     setFilterType(item.type);
                //   }
                // });
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
                            title: `${
                              hasPendingTask
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
                            onCancel() {},
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
                            onCancel() {},
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
                            title: `${
                              hasPendingTask
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
                            onCancel() {},
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
              assets={selectedDutyIds}
              names={selectedDutyNames}
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
                initialValues={{ role: "" }}
                labelAlign="right"
                labelCol={{ span: 6 }}
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
                  <Col span={12}>
                    <Form.Item
                      name="phone"
                      label="手机号"
                      rules={[{ required: true, validator: validatePhone }]}
                    >
                      <Input placeholder="请输入手机号" maxLength={11} />
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
              </Form>
            </Modal>
          </div>
        </div>
      </div>
    </div>
  );
}

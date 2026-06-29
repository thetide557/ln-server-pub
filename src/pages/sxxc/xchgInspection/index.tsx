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
import React, { useEffect, useState, useContext } from "react";
import moment from "moment";
import _ from "lodash";
import {
  Button,
  Input,
  message,
  Modal,
  Table,
  Form,
  Space,
  Select,
  Menu,
  Dropdown,
} from "antd";
import { useHistory } from "react-router-dom";
import { DownOutlined, UserOutlined } from "@ant-design/icons";
import { ColumnsType } from "antd/lib/table";
import { useAntdTable } from "ahooks";
import PageLayout from "@/components/pageLayout";
import {getXinchuangComponentInstances,exportTemplet} from "@/services/sxxc/inspection";
import { InspectionType, Inspection } from "@/store/sxxc/inspection";
import { CommonStateContext } from "@/App";
import usePagination from "@/components/usePagination";
import XinchuangModal from "./components/xinchuangModal";
import "./index.less";

// import './locale';


const Resource: React.FC = () => {
  const [form] = Form.useForm();
  const { profile, permList, busiGroups } = useContext(CommonStateContext);
  const groupIds = busiGroups?.map((item) => item.id);
  const pagination = usePagination({ PAGESIZE_KEY: "inspectionList" });
  const [pageNum, setPageNum] = useState(1);

  const [xinchuangModalVisible, setXinchuangModalVisible] =
    useState<boolean>(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const xinchuangColumn: ColumnsType<Inspection> = [
    {
      title: "序号",
      render: (text, record, index) => `${index + 1}`,
    },
    {
      title: "资产名称",
      dataIndex: "asset_name",
    },
    {
      title: "IP地址",
      dataIndex: "agent_ip",
    },
    {
      title: "业务组",
      dataIndex: "busi_group",
    },
    {
      title: "组件类型",
      dataIndex: "component_type_label",
    },
    {
      title: "组件名称",
      dataIndex: "component_name",
    },
    {
      title: "组件中文名称",
      dataIndex: "component_name_zh",
    },
    {
      title: "组件版本",
      dataIndex: "component_version",
    },
    {
      title: "组件属性",
      dataIndex: "xinchuang_attr_label",
    },
    {
      title: "替代建议",
      dataIndex: "replace_advice",
    },
    {
      title: "厂商",
      dataIndex: "vendor",
    },
    {
      title: "操作系统",
      dataIndex: "os",
    },
    {
      title: "部署路径",
      dataIndex: "deployment_path",
    },
    {
      title: "扫描时间",
      dataIndex: "scan_time_display",
    },
    {
      title: "风险等级",
      dataIndex: "risk_level_label",
    },
  ];

  const [refreshFlag, setRefreshFlag] = useState<string>(
    _.uniqueId("refresh_flag"),
  );
  const getTableData = ({ current, pageSize }): Promise<any> => {
    setPageNum(current);
    const params = {
      ...form.getFieldsValue(),
      limit: pageSize,
      page: current,
    };

    return getXinchuangComponentInstances({
      ...params,
    }).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };
  const { tableProps, run } = useAntdTable(getTableData, {
    defaultPageSize: pagination.pageSize,
    refreshDeps: [form, refreshFlag],
  });

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      run({ current: 1, pageSize: pagination.pageSize });
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {}, []);

  const handleXchgManifest = () => {
    setXinchuangModalVisible(true);
  };

  // 导出清单
  const handleExportXchgManifest = async () => {
    // 显示确认对话框
    Modal.confirm({
      title: '确认导出',
      content: selectedRows.length > 0 
        ? `确定要导出选中的 ${selectedRows.length} 条记录吗？`
        : '确定要导出全部记录吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 准备导出参数
          const params = {
            // 如果有选中的行，传递选中行的ID
            // 否则传递空数组表示导出全部
            ids: selectedRows.length > 0 ? selectedRows.map((row) => row.id).join(',') : '',
          };

          const exportTitle = "信创检测清单";
          const url = "/api/n9e/xinchuang/component-instances/export";
          const res = await exportTemplet(url, params);
          const blobUrl = window.URL.createObjectURL(
            new Blob([res], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }),
          );
          const link = document.createElement("a");
          link.href = blobUrl;
          const fileType = ".xls";
          link.download = `${exportTitle}_${moment().format(
            "MMDDHHmmss",
          )}${fileType}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          message.success("批量导出成功");
        } catch (error) {
          console.error("导出失败:", error);
          // message.error("导出失败，请稍后重试");
        }
      }
    });
  };

  return (
    <PageLayout title={"信创检测"} icon={<UserOutlined />}>
      <div className="task-manage-content">
        <div className="task-content">
          <Form form={form}>
            <div className="xchg-inspection-search">
              <div>
                <Space style={{ marginRight: 16 }}>
                  <Form.Item label={"IP地址"} name="ip">
                    <Input
                      className="left-area-group-search"
                      placeholder="IP地址"
                      // maxLength={20}
                      style={{ width: "200px" }}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        handleSubmit();
                      }}
                    />
                  </Form.Item>
                </Space>
                <Space style={{ marginRight: 16 }}>
                  <Form.Item label={"业务组"} name="busi_group">
                    <Select
                      allowClear
                      placeholder={"业务组"}
                      style={{ width: 200 }}
                    >
                      {_.map(busiGroups, (item) => {
                        return (
                          <Select.Option key={item.id} value={item.id}>
                            {item.name}
                          </Select.Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                </Space>
                <Space style={{ marginRight: 16 }}>
                  <Form.Item label={"组件类型"} name="component_type">
                    <Select
                      allowClear
                      placeholder={"组件类型"}
                      style={{ width: 200 }}
                    >
                      <Select.Option value="database">数据库</Select.Option>
                      <Select.Option value="middleware">中间件</Select.Option>
                    </Select>
                  </Form.Item>
                </Space>
                <Space style={{ marginRight: 16 }}>
                  <Form.Item label={"信创属性"} name="xinchuang_attr">
                    <Select
                      allowClear
                      placeholder={"信创属性"}
                      style={{ width: 200 }}
                    >
                      <Select.Option value="xc">信创</Select.Option>
                      <Select.Option value="non_xc">非信创</Select.Option>
                    </Select>
                  </Form.Item>
                </Space>
                {/* 风险等级筛选 */}
                <Space style={{ marginRight: 16 }}>
                  <Form.Item label={"风险等级"} name="risk_level">
                    <Select
                      allowClear
                      placeholder={"风险等级"}
                      style={{ width: 200 }}
                    >
                      <Select.Option value="high">高风险</Select.Option>
                      <Select.Option value="medium">中风险</Select.Option>
                      <Select.Option value="low">低风险</Select.Option>
                    </Select>
                  </Form.Item>
                </Space>
                <Space>
                  {(profile.roles?.includes("Admin") ||
                    permList.includes("/inspection/xchgInspectionQuery")) && (
                    <Button
                      style={{ marginRight: "16px" }}
                      onClick={handleSubmit}
                      type="primary"
                    >
                      查询
                    </Button>
                  )}
                </Space>
              </div>
              <div style={{ display: "flex" }}>               
                  {(profile.roles?.includes("Admin") ||
                    permList.includes("/inspection/xchgManifest")) && (
                    <Button
                      style={{ marginRight: "16px" }}
                      onClick={handleXchgManifest}
                      type="primary"
                    >
                      组件清单
                    </Button>
                  )}
                
                {(profile.roles?.includes("Admin") ||
                  permList.includes("/inspection/xchgManifest/ops")) && (
                  <div>
                    <Dropdown
                      trigger={["click"]}
                      overlay={
                        <Menu
                          style={{ width: "100px" }}
                          onClick={({ key }) => {
                            if (key == "exportXchgManifest") {
                              handleExportXchgManifest();
                            }
                          }}
                          items={[
                            { key: "exportXchgManifest", label: "导出清单" },
                          ]}
                        ></Menu>
                      }
                    >
                      <Button>
                        批量操作 <DownOutlined />
                      </Button>
                    </Dropdown>
                  </div>
                )}
              </div>
            </div>
          </Form>
          <Table
            size="small"
            rowKey="id"
            columns={xinchuangColumn}
            {...tableProps}
            pagination={{
              ...tableProps.pagination,
              ...pagination,
            }}
            rowSelection={{
              onChange: (_, rows) => {
                setSelectedRows(rows);
              },
            }}
          />

          {/* 信创清单弹窗 */}
          <XinchuangModal
            visible={xinchuangModalVisible}
            onCancel={() => setXinchuangModalVisible(false)}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default Resource;

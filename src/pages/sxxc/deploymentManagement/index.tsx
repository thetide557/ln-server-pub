import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Dropdown,
  Input,
  Menu,
  message,
  Modal,
  Space,
  Table,
} from "antd";
import PageLayout from "@/components/pageLayout";
import { useTranslation } from "react-i18next";
import { useAntdResizableHeader } from "use-antd-resizable-header";

import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  GroupOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import "./locale";
import "./style.less";
import _ from "lodash";
import DeploymentModal from "./deployment/deploymentModal";
import { assetsType, metricsUnitEnum } from "@/store/assetsInterfaces";
import { CommonStateContext } from "@/App";
import {
  getDeploymentsList,
  delDeployments,
  batchDelDeployment,
} from "@/services/sxxc/deploymentManagement";
import RefreshIcon from "@/components/RefreshIcon";
import type { DataNode, TreeProps } from "antd/es/tree";
import { useInterval, useLocalStorage } from "react-use";
export enum OperateType {
  BindTag = "bindTag",
  UnbindTag = "unbindTag",
  AssetBatchImport = "assetBatchImport",
  AssetBatchExport = "assetBatchExport",
  UpdateBusi = "updateBusi",
  RemoveBusi = "removeBusi",
  UpdateNote = "updateNote",
  Delete = "delete",
  ChangeOrganize = "changeOrganize",
  None = "none",
}

export default function () {
  const { t } = useTranslation("assets");
  const [list, setList] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useLocalStorage("asset_current_page", 10);
  const [searchVal, setSearchVal] = useLocalStorage<any>(
    "asset_filter_value",
    null
  );
  const [refreshKey, setRefreshKey] = useState(_.uniqueId("refreshKey_"));
  const [total, setTotal] = useState<number>(0);
  const {profile, permList } = useContext(CommonStateContext);
  const [title, setTitle] = useState<any>("");
  const [open, setOpen] = useState<boolean>(false);
  const [itemForm, setTtemForm] = useState<Object>({});
  const baseColumns: any[] = [
    {
      title: "项目名称",
      dataIndex: "project_name",
      Ced: "left",
      ellipsis: true,
    },
    {
      title: "所属区域",
      dataIndex: "region",
      Ced: "left",
      align: "center",
      ellipsis: true,
    },
    {
      title: "所属行业",
      dataIndex: "industry",
      Ced: "left",
      align: "center",
      ellipsis: true,
    },
    {
      title: "部署日期",
      dataIndex: "deployment_date",
      align: "center",
      width: 120,
      ellipsis: true,
    },
    {
      title: "部署版本",
      dataIndex: "deployment_version",
      align: "center",
      width: 100,
      ellipsis: true,
    },
    {
      title: "资产总数",
      dataIndex: "asset_count",
      align: "center",
      ellipsis: true,
      width: 100,
    },
    {
      title: "联系人",
      dataIndex: "contact_person",
      align: "center",
      ellipsis: true,
      width: 100,
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      align: "center",
      ellipsis: true,
      width: 200,
    },
    {
      title: "更新时间",
      dataIndex: "updated_at",
      align: "center",
      width: 200,
      ellipsis: true,
    },
    {
      title: "更新人",
      dataIndex: "updated_by",
      align: "center",
      width: 100,
      ellipsis: true,
    },
  ];

  const fixColumns: any[] = [
    {
      title: "操作",
      width: 150,
      align: "center",
      fixed: "right",
      render: (text: string, record: assetsType) => (
        <Space>
          {(profile.roles?.includes("Admin") ||
            permList.includes("/xh/assetmgt/put")) && (
            <EditOutlined
              title="编辑"
              onClick={(e) => {
                showModal("update", record);
              }}
            />
          )}
          {(profile.roles?.includes("Admin") ||
            permList.includes("/xh/assetmgt/del")) && (
            <DeleteOutlined
              title="删除"
              className="table-operator-area-warning"
              onClick={async () => {
                Modal.confirm({
                  title: "项目将在平台中移除，确认删除？",
                  onOk: async () => {
                    await delDeployments(record.id);
                    message.success(t("common:success.delete"));
                    setCurrent(1);
                    setRefreshKey(_.uniqueId("refreshKey_"));
                    setSelectedAssets([]);
                  },

                  onCancel() {},
                });
              }}
            ></DeleteOutlined>
          )}
        </Space>
      ),
    },
  ];

  const [selectColumns, setSelectColumns] = useState<any[]>(
    baseColumns.concat(fixColumns)
  );
  const { resizableColumns, components, tableWidth } = useAntdResizableHeader({
    columns: useMemo(() => selectColumns, [selectColumns]),
    columnsState: {
      persistenceType: "localStorage",
      persistenceKey: `dashboard-table-resizable-xh-asset-management`,
    },
  });

  useEffect(() => {
    getTableData();
  }, [searchVal, refreshKey]);

  const getTableData = () => {
    const param = {
      page: current,
      limit: pageSize,
    };
    if (searchVal != null && searchVal.length > 0) {
      param["query"] = searchVal;
    }
    getDeploymentsList(param).then(({ dat }) => {
      setList(dat.list || []);
      setTotal(dat.total);
    });
  };

  const showModal = (action: string, formData: any) => {
    if (action == "add") {
      setTtemForm({});
      setOpen(true);
    } else if (action == "update") {
      setTtemForm(formData);
      setOpen(true);
    }
    setTitle(action == "add" ? "新增项目" : "编辑项目");
  };

  const onPageChange = (page: number, pageSize: number) => {
    setCurrent(page);
    setPageSize(pageSize);
    setRefreshKey(_.uniqueId("refreshKey_"));
  };

  const handleClose = (value: any) => {
    if (value == "sure") {
      getTableData();
    }
    setOpen(false);
  };
  return (
    <PageLayout icon={<GroupOutlined />} title={"项目管理"}>
      <div style={{ display: "inline-flex" }} className="asset_list_view">
        <div className="asset-operate_xh">
          <div className="table-content_xh">
            <Space>
              <RefreshIcon
                onClick={() => {
                  setRefreshKey(_.uniqueId("refreshKey_"));
                }}
              />
              <Space>
                <div className="table-handle-search">
                  <Space>
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
                      placeholder={"输入项目名称/所属区域/联系人"}
                    />
                  </Space>
                </div>
              </Space>
            </Space>
            <div className="tool_right">
              <Space>
                {(profile.roles?.includes("Admin") ||
                  permList.includes("/xh/assetmgt/add")) && (
                  <div>
                    <Button
                      onClick={() => {
                        showModal("add", null);
                      }}
                      type="primary"
                    >
                      {t("新增")}
                    </Button>
                  </div>
                )}
                {(profile.roles?.includes("Admin") ||
                  permList.includes("/xh/assetmgt/ops")) && (
                  <div>
                    <Dropdown
                      trigger={["click"]}
                      overlay={
                        <Menu
                          style={{ width: "100px" }}
                          onClick={({ key }) => {
                            if (key == OperateType.Delete) {
                              if (selectedAssets.length <= 0) {
                                message.warning("请选择要批量移除的项目");
                                return;
                              } else {
                                Modal.confirm({
                                  title: "项目将在平台中移除，确认删除？",
                                  onOk: async () => {
                                    batchDelDeployment(selectedAssets).then(
                                      (res) => {
                                        message.success("删除成功！");
                                        setRefreshKey(
                                          _.uniqueId("refreshKey_")
                                        );
                                        setSelectedAssets([]);
                                      }
                                    );
                                  },
                                  onCancel() {},
                                });
                              }
                            }
                          }}
                          items={[
                            { key: OperateType.Delete, label: "批量删除" },
                          ]}
                        ></Menu>
                      }
                    >
                      <Button>
                        {t("common:btn.batch_operations")} <DownOutlined />
                      </Button>
                    </Dropdown>
                  </div>
                )}
              </Space>
            </div>
          </div>
          <div className="renderer-table-container">
            <div className="assets-list-1 renderer-table-container-box">
              <Table
                dataSource={list}
                className="table-view"
                scroll={{ x: tableWidth }}
                components={components}
                columns={resizableColumns}
                bordered
                rowSelection={{
                  onChange: (_, rows) => {
                    setSelectedAssets(rows ? rows.map(({ id }) => id) : []);
                  },
                }}
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  total: total,
                  onChange: onPageChange,
                  current: current,
                  pageSize: pageSize,
                  showTotal: (total) => `总共 ${total} 条`,
                  pageSizeOptions: [10, 20, 50, 100],
                }}
                rowKey="id"
                size="small"
              ></Table>
            </div>
          </div>
        </div>
        {/* 分组弹窗 */}
        {open && (
          <DeploymentModal
            title={title}
            open={open}
            closeOpen={handleClose}
            itemForm={itemForm}
          />
        )}
      </div>
    </PageLayout>
  );
}

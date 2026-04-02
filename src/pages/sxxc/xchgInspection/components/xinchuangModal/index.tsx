import React, { useState, useEffect } from "react";
import {
  Modal,
  Table,
  Input,
  Button,
  Space,
  Divider,
  message,
  Menu,
  Dropdown,
} from "antd";
import moment from "moment";
import _ from "lodash";

import {
  DownOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { exportTemplet, getXinchuangComponentItems,batchDeleteXinchuangComponentItems } from "@/services/sxxc/inspection";
import usePagination from "@/components/usePagination";
import { useAntdTable } from "ahooks";
import EditManifestModal from "./EditManifestModal";

// 定义清单明细项接口（适配黑白名单接口）
interface DetailItem {
  id?: string;
  process_name: string;
  component_type: string;
  component_name: string;
  xinchuang_attr: string;
  replace_advice: string;
  vendor: string;
  risk_level: string;
}



interface ViewManifestModalProps {
  visible: boolean;
  onCancel: () => void;
}

const ViewManifestModal: React.FC<ViewManifestModalProps> = ({
  visible,
  onCancel,
}) => {
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [selectedViewDetailRows, setSelectedViewDetailRows] = useState<
    DetailItem[]
  >([]);

  // 详情数据和加载状态
  const [item, setItem] = useState<any | null>(null);  // 信创组件清单基本信息
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const pagination = usePagination({ PAGESIZE_KEY: "inspectionList" });
  const [pageNum, setPageNum] = useState(1);
  
  // 编辑弹窗状态
  const [editModalVisible, setEditModalVisible] = useState(false);


  const componentColumn = [
    {
      title: "进程名",
      dataIndex: "process_name",
      key: "process_name",
      width: "150px",
    },
    {
      title: "组件类型",
      dataIndex: "component_type",
      key: "component_type",
      width: "150px",
      render: (text) => {
        const typeMap = {
          database: "数据库",
          middleware: "中间件"
        };
        return typeMap[text] || text;
      }
    },
    {
      title: "组件名称",
      dataIndex: "component_name",
      key: "component_name",
      width: "150px",
    },
    {
      title: "信创属性",
      dataIndex: "xinchuang_attr",
      key: "xinchuang_attr",
      width: "150px",
      render: (text) => {
        const attrMap = {
          xc: "信创",
          non_xc: "非信创"
        };
        return attrMap[text] || text;
      }
    },
    {
      title: "替代建议",
      dataIndex: "replace_advice",
      key: "replace_advice",
      width: "150px",
    },
    {
      title: "厂商",
      dataIndex: "vendor",
      key: "vendor",
      width: "150px",
    },
    {
      title: "风险等级",
      dataIndex: "risk_level",
      key: "risk_level",
      width: "150px",
      render: (text) => {
        const levelMap = {
          high: "高",
          medium: "中",
          low: "低"
        };
        return levelMap[text] || text;
      }
    },
  ];

  const [refreshFlag, setRefreshFlag] = useState<string>(
    _.uniqueId("refresh_flag"),
  );
  const getTableData = ({ current, pageSize }): Promise<any> => {
    setPageNum(current);
    const params = {
      query: searchKeyword,
      limit: pageSize,
      page: current,
      list_id: 1001,
    };

    return getXinchuangComponentItems({
      ...params,
    }).then((res) => {
      setItem(res.dat?.meta);  // 设置信创组件清单基本信息
      return {
        total: res.dat?.total || 0,
        list: res.dat?.list || [],
      };
    });
  };
  const { tableProps, run } = useAntdTable(getTableData, {
    defaultPageSize: pagination.pageSize,
    refreshDeps: [searchKeyword, refreshFlag],
  });


  // 导出组件清单
  const handleExport = async () => {
    // 显示确认对话框
    Modal.confirm({
      title: "确认导出",
      content:
        selectedViewDetailRows.length > 0
          ? `确定要导出选中的 ${selectedViewDetailRows.length} 条记录吗？`
          : "确定要导出全部记录吗？",
      okText: "确定",
      cancelText: "取消",
      onOk: async () => {
        try {
          // 准备导出参数
          const params = {
            list_id: 1001,
            // 如果有选中的行，传递选中行的ID
            // 否则传递空数组表示导出全部
            ids:
              selectedViewDetailRows.length > 0
                ? selectedViewDetailRows.map((row) => row.id).join(',')
                : '',
          };

          const exportTitle = "信创组件清单";
          const url = "/api/n9e/xinchuang/component-items/export";
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
      },
    });
  };

  const handleEdit = async () => {
    setEditModalVisible(true);
  };

  return (
    <Modal
      title="信创组件清单"
      visible={visible}
      onCancel={() => {
        onCancel();
        setSearchKeyword("");
        setSelectedViewDetailRows([]);
      }}
      footer={null}
      width={800}
    >
      <div style={{ display: "flex", marginBottom: 16 }}>
        <div style={{ marginRight: 32 }}>
          <span style={{ color: "#666", marginRight: 4 }}>最近更新时间：</span>
          <span>{item?.last_updated_at || "-"}</span>
        </div>
        <div style={{ marginRight: 32 }}>
          <span style={{ color: "#666", marginRight: 4 }}>最近更新人：</span>
          <span>{item?.last_updated_by || "-"}</span>
        </div>
      </div>
      <Divider style={{ borderColor: "#108ee9" }} />
      <div>清单明细</div>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Space>
          <Input
            placeholder="请输入软件名称/厂商/典型进程"
            style={{ width: 300 }}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <Button
            type="primary"
            onClick={()=>run({ current: 1, pageSize: pagination.pageSize })}
            icon={<SearchOutlined />}
            loading={searchLoading}
          >
            查询
          </Button>
        </Space>
        <Space>
          <Button type="primary" onClick={handleEdit}>
            修改
          </Button>
          {
            // (profile.roles?.includes("Admin") || permList.includes("/xh/assetmgt/ops")) &&
            <div>
              <Dropdown
                trigger={["click"]}
                overlay={
                  <Menu
                    style={{ width: "100px" }}
                    onClick={({ key }) => {
                      if (key == "export") {
                        handleExport();
                      } else if (key == "delete") {
                        if (selectedViewDetailRows.length <= 0) {
                          message.warning("请选择要批量删除的组件");
                          return;
                        } else {
                          Modal.confirm({
                            title: "确认要删除吗",
                            onOk: async () => {
                              let rows = selectedViewDetailRows?.map(
                                (item) => item.id,
                              );
                              batchDeleteXinchuangComponentItems({ list_id:1001,ids: rows }).then((res) => {
                                message.success("删除成功！");
                                // 重新获取信创组件清单
                                setRefreshFlag(_.uniqueId("refresh_flag"));
                                setSelectedViewDetailRows([]);
                              });
                            },
                            onCancel() {},
                          });
                        }
                      }
                    }}
                    items={[
                      { key: "export", label: "导出清单" },
                      { key: "delete", label: "批量删除" },
                    ]}
                  ></Menu>
                }
              >
                <Button>
                  批量操作 <DownOutlined />
                </Button>
              </Dropdown>
            </div>
          }
        </Space>
      </div>

      <Table
        size="small"
        rowKey="id"
        columns={componentColumn}
        {...tableProps}
        pagination={{
          ...tableProps.pagination,
          ...pagination,
        }}
        style={{ marginTop: 16 }}
        rowSelection={{
          onChange: (_, rows) => {
            setSelectedViewDetailRows(rows || []);
          },
        }}
      />
      
      {/* 编辑清单弹窗 */}
      <EditManifestModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
        }}
        onRefresh={() => {
          // 刷新表格数据
          setRefreshFlag(_.uniqueId("refresh_flag"));
        }}
      />
    </Modal>
  );
};

export default ViewManifestModal;

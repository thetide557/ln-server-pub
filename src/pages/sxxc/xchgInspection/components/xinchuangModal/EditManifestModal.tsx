import React, { useState, useEffect } from "react";
import {
  Modal,
  Table,
  Form,
  Input,
  Select,
  message,
  Button,
  Space,
} from "antd";
import _ from "lodash";
import {
  PlusSquareOutlined,
  MinusSquareOutlined,
} from "@ant-design/icons";

import {
  getXinchuangComponentItems,
  batchSaveXinchuangComponentItems,
} from "@/services/sxxc/inspection";

// 定义清单明细项接口
interface DetailItem {
  id?: number;
  process_name: string;
  component_type: string;
  component_name: string;
  component_name_zh: string;
  xinchuang_attr: string;
  replace_advice: string;
  vendor: string;
  risk_level: string;
}

interface XinchuangModalProps {
  visible: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

const XinchuangModal: React.FC<XinchuangModalProps> = ({
  visible,
  onClose,
  onRefresh,
}) => {
  const [editForm] = Form.useForm();
  const [addDetails, setAddDetails] = useState<DetailItem[]>([]); // 组件清单明细表格数据
  const [deletedIds, setDeletedIds] = useState<number[]>([]); // 存储要删除的id数组
  const [loading, setLoading] = useState(false);

  const [refreshFlag, setRefreshFlag] = useState<string>(
    _.uniqueId("refresh_flag"),
  );
  const getTableData = (): Promise<any> => {
    return getXinchuangComponentItems({list_id: 1001})
      .then(({ dat }) => {
        const list = Array.isArray(dat?.list) ? dat.list : [];
        // 如果没数据时，初始化一条空数据
        if (list.length === 0) {
          setAddDetails([addDetailRow()]);
        }else { 
          setAddDetails(list);
        }
      })
      .catch((error) => {
        console.error("获取组件清单列表失败:", error);
        setAddDetails([addDetailRow()]);
      });
  };


  // 当modal打开时，获取初始数据
  useEffect(() => {
    if (visible) {
      getTableData();
    } else {
      // 重置状态
      setAddDetails([]);
      setDeletedIds([]);
    }
  }, [visible]);

  // 新增清单明细行
  const addDetailRow = (defaultValues?: Partial<DetailItem>) => {
    // 生成临时id，格式为负数，以区分原始id（正数）
    const tempId = -Date.now() - Math.floor(Math.random() * 1000);
    const newRow: DetailItem = {
      id: tempId,
      process_name: defaultValues?.process_name || "",
      component_type: defaultValues?.component_type || "",
      component_name: defaultValues?.component_name || "",
      component_name_zh: defaultValues?.component_name_zh || "",
      xinchuang_attr: defaultValues?.xinchuang_attr || "",
      replace_advice: defaultValues?.replace_advice || "",
      vendor: defaultValues?.vendor || "",
      risk_level: defaultValues?.risk_level || "",
    };
    return newRow;
  };

  // 删除行
  const handleDelete = (record: DetailItem) => {
    if (record.id && record.id > 0) {
      // 对于有id的行（从后端获取的），添加到删除数组
      setDeletedIds((prev) => (record.id ? [...prev, record.id] : prev));     
    }
    // 从表格数据中删除
    setAddDetails((prev) => prev.filter((item) => item.id !== record.id));
    // 如果删除后没有数据，添加一行空数据
    if (addDetails.length <= 1) {
      setAddDetails([addDetailRow()]);
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      // 验证所有必填项
      const hasEmptyFields = addDetails.some((item) => {
        return (
          !item.process_name ||
          !item.component_type ||
          !item.component_name ||
          !item.component_name_zh ||
          !item.xinchuang_attr ||
          !item.replace_advice ||
          !item.vendor ||
          !item.risk_level
        );
      });

      if (hasEmptyFields) {
        message.error("所有带*的字段都是必填项，请填写完整");
        return;
      }

      // 验证进程名去重
      const processNameSet = new Set<string>();
      let hasDuplicateProcessName = false;
      for (const item of addDetails) {
        if (processNameSet.has(item.process_name)) {
          hasDuplicateProcessName = true;
          break;
        }
        processNameSet.add(item.process_name);
      }

      if (hasDuplicateProcessName) {
        message.error("进程名不能重复");
        return;
      }

      // 验证组件名称去重
      const componentNameSet = new Set<string>();
      let hasDuplicateComponentName = false;
      for (const item of addDetails) {
        if (componentNameSet.has(item.component_name)) {
          hasDuplicateComponentName = true;
          break;
        }
        componentNameSet.add(item.component_name);
      }

      if (hasDuplicateComponentName) {
        message.error("组件名称不能重复");
        return;
      }
      setLoading(true);

      // 准备提交数据
      const submitData = {
        list_id: 1001, // 固定值1001
        items: addDetails.map((item) => {
          // 移除临时id（负数）
          const { id } = item;
          return {
            ...(id && id > 0 ? { id } : {}),
            process_name: item.process_name,
            component_type: item.component_type,
            component_name: item.component_name,
            component_name_zh: item.component_name_zh,
            xinchuang_attr: item.xinchuang_attr,
            replace_advice: item.replace_advice,
            vendor: item.vendor,
            risk_level: item.risk_level,
          };
        }),
        delete_ids: deletedIds,
      };

      // console.log("提交数据:", submitData);
      await batchSaveXinchuangComponentItems(submitData);
      message.success("提交成功");
      // 刷新父组件表格数据
      if (onRefresh) {
        onRefresh();
      }
      // 关闭弹窗
      onClose();
    } catch (error) {
      console.error("提交失败:", error);
      // message.error("提交失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 信创清单弹框 */}
      <Modal
        title="信创组件清单"
        visible={visible}
        onCancel={onClose}
        width={1000}
        footer={[
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleSubmit}
            loading={loading}
          >
            提交
          </Button>,
        ]}
        destroyOnClose
      >
        <Form form={editForm}>
          <Table
            size="small"
            rowKey="id"
            dataSource={addDetails}
            pagination={false}
            columns={[
              {
                title: "序号",
                render: (text, record, index) => `${index + 1}`,
                width: 80,
              },
              {
                title: <span><span style={{ color: 'red' }}>*</span>进程名</span>,
                dataIndex: "process_name",
                key: "process_name",
                width: "150px",
                render: (text, record) => (
                  <Input
                    value={record.process_name}
                    onChange={(e) => {
                      setAddDetails(
                        addDetails.map((item) => {
                          if (item.id === record.id) {
                            return {
                              ...item,
                              process_name: e.target.value,
                            };
                          }
                          return item;
                        }),
                      );
                    }}
                    placeholder="请输入进程名"
                    style={{ width: "100%" }}
                  />
                ),
              },
              {
                title: <span><span style={{ color: 'red' }}>*</span>组件类型</span>,
                dataIndex: "component_type",
                key: "component_type",
                width: "150px",
                render: (text, record) => (
                  <Select
                    value={record.component_type}
                    onChange={(value) => {
                      setAddDetails(
                        addDetails.map((item) => {
                          if (item.id === record.id) {
                            return {
                              ...item,
                              component_type: value,
                            };
                          }
                          return item;
                        }),
                      );
                    }}
                    placeholder="请选择组件类型"
                    style={{ width: "100%" }}
                    options={[
                      { value: "database", label: "数据库" },
                      { value: "middleware", label: "中间件" },
                    ]}
                  />
                ),
              },
              {
                title: <span><span style={{ color: 'red' }}>*</span>组件名称</span>,
                dataIndex: "component_name",
                key: "component_name",
                width: "150px",
                render: (text, record) => (
                  <Input
                    value={record.component_name}
                    onChange={(e) => {
                      setAddDetails(
                        addDetails.map((item) => {
                          if (item.id === record.id) {
                            return { ...item, component_name: e.target.value };
                          }
                          return item;
                        }),
                      );
                    }}
                    placeholder="请输入组件名称"
                    style={{ width: "100%" }}
                  />
                ),
              },
              {
                title: <span><span style={{ color: 'red' }}>*</span>组件中文名称</span>,
                dataIndex: "component_name_zh",
                key: "component_name_zh",
                width: "180px",
                render: (text, record) => (
                  <Input
                    value={record.component_name_zh}
                    onChange={(e) => {
                      setAddDetails(
                        addDetails.map((item) => {
                          if (item.id === record.id) {
                            return { ...item, component_name_zh: e.target.value };
                          }
                          return item;
                        }),
                      );
                    }}
                    placeholder="请输入组件中文名称"
                    style={{ width: "100%" }}
                  />
                ),
              },
              {
                title: <span><span style={{ color: 'red' }}>*</span>信创属性</span>,
                dataIndex: "xinchuang_attr",
                key: "xinchuangAttribute",
                width: "150px",
                render: (text, record) => (
                  <Select
                    value={record.xinchuang_attr}
                    onChange={(value) => {
                      setAddDetails(
                        addDetails.map((item) => {
                          if (item.id === record.id) {
                            return {
                              ...item,
                              xinchuang_attr: value,
                            };
                          }
                          return item;
                        }),
                      );
                    }}
                    placeholder="请选择信创属性"
                    style={{ width: "100%" }}
                    options={[
                      { value: "xc", label: "信创" },
                      { value: "non_xc", label: "非信创" },
                    ]}
                  />
                ),
              },
              {
                title: <span><span style={{ color: 'red' }}>*</span>替代建议</span>,
                dataIndex: "replace_advice",
                key: "replace_advice",
                width: "150px",
                render: (text, record) => (
                  <Input
                    value={record.replace_advice}
                    onChange={(e) => {
                      setAddDetails(
                        addDetails.map((item) => {
                          if (item.id === record.id) {
                            return { ...item, replace_advice: e.target.value };
                          }
                          return item;
                        }),
                      );
                    }}
                    placeholder="请输入替代建议"
                    style={{ width: "100%" }}
                  />
                ),
              },
              {
                title: <span><span style={{ color: 'red' }}>*</span>厂商</span>,
                dataIndex: "vendor",
                key: "vendor",
                width: "150px",
                render: (text, record) => (
                  <Input
                    value={record.vendor}
                    onChange={(e) => {
                      setAddDetails(
                        addDetails.map((item) => {
                          if (item.id === record.id) {
                            return { ...item, vendor: e.target.value };
                          }
                          return item;
                        }),
                      );
                    }}
                    placeholder="请输入厂商"
                    style={{ width: "100%" }}
                  />
                ),
              },
              {
                title: <span><span style={{ color: 'red' }}>*</span>风险等级</span>,
                dataIndex: "risk_level",
                key: "risk_level",
                width: "150px",
                render: (text, record) => (
                  <Select
                    value={record.risk_level}
                    onChange={(value) => {
                      setAddDetails(
                        addDetails.map((item) => {
                          if (item.id === record.id) {
                            return {
                              ...item,
                              risk_level: value,
                            };
                          }
                          return item;
                        }),
                      );
                    }}
                    placeholder="请选择风险等级"
                    style={{ width: "100%" }}
                    options={[
                      { value: "high", label: "高" },
                      { value: "medium", label: "中" },
                      { value: "low", label: "低" },
                    ]}
                  />
                ),
              },
              {
                title: "操作",
                key: "action",
                width: "120px",
                render: (text, record, index) => (
                  <Space>
                    <MinusSquareOutlined
                      style={{ fontSize: 13, color: "#1890FF" }}
                      onClick={() => handleDelete(record)}
                    />
                    <PlusSquareOutlined
                      style={{ fontSize: 13, color: "#1890FF" }}
                      onClick={() =>
                        setAddDetails([...addDetails, addDetailRow()])
                      }
                    />
                  </Space>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </>
  );
};

export default XinchuangModal;

import React, { useState, useContext, useEffect } from "react";
import {
  Table,
  Input,
  Select,
  Button,
  Checkbox,
  Modal,
  Form,
  Menu,
  Dropdown,
  message,
} from "antd";
import { PlusSquareOutlined } from "@ant-design/icons";
import { CommonStateContext } from "@/App";
import _ from "lodash";
import "./style.less";
import {
  getIotAttributeList,
  getIotPage,
  IotPageEdit,
} from "@/services/sxxc/iotAssets";

interface FieldItem {
  Id: number | null;
  Name: string;
  SortOrder: number | null;
  DisplayOrder: number | null | undefined;
  PageId: number | null;
  TypeId: number | null;
}

interface PageConfig {
  PageId: string;
  // 新增可选属性 tempPageId
  tempPageId?: string;
  PageName: string;
  Attributes: FieldItem[];
}

const FieldConfig = (props) => {
  const { profile, permList } = useContext(CommonStateContext);
  const { open, closeOpen, typeId } = props;
  // console.log("typeId", typeId,typeof typeId);
  const [form] = Form.useForm();
  const [selectedFields, setSelectedFields] = useState<(number | null)[]>([]);
  const [fieldsList, setFieldsList] = useState<any>([]); // 可选的字段名称

  // 存储分页数据
  const [paginationData, setPaginationData] = useState<PageConfig[]>([]);

  useEffect(() => {
    getFieldsByType(typeId);
    getPagesByType(typeId);
  }, [typeId]);
  useEffect(() => {
    form.setFieldsValue({ paginationData });
    console.log("paginationData", paginationData);
  }, [paginationData]);

  // 根据选择资产类型生成可选字段列表
  const getFieldsByType = (typeId: number) => {
    getIotAttributeList({ typeId }).then((res) => {
      const { dat } = res;
      setFieldsList(dat);
    });
  };

  // 根据选择资产类型生成分页数据
  const getPagesByType = (typeId: number) => {
    getIotPage({ typeId }).then((res) => {
      const { dat } = res;
      if (dat) {
        setPaginationData(dat);
      } else {
        setPaginationData([
          {
            PageId: "",
            tempPageId: _.uniqueId("pages_"), // 新增临时ID
            PageName: "",
            Attributes: [],
          },
        ]);
      }
    });
  };

  // 添加分页
  const handleAddPagination = () => {
    setPaginationData([
      ...paginationData,
      {
        PageId: "",
        tempPageId: _.uniqueId("pages_"), // 新增临时ID
        PageName: "",
        Attributes: [],
      },
    ]);
  };

  // 添加字段行
  const handleAddRow = (paginationId: string) => {
    setPaginationData(
      paginationData.map((page) => {
        if (
          page.PageId
            ? page.PageId === paginationId
            : page.tempPageId === paginationId
        ) {
          return {
            ...page,
            Attributes: [
              ...page.Attributes,
              {
                Id: null,
                Name: "",
                SortOrder: null,
                DisplayOrder: null,
                PageId: null,
                TypeId: typeId,
              },
            ],
          };
        }
        return page;
      })
    );
  };

  // 显示列字段：过滤出 DisplayOrder 不等于 null 的属性
  // TODO:显示列DisplayOrder值是null/undefined的时候，传递到后端就变成0了
  const getDisplayFields = (paginationData) => {
    let result: {
      Id: number | null;
      Name: string;
      DisplayOrder: number | null;
    }[] = [];
    paginationData.map((page) => {
      // 检查 page.Attributes 是否存在
      if (page.Attributes) {
        const filteredAttributes = page.Attributes.filter(
          (attr) =>
            attr.pageId !== -1 &&
            attr.DisplayOrder !== null &&
            attr.DisplayOrder !== 0
        ).map((attr) => ({
          Id: attr.Id,
          Name: attr.Name,
          DisplayOrder: attr.DisplayOrder,
        }));
        result = [...result, ...filteredAttributes];
      }
    });
    return result;
  };

  // 批量移出显示列
  // TODO:显示列DisplayOrder值是null/undefined的时候，传递到后端就变成0了
  const handleBatchRemove = (paginationId: string, fieldIds: any[]) => {
    const newData = paginationData.map((page) => {
      if (
        page.PageId
          ? page.PageId === paginationId
          : page.tempPageId === paginationId
      ) {
        const updatedFields = [...page.Attributes];
        // 更新状态
        updatedFields.forEach((f) => {
          if (fieldIds.includes(f.Id)) {
            // if (f.DisplayOrder !== null) {
            f.DisplayOrder = null;
            // }
          }
        });
        return {
          ...page,
          Attributes: updatedFields,
        };
      }
      return page;
    });

    // 重新计算显示排序
    const displayFields = getDisplayFields(newData).sort(
      (a, b) => (a.DisplayOrder || 0) - (b.DisplayOrder || 0)
    ); // 按原顺序排序

    // 重新编号
    displayFields.forEach((field, index) => {
      field.DisplayOrder = index + 1;
    });

    // 更新显示列字段的排序
    newData?.forEach((page) => {
      page.Attributes?.forEach((f) => {
        const displayField = displayFields.find((item) => item.Id === f.Id);
        if (displayField) {
          f.DisplayOrder = displayField.DisplayOrder;
        }
      });
    });

    // 更新表单数据
    // form.setFieldsValue({ paginationData: newData });
    setPaginationData(newData);
  };

  // 批量设为显示列
  // TODO:显示列DisplayOrder值是null/undefined的时候，传递到后端就变成0了
  const handleBatchDisplay = (paginationId: string, fieldIds: any[]) => {
    const newData = paginationData.map((page) => {
      if (
        page.PageId
          ? page.PageId === paginationId
          : page.tempPageId === paginationId
      ) {
        const updatedFields = [...page.Attributes];
        updatedFields.forEach((f) => {
          // if (fieldIds.includes(f.Id) && f.DisplayOrder === null && f.DisplayOrder=== 0) {
          if (fieldIds.includes(f.Id)) {
            f.DisplayOrder = undefined;
          }
        });
        return {
          ...page,
          Attributes: updatedFields,
        };
      }
      return page;
    });
    // 更新表单数据
    // form.setFieldsValue({ paginationData: newData });
    setPaginationData(newData);
  };

  // 批量删除
  const handleBatchDelete = (paginationId: string, fieldIds: any[]) => {
    // const newData = paginationData.map((page) => {
    //   if (page.PageId === paginationId) {
    //     const updatedFields = [...page.Attributes];
    //     updatedFields.forEach((f) => {
    //       if (fieldIds.includes(f.Id)) {
    //         f.PageId = -1;
    //         f.DisplayOrder = -1;
    //         f.SortOrder = null;
    //       }
    //     });
    //     // 删除之后处理分页字段排序
    //     const remainFields = updatedFields
    //       .filter((f) => f.PageId !== -1)
    //       .sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));
    //     remainFields.forEach((field, index) => {
    //       field.SortOrder = index + 1;
    //     });
    //     return {
    //       ...page,
    //       Attributes: updatedFields, // 返回更新后的 page 对象
    //     };
    //   }
    //   return page;
    // });

    const newData = paginationData.map((page) => {
      if (
        page.PageId
          ? page.PageId === paginationId
          : page.tempPageId === paginationId
      ) {
        const remainFields =
          page.Attributes.filter((f) => !fieldIds.includes(f.Id)) || [];
        // 删除之后处理排序逻辑
        if (remainFields.length) {
          // 处理分页字段排序
          remainFields.sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));
          remainFields.forEach((field, index) => {
            field.SortOrder = index + 1;
          });
        }
        return {
          ...page,
          Attributes: remainFields,
        };
      }
      return page;
    });

    // 处理显示列字段排序
    const displayFields = getDisplayFields(newData);
    displayFields.sort((a, b) => (a.DisplayOrder || 0) - (b.DisplayOrder || 0));
    displayFields?.forEach((field, index) => {
      field.DisplayOrder = index + 1;
    });
    // 更新显示列字段的排序
    newData?.forEach((page) => {
      page.Attributes?.forEach((f) => {
        const displayField = displayFields.find((item) => item.Id === f.Id);
        if (displayField) {
          f.DisplayOrder = displayField.DisplayOrder;
        }
      });
    });

    // 更新表单数据
    // form.setFieldsValue({ paginationData: newData });
    setPaginationData(newData);
  };

  // 获取已选中的字段名称
  const getSelectedAttributeNames = () => {
    let selectedNames: string[] = [];
    paginationData.forEach((page) => {
      page.Attributes?.forEach((attr) => {
        if (attr.PageId !== -1 && attr.Name) {
          selectedNames.push(attr.Name);
        }
      });
    });
    return selectedNames;
  };
  // 生成去重的分页字段排序选项
  const getAvailablePageOrders = (
    paginationId: string,
    currentFieldId: number | null
  ) => {
    // 获取当前分页所有字段
    const currentPage = paginationData.find((page) =>
      page.PageId
        ? page.PageId === paginationId
        : page.tempPageId === paginationId
    );
    if (!currentPage?.Attributes) return [];

    // 收集已使用的排序值（排除当前字段自身）
    const usedOrders = currentPage.Attributes.filter(
      (f) => f.PageId !== -1 && f.Id !== currentFieldId && f.SortOrder !== null
    ).map((f) => f.SortOrder);

    // 生成可用选项
    return Array.from(
      { length: currentPage.Attributes.length },
      (_, i) => i + 1
    )
      .filter((n) => !usedOrders.includes(n))
      .map((n) => ({ label: n, value: n }));
  };
  // 生成去重的显示列字段排序选项
  const getAvailableDisplayOrders = (currentFieldId: number | null) => {
    // 获取所有显示列字段
    const displayFields = getDisplayFields(paginationData);
    // 收集已使用的排序值（排除当前字段自身）
    const usedOrders = displayFields
      .filter((f) => f.Id !== currentFieldId && f.DisplayOrder !== undefined)
      .map((f) => f.DisplayOrder);

    // 生成可用选项
    return Array.from({ length: displayFields.length }, (_, i) => i + 1)
      .filter((n) => !usedOrders.includes(n))
      .map((n) => ({ label: n, value: n }));
  };

  // 同步表单数据到分页数据
  const syncFormToState = (changedValues: any, allValues: any) => {
    // console.log("allValues", allValues);
    // 将表单数据转换为与分页数据状态相同的结构
    const formPages: PageConfig[] = allValues.paginationData.map(
      (formPage: any, index: number) => ({
        ...paginationData[index],
        ...formPage,
        Attributes:
          formPage.Attributes?.map((formField: any, fieldIndex: number) => ({
            Id: fieldsList.find((item) => item.Name === formField.Name)?.Id,
            ...formField,
            PageId:
              paginationData[index]?.Attributes[fieldIndex].PageId ||
              Number(formPage.PageId), // 保留原始PageId
            TypeId: typeId,
          })) || [],
      })
    );
    setPaginationData(formPages);
  };

  // const syncFormToState = (changedValues: any, allValues: any) => {
  //   // 将表单数据转换为与分页数据状态相同的结构
  //   const formPages: PageConfig[] = allValues.paginationData.map(
  //     (formPage: any, index: number) => {
  //       const originalAttributes = paginationData[index]
  //         ? paginationData[index].Attributes
  //         : [];
  //       const removedAttributes = originalAttributes.filter(
  //         (attr) => attr.PageId === -1
  //       );

  //       const formAttributes =
  //         formPage.Attributes?.map((formField: any, fieldIndex: number) => ({
  //           // 处理新增的字段，用户选中字段后，对应的id
  //           Id: fieldsList.find((item) => item.Name === formField.Name)?.Id,
  //           ...formField,
  //           // DisplayOrder:
  //           //   formField.DisplayOrder != -1 ? formField.DisplayOrder : null,
  //           PageId:
  //             originalAttributes[fieldIndex]?.PageId || Number(formPage.PageId), // 保留原始PageId
  //           TypeId: typeId,
  //         })) || [];
  //       return {
  //         ...formPage,
  //         Attributes: [...removedAttributes, ...formAttributes],
  //       };
  //     }
  //   );
  //   setPaginationData(formPages);
  // };

  const handleOk = () => {
    const submitData = paginationData.map((page) => {
      const newPage = { ...page };
      // 如果存在 tempPageId 属性，则删除它
      if (newPage.tempPageId) {
        delete newPage.tempPageId;
      }
      return newPage;
    });
    console.log("分页数据", paginationData, "submitData", submitData);
    // TODO:API调用
    form
      .validateFields()
      .then(() => {
        IotPageEdit(submitData, typeId).then((res) => {
          message.success("配置成功");
          closeOpen("sure");
          // getPagesByType(typeId);
        });
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleCancel = () => {
    closeOpen("cancel");
  };

  return (
    <Modal
      visible={open}
      title="字段配置"
      width={650}
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <Form form={form} onValuesChange={syncFormToState}>
        {paginationData &&
          paginationData.map((pagination, paginationIndex) => (
            <div key={pagination.PageId + "_" + paginationIndex}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontWeight: "bold",
                }}
              >
                <span>分页{paginationIndex + 1}</span>
                <span
                  style={{ marginLeft: "10px" }}
                  onClick={handleAddPagination}
                >
                  <PlusSquareOutlined
                    style={{ fontSize: 13, color: "#1890FF" }}
                  />
                </span>
              </div>
              <Form.Item
                name={["paginationData", paginationIndex, "PageId"]}
                hidden
              >
                <Input />
              </Form.Item>
              <Form.Item
                name={["paginationData", paginationIndex, "PageName"]}
                label="分页名称"
                rules={[
                  { required: true },
                  {
                    validator: (_, value) => {
                      const duplicateNames = paginationData.filter(
                        (page, index) =>
                          index !== paginationIndex && page.PageName === value
                      );
                      return duplicateNames.length === 0
                        ? Promise.resolve()
                        : Promise.reject("分页名称不能重复");
                    },
                  },
                ]}
              >
                <Input placeholder="请输入分页名称" maxLength={20} />
              </Form.Item>
              {(profile.roles?.includes("Admin") ||
                permList.includes("/xh/assetmgt/ops")) && (
                <div className="batch-operation">
                  <Dropdown
                    trigger={["click"]}
                    overlay={
                      <Menu
                        style={{ width: "100px" }}
                        onClick={({ key }) => {
                          if (key == "show-fields") {
                            handleBatchDisplay(
                              pagination.tempPageId
                                ? pagination.tempPageId
                                : pagination.PageId,
                              selectedFields
                            );
                          } else if (key == "remove-fields") {
                            handleBatchRemove(
                              pagination.tempPageId
                                ? pagination.tempPageId
                                : pagination.PageId,
                              selectedFields
                            );
                          } else if (key == "del-fields") {
                            handleBatchDelete(
                              pagination.tempPageId
                                ? pagination.tempPageId
                                : pagination.PageId,
                              selectedFields
                            );
                          }
                        }}
                        items={[
                          {
                            key: "show-fields",
                            label: "设为显示列",
                          },
                          {
                            key: "remove-fields",
                            label: "移出显示列",
                          },
                          {
                            key: "del-fields",
                            label: "批量删除",
                          },
                        ]}
                      ></Menu>
                    }
                  >
                    <Button type="primary">批量操作</Button>
                  </Dropdown>
                </div>
              )}
              <Table
                dataSource={pagination.Attributes?.filter(
                  (f) => f.PageId !== -1
                )}
                // rowKey="Id"
                rowKey={(record, index) => `${record.Id}_${index}`}
                pagination={false}
                bordered
                size="small"
                rowClassName="column-config-table-row"
                rowSelection={{
                  onChange: (_, record) => {
                    setSelectedFields(record ? record.map(({ Id }) => Id) : []);
                  },
                }}
                columns={[
                  {
                    title: "字段名称",
                    dataIndex: "Name",
                    width: 150,
                    render: (_, record, fieldIndex) => (
                      <Form.Item
                        name={[
                          "paginationData",
                          paginationIndex,
                          "Attributes",
                          fieldIndex,
                          "Name",
                        ]}
                        rules={[
                          {
                            validator: (_, value) => {
                              const duplicates = pagination.Attributes.filter(
                                (f) => f.Name === value
                              );
                              return duplicates.length <= 1
                                ? Promise.resolve()
                                : Promise.reject("字段名称重复");
                            },
                          },
                        ]}
                      >
                        <Select placeholder="请输入字段" showSearch>
                          {/* {fieldsList.map((item) => {
                          return (
                            <Select.Option value={item.Name} key={item.Id}>
                              {item.Name}
                            </Select.Option>
                          );
                        })} */}
                          {fieldsList
                            .filter(
                              (item) =>
                                !getSelectedAttributeNames().includes(item.Name)
                            )
                            .map((item) => {
                              return (
                                <Select.Option value={item.Name} key={item.Id}>
                                  {item.Name}
                                </Select.Option>
                              );
                            })}
                        </Select>
                      </Form.Item>
                    ),
                  },
                  {
                    title: "分页字段排序",
                    dataIndex: "SortOrder",
                    render: (value, record, fieldIndex) => (
                      <Form.Item
                        name={[
                          "paginationData",
                          paginationIndex,
                          "Attributes",
                          fieldIndex,
                          "SortOrder",
                        ]}
                        // rules={[
                        //   { required: true },
                        //   {
                        //     validator: (_, value) => {
                        //       const duplicates = pagination.Attributes.filter(
                        //         (f: FieldItem, idx: number) =>
                        //           idx !== fieldIndex && f.SortOrder === value
                        //       );
                        //       return duplicates.length === 0
                        //         ? Promise.resolve()
                        //         : Promise.reject("该排序值已被使用");
                        //     },
                        //   },
                        // ]}
                      >
                        {/* <Select placeholder="请选择排序">
                        {pagination.Attributes.map((_, i) => (
                          <Select.Option key={i} value={i + 1}>
                            {i + 1}
                          </Select.Option>
                        ))}
                      </Select> */}
                        <Select
                          options={getAvailablePageOrders(
                            pagination.tempPageId
                              ? pagination.tempPageId
                              : pagination.PageId,
                            record.Id
                          )}
                          placeholder="选择排序"
                        />
                      </Form.Item>
                    ),
                  },
                  {
                    title: "显示列字段排序",
                    dataIndex: "DisplayOrder",
                    render: (value, record, fieldIndex) => (
                      <Form.Item
                        name={[
                          "paginationData",
                          paginationIndex,
                          "Attributes",
                          fieldIndex,
                          "DisplayOrder",
                        ]}
                      >
                        {/* <Select
                        placeholder="请选择排序"
                        disabled={!record.isDisplay}
                      >
                        {pagination.Attributes
                          .filter((f) => f.isDisplay)
                          .map((f, i) => (
                            <Select.Option key={i} value={i + 1}>
                              {i + 1}
                            </Select.Option>
                          ))}
                      </Select> */}
                        <Select
                          options={getAvailableDisplayOrders(record.Id)}
                          placeholder="选择排序"
                          disabled={
                            record.DisplayOrder === null ||
                            record.DisplayOrder === 0
                          }
                        />
                      </Form.Item>
                    ),
                  },
                  {
                    title: "操作",
                    render: (_, record) => (
                      <>
                        {/* TODO:显示列DisplayOrder值是null/undefined的时候，传递到后端就变成0了 */}
                        {record.DisplayOrder === null ||
                        record.DisplayOrder === 0 ? (
                          <Button
                            type="link"
                            size="small"
                            onClick={() => {
                              handleBatchDisplay(
                                pagination.tempPageId
                                  ? pagination.tempPageId
                                  : pagination.PageId,
                                [record.Id]
                              );
                            }}
                          >
                            设为显示列
                          </Button>
                        ) : (
                          <Button
                            type="link"
                            size="small"
                            onClick={() =>
                              handleBatchRemove(
                                pagination.tempPageId
                                  ? pagination.tempPageId
                                  : pagination.PageId,
                                [record.Id]
                              )
                            }
                          >
                            移出显示列
                          </Button>
                        )}
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() =>
                            handleBatchDelete(
                              pagination.tempPageId
                                ? pagination.tempPageId
                                : pagination.PageId,
                              [record.Id]
                            )
                          }
                          style={{ marginLeft: 10 }}
                        >
                          删除
                        </Button>
                      </>
                    ),
                  },
                ]}
              />
              <div style={{ marginLeft: "10px", marginTop: "10px" }}>
                <PlusSquareOutlined
                  style={{ fontSize: 13, color: "#1890FF" }}
                  onClick={() =>
                    handleAddRow(
                      pagination.tempPageId
                        ? pagination.tempPageId
                        : pagination.PageId
                    )
                  }
                />
              </div>
            </div>
          ))}
      </Form>
    </Modal>
  );
};

export default FieldConfig;

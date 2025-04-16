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
  Tooltip
} from "antd";
import { PlusSquareOutlined,MinusSquareFilled } from "@ant-design/icons";
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
  tempFieldId?: string;
  Name: string;
  Alias: string;
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
  const [selectedFields, setSelectedFields] = useState<(any)[]>([]);
  const [fieldsList, setFieldsList] = useState<any>([]); // 可选的字段名称

  // 存储分页数据
  const [paginationData, setPaginationData] = useState<PageConfig[]>([]);

  useEffect(() => {
    // if(typeId!=0){
      getFieldsByType(typeId);
      getPagesByType(typeId);
    // }
  }, [typeId]);
  useEffect(() => {
    form.setFieldsValue({ paginationData });
    console.log("paginationData", paginationData);
  }, [paginationData]);

  // 根据选择资产类型生成可选字段列表
  const getFieldsByType = (typeId: number) => {
    if (typeId === 0) {
      setFieldsList([]);
      return;
    }
    getIotAttributeList({ typeId }).then((res) => {
      const { dat } = res;
      setFieldsList(dat || []);
    });
  };

  // 根据选择资产类型生成分页数据
  const getPagesByType = (typeId: number) => {
    if (typeId === 0) {
      setPaginationData([
        {
          PageId: "",
          tempPageId: _.uniqueId("pages_"), // 新增临时ID
          PageName: "",
          Attributes: [],
        },
      ]);
      return;
    }
    getIotPage({ typeId }).then((res) => {
      const { dat } = res;
      if (dat) {
        // 处理 DisplayOrder  和 SortOrder 为 0 的情况，转为null
        const newPaginationData = dat.map((page) => {
          const newAttributes = page.Attributes.map((attr) => {
            const updatedDisplayOrder = attr.DisplayOrder === 0 ? null : attr.DisplayOrder;
            const updatedSortOrder = attr.SortOrder === 0 ? null : attr.SortOrder;
            return {
              ...attr,
              DisplayOrder: updatedDisplayOrder,
              SortOrder: updatedSortOrder,
            };
          });
          return {
            ...page,
            Attributes: newAttributes,
          };
        });
        setPaginationData(newPaginationData);
        // setPaginationData(dat);
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

  // TODO:删除分页
  const handleDelPagination = (paginationId: string)=>{
    // 检查当前分页数量是否大于 1
  if (paginationData.length > 1) {
    const newData = paginationData.filter((page) => 
          page.PageId
            ? page.PageId !== paginationId
            : page.tempPageId !== paginationId
    )
    // 更新显示列排序
    const displayFields = getDisplayFields(newData).filter(field => field.DisplayOrder!== null && field.DisplayOrder!== undefined) ?.sort(
      (a, b) => (a.DisplayOrder || 0) - (b.DisplayOrder || 0)
    ); 
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
    setPaginationData(newData);

  }else {
    // 当分页数量为 1 时，提示信息
    message.warning('至少保留一个分页');
  }
    
  }
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
                tempFieldId: _.uniqueId("fields_"), // 新增临时ID
                Name: "",
                Alias: "",
                SortOrder: null,
                DisplayOrder: null,
                PageId: page.PageId ? Number(page.PageId) : null,
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
  // 显示列DisplayOrder值是null/undefined的时候，传递到后端就变成0了
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
  // 显示列DisplayOrder值是null/undefined的时候，传递到后端就变成0了
  const handleBatchRemove = (paginationId: string, fieldIds: any[]) => {
    const newData = paginationData.map((page) => {
      if (
        page.PageId
          ? page.PageId === paginationId
          : page.tempPageId === paginationId
      ) {
        // 批量操作没有选中数据时，为全部数据
        if (fieldIds.length === 0) {
          fieldIds = page.Attributes.map((f) => f.Id || f.tempFieldId);
        }
        // console.log("fieldIds11111移出", fieldIds);
        const updatedFields = [...page.Attributes];
        // 更新状态
        updatedFields.forEach((f) => {
          // const id = f.Id!== null && f.Id!== undefined? f.Id : f.tempFieldId;
          const id = f.Id || f.tempFieldId;
          if (fieldIds.includes(id)) {
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
    const displayFields = getDisplayFields(newData).filter(field => field.DisplayOrder!== null && field.DisplayOrder!== undefined) ?.sort(
      (a, b) => (a.DisplayOrder || 0) - (b.DisplayOrder || 0)
    ); 
    // console.log("显示列要排序的字段", displayFields);  
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
  const handleBatchDisplay = (paginationId: string, fieldIds: any[]) => {
    console.log("设为显示列", fieldIds);
    const newData = paginationData.map((page) => {
      if (
        page.PageId
          ? page.PageId === paginationId
          : page.tempPageId === paginationId
      ) {
        // 批量操作没有选中数据时，为全部数据
        if (fieldIds.length === 0) {
          fieldIds = page.Attributes.map((f) => f.Id || f.tempFieldId);
        }
        // console.log("fieldIds设为", fieldIds);
        const updatedFields = [...page.Attributes];
        updatedFields.forEach((f) => {
          // if (fieldIds.includes(f.Id) && f.DisplayOrder === null && f.DisplayOrder=== 0) {
          // const id = f.Id!== null && f.Id!== undefined? f.Id : f.tempFieldId;
          const id = f.Id || f.tempFieldId;
          if (fieldIds.includes(id)) {
            if (f.DisplayOrder === null) {
              f.DisplayOrder = undefined; // 初始值为 undefined
            }
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
        // const remainFields =
        //   page.Attributes.filter((f) => !fieldIds.includes(f.Id)) || [];
        // 批量操作没有选中数据时，为全部数据
        if (fieldIds.length === 0) {
          fieldIds = page.Attributes.map((f) => f.Id || f.tempFieldId);
        }
        // console.log("fieldIds删除", fieldIds);
        const remainFields = page.Attributes.filter((f) => {
          // const id = f.Id!== null && f.Id!== undefined? f.Id : f.tempFieldId;
          const id = f.Id || f.tempFieldId;
          return !fieldIds.includes(id);
        }) || [];
        console.log("删除后剩余分页排序的字段", remainFields);
        // 删除之后处理排序逻辑
        const fieldsWithSortOrder = remainFields.filter((field) => field.SortOrder!== null && field.SortOrder!== undefined);
        console.log("删除后要重新排序的字段", fieldsWithSortOrder);
        if (fieldsWithSortOrder.length) {
          // 处理分页字段排序
          fieldsWithSortOrder.sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));
          fieldsWithSortOrder.forEach((field, index) => {
            field.SortOrder = index + 1;
          });
        }
        const updatedRemainFields = remainFields.map((field) => {
          const sortedField = fieldsWithSortOrder.find((f) => f.Id === field.Id);
          return sortedField || field;
        });
        return {
          ...page,
          Attributes: updatedRemainFields,
        };
      }
      return page;

    });

    // 处理显示列字段排序
    const displayFields = getDisplayFields(newData);
    const fieldsWithDisplayOrder = displayFields.filter(field => field.DisplayOrder!== null && field.DisplayOrder!== undefined) || [];
    fieldsWithDisplayOrder.sort((a, b) => (a.DisplayOrder || 0) - (b.DisplayOrder || 0));
    fieldsWithDisplayOrder?.forEach((field, index) => {
      field.DisplayOrder = index + 1;
    });
    // 更新显示列字段的排序
    newData?.forEach((page) => {
      page.Attributes?.forEach((f) => {
        const displayField = fieldsWithDisplayOrder.find((item) => item.Id === f.Id);
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
  // const getSelectedAttributeNames = () => {
  //   let selectedNames: string[] = [];
  //   paginationData.forEach((page) => {
  //     page.Attributes?.forEach((attr) => {
  //       if (attr.PageId !== -1 && attr.Name) {
  //         selectedNames.push(attr.Name);
  //       }
  //     });
  //   });
  //   return selectedNames;
  // };
  // 生成去重的分页字段排序选项
  // const getAvailablePageOrders = (
  //   paginationId: string,
  //   currentFieldId: number | null
  // ) => {
  //   // 获取当前分页所有字段
  //   const currentPage = paginationData.find((page) =>
  //     page.PageId
  //       ? page.PageId === paginationId
  //       : page.tempPageId === paginationId
  //   );
  //   if (!currentPage?.Attributes) return [];

  //   // 收集已使用的排序值（排除当前字段自身）
  //   const usedOrders = currentPage.Attributes.filter(
  //     (f) => f.PageId !== -1 && f.Id !== currentFieldId && f.SortOrder !== null
  //   ).map((f) => f.SortOrder);

  //   // 生成可用选项
  //   return Array.from(
  //     { length: currentPage.Attributes.length },
  //     (_, i) => i + 1
  //   )
  //     .filter((n) => !usedOrders.includes(n))
  //     .map((n) => ({ label: n, value: n }));
  // };

  // 生成去重的显示列字段排序选项
  // const getAvailableDisplayOrders = (currentFieldId: number | null) => {
  //   // 获取所有显示列字段
  //   const displayFields = getDisplayFields(paginationData);
  //   // 收集已使用的排序值（排除当前字段自身）
  //   const usedOrders = displayFields
  //     .filter((f) => f.Id !== currentFieldId && f.DisplayOrder !== undefined)
  //     .map((f) => f.DisplayOrder);

  //   // 生成可用选项
  //   return Array.from({ length: displayFields.length }, (_, i) => i + 1)
  //     .filter((n) => !usedOrders.includes(n))
  //     .map((n) => ({ label: n, value: n }));
  // };


  // 生成显示列字段排序选项
  const getDisplayOrders = () => {
    const displayFields = getDisplayFields(paginationData);
    return Array.from({ length: displayFields.length }, (_, i) => i + 1).map((n) => ({ label: n, value: n }));
  }


  // 同步表单数据到分页数据
  const syncFormToState = (changedValues: any, allValues: any) => {
    console.log("allValues", changedValues,allValues);
    // 判断 Name 是否发生变化
    let pageIndex = undefined;
    let attrIndex = undefined;
    if (changedValues.paginationData) {
      changedValues.paginationData.forEach((page,i) => {
        if (page && page.Attributes) {
          pageIndex = i
          page.Attributes.forEach((attr,j) => {
            if (attr && Object.prototype.hasOwnProperty.call(attr, 'Name')) {
              attrIndex = j
            }
          })
        }
      });
    }
    // console.log("字段名称发生变化", pageIndex,attrIndex);
    // 字段中文名称默认值设置
    if(pageIndex !== undefined && attrIndex !== undefined){
      // allValues.paginationData[pageIndex].Attributes[attrIndex].Alias = ''
      const updateAttr = allValues.paginationData[pageIndex].Attributes[attrIndex]
      updateAttr.Alias = fieldsList.find((item) => item.Name === updateAttr.Name)?.Alias || '';
    }

    // 将表单数据转换为与分页数据状态相同的结构
    const formPages: PageConfig[] = allValues.paginationData.map(
      (formPage: any, index: number) => ({
        ...paginationData[index],
        ...formPage,
        Attributes:
          formPage.Attributes?.map((formField: any, fieldIndex: number) => ({
            ...paginationData[index]?.Attributes[fieldIndex],
            ...formField,
            Id: fieldsList.find((item) => item.Name === formField.Name)?.Id,
            PageId:
              paginationData[index]?.Attributes[fieldIndex].PageId ||
              Number(formPage.PageId), // 保留原始PageId
            TypeId: typeId,
            // Alias: formField.Alias || fieldsList.find((item) => item.Name === formField.Name)?.Alias,
            // 去除 Alias 属性值的前后空格
            Alias:formField.Alias.trim()            
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
      // 删除 Attributes 中每个数据项的 tempFieldId 属性
      newPage.Attributes = newPage.Attributes.map((attr) => {
        const newAttr = { ...attr };
        if (newAttr.tempFieldId) {
          delete newAttr.tempFieldId;
        }
        return newAttr;
      });
      return newPage;
    });
    console.log("分页数据", paginationData, "submitData", submitData);
    // API调用
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
      width={850}
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
                <span
                  style={{ marginLeft: "10px" }}
                  onClick={()=>handleDelPagination(pagination.tempPageId
                    ? pagination.tempPageId
                    : pagination.PageId)}
                >
                  <MinusSquareFilled style={{ fontSize: 13, color: "#aaaaaa"}}/>
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
                          index !== paginationIndex && page.PageName && page.PageName === value
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
              {
              // (profile.roles?.includes("Admin") ||
              //   permList.includes("/xh/assetmgt/ops")) && 
              (
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
                rowKey={(record) => `${record.Id || record.tempFieldId}_${record.Name}`}
                pagination={false}
                bordered
                size="small"
                rowClassName="column-config-table-row"
                rowSelection={{
                  onChange: (_, record) => {
                    setSelectedFields(record ? record.map((item) => item.Id || item.tempFieldId) : []);
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
                          // TODO:字段名重复值校验
                          {
                            validator: (_, value) => {
                              let isDuplicate = false;
                              // 遍历所有分页数据
                              paginationData.forEach((page, pageIndex) => {
                                page.Attributes.forEach((attr, attrIndex) => {
                                  // 排除当前字段本身
                                  if (
                                    pageIndex !== paginationIndex ||
                                    attrIndex !== fieldIndex
                                  ) {
                                    if (attr.Name && attr.Name === value) {
                                      isDuplicate = true;
                                    }
                                  }
                                });
                              });
                              return isDuplicate
                                ? Promise.reject("字段名称重复")
                                : Promise.resolve();
                            },
                          },
                        ]}
                      >
                        <Select placeholder="请选择字段" showSearch 
        //                 onChange={(value) => {
        //   const selectedField = fieldsList.find((item) => item.Name === value);
        //   console.log("111111",selectedField);
        //   if (selectedField) {
        //     form.setFieldsValue({
        //       // [`paginationData[${paginationIndex}].Attributes[${fieldIndex}].Alias`]: selectedField.Alias,
        //       // [['paginationData', paginationIndex, 'Attributes', fieldIndex, 'Alias'].join('.')]: selectedField.Alias
        //       'paginationData':{[paginationIndex]:{'Attributes':{[fieldIndex]:{'Alias':selectedField.Alias}}}}
        //     });
            
        //   }
        // }}
        >
                          {fieldsList.map((item) => {
                          return (
                            <Select.Option value={item.Name} key={item.Id + item.Name}>
                              {item.Name}
                            </Select.Option>
                          );
                        })}
                          {/* {fieldsList
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
                            })} */}
                        </Select>
                      </Form.Item>
                    ),
                  },
                  {
                    title: "中文名称",
                    dataIndex: "Alias",
                    width: 150,
                    // ellipsis: true,
                    render: (_, record, fieldIndex) => (
                      <Tooltip title={record.Alias || ''}> 
                        <Form.Item
                          name={[
                            "paginationData",
                            paginationIndex,
                            "Attributes",
                            fieldIndex,
                            "Alias",
                          ]}
                          rules={[
                            // { required: true },
                            { required: Boolean(record.Name), message: '请输入中文名称' },
                            // TODO:字段中文名称重复值校验
                            {
                              validator: (_, value) => {
                                let isDuplicate = false;
                                // 遍历所有分页数据
                                paginationData.forEach((page, pageIndex) => {
                                  page.Attributes.forEach((attr, attrIndex) => {
                                    // 排除当前字段本身
                                    if (
                                      pageIndex !== paginationIndex ||
                                      attrIndex !== fieldIndex
                                    ) {
                                      if (attr.Alias && attr.Alias === value) {
                                        isDuplicate = true;
                                      }
                                    }
                                  });
                                });
                                return isDuplicate
                                  ? Promise.reject("中文名称重复")
                                  : Promise.resolve();
                              },
                            },
                          ]}
                        > 
                          <Input placeholder='请输入中文名称' maxLength={20}/>
                        </Form.Item>
                      </Tooltip>
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
                        rules={[
                          // { required: true },
                          { required: Boolean(record.Name), message: '请选择分页字段排序' },
                          {
                            validator: (_, value) => {
                              const duplicates = pagination.Attributes.filter(
                                (f: FieldItem, idx: number) =>
                                  idx !== fieldIndex && f.SortOrder && f.SortOrder === value
                              );
                              return duplicates.length === 0
                                ? Promise.resolve()
                                : Promise.reject("分页排序值重复");
                            },
                          },
                        ]}
                      >
                      <Select placeholder="请选择排序">
                        {pagination.Attributes.map((_, i) => (
                          <Select.Option key={i} value={i + 1}>
                            {i + 1}
                          </Select.Option>
                        ))}
                      </Select>
                        {/* <Select
                          options={getAvailablePageOrders(
                            pagination.tempPageId
                              ? pagination.tempPageId
                              : pagination.PageId,
                            record.Id
                          )}
                          placeholder="选择排序"
                        /> */}
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
                        // TODO:显示列排序值重复校验
                        rules={[
                          { required: Boolean(record.Name) && record.DisplayOrder === undefined, message: '请选择显示列排序' },
                          // {
                          //   validator: (_, value) => {
                          //     const displayFields = getDisplayFields(paginationData);
                          //     const duplicates = displayFields.filter(
                          //       (f) =>
                          //         f.DisplayOrder === value
                          //     );
                          //     return duplicates.length === 0
                          //       ? Promise.resolve()
                          //       : Promise.reject("该显示列排序值已被使用");
                          //   },
                          // },
                          {
                            validator: (_, value) => {
                              let isDuplicate = false;
                              // 遍历所有分页数据
                              paginationData.forEach((page, pageIndex) => {
                                page.Attributes.forEach((attr, attrIndex) => {
                                  // 排除当前字段本身
                                  if (
                                    pageIndex !== paginationIndex ||
                                    attrIndex !== fieldIndex
                                  ) {
                                    if (attr.DisplayOrder && attr.DisplayOrder === value) {
                                      isDuplicate = true;
                                    }
                                  }
                                });
                              });
                              return isDuplicate
                                ? Promise.reject("显示列排序值重复")
                                : Promise.resolve();
                            },
                          },
                          
                        ]}
                      >
                      <Select
                        placeholder="请选择排序"
                        disabled={record.DisplayOrder === null ||
                          record.DisplayOrder === 0}
                        options={getDisplayOrders()}
                      >
                      </Select>
                        {/* <Select
                          options={getAvailableDisplayOrders(record.Id)}
                          placeholder="选择排序"
                          disabled={
                            record.DisplayOrder === null ||
                            record.DisplayOrder === 0
                          }
                        /> */}
                      </Form.Item>
                    ),
                  },
                  {
                    title: "操作",
                    render: (_, record) => (
                      <>
                        {/* 显示列DisplayOrder值是null/undefined的时候，传递到后端就变成0了 */}
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
                                  [record.Id || record.tempFieldId]
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
                                  [record.Id || record.tempFieldId]
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
                              [record.Id || record.tempFieldId]
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

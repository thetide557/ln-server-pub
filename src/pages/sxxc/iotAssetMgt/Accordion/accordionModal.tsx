import React, { useCallback, useContext, useEffect, useState } from "react";
import { Form, Input, Modal, Select, message } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { CommonStateContext } from "@/App";
import {
  getIotTypeList,
  addIotType,
  addIotTree,
} from "@/services/sxxc/iotAssets";
import _ from "lodash";
import "./index.less";

const AccordionModal = (props: any) => {
  const { busiGroups, profile, permList } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const [addTypeForm] = Form.useForm(); // 新增设备类型表单
  const { title, open, closeOpen, curGroup, level, parentId } = props;
  const [checkList, setCheckList] = useState<any>([]);
  const [deviceTypes, setDeviceTypes] = useState<any>([]); // 分组内设备类型
  const [isModalOpen, setIsModalOpen] = useState(false); // 新增设备类型弹窗是否显示
  // const [addDeviceTypes, setAddDeviceTypes] = useState<any>([]); // 新增设备类型

  // 获取分组内设备类型选项
  const getDeviceTypes = () => {
    getIotTypeList().then((res) => {
      const { dat } = res;
      const newDat = dat.map((item) => ({
        id: item.id,
        name: item.name
      }));
      setDeviceTypes(newDat);
    });
  };
  // 初始化加载设备类型
  useEffect(() => {
    getDeviceTypes();
  }, []);

  // 根据typeId查找设备类型
  const filterDataByIds = (data, ids) => {
    return data.filter((item) => ids.includes(item.id));
  };

  useEffect(() => {
    console.log("当前分组", curGroup);
    if (curGroup.nodeName) {
      const typsList = curGroup.TypeIds!="-1"?JSON.parse(curGroup.TypeIds) : [];
      const selectDeviceList = filterDataByIds(deviceTypes, typsList);
      // console.log("当前分组设备", selectDeviceList);
      // 修改
      const obj = {
        id: curGroup.nodeId,
        Name: curGroup.nodeName,
        TypeIds: typsList,
      };
      setCheckList(selectDeviceList);
      form.setFieldsValue(obj);
    }
  }, [deviceTypes]);

  const handleOk = () => {
    form
      .validateFields()
      .then((data) => {
        // API调用
        let params = { ...data };
        params.Depth = level;
        params.ParentId = parentId;
        params.TypeIds = params.TypeIds?.length>0 ? JSON.stringify(params.TypeIds) : "-1"
        // 编辑需要传入节点id
        if (curGroup.nodeName) {
          params.Id = curGroup.nodeId;
          console.log("编辑分组",params);
          addIotTree({ ...params }).then((res) => {
            message.success("修改成功");
            closeOpen("sure");
          });
        } else {
          console.log("新增分组",params);
          addIotTree(params).then((res) => {
            message.success("新增成功");
            closeOpen("sure");
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const handleCancel = () => {
    closeOpen("cancel");
  };

  const handleChange = (value: any, option: any) => {
    console.log(value);
    const selectDeviceList = filterDataByIds(deviceTypes, value);
    // console.log(option);
    setCheckList(selectDeviceList);
  };

  // 新增设备类型
  const handleAddTypeOK = () => {
    addTypeForm
      .validateFields()
      .then((data) => {
        addIotType(data).then((res) => {
          message.success("新增成功");
          closeOpen("sure");
        });
        getDeviceTypes();
        setIsModalOpen(false);
        addTypeForm.resetFields();
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const reset = () => {
    // 重置下拉框
    form.setFieldsValue({
      TypeIds: [],
    });
    setCheckList([]);
  };

  const remove = (id) => {
    // console.log(item);
    const data = checkList?.filter((item) => item.id !== id);
    const newTypeIds = data.map((item) => item.id);
    // console.log(data);
    form.setFieldsValue({
      TypeIds: newTypeIds,
    });
    setCheckList(data);
  };

  return (
    <>
      <Modal
        visible={open}
        title={title}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={form}>
          <Form.Item name="Name" label="分组名称" rules={[{ required: true }]}>
            <Input placeholder="请输入分组名称" maxLength={20} />
          </Form.Item>
          <Form.Item
            name="TypeIds"
            label="分组设备"
            rules={[
              { required: level === 2, message: "请选择分组内的设备类型" },
            ]}
          >
            {/* 当有多级分组时，上层分级应该禁用编辑中的分组设备 */}
            <Select
              mode="multiple"
              placeholder="请选择分组内的设备类型"
              disabled={curGroup.TypeIds == "-1" && curGroup.subNode?.length > 0}
              onChange={handleChange}
              allowClear
              optionFilterProp='children'
              dropdownRender={(menu) => (
                <>
                  {menu}
                  {/* admin账号显示该选项 */}
                  { (profile.roles?.includes('Admin') ||
                    permList.includes('/sxxc/iotassetmgt/adddevicetype')) && (
                    <div
                      className="ant-select-item"
                      style={{ padding: "8px 12px", cursor: "pointer" }}
                      onClick={() => setIsModalOpen(true)}
                    >
                      新增设备类型
                    </div>
                  )}
                </>
              )}
            >
              {_.map(deviceTypes, (item) => {
                return (
                  <Select.Option value={item.id} key={item.name}>
                    {item.name}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
          <Form.Item label={null}>
            <div className="check-box">
              <div className="check-title">
                <div className="check-num">已选（{checkList?.length}）</div>
                <div className="check-reset" onClick={reset}>
                  <div className="check-icon"></div>
                  <div>重置</div>
                </div>
              </div>
              <div className="check-content">
                {_.map(checkList, (item) => {
                  return (
                    <div className="check-card" key={item.id}>
                      <div
                        className="card-icon"
                        onClick={() => {
                          remove(item.id);
                        }}
                      ></div>
                      <div>{item.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Form.Item>
        </Form>
      </Modal>
      {/* 新增设备类型弹窗 */}
      <Modal
        title="新增设备类型"
        visible={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleAddTypeOK}
      >
        <Form form={addTypeForm}>
          <Form.Item
            name="name"
            label="设备类型"
            rules={[{ required: true, message: "请输入设备类型" }]}
          >
            <Input placeholder="请输入设备类型" />
            {/* <Select  placeholder="请输入设备类型" allowClear>
              {_.map(addDeviceTypes, (item) => {
                return (
                  <Select.Option value={item.name} key={item.id}>
                    {item.name}
                  </Select.Option>
                );
              })}
            </Select> */}
          </Form.Item>
          <Form.Item
            name="TableName"
            label="设备表名"
            rules={[{ required: true, message: "请输入设备表名" }]}
          >
            <Input placeholder="请输入设备表名" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
export default AccordionModal;

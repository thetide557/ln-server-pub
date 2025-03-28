import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Tag,
  Tooltip,
  TreeSelect,
  Upload,
  message,
} from "antd";
import { useTranslation } from "react-i18next";
import { CommonStateContext } from "@/App";
import { debounce } from "lodash";
import {
  bindTags,
  deleteXhAssets,
  getAssetsTags,
  moveTargetBusi,
  unbindTags,
  updateAssetNote,
  changeAssetOrganization,
} from "@/services/assets";
import { getBusiGroups } from "@/services/common";
import { OperateType } from "./index";
import { exportTemplet } from "@/services/assets/asset";
import Icon from "@ant-design/icons";
import moment from "moment";
import "./style.less";
import { getOrganizationTree, importXhAssetSetData } from "@/services/assets";

export const OperationModal = ({
  operateType,
  setOperateType,
  assets,
  names,
  reloadList,
  typeId,
}) => {
  const { t } = useTranslation("iotassets");
  const { busiGroups } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [assetsList, setAssetsList] = useState<string[]>(assets);
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>();
  const [fileList, setFileList] = useState<any[]>([]);
  const detailProp =
    operateType === OperateType.UnbindTag ? tagsList : busiGroups;
  const [treeData, setTreeData] = useState([]);
  const [ids, setIds] = useState<string>();
  const [ftype, setFtype] = useState<number>(1);

  const style = {
    style1: {
      width: "150px",
    },
  };

  const props = {
    showUploadList: false,
    onRemove: (file) => {
      setFileList([]);
    },
    beforeUpload: (file) => {
      console.log(file);
      let { name } = file;
      var fileExtension = name.substring(name.lastIndexOf(".") + 1); //截取文件后缀名
      if (fileExtension == "xls" || fileExtension == "xlsx") {
        setFileName(name);
        let newList = new Array();
        newList.push(file);
        fileList.concat(...newList);
        setFileList(newList);
        return false;
      } else {
        message.error("文件格式错误，系统支持excel格式xls、xlsx");
      }
    },
    fileList,
  };

  useEffect(() => {
    console.log("initData", assets);
    if (operateType === OperateType.ChangeOrganize) {
      getOrganizationTree({}).then(({ dat }) => {
        setTreeData(dat);
      });
    } else if (operateType != OperateType.None) {
      setAssetsList(assets);
      setIds(assets.join("\n"));
      form.setFieldsValue({
        ids: assets.join("\n"),
      });
    }
  }, [operateType, assets]);
  // 绑定标签弹窗内容
  const bindTagDetail = () => {
    // 校验单个标签格式是否正确
    function isTagValid(tag) {
      const contentRegExp = /^[a-zA-Z_][\w]*={1}[^=]+$/;
      return {
        isCorrectFormat: contentRegExp.test(tag.toString()),
        isLengthAllowed: tag.toString().length <= 64,
      };
    }

    // 渲染标签
    function tagRender(content) {
      const { isCorrectFormat, isLengthAllowed } = isTagValid(content.value);
      return isCorrectFormat && isLengthAllowed ? (
        <Tag closable={content.closable} onClose={content.onClose}>
          {content.value}
        </Tag>
      ) : (
        <Tooltip
          title={
            isCorrectFormat
              ? t("bind_tag.render_tip1")
              : t("bind_tag.render_tip2")
          }
        >
          <Tag
            color="error"
            closable={content.closable}
            onClose={content.onClose}
            style={{ marginTop: "2px" }}
          >
            {content.value}
          </Tag>
        </Tooltip>
      );
    }

    // 校验所有标签格式
    function isValidFormat() {
      return {
        validator(_, value) {
          const isInvalid = value.some((tag) => {
            const { isCorrectFormat, isLengthAllowed } = isTagValid(tag);
            if (!isCorrectFormat || !isLengthAllowed) {
              return true;
            }
          });
          return isInvalid
            ? Promise.reject(new Error(t("bind_tag.msg2")))
            : Promise.resolve();
        },
      };
    }

    return {
      operateTitle: t("bind_tag.title"),
      requestFunc: bindTags,
      isFormItem: true,
      render() {
        return (
          <>
            <Form.Item name="ids" rules={[{ required: true }]} hidden>
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 10 }}
                onBlur={formatValue}
                defaultValue={assets}
              />
            </Form.Item>
            <Form.Item
              label={t("assets")}
              name="names"
              rules={[{ required: true }]}
            >
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 10 }}
                placeholder={"关联资产信息"}
                onBlur={formatValue}
                readOnly
              />
            </Form.Item>
            <Form.Item
              label={t("common:table.tag")}
              name="tags"
              rules={[
                { required: true, message: t("bind_tag.msg1") },
                isValidFormat,
              ]}
            >
              <Select
                mode="tags"
                tokenSeparators={[" "]}
                open={false}
                placeholder={t("bind_tag.placeholder")}
                tagRender={tagRender}
              />
            </Form.Item>
          </>
        );
      },
    };
  };

  // 解绑标签弹窗内容
  const unbindTagDetail = (tagsList) => {
    return {
      operateTitle: t("unbind_tag.title"),
      requestFunc: unbindTags,
      isFormItem: true,
      render() {
        return (
          <>
            <Form.Item name="ids" rules={[{ required: true }]} hidden>
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 10 }}
                onBlur={formatValue}
              />
            </Form.Item>
            <Form.Item
              label={t("assets")}
              name="names"
              rules={[{ required: true }]}
            >
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 10 }}
                placeholder={"关联资产信息"}
                onBlur={formatValue}
                readOnly
              />
            </Form.Item>
            <Form.Item
              label={t("common:table.tag")}
              name="tags"
              rules={[{ required: true, message: t("unbind_tag.msg") }]}
            >
              <Select
                mode="multiple"
                showArrow={true}
                placeholder={t("unbind_tag.placeholder")}
                options={tagsList.map((tag) => ({ label: tag, value: tag }))}
              />
            </Form.Item>
          </>
        );
      },
    };
  };

  // 移出业务组弹窗内容
  const removeBusiDetail = () => {
    return {
      operateTitle: t("remove_busi.title"),
      requestFunc: moveTargetBusi,
      isFormItem: false,
      render() {
        return (
          <>
            <Form.Item name="ids" rules={[{ required: true }]} hidden>
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 10 }}
                onBlur={formatValue}
              />
            </Form.Item>
            <Form.Item
              labelCol={{ span: 2 }}
              label={t("assets")}
              name="names"
              rules={[{ required: true }]}
            >
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 10 }}
                placeholder={"关联资产信息"}
                onBlur={formatValue}
                readOnly
              />
            </Form.Item>
            <Form.Item label={""}>
              <Alert message={t("remove_busi.msg")} type="error" />;
            </Form.Item>
          </>
        );
      },
    };
  };

  // 批量导出弹窗内容
  const assetBatchExportDetail = () => {
    return {
      operateTitle: "资产导出",
      requestFunc: moveTargetBusi,
      isFormItem: false,
      render() {
        return (
          <>
            <>
              {assets.length > 0 ? (
                <div className="tip_title">确认要导出所选中的资产记录吗?</div>
              ) : (
                <div className="tip_title">确认要导出所有的资产记录吗？</div>
              )}
            </>
            <Radio.Group
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }}
              defaultValue={ftype}
            >
              <Radio
                value={1}
                onChange={(e) => {
                  setFtype(parseInt("" + e.target.value));
                }}
              >
                Excel
              </Radio>
              {/* <Radio value={2} onChange={e=>{
                  setFtype(parseInt(""+e.target.value))
               }}>Xml</Radio>
               <Radio value={3} onChange={e=>{
                  setFtype(parseInt(""+e.target.value))
               }}>Txt</Radio> */}
            </Radio.Group>
          </>
        );
      },
    };
  };
  // 修改备注弹窗内容
  const updateNoteDetail = () => {
    return {
      operateTitle: t("update_note.title"),
      requestFunc: updateAssetNote,
      isFormItem: true,
      render() {
        return (
          <>
            <Form.Item name="ids" rules={[{ required: true }]} hidden>
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 10 }}
                onBlur={formatValue}
              />
            </Form.Item>
            <Form.Item
              label={t("assets")}
              name="names"
              rules={[{ required: true }]}
            >
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 10 }}
                placeholder={"关联资产信息"}
                onBlur={formatValue}
                readOnly
              />
            </Form.Item>
            <Form.Item label={t("common:table.note")} name="note">
              <Input
                maxLength={64}
                placeholder={t("update_note.placeholder")}
              />
            </Form.Item>
          </>
        );
      },
    };
  };

  const changeOrganizeDetail = () => {
    return {
      operateTitle: t("变更资产所属组织树"),
      requestFunc: changeAssetOrganization,
      isFormItem: true,
      render() {
        return (
          <>
            <Form.Item name="ids" rules={[{ required: true }]} hidden>
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 10 }}
                onBlur={formatValue}
              />
            </Form.Item>
            <Form.Item
              label={t("assets")}
              name="names"
              rules={[{ required: true }]}
            >
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 10 }}
                placeholder={"关联资产信息"}
                onBlur={formatValue}
                readOnly
              />
            </Form.Item>
            <Form.Item
              label={t("所属组织树")}
              name="id"
              rules={[{ required: true, message: t("请选择组织树") }]}
            >
              <TreeSelect
                showSearch
                style={{ width: "100%" }}
                dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
                placeholder="请选择所属组织机构"
                allowClear
                treeData={treeData}
                fieldNames={{
                  label: "name",
                  value: "id",
                  children: "children",
                }}
                treeDefaultExpandAll={true}
              ></TreeSelect>
            </Form.Item>
          </>
        );
      },
    };
  };

  // 批量删除弹窗内容
  const deleteDetail = () => {
    return {
      operateTitle: t("batch_delete.title"),
      requestFunc: deleteXhAssets,
      isFormItem: false,
      render() {
        return <Alert message={t("batch_delete.msg")} type="error" />;
      },
    };
  };

  // 修改业务组弹窗内容
  const updateBusiDetail = (busiGroups) => {
    return {
      operateTitle: t("update_busi.title"),
      requestFunc: moveTargetBusi,
      isFormItem: true,
      render() {
        return (
          <>
            <Form.Item name="ids" rules={[{ required: true }]} hidden>
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 10 }}
                onBlur={formatValue}
              />
            </Form.Item>
            <Form.Item
              label={t("assets")}
              name="names"
              rules={[{ required: true }]}
            >
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 10 }}
                placeholder={"关联资产信息"}
                onBlur={formatValue}
                readOnly
              />
            </Form.Item>
            <Form.Item
              label={t("update_busi.label")}
              name="bgid"
              rules={[{ required: true }]}
            >
              <Select
                showSearch
                style={{ width: "100%" }}
                options={filteredBusiGroups.map(({ id, name }) => ({
                  label: name,
                  value: id,
                }))}
                optionFilterProp="label"
                filterOption={false}
                onSearch={handleSearch}
                onFocus={() => {
                  getBusiGroups("").then((res) => {
                    setFilteredBusiGroups(res.dat || []);
                  });
                }}
                onClear={() => {
                  getBusiGroups("").then((res) => {
                    setFilteredBusiGroups(res.dat || []);
                  });
                }}
              />
            </Form.Item>
          </>
        );
      },
    };
  };
  //批量导入设备页面
  const assetBatchImportDetail = () => {
    return {
      isFormItem: true,
      operateTitle: t("数据导入"),
      render() {
        return (
          <Form.Item label="选择文件" name="file" rules={[{ required: true }]}>
            <div
              key={Math.random()}
              style={{ display: "inline-flex", gap: "8px" }}
            >
              <Input value={fileName} style={style.style1}></Input>
              <Upload {...props}>
                <Button type="primary">
                  <Icon type="upload" />
                  浏览
                </Button>
              </Upload>
              <Button
                className="down_load_button"
                onClick={async (event) => {
                  let url = "/api/n9e/xh/asset/templet";
                  let params = {};
                  let exportTitle = "资产";
                  exportTemplet(url, params).then((res) => {
                    const url = window.URL.createObjectURL(
                      new Blob(
                        [res],
                        // 设置该文件的mime类型，这里对应的mime类型对应为.xlsx格式
                        {
                          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        }
                      )
                    );
                    const link = document.createElement("a");
                    link.href = url;
                    const fileName =
                      exportTitle +
                      "导入模板_" +
                      moment().format("MMDDHHmmss") +
                      ".xls"; //decodeURI(res.headers['filename']);
                    link.setAttribute("download", fileName);
                    document.body.appendChild(link);
                    link.click();
                  });
                }}
                style={{
                  border: "0px solid #fff",
                  fontSize: "14px",
                  color: "#40A2EC",
                }}
              >
                下载模板
              </Button>
            </div>
          </Form.Item>
        );
      },
    };
  };

  const operateDetail = {
    bindTagDetail,
    unbindTagDetail,
    assetBatchImportDetail,
    updateBusiDetail,
    removeBusiDetail,
    updateNoteDetail,
    changeOrganizeDetail,
    deleteDetail,
    assetBatchExportDetail,
    noneDetail: () => ({
      operateTitle: "",
      requestFunc() {
        return Promise.resolve();
      },
      isFormItem: false,
      render() {},
    }),
  };
  const { operateTitle, requestFunc, isFormItem, render } =
    operateDetail[`${operateType}Detail`](detailProp);
  const [filteredBusiGroups, setFilteredBusiGroups] = useState(busiGroups);
  function formatValue() {
    const inputValue = form.getFieldValue("ids");
    const formattedIds = inputValue.split(/[ ,\n]+/).filter((value) => value);
    const formattedValue = formattedIds.join("\n");
    // 自动格式化表单内容
    if (inputValue !== formattedValue) {
      form.setFieldsValue({
        ids: formattedValue,
      });
    }
    // 当对象标识变更时，更新标识数组
    if (assetsList.sort().join("\n") !== formattedIds.sort().join("\n")) {
      setAssetsList(formattedIds);
    }
  }

  // 提交表单
  function submitForm() {
    if (operateType === OperateType.AssetBatchImport) {
      if (fileList == null || fileList.length == 0) {
        message.error("请选择要导入的文件");
        return;
      }
      let formData = new FormData();
      formData.append("file", fileList[0]);
      let url = "/api/n9e/xh/asset/import-xls";
      console.log("批量导入", url);
      importXhAssetSetData(url, formData).then((res) => {
        message.success("批量导入成功");
        setFileName("");
        setFileList([]);
        reloadList(null, operateType);
      });
    } else if (operateType === OperateType.AssetBatchExport) {
      // 导出设备
      // 如果用户选择了特定的资产，则导出选中的资产数据；否则，导出所有资产数据。
      let params: any = {};
      // params.ftype = 1;
      if (assetsList != null && assetsList.length > 0) {
        params.ids = assetsList;
      } else {
        delete names.limit;
        delete names.page;
        params = { ...params, ...names };
      }
      console.log("资产导出", assetsList, params);
      // TODO:构建导出 API 的 URL
      let url = "/api/n9e/iot/device/export?typeId=" + typeId;
      let exportTitle = "物联网资产";
      exportTemplet(url, params).then((res) => {
        const url = window.URL.createObjectURL(
          new Blob(
            [res],
            // 设置该文件的mime类型，这里对应的mime类型对应为.xlsx格式
            {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }
          )
        );
        const link = document.createElement("a");
        link.href = url;
        // 根据用户选择的文件类型，设置文件扩展名
        let fileType = ".xls";
        if (ftype === 1) {
          fileType = ".xls";
        } else if (ftype === 2) {
          fileType = ".xml";
        } else if (ftype === 3) {
          fileType = ".txt";
        }
        // 生成文件名，包含导出标题、时间戳和文件扩展名
        const fileName =
          exportTitle + "数据_" + moment().format("MMDDHHmmss") + fileType; //decodeURI(res.headers['filename']);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
      });
    } else {
      form.validateFields().then((data) => {
        // setConfirmLoading(true);
        data.ids = data.ids.split("\n");
        requestFunc(data)
          .then(() => {
            setOperateType(OperateType.None);
            reloadList();
            form.resetFields();
            setConfirmLoading(false);
          })
          .catch(() => setConfirmLoading(false));
      });
    }
  }

  // 初始化展示所有业务组
  useEffect(() => {
    if (!filteredBusiGroups.length) {
      setFilteredBusiGroups(busiGroups);
    }
  }, [busiGroups]);

  const fetchBusiGroup = (e) => {
    getBusiGroups(e).then((res) => {
      setFilteredBusiGroups(res.dat || []);
    });
  };
  const handleSearch = useCallback(debounce(fetchBusiGroup, 800), []);

  // 点击批量操作时，初始化默认监控对象列表
  useEffect(() => {
    if (operateType !== OperateType.None) {
      setAssetsList(assets);
      if (operateType !== OperateType.AssetBatchExport) {
        form.setFieldsValue({
          names: names.join("\n"),
        });
      }
      form.setFieldsValue({
        ids: assets.join("\n"),
      });
    }
  }, [operateType, assets]);

  // 解绑标签时，根据输入框监控对象动态获取标签列表
  useEffect(() => {
    if (operateType === OperateType.UnbindTag && assetsList.length) {
      getAssetsTags({ ids: assetsList.join(",") }).then(({ dat }) => {
        // 删除多余的选中标签
        const curSelectedTags = form.getFieldValue("tags") || [];
        form.setFieldsValue({
          tags: curSelectedTags.filter((tag) => dat.includes(tag)),
        });

        setTagsList(dat);
      });
    }
  }, [operateType, assetsList]);

  return (
    <Modal
      visible={operateType !== "none"}
      title={operateTitle}
      confirmLoading={confirmLoading}
      okButtonProps={{
        danger:
          operateType === OperateType.RemoveBusi ||
          operateType === OperateType.Delete,
      }}
      okText={
        operateType === OperateType.RemoveBusi
          ? t("remove_busi.btn")
          : operateType === OperateType.Delete
          ? t("batch_delete.btn")
          : t("common:btn.ok")
      }
      onOk={submitForm}
      onCancel={() => {
        setOperateType(OperateType.None);
        setFileName("");
        // form.setFieldsValue();
        setFileList([]);
        form.resetFields();
      }}
    >
      {/* 基础展示表单项 */}
      <Form form={form} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
        {isFormItem && render()}
      </Form>
      {!isFormItem && render()}
    </Modal>
  );
};

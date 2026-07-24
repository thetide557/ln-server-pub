import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Upload,message
} from "antd";
import { useTranslation } from "react-i18next";
import { CommonStateContext } from "@/App";
import { debounce } from "lodash";
import { getBusiGroups } from "@/services/common";
import { OperateType } from "./DutyList";
import { exportTemplet } from "@/services/assets/asset";
import Icon from "@ant-design/icons";
import moment from "moment";
import { importXhAssetSetData } from '@/services/assets';

// 定义导入配置接口
export interface ImportConfig {
  templateUrl: string;
  importUrl: string;
  templateTitle: string;
}
export const OperationModal = ({
  operateType,
  setOperateType,
  // assets,
  // names,
  reloadList,
  // 导入配置参数
  importConfig = {
    templateUrl: '/api/takin/duty/template',
    importUrl: '/api/takin/xh/duty/import-xls',
    templateTitle: '值班人员'
  }
}) => {
  const { t } = useTranslation("assets");
  const { busiGroups } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>();
  const [fileList, setFileList] = useState<any>([]);
   const detailProp = operateType ===  busiGroups;
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
      // console.log(file)
      let { name } = file;
      var fileExtension = name.substring(name.lastIndexOf(".") + 1); //截取文件后缀名
      setFileName(name);
      let newList = new Array();
      newList.push(file);
      fileList.concat(...newList);
      setFileList(newList);
      return false;
    },
    fileList,
  };

  
  //批量导入页面
  const importDetail = () => {
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
                  // let url = "/api/takin/busi-group/duty/template";
                  // let params = {};
                  // let exportTitle = "值班人员";
                  // 使用配置的URL和标题
                  let url = importConfig.templateUrl;
                  let params = {};
                  let exportTitle = importConfig.templateTitle;
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
    // bindTagDetail,
    // unbindTagDetail,
    importDetail,
    // updateBusiDetail,
    // removeBusiDetail,
    // updateNoteDetail,
    // changeOrganizeDetail,
    // deleteDetail,
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
  }

  // 提交表单
  function submitForm() {
    if (operateType === OperateType.Import) {
      if (fileList == null || fileList.length == 0) {
        message.error("请选择要导入的文件");
        return;
      }
      let formData = new FormData();
      formData.append("file", fileList[0]);
      // let url = "/api/takin/xh/duty/import-xls";
      // 使用配置的URL
      let url = importConfig.importUrl;
      console.log("批量导入", url);
      importXhAssetSetData(url, formData).then((res) => {
        message.success("批量导入成功");
        setFileName("");
        setFileList([]);
        reloadList(null, operateType);
        setOperateType(OperateType.None); // 关闭导入弹框
      });
    } else {
      form.validateFields().then((data) => {
        setConfirmLoading(true);
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

  // // 点击批量操作时，初始化默认监控对象列表
  // useEffect(() => {
  //   if (operateType !== OperateType.None) {
  //     setAssetsList(assets);
  //     form.setFieldsValue({
  //       names: names.join("\n"),
  //     });
  //     form.setFieldsValue({
  //       ids: assets.join("\n"),
  //     });
  //   }
  // }, [operateType, assets]);

  

  return (
    <Modal
      visible={operateType !== "none"}
      title={operateTitle}
      confirmLoading={confirmLoading}
      forceRender={true}
      okButtonProps={{
        danger:
          operateType === OperateType.Delete,
      }}
      okText={
         operateType === OperateType.Delete
          ? t("batch_delete.btn")
          : t("common:btn.ok")
      }
      onOk={submitForm}
      onCancel={() => {
        setOperateType(OperateType.None);
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

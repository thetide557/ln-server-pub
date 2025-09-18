// @ts-nocheck
import "./style.less";
import React, {
  Fragment,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  FormInstance,
  Input,
  message,
  Row,
  Select,
  Space,
  Tabs,
  DatePicker,
  Modal,
  InputNumber,
  Timeline,
  Tag,
} from "antd";
import { useTranslation } from "react-i18next";
import _ from "lodash";
import moment from "moment";
import { CommonStateContext } from "@/App";
import { MinusCircleOutlined } from "@ant-design/icons";
import { v4 as uuidv4 } from "uuid";
import { useLocation, useHistory } from "react-router-dom";
import queryString from "query-string";
import { getAssetsByCondition } from "@/services/assets";
import localeCompare from "@/pages/dashboard/Renderer/utils/localeCompare";
import { AutoComplete } from "antd";
import { timestamp, timestampToCST } from "@/utils/day";
import PageLayout from "@/components/pageLayout";
import { getIotPage,getIotDeviceDetail } from "@/services/sxxc/iotAssets";
const { Option } = Select;
const { TextArea } = Input;

export default function () {
  const { t } = useTranslation("iotassets");
  const [assetTypes, setAssetTypes] = useState<any[]>([]); // 资产类型
  const { busiGroups } = useContext(CommonStateContext); // 业务组
  const [formItems, setFormItems] = useState<any[]>([]); // tab项
  const [tabIndex, setTabIndex] = useState<string>(""); // 点击的tab索引
  const [editType, setEditType] = useState<string>("insert"); // 新增还是编辑
  const history = useHistory();

  const [hasSave, setHasSave] = useState<boolean>(true);

  const { search } = useLocation();
  const { mode, id, typeId, primaryKey } = queryString.parse(search);

  const [properties, setProperties] = useState({});

  // const [params, setParams] = useState<
  //   {
  //     label: string;
  //     name: string;
  //     required?: boolean;
  //     type: string;
  //     options?: [];
  //   }[]
  // >([]); 

  const [form] = Form.useForm();
  const [assetData, setAssetData] = useState<any>({}); // 集中保存提交的数据
  const [currentType, setCurrentType] = useState();

  const panelBaseProps: any = {
    size: "small",
    bodyStyle: { padding: "24px 24px 8px 24px" },
  };

  useEffect(() => {
    console.log("formItems", formItems);
  }, [formItems]);

  // TODO:根据选择资产类型生成分页数据
  useEffect(() => {
    // if(typeId !=0){
      getPagesByType(typeId);
    // }
  }, [typeId]);
  const getPagesByType = (typeId: number) => {
    if (!typeId) return;
    getIotPage({ typeId }).then((res) => {
      const { dat } = res;
      const newDat = dat.map((page) => ({
        ...page,
        // Attributes: page.Attributes.sort((a, b) => a.SortOrder - b.SortOrder),
        // 过滤 PageId 不等于 -1 且 SortOrder 不等于 0 的项，然后排序
        Attributes: page.Attributes?.filter(item => item.PageId !== -1 && item.SortOrder !== 0)?.sort((a, b) => a.SortOrder - b.SortOrder),
      }));
      setFormItems(newDat);
      setTabIndex(newDat[0].PageId)
    });
  };

  
  // TODO:获取资产详细信息，表单的回显值设置
  const loadAssetInfo = (id) => {
    console.log('primaryKey',primaryKey);
    if(id){
      if (!typeId) return;
      const param = {
        [primaryKey]: id,
        typeId
      }
      getIotDeviceDetail(param).then((res) => {
        const { dat } = res;
        form.setFieldsValue(dat);
      });
    }
   
  };


  useEffect(() => {
    if (id) {
      loadAssetInfo(id);
    }
  }, [id]);

  const TabOperteClick = (tabIndex: string) => {
    setTabIndex(tabIndex);
  };


  const renderFormItem = (v) => {
    if (v.type === "select") {
      return (
        <Select
          key={"v" + v.name}
          style={{ width: "100%" }}
          options={v.options}
        ></Select>
      );
    }
    if (v.type === "password") {
      return (
        <Input.Password key={"v" + v.name} placeholder={`请输入${v.label}`} />
      );
    }
    if (v.type === "checkbox") {
      return <Checkbox></Checkbox>;
    }
    return (
      <Input
        key={"v" + v.Name}
        placeholder={`请填写${v.Alias}`}
        name={v.Name}
      />
    );
  };



  

  const formItemLayout = { labelCol: { span: 8 }, wrapperCol: { span: 10 } };

  return (
    <PageLayout title="资产信息查看" showBack>
      <div className="asset_every">
        <div className="assetmgt_header_select">
          <Tabs
            className="assetmgt_list_2"
            activeKey={tabIndex}
            type="card"
            size="small"
            onTabClick={(key) => {
              TabOperteClick(key);
            }}
          >
            {formItems.map((groupItem, index) => {
              return (
                <Tabs.TabPane
                  tab={groupItem.PageName}
                  key={groupItem.PageId}
                  className="tab_header"
                ></Tabs.TabPane>
              );
            })}
          </Tabs>
        </div>
        <Form
          name="asset"
          form={form}
          layout="horizontal"
          disabled={mode == "view" ? true : false}
          {...formItemLayout}
          className="asset_xh_form"
        >
          
          <div className="card-wrapper">
            {formItems.map((groupItem, index) => {
              // {
              //   console.log("groupItem", groupItem);}
              if (tabIndex == groupItem.PageId) {
                return (
                  <Fragment key={groupItem.PageId}>
                    <Row gutter={10}>
                      {groupItem.Attributes.map((field, findex_) => {
                        return (
                          <Col key={field.Name + findex_} span={12}>
                          
                            <Form.Item
                              label={field.Alias}
                              key={field.Name + "_" + findex_}
                              name={field.Name}
                              // rules={[
                              //   {
                              //     required: field.required
                              //       ? field.required
                              //       : false,
                              //     message: `请选择您的${field.label}`,
                              //   },
                              // ]}
                            >
                              {renderFormItem(field)}
                            </Form.Item>
                          </Col>
                        );
                      })}
                    </Row>
                  </Fragment>
                );
              }
            })}
          </div>

          {mode == "edit" && (
            <div className="button-wrapper">
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" disabled={!hasSave}>
                    保存
                  </Button>
                  <Button
                    onClick={() => {
                      history.goBack();
                    }}
                  >
                    关闭
                  </Button>
                </Space>
              </Form.Item>
            </div>
          )}
        </Form>
        {mode == "view" && (
          <div className="asset_manage_button_zone">
            <Button
              onClick={() => {
                history.goBack();
              }}
            >
              关闭
            </Button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

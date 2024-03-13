import './style.less';
import React, {  useContext, useEffect, useState } from 'react';

import { Button, Card, Col, Form, Input, message, Modal, Row, Select, Image, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import queryString from 'query-string';
import { CommonStateContext } from '@/App';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons/lib/icons';
import { useLocation } from 'react-router-dom';
import { getXhMonitor} from '@/services/manage';
import { getXhAsset } from '@/services/assets';


export default function (props: { initialValues: object; initParams: object; mode?: string }) {
  const { t } = useTranslation('assets');
  const commonState = useContext(CommonStateContext);
  const [assetTypes, setAssetTypes] = useState<{ name: string; form: any }[]>([]);
  const [assetList, setAssetList] = useState<{ name: string; id: any }[]>([]);
  const [params, setParams] = useState<{ label: string; name: string; editable?: boolean; password?: boolean; items?: [] }[]>([]);
  const [form] = Form.useForm();
  const { search } = useLocation();
  const { id } = queryString.parse(search);
  const [monitor, setMonitor] = useState<any>(null);
  const [assetInfo,setAssetInfo] = useState<any>(null);

  const panelBaseProps: any = {
    size: 'small',
    bodyStyle: { padding: '24px 124px 8px 124px' },
  };


  useEffect(() => {
    if(id!=null && id.length>0 && id!="null"){
      getXhMonitor(id).then(({dat})=>{
        if(dat!=null){
          setMonitor(dat);
          console.log("监控数据",dat);
          let config = dat["config"];
          delete dat["config"];
          if(config!=null && config.length>0){
            let configJson = JSON.parse(config);
            dat = {...configJson,...dat};
          }
          loadAssetInfo(dat.asset_id);
        }
      })
    }

  }, []);


  const loadAssetInfo =(id) => {
    if (id != null) {
      getXhAsset("" + id).then(({ dat }) => {
        console.log(dat);          
        let expands = dat.exps;
        if (expands != null && expands.length > 0) {
          const map = new Map()
          expands.forEach((item, index, arr) => {
            if (!map.has(item.config_category)) {
              map.set(
                item.config_category,
                arr.filter(a => a.config_category == item.config_category)
              )
            }
          })
          //以上分组加载数据
          let mapValues = {};
          map.forEach(function (value, key) {
            const formDataMap = new Map()
            value.forEach((item, index, arr) => {
              if (!formDataMap.has(item.group_id)) {
                formDataMap.set(
                  item.group_id,
                  arr.filter(a => a.group_id == item.group_id)
                )
              }
            })
            let group: any = [];
            formDataMap.forEach(function (value, i) {
              let itemsChars = ""
              value.forEach((item, index, arr) => {
                itemsChars += "\"" + item.name + "\":\"" + item.value + "\",";
              })
              itemsChars = "{" + itemsChars.substring(0, itemsChars.length - 1) + "}";
              group.push(JSON.parse(itemsChars));
            })
            mapValues[key] = group;
            dat[key] = group;
          })
          delete dat.exps; 
          setAssetInfo(dat); 
          console.log("资产数据",dat);
        }
      });
    }
  }

  const genForm = () => {
    const asset: any = assetList.find((v) => v.id === form.getFieldValue('asset_id'));
    if (asset) {
      form.setFieldsValue({ type: asset.type });
      const assetType: any = assetTypes.find((v) => v.name === asset.type);
      setParams(assetType.form || []);
      genDefaultConfig()
    }
  };

  const renderForm = (v) => {
    if (v.items) {
      return (
        <Select
          style={{ width: '100%' }}
          options={v.items.map((v) => {
            return { label: v, value: v };
          })}
        ></Select>
      );
    }
    if (v.password) {
      return <Input.Password placeholder={`填写${v.label}`} />;
    }
    return <Input placeholder={`填写${v.label}`} />;
  };

  const submitForm = async (values) => {
    // values.group_id = curBusiId;
    values.params = JSON.stringify(values);

    console.log("submitForm", values);
    // values.organization_id = organizationId;
    // if (props.mode === 'edit') {
    //   await updateAsset(values);
    // } else {
    //   await addAsset(values);
    // }
    message.success('操作成功');
    history.back();
  };

  const genDefaultConfig = () => {
    const name = form.getFieldValue('type');
    const data = form.getFieldsValue();

  };

  return (
    <Form
      name='asset'
      form={form}
      layout='vertical'
      onFinish={submitForm}
      onValuesChange={() => {
        genForm();
      }}
    >
      <div className='view-form' >
        <div className='card-wrapper'>
          <Card {...panelBaseProps} title={'基本信息'}>
            <div className='asset_info'>
              <div className='images'>
                <Image
                  width={120}
                  height={60}
                  src="error"
                />
              </div>
              <div className='info'>
                <Row gutter={10} className='row'>
                  <Col>资产名称：</Col>
                  <Col>资产类型：</Col>
                  <Col>IP地址：</Col>
                  <Col>厂商：</Col>
                </Row>
                <Row gutter={10} className='row'>
                  <Col>资产位置：</Col>
                  <Col>监控配置：</Col>
                  <Col>状态：</Col>
                  <Col></Col>
                </Row>
              </div>


            </div>
            <div className='monitor_info'>
              <div className='base'>
                <Row gutter={10} className='row'>
                  <Col>资产位置：</Col>
                </Row>
                <Row gutter={10} className='row'>
                  <Col>监控配置：</Col>
                </Row>
                <Row gutter={10} className='row'>
                  <Col>状态：</Col>
                </Row>
              </div>
              <div className='script'>
                <div className='title'>监控脚本：</div>
                <div className='content'></div>
              </div>

            </div>
            <div className='party_info'>
              <div className='assembly show_image'>
                <div className='title'>CPU(2)</div>
                <div className='image cpu'></div>
                <div className='status'>状态：
                   {false ? (
                      <div>正常<CheckCircleFilled  className='normal'/></div>
                   ):(
                      <div>故障<CloseCircleFilled  className='no_normal'/></div>
                   )}</div>
              </div>
              <div className='assembly show_image'>
                <div className='title'>网卡(2)</div>
                <div className='image net'></div>
                <div className='status'>状态：
                   {true ? (
                      <div>正常<CheckCircleFilled  className='normal'/></div>
                   ):(
                      <div>故障<CloseCircleFilled  className='no_normal'/></div>
                   )}
                
                </div>
              </div>

            </div>
          </Card>
        </div>
        <div className='card-wrapper'>
          <Card {...panelBaseProps} title={'配置信息'}>

          </Card>
        </div>
      </div>
    </Form>
  );
}

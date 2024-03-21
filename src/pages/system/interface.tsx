import React, { createRef, useContext, useEffect, useRef, useState } from 'react';
import { Button, Dropdown, Input, Menu, message, Modal, Space, Table, Tag, Tree, Switch, Row, Form, Checkbox, Card, FormInstance, Popconfirm } from 'antd';
import PageLayout from '@/components/pageLayout';
import { InterfaceForms } from './catalog'
import { CommonStateContext } from '@/App';
import './style.less';
import _ from 'lodash';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import { title } from 'process';
import { getIpPwInfo, getPwInfo, saveInterfaces } from '@/services/interface';
import ClipboardJS from 'clipboard';
import { element } from 'prop-types';
import ValuesSelect from '../alertRules/Form/Rule/Rule/Host/ValuesSelect';
import { GroupOutlined } from '@ant-design/icons';

export default function () {
  const commonState = useContext(CommonStateContext);

  const [refArr, setRefArr] = useState<any>({});
  const [ipchecks, setIpChecks] = useState<any>({});
  const [pwchecks, setPwChecks] = useState<any>({});
  const [inputIpVal, setInputIpVal] = useState<any>({});
  const [inputPwVal, setInputPwVal] = useState<any>({});
  const [dataFromDatabase, setDataFromDatabase] = useState<any>({});

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showmiyaoew, setShowmiyaoew] = useState<any>();
  const copyButtonRef = useRef(null);

  useEffect(()=>{
     setRefArr(refArr)
  },[]);

  useEffect(() => {
    //初始化表单
    InterfaceForms.map((modelFF, index)=>{
      ipchecks[modelFF.id] = true;
      pwchecks[modelFF.id] = true;
    })
    setIpChecks({...ipchecks})
    setPwChecks({...pwchecks}) 
    //数据初始化
    getIpPwInfo().then((res) => {
      console.log("AAAAAAAAAAAAAA")
      console.log(res);
      res.dat.map((item, index) => {
        if(refArr[item.type]){
          refArr[item.type].current.setFieldsValue(item);
          console.log(refArr[item.type])
          if(item.inputIpVal!=null && item.inputIpVal.length>0){
             ipchecks[item.type] = false;
             setIpChecks({...ipchecks})
          }
          if(item.inputPwVal!=null && item.inputPwVal.length>0){
            pwchecks[item.type] = false;
            setPwChecks({...pwchecks})
         }
        }
      })
      console.log("内容已复制到剪贴aksjflk板",ipchecks)
    })
    const clipboard = new ClipboardJS('#copyButton');
    clipboard.on('success', (e) => {
      console.log('内容已复制到剪贴板');
    });

    clipboard.on('error', (e) => {
      console.error('复制失败:', e);
    });

    return () => {
      clipboard.destroy();
    };


  }, [refArr]);

  const renderFields = (text, record, field, currentConfigId) => {
    console.log("渲染数据列", text, record, field, currentConfigId);
    let value = record[field];
    return value;
  }
  const onIpOrPwdChange = (e: CheckboxChangeEvent, id, type) => {
    let values = refArr[id].current.getFieldsValue();
    if (type == "ip") {
      ipchecks[id] = e.target.checked ? false : true;
      if(ipchecks[id]){        
        refArr[id].current.setFieldsValue({...values,inputIpVal:''});
      }
      setIpChecks(_.cloneDeep({ ...ipchecks }))
    }
    else if (type == "passwd") {
      pwchecks[id] = e.target.checked ? false : true;
      if(pwchecks[id]){        
        refArr[id].current.setFieldsValue({...values,inputPwVal:''});
      }
      setPwChecks(_.cloneDeep({ ...pwchecks }))
    }
  };
  // const onInputIpPWChange = (e: React.ChangeEvent<HTMLInputElement>, id: string,type) => {
  //   if(type == "ip"){
  //     inputIpVal[id] = e.target.value;
  //     setInputIpVal(_.cloneDeep({ ...inputIpVal }));
  //     console.log('inputIpVal = ', inputIpVal);
  //   }else if(type == "passwd"){
  //     inputPwVal[id] = e.target.value;
  //     setInputPwVal(_.cloneDeep({ ...inputPwVal }));
  //     console.log('inputPwVal = ', inputPwVal);
  //   }
  // };

  const handleCancel = () => {
    setIsModalVisible(false);
  };


  const handleClick = (values: any, formId: any) => {
    values.type = formId;
    saveInterfaces(values).then((res) => {
      message.success('操作成功');
    });
  }




  return (
    <PageLayout icon={<GroupOutlined />} title={'接口访问设置'}>
      <div className='body-list' >
        {InterfaceForms.map((modelFF, index) => {
          refArr[modelFF.id] =createRef<FormInstance>();
          return (
            <Card
              hoverable
              title={modelFF.title}
              key={'card-hoverable' + index}
              className='interface_set'
            >
              <Form
                name={modelFF.id}
                labelCol={{ span: 8 }}
                className='interface_submit_form'
                layout="inline"
                initialValues={dataFromDatabase[modelFF.id]}
                ref={refArr[modelFF.id]}
                onFinish={values => {
                  handleClick(values, modelFF.id);
                }}
                autoComplete="off"
              >
                <Form.Item name="ipCheck" key={'ipv-' + index}>
                  <Checkbox onChange={e => {
                    onIpOrPwdChange(e, modelFF.id, "ip")
                  }} value={1}  checked={!ipchecks[modelFF.id]}
                  >IP验证</Checkbox>
                </Form.Item>
                <Form.Item label="访问IP白名单" name="inputIpVal" key={'white_ips-' + index} >
                  <Input placeholder='填写IP地址,逗号隔开' disabled={ipchecks[modelFF.id] ? true : false}
                    // value={inputIpVal[modelFF.id]}
                    // onChange={e => { onInputIpPWChange(e, modelFF.id,"ip") }}
                  ></Input>
                </Form.Item>

                <Form.Item name="pwdCheck" key={'pdv-' + index}>
                  <Checkbox onChange={e => {
                    onIpOrPwdChange(e, modelFF.id, "passwd")
                  }} value={1} checked={!pwchecks[modelFF.id]} >密码验证</Checkbox>
                </Form.Item>
                <Form.Item label="密码" name="inputPwVal" key={'pwd-' + index}>
                  <Input.Password placeholder='填写密码' disabled={pwchecks[modelFF.id] ? true : false}
                    //value={inputPwVal[modelFF.id]}
                    // onChange={e => { onInputIpPWChange(e, modelFF.id,"passwd") }}
                  ></Input.Password>
                </Form.Item>
                <Form.Item className='submit_buttons'>
                  <Space >
                    <Button className='view_passwd' onClick={() => {
                      if (inputPwVal[modelFF.id] ==""||inputPwVal[modelFF.id]==null) {
                        message.error("请输入密码");
                      }
                      else {
                        getPwInfo(inputPwVal[modelFF.id]).then((res) => {
                          setShowmiyaoew(res.dat.key);
                        })
                        setIsModalVisible(true);
                      }
                    }}>
                      查看秘钥
                    </Button>
                    {isModalVisible && (
                      <Modal
                        title="密钥"
                        visible={isModalVisible}
                        onCancel={() => setIsModalVisible(false)}
                        footer={[
                          <button id="copyButton" key="copy" ref={copyButtonRef} data-clipboard-text={showmiyaoew}>
                            复制
                          </button>,
                          <button key="cancel" onClick={() => setIsModalVisible(false)}>
                            取消
                          </button>,
                        ]}
                      >
                        {showmiyaoew}
                      </Modal>
                    )}
                    <Button htmlType="submit" className='save_button'>
                      保存
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>

          )

        })}
      </div>
    </PageLayout>
  );
}
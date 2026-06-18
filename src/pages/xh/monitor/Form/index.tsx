import './style.less';
import React, { Fragment, useContext, useEffect, useRef, useState } from 'react';

import { Button, Card, Col, Form, Input, InputNumber, InputRef, message, Modal, Radio, Row, Select, Space, Table,  TableProps  } from 'antd';
import { useTranslation } from 'react-i18next';
import _, { concat, random, values } from 'lodash';
import { getAssetsIdents, getAssetstypes, getAssetsByConditionSimple } from '@/services/assets';
import { getMonitorUnit, createXhMonitor, getXhMonitor, updateXhMonitor } from '@/services/manage';
import PromBox from './PromBox';
import { useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { cn_name, en_name } from '@/components/PromQueryBuilder/components/metrics_translation'
const { TextArea } = Input;
import { unitTypes } from '../../assetmgt/catalog';
import { FilterOutlined, MinusCircleOutlined, SearchOutlined } from '@ant-design/icons';

export default function (props: { initialValues: object; initParams: object; mode?: string, disabled?: boolean }) {
  const { t } = useTranslation('assets');
  const history = useHistory();
  const backToMonitorList = () => {
    history.push({
      pathname: '/xh/monitor',
      state: { isops: true },
    });
  };
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [assetList, setAssetList] = useState<any[]>([]);
  const [assetOptions, setAssetOptions] = useState<any[]>([]);
  const [assetIpOptions, setAssetIpOptions] = useState<any[]>([]);
  const [sqlCN, setSqlCN] = useState<string>("")
  const [identList, setIdentList] = useState([]);
  const [params, setParams] = useState<{ label: string; name: string; editable?: boolean; required?: boolean; password?: boolean; items?: [] }[]>([]);
  const [form] = Form.useForm();
  const [datasource, setDatasource] = useState(1);
  const { search } = useLocation();
  const { id } = queryString.parse(search);
  const { action } = queryString.parse(search);
  const [monitor, setMonitor] = useState<any>({});
  const [scriptOptions,setScriptOptions] =  useState<any[]>([]);
  const [selectedRow,setSelectedRow] =  useState<string>();
  const [filteredInfo, setFilteredInfo] = useState<Record<string, any | null>>({});
  const [searchVal, setSearchVal] = useState<string>('');
  const searchInput = useRef<InputRef>(null);

const [operateScript, setOperateScript] = useState<any>({
    visual: false,
    title: "选择监控指标"
  });

  const panelBaseProps: any = {
    size: 'small',
    // bodyStyle: { padding: '24px 124px 8px 124px' },
  };


  useEffect(() => {
    form.setFieldsValue({
      asset_id: undefined, // 替换为你的字段名
    });
    let map = new Map;
    let scripList = new Array();
    Object.keys(cn_name).map(key=>{
        if(!map.has(key)){
          scripList.push({
            name:key,
            cn_name:cn_name[key]
          })
          map.set(key,key);
        }
    })
    Object.keys(en_name).map(key=>{
      if(!map.has(key)){
        scripList.push({
          name:key,
          cn_name:en_name[key]
        })
        map.set(key,key);
      }
    })
   setScriptOptions(scripList);
    if (action == null || 'addeditview'.indexOf(action + '') < 0) {
      backToMonitorList();
    }
    
    getAssetstypes().then((res) => {
      const types = res.dat.map((v) => {
        return {
          value: v.name,
          label: v.name,
          ...v,
        };
      });
      // .filter((v) => v.name !== '主机'); //探针自注册的不在前台添加
      const types1 = res.dat.map(item => item.name).toString()
      setAssetTypes(types);
      const param = {
        page: 1,
        limit: -1,
        types: types1,
      };
      getAssetsByConditionSimple(param).then((assets) => {
        let options = new Array();
        assets.dat.list.map((v) => {
          options.push({
            value: v.id,
            label: v.name + '[' + v.type + ']',
          });
        });
        setAssetOptions(options);
        let ipOptions = new Array();
        assets.dat.list.map((v) => {
          ipOptions.push({
            value: v.id,
            label: v.ip,
          });
        });
        setAssetIpOptions(ipOptions);
        
        setAssetList(assets.dat.list);
        if (id != null && id.length > 0 && id != 'null' && action!="add") {
          getXhMonitor(id).then(({ dat }) => {
            if (dat != null) {
              setMonitor(dat);
              let config = dat['config'];
              delete dat['config'];
              if (config != null && config.length > 0) {
                let configJson = JSON.parse(config);
                dat = { ...configJson, ...dat };
              }
              form.setFieldsValue(dat);
              setMonitor(dat);
              setTimeout(() => {
                genForm(assets.dat.list, types);
              }, 1500);
            }
          });
        }
        if(id != null && id.length > 0 && id != 'null' && action=="add" ){
            // form.setFieldsValue({asset_id:parseInt(""+id)});
        }
      });


    });

    getAssetsIdents().then((res) => {
      const items = res.dat.map((v) => {
        return {
          value: v.id,
          label: v.ident,
        };
      });
      setIdentList(items);
    });
    form.setFieldsValue({ datasource_id: 1 })

  }, []);

  const handleChange: TableProps<any>['onChange'] = (pagination, filters, sorter) => {
    console.log('Various parameters', pagination, filters, sorter);
    setFilteredInfo(filters);
  };

  const genForm = (assets, types) => {
    if (assets == null || assets.length <= 0 || types == null || types.length <= 0) return
    console.log('genForm');
    let formValue = form.getFieldsValue();
    console.log(formValue);
    const asset: any = assets ? assets.find((v: any) => v.id === formValue['asset_id']) : assetList.find((v: any) => v.id === formValue['asset_id']);
    if (asset) {
      form.setFieldsValue({ type: asset.type });
      let typeList = types ? types : assetTypes;
      const assetType: any = typeList.find((v) => v.name === asset.type);
      if (assetType) setParams(assetType.form || []);
      console.log('gen---Form', assetType.form);
    }
    if (formValue['monitoring_sql'] != null) {
      let sql = formValue['monitoring_sql'];;
      if (cn_name[sql]) {
        setSqlCN(sql + ":" + cn_name[sql])
        console.log("中文", sql + ":" + cn_name[sql])
      } else if (en_name[sql]) {
        setSqlCN(sql + ":" + en_name[sql])
        console.log("英文", setSqlCN(cn_name[sql]))
      } else {
        setSqlCN("")
      }
    }
  };

  const getColumnSearchProps = (dataIndex,title) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input.Search
          ref={searchInput}
          allowClear
          placeholder={`在${title}中填关键词`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onSearch={(val) => {
            setSearchVal(val);
          }}
        />
      </div>
    ),
    filterIcon: (filtered: boolean) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
  });

  const submitForm = async (values) => {
    console.log('submitForm', values);
    if(values.monitoring_sql==null || values.monitoring_sql.length<1){
      message.error("监控脚本不能为空，请编辑此项");
      return 
    } 
    if(values.alert_rules!=null && values.alert_rules.length>0){
      values.alert_rules.forEach(rule => {
        let relation = rule.relation==">"?"大于":(rule.relation=="=="?"等于":"小于")
        rule["rule_config_cn"]=values.monitoring_name+relation+rule.value;
      });
    }
    let config = {};
    if (params != null && params.length > 0) {
      for (let param in params) {
        let group = params[param];
        config[group.name] = values[group.name];
        delete values[group.name];
      }
    }
    if (id != null && id.length > 0 && id != 'null' &&  action!="add") {
      values.id = parseInt('' + id);
      values['config'] = JSON.stringify(config);
      updateXhMonitor(values).then((res) => {
        message.success('修改成功');
        history.push('/xh/monitor')
      });
    } else {
      values['config'] = JSON.stringify(config);
      createXhMonitor(values).then((res) => {
        message.success('操作成功');
        history.push(`/xh/monitor?assetId=${values['asset_id']}`)
      });
    }
  };


  const rowSelection = {
    onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
      console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows,'selectedRows-Name: ', selectedRows[0].name);
      setSelectedRow(selectedRows[0].name);
    }
  };

  return (
    <>
      <Form
        name='asset'
        form={form}
        layout='vertical'
        className='monitor_form'
        onFinish={submitForm}
        disabled={props.disabled}
        onValuesChange={() => {
          genForm(assetList, assetTypes);
        }}
      >
        <Form.Item hidden name='id'>
          <Input></Input>
        </Form.Item>
        <Form.Item hidden name='type'>
          <Input></Input>
        </Form.Item>
        <div className='card-wrapper'>
          <Card {...panelBaseProps} title={t('basic')}>
            <Row gutter={10}>
              <Col span={8}>
                <Form.Item label='监控名称' name='monitoring_name' rules={[{ required: true }]}>
                  <Input placeholder='请输入监控名称' />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label='资产名称' name='asset_id' rules={[{ required: true }]}>
                  <Select style={{ width: '100%' }} showSearch filterOption optionFilterProp={"label"} options={assetOptions} placeholder='请选择资产' disabled={action === 'edit'} />
                </Form.Item>
              </Col>
             
              <Col span={8}>
              <Form.Item name='datasource_id'  hidden>
              <Input defaultValue={1}></Input>
              </Form.Item>

              <Form.Item label='IP地址' name='asset_id' rules={[{ required: true }]}>
                  <Select style={{ width: '100%' }} showSearch filterOption optionFilterProp={"label"} options={assetIpOptions} placeholder='请选择资产' disabled={action === 'edit'} />
                </Form.Item>              
              </Col>
            </Row>
            <Row gutter={10}>
              <Col span={14}>
                <Form.Item rules={[{ required: true }]}>
                  <Form.Item label='监控脚本'  name='monitoring_sql' rules={[{ required: true }]}>
                    <PromBox datasource={datasource} value={monitor.monitoring_sql}></PromBox>
                  </Form.Item>
                  {sqlCN != null && sqlCN.length > 0 && (
                    <div className='chinese_remark'><span className='title' style={{ color: '#0A4B9D', fontSize: "14px" }}>指标关键词说明：</span>{sqlCN}</div>
                  )}
                  
                </Form.Item>
                
              </Col>
              <Col span={2}  className='script_option'>
                  <Button type='primary' icon={<SearchOutlined /> } onClick={() => {
                          operateScript.visual = true;
                          setOperateScript(_.cloneDeep(operateScript));
                        }}>选择</Button>
              </Col>
              
              {/* <Col span={4}>
                <Form.Item name="label" label="标签">
                    <Input placeholder='{{name}}'></Input>
                </Form.Item>
              </Col> */}
              <Col span={8}>
                  <Form.Item label='指标计算单位' name='unit' rules={[{ required: true,message:'请输入指标计算单位' }]}>
                    <Select >
                      {Object.keys(unitTypes).map((key) => {
                        return (<Select.Option value={key}>{unitTypes[key]}</Select.Option>)
                      })}
                    </Select>
                  </Form.Item>

              </Col>
            </Row>
            <Row gutter={10}>
              <Col span={24}>
                <Form.Item label='描述' name='remark'>
                  <TextArea placeholder='填写描述' />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </div>
        {/* <div className='card-wrapper'>
          <Card title={'告警设置'} className='alert_rule_card'>
            <Row gutter={10}>
              <Form.List name={'alert_rules'} initialValue={[]}>
                {(field, { add, remove }) => {
                  return (
                    <Fragment>
                      <Card
                        className='rule_card_group'
                        extra={
                          <>
                            <Button
                              type='primary'
                              className='form_add'
                              onClick={() => {
                                add();
                              }}
                            >
                              {' '}
                              ＋添加
                            </Button>
                          </>
                        }
                      >
                        {field.length > 0 && <Row gutter={10} className='rule-row'>
                          <Col span={5}>指标</Col>
                          <Col span={2}>关系</Col>
                          <Col span={5}>阈值</Col>
                          <Col span={12}>告警级别</Col>
                        </Row>}
                        {field.map((item, _suoyi) => (
                          <Fragment>
                            <Row gutter={10} className='rule-row'>
                              <Col span={5}>
                              <Form.Item name={[item.name, 'id']} hidden>
                                  <Input></Input>
                                </Form.Item>
                                <Form.Item>
                                  <Input readOnly value={form.getFieldValue("monitoring_name")}></Input>
                                </Form.Item>
                              </Col>
                              <Col span={2}>
                                <Form.Item
                                  // label={'关系'}
                                  required
                                  name={[item.name, 'relation']}
                                  rules={[{ required: true, message: `请选择符号` }]}
                                >
                                  <Select style={{width: "100%"}} options={[
                                    { value: ">", label: '大于' }, { value: "==", label: '等于' }, { value: "<", label: '小于' },
                                  ]}></Select>
                                </Form.Item>
                              </Col>
                              <Col span={5}>
                                <Form.Item
                                  // label={'阈值'}
                                  required
                                  name={[item.name, 'value']}
                                  rules={[{ required: true, message: `请选择阈值` }]}
                                >
                                  <InputNumber placeholder="请输入值" />
                                </Form.Item>
                              </Col>
                              <Col span={10} >
                                <Form.Item
                                  // label={'告警级别'}
                                  name={[item.name, 'severity']}
                                  className='item_severity_style'
                                  rules={[{ required: true, message: `请选择告警级别` }]}
                                >
                                  <Radio.Group>
                                    <Radio value={1}>{t('common:severity.1')}</Radio>
                                    <Radio value={2}>{t('common:severity.2')}</Radio>
                                    <Radio value={3}>{t('common:severity.3')}</Radio>
                                  </Radio.Group>
                                </Form.Item>
                              </Col>
                              <Col span={2}>
                                  <MinusCircleOutlined
                                    className='dynamic-delete-button'
                                    style={{ color: 'red', marginTop:14, marginLeft: 8 }}
                                    onClick={() => remove(_suoyi)}
                                  />
                              </Col>
                            </Row>
                          </Fragment>
                        ))}
                      </Card>
                    </Fragment>
                  );
                }}
              </Form.List>

            </Row>
          </Card>
        </div> */}
        {props.disabled == false && (
          <div className='card-wrapper'>
            <Form.Item>
              <div className='bottom_button'>
                <Space>
                  <Button type='primary' htmlType='submit'>
                    保存
                  </Button>
                  <Button
                    onClick={() => {
                      backToMonitorList();
                    }}
                  >
                    取消
                  </Button>
                </Space>
              </div>
            </Form.Item>
          </div>
        )}

      </Form>
      <Modal
          visible={operateScript.visual}
          title={"选择监控指标"}
          confirmLoading={false}
          width={window.innerWidth * 0.4}
          okButtonProps={{
              onClick: () => {
                operateScript.visual = false;
               setOperateScript(_.cloneDeep(operateScript));
                if(selectedRow!=null && selectedRow.length>0) {
                   let values:any = form.getFieldsValue();
                   form.setFieldsValue(values);
                   values["monitoring_sql"] = selectedRow;
                   form.setFieldsValue(values);
                   genForm(assetList, assetTypes);
                }
                 
              }           
          }}
          onCancel={() => {
            operateScript.visual = false;
            setOperateScript(_.cloneDeep(operateScript));
          }}
        >
          <Table
              rowSelection={{
                type: "radio",
                ...rowSelection,
              }}
              className='script_table'
              bordered
              rowKey={"name"}
              columns={[
                {
                  title: '指标名',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: '指标说明',
                  dataIndex: 'cn_name',
                  onFilter: (value: string, record) => record.cn_name.includes(value),
                  key: 'cn_name',
                  ...getColumnSearchProps('cn_name','指标说明'),
                },
              ]}
              dataSource={_.filter(scriptOptions, (item) => {
                if (searchVal) {
                  return _.includes(item.cn_name, searchVal);
                }
                return item;
              })}
              onChange={handleChange}
            />

        </Modal>
      {props.disabled == true && (
        <div className='monitor_management_button_zone'>
          <Button
            onClick={() => {
              backToMonitorList();
            }}
          >
            取消
          </Button>
        </div>
      )}
    </>

  );
}

import './style.less';
import React, { Fragment, useContext, useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Button, Card, Checkbox, Col, Empty, Form, Input, InputNumber, InputRef, message, Modal, Radio, Row, Select, Space, Table, TableProps } from 'antd';
import { useTranslation } from 'react-i18next';

import { CommonStateContext } from '@/App';
import { addAsset, getAssetDefaultConfig, getAssetsIdents, getAssetstypes, updateAsset, getAssetsByCondition } from '@/services/assets';
import { createXhMonitor, getXhMonitor, updateXhMonitor } from '@/services/manage';
import PromBox from '../monitor/Form/PromBox';
import { factories, unitTypes } from '../assetmgt/catalog';
import queryString from 'query-string';
import { cn_name, en_name } from '@/components/PromQueryBuilder/components/metrics_translation'
import PageLayout from '@/components/pageLayout';
import { GroupOutlined, MinusCircleOutlined, SearchOutlined } from '@ant-design/icons';
const { TextArea } = Input;
const { Option } = Select;
import _, { concat, random, values } from 'lodash';

export default function (props: { initialValues: object; initParams: object; mode?: string, disabled?: boolean }) {
  const { t } = useTranslation('assets');
  const commonState = useContext(CommonStateContext);
  const [organizationId] = useState<number>(commonState.organizationId);
  const [selectedValues, setSelectedValues] = useState<any[]>([]);
  const [assetTypes, setAssetTypes] = useState<{ name: string; form: any }[]>([]);
  const [assetList, setAssetList] = useState<any[]>([]);
  const [assetOptions, setAssetOptions] = useState<any[]>([]);
  const [sqlCN, setSqlCN] = useState<string>("")
  const [selectedRow, setSelectedRow] = useState<string>();
  const [identList, setIdentList] = useState([]);
  const [params, setParams] = useState<{ label: string; name: string; editable?: boolean; password?: boolean; items?: [] }[]>([]);
  const [form] = Form.useForm();
  const [datasource, setDatasource] = useState(1);
  const { search } = useLocation();
  const { id } = queryString.parse(search);
  const history = useHistory();
  const { action } = queryString.parse(search);
  const [monitor, setMonitor] = useState<any>({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearchEmpty, setIsSearchEmpty] = useState(false);
  const [scriptOptions, setScriptOptions] = useState<any[]>([]);
  const [searchVal, setSearchVal] = useState<string>('');
  const searchInput = useRef<InputRef>(null);
  const [filteredInfo, setFilteredInfo] = useState<Record<string, any | null>>({});
  const [options, setOptions] = useState<any[]>([]);

  const [operateScript, setOperateScript] = useState<any>({
    visual: false,
    title: "选择监控指标"
  });


  const panelBaseProps: any = {
    size: 'small',
    // bodyStyle: { padding: '24px 124px 8px 124px' },
  };

  useEffect(() => {

    getAssetstypes().then((res) => {
      const items = res.dat.map((v) => {
        return {
          value: v.name,
          label: v.name,
          ...v,
        };
      });
      setAssetTypes(items);
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

    let map = new Map;
    let scripList = new Array();
    Object.keys(cn_name).map(key => {
      if (!map.has(key)) {
        scripList.push({
          name: key,
          cn_name: cn_name[key]
        })
        map.set(key, key);
      }
    })
    Object.keys(en_name).map(key => {
      if (!map.has(key)) {
        scripList.push({
          name: key,
          cn_name: en_name[key]
        })
        map.set(key, key);
      }
    })
    setScriptOptions(scripList);
  }, []);


  const getColumnSearchProps = (dataIndex, title) => ({
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

  const genForm = (assets, types) => {

    console.log('genForm');
    let formValue = form.getFieldsValue();
    const assetType: any = assetTypes.find((v) => v.name == formValue['type']);
    if (assetType) setParams(assetType.form || []);
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


  const rowSelection = {
    onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
      console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows, 'selectedRows-Name: ', selectedRows[0].name);
      setSelectedRow(selectedRows[0].name);
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
    console.log('submitForm', values);
    if (values.monitoring_sql == null || values.monitoring_sql.length < 1) {
      message.error("监控脚本不能为空，请编辑此项");
      return
    }
    if (values.alert_rules != null && values.alert_rules.length > 0) {
      values.alert_rules.forEach(rule => {
        let relation = rule.relation == ">" ? "大于" : (rule.relation == "==" ? "等于" : "小于")
        rule["rule_config_cn"] = values.monitoring_name + relation + rule.value;
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
    values['config'] = JSON.stringify(config);

    createXhMonitor(values).then((res) => {
      message.success('操作成功');
      history.push("/xh/monitor")
    });
  };

  const genDefaultConfig = () => {
    const name = form.getFieldValue('type');
    // debugger;
    const data = form.getFieldsValue();
    // if (data.configs) {
    //   Modal.confirm({
    //     title: '将会覆盖原有配置,是否继续?',
    //     onOk: () => {
    //       delete data.configs;
    getAssetDefaultConfig(name, data).then((res) => {
      form.setFieldsValue({ configs: res.dat.content });
    });
    // },
    // });
    // } else {
    //   getAssetDefaultConfig(name, data).then((res) => {
    //     form.setFieldsValue({ configs: res.dat.content });
    //   });
    // }
  };
  const isAllOptionSelected = () => {
    const selectedOptions = options
      .filter(
        (option) =>
          option.value !== undefined &&
          option.value !== null &&
          option.value !== '',
      )
      .map((option) => option.value!);
    return (
      selectedOptions.length > 0 &&
      selectedOptions.every((value) => selectedValues.indexOf(value) !== -1)
    );
  };

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    setIsSearchEmpty(
      options.filter((option) =>
        option.label.toLowerCase().includes(value.toLowerCase()),
      ).length === 0,
    );
  };
  const handleChange: TableProps<any>['onChange'] = (pagination, filters, sorter) => {
    console.log('Various parameters', pagination, filters, sorter);
    setFilteredInfo(filters);
  };
  const handleSelectChange = (values: number[]) => {
    setSelectedValues(values);
    searchKeyword && setSearchKeyword('');
    console.log('handleSelectChange', values)
    form.setFieldsValue({ asset_ids: values })
  };

  const handleAllOptionSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.checked) {
      handleSelectChange(options.map((option) => option.value!));
    } else {
      handleSelectChange([]);
    }
  };



  return (
    <>
      <PageLayout icon={<GroupOutlined />} title={'批量添加'}
      >
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
                <Col span={12}>
                  <Form.Item label='类型' name='type' rules={[{ required: true }]}>
                    <Select style={{ width: '100%' }} options={assetTypes} placeholder='请选择资产类型'
                      onChange={(value) => {
                        form.setFieldsValue({ "asset_ids": [] })
                        const param = {
                          page: 1,
                          limit: 100000,
                          type: value
                        };
                        getAssetsByCondition(param).then((res) => {
                          const names = res.dat.list.map((v) => {
                            return {
                              value: v.id,
                              label: v.name,
                            }
                          });
                          setAssetOptions(names);
                          const ips = res.dat.list.map((v) => {
                            return ({
                              value: v.id,
                              label: v.ip,
                            });
                          });
                          setOptions(ips);
                        });
                      }} disabled={id != null} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='资产名称' name='asset_ids' rules={[{ required: true }]}>
                   <Select mode="multiple" style={{ width: '100%' }} showSearch filterOption optionFilterProp={"label"}
                      placeholder='请选择资产'
                      disabled={props.mode === 'edit'}                      
                      maxTagCount={3}
                      getPopupContainer={(triggerNode) => triggerNode.parentNode}
                      maxTagPlaceholder={(omittedValues) => `+ ${omittedValues.length} 项`}
                      dropdownRender={(menu) => (
                        <div className="my-select-wrapper">
                          {!searchKeyword && assetOptions.length>0 && (
                            <div onClick={(e) => e.stopPropagation()} className="my-menu-all">
                              <Checkbox
                                checked={isAllOptionSelected()}
                                onChange={handleAllOptionSelect as any}
                                style={{ width: '100%', padding: '5px 20px' }}
                              >
                                全选
                              </Checkbox>
                            </div>
                          )}
                          {isSearchEmpty ? (
                            <div className="my-empty">
                              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            </div>
                          ) : (
                            assetOptions
                              .filter((option) =>
                                option.label
                                  .toLowerCase()
                                  .includes(searchKeyword.toLowerCase()),
                              )
                              .map((option) => (
                                <div
                                  key={option.value}
                                  onClick={(e) => e.stopPropagation()}
                                  className="my-menu-item"
                                >
                                  <Checkbox
                                    checked={selectedValues.indexOf(option.value) !== -1}
                                    onChange={(e) => {
                                      const nextSelectedValues = e.target.checked
                                        ? [...selectedValues, option.value]
                                        : selectedValues.filter(
                                          (value) => value !== option.value,
                                        );
                                      handleSelectChange(nextSelectedValues);
                                    }}
                                    style={{ width: '100%', padding: '5px 20px' }}
                                  >
                                    {option.label}
                                  </Checkbox>
                                </div>
                              ))
                          )}
                        </div>
                      )}
                      onFocus={()=>{
                        if(form.getFieldValue("type")==null){
                          message.warn("请先选择要编辑的设备类型")
                        }else{
                           if(assetOptions==null || assetOptions.length==0){
                             message.info("该类型下无资产信息")
                           }
                        }

                      }}

                    > 
                    {assetOptions.map((item, index) => (
                       <Select.Option value={item.value} key={index}>{item.label}</Select.Option>
                    ))}
                    </Select>


                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='IP地址' name='asset_ids' rules={[{ required: true }]}>
                    <Select mode="multiple" style={{ width: '100%' }} showSearch
                      filterOption optionFilterProp={"label"}
                      placeholder='请选择资产' disabled={props.mode === 'edit'}
                      value={selectedValues}
                      maxTagCount={3}
                      getPopupContainer={(triggerNode) => triggerNode.parentNode}
                      maxTagPlaceholder={(omittedValues) => `+ ${omittedValues.length} 项`}
                      dropdownRender={(menu) => (
                        <div className="my-select-wrapper">
                          {!searchKeyword && options.length>0 && (
                            <div onClick={(e) => e.stopPropagation()} className="my-menu-all">
                              <Checkbox
                                checked={isAllOptionSelected()}
                                onChange={handleAllOptionSelect as any}
                                style={{ width: '100%', padding: '5px 20px' }}
                              >
                                全部
                              </Checkbox>
                            </div>
                          )}
                          {isSearchEmpty ? (
                            <div className="my-empty">
                              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            </div>
                          ) : (
                            options
                              .filter((option) =>
                                option.label
                                  .toLowerCase()
                                  .includes(searchKeyword.toLowerCase()),
                              )
                              .map((option) => (
                                <div
                                  key={option.value}
                                  onClick={(e) => e.stopPropagation()}
                                  className="my-menu-item"
                                >
                                  <Checkbox
                                    checked={selectedValues.indexOf(option.value) !== -1}
                                    onChange={(e) => {
                                      const nextSelectedValues = e.target.checked
                                        ? [...selectedValues, option.value]
                                        : selectedValues.filter(
                                          (value) => value !== option.value,
                                        );
                                      handleSelectChange(nextSelectedValues);

                                      console.log(nextSelectedValues);
                                    }}
                                    style={{ width: '100%', padding: '5px 20px' }}
                                  >
                                    {option.label}
                                  </Checkbox>
                                </div>
                              ))
                          )}
                        </div>
                      )}
                      onFocus={()=>{
                          if(form.getFieldValue("type")==null){
                            message.warn("请先选择要编辑的设备类型")
                          }else{
                            if(options==null || options.length==0){
                              message.info("该类型下无资产信息")
                            }
                         }
                      }}

                    >
                     {options.map((item, index) => (
                       <Select.Option value={item.value} key={index}>{item.label}</Select.Option>
                   ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='监控名称' name='monitoring_name' rules={[{ required: true }]}>
                    <Input placeholder='请输入监控名称' />
                  </Form.Item>
                  <Form.Item name='datasource_id'  hidden>
                    <Input defaultValue={1}></Input>
                 </Form.Item>
                </Col>
              </Row>
              <Row gutter={10}>
                <Col span={14}>
                  <Form.Item rules={[{ required: true }]}>

                    <Form.Item  label='监控脚本' name='monitoring_sql' rules={[{ required: true }]}>
                      <PromBox datasource={datasource} value={monitor.monitoring_sql}></PromBox>
                    </Form.Item>
                    {sqlCN != null && sqlCN.length > 0 && (
                      <div className='chinese_remark'><span className='title' style={{ color: '#0A4B9D', fontSize: "14px" }}>指标关键词说明：</span>{sqlCN}</div>
                    )}

                  </Form.Item>

                </Col>
                <Col span={2} className='script_option'>
                  <Button type='primary' icon={<SearchOutlined />} onClick={() => {
                    operateScript.visual = true;
                    setOperateScript(_.cloneDeep(operateScript));
                  }}>选择</Button>
                </Col>
                <Col span={4}>
                  <Form.Item name="label" label="标签">
                    <Input placeholder='{{name}}'></Input>
                  </Form.Item>
                </Col>
                <Col span={4}>
                    <Form.Item name='unit' label='指标计算单位'  rules={[{ required: true, message: '请输入指标计算单位' }]}>
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
          <div className='card-wrapper'>
            <Card title={'告警设置'} className='alert_rule_card'>
              <Row gutter={10}>
                <Form.List name={'alert_rules'} initialValue={[{}]}>
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
                          <Row gutter={10} className='rule-row'>
                                <Col span={5}>指标</Col>
                                <Col span={2}>关系</Col>
                                <Col span={5}>阈值</Col>
                                <Col span={12}>告警级别</Col>
                          </Row>
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
                                    name={[item.name, 'relation']}
                                    rules={[{ required: true, message: `请选择符号` }]}
                                  >
                                    <Select options={[
                                      { value: ">", label: '大于' }, { value: "==", label: '等于' }, { value: "<", label: '小于' },
                                    ]}></Select>
                                  </Form.Item>
                                </Col>
                                <Col span={5}>
                                  <Form.Item
                                    // label={'阈值'}
                                    name={[item.name, 'value']}
                                    rules={[{ required: true, message: `请选择阈值` }]}
                                  >
                                    <InputNumber placeholder="请输入值" />
                                  </Form.Item>
                                </Col>
                                <Col span={10}>
                                  <Form.Item
                                    // label={'告警级别'}
                                    name={[item.name, 'severity']}
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
                                    style={{ color: 'red', marginTop: 14, marginLeft: 8 }}
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
          </div>
          {/* <div className='card-wrapper'>
            <Card {...panelBaseProps} title={'配置信息'}>
              <Row gutter={10}>
                {params.map((v) => {
                  return (
                    <Col key={`col=${v.name}`} span={12}>
                      <Form.Item key={`form-item${v.name}`} label={v.label} name={v.name} >
                        {renderForm(v)}
                      </Form.Item>
                    </Col>
                  );
                })}
              </Row>
            </Card>
          </div> */}
          <div className='card-wrapper'>
            <Form.Item>
              <div className='bottom_button'>
                <Space>
                  <Button type='primary' htmlType='submit'>
                    保存
                  </Button>
                  <Button
                    onClick={() => {
                      history.goBack()
                    }}
                  >
                    取消
                  </Button>
                </Space>
              </div>
            </Form.Item>
          </div>

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
              if (selectedRow != null && selectedRow.length > 0) {
                let values: any = form.getFieldsValue();
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
                ...getColumnSearchProps('cn_name', '指标说明'),
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
      </PageLayout >

    </>

  );
}

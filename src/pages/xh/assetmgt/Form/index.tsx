// @ts-nocheck
import './style.less';
import React, { Fragment, useContext, useEffect, useState } from 'react';

import { Button, Card, Checkbox, Col, Form, FormInstance, Input, message, Row, Select, Space, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { insertXHAsset, getXhAsset, getAssetsIdents, getAssetstypes, updateXHAsset, addXHAssetExpansion } from '@/services/assets';
import { MinusCircleOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { useLocation, useHistory } from 'react-router-dom';
import queryString from 'query-string';
import { getAssetsByCondition } from '@/services/assets';
import localeCompare from '@/pages/dashboard/Renderer/utils/localeCompare';
import { factories } from '../catalog';
import { AutoComplete } from 'antd';
import { tuple } from 'antd/lib/_util/type';
const { Option } = Select;
export default function () {
  const { t } = useTranslation('assets');
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const { busiGroups } = useContext(CommonStateContext);
  const [formItems, setFormItems] = useState<any[]>([]);
  const [tabIndex, setTabIndex] = useState<string>('base_set');
  const [editType, setEditType] = useState<string>('insert');
  const history = useHistory();

  const [hasSave, setHasSave] = useState<boolean>(true);

  const { search } = useLocation();
  const { mode, id } = queryString.parse(search);

  const [properties, setProperties] = useState({});

  const [params, setParams] = useState<{ label: string; name: string; required?: boolean; type: string; options?: [] }[]>([]);
  const [form] = Form.useForm();
  const [assetData, setAssetData] = useState<any>({}); // 集中保存提交的数据
  const [currentType, setCurrentType] = useState();
  const [assetList, setAssetList] = useState<any>({});
  const [assetOptions, setAssetOptions] = useState<any[]>([]);
  // const [assetOptions1, setAssetOptions1] = useState<any[]>([]);

  const panelBaseProps: any = {
    size: 'small',
    bodyStyle: { padding: '24px 24px 8px 24px' },
  };

  // 根据选择资产类型生成表单
  useEffect(() => {
    const assetType: any = assetTypes.find((v) => v.name === currentType);
    if (assetType) {
      setParams(assetType.form || []); // 显示form表单
      if (!id) {
        // 新增时不显示扩展选项卡
        return;
      }
      //TODO：处理分组属性
      let items = new Array();
      let extra_props = assetType.extra_props;
      let map = new Map();
      for (let property in extra_props) {
        let group = extra_props[property];
        map.set(group.sort, property);
      }
      var arrayObj = Array.from(map);
      arrayObj.sort(function (a, b) {
        return a[0] - b[0];
      });

      for (var [key, value] of arrayObj) {
        let group = extra_props[value];
        if (group != null && group.props) {
          let baseItems = new Array();
          let listItems = new Array();
          group.props.map((item, index) => {
            if (item.type === 'list') {
              item.items.forEach((element) => {
                listItems.push(element);
                properties[value + '.' + element.name] = element.label;
              });
            } else {
              baseItems.push(item);
              properties[value + '.' + item.name] = item.label;
            }
          });
          items.push({
            name: value,
            label: group.label,
            base: baseItems,
            list: listItems,
          });
        }
      }
      setProperties(properties);
      setFormItems(items);
    }
  }, [assetTypes, currentType]);

  const loadAssetInfo = (id) => {
    if (!!id) {
      setEditType('edit');
      getXhAsset(_.toString(id)).then(({ dat }) => {
        // let expands = dat.exps;
        // if (expands != null && expands.length > 0) {
        //   const map = new Map();
        //   expands.forEach((item, index, arr) => {
        //     if (!map.has(item.config_category)) {
        //       map.set(
        //         item.config_category,
        //         arr.filter((a) => a.config_category == item.config_category),
        //       );
        //     }
        //   });
        //   //以上分组加载数据
        //   let mapValues = {};
        //   map.forEach(function (value, key) {
        //     const formDataMap = new Map();
        //     value.forEach((item, index, arr) => {
        //       if (!formDataMap.has(item.group_id)) {
        //         formDataMap.set(
        //           item.group_id,
        //           arr.filter((a) => a.group_id == item.group_id),
        //         );
        //       }
        //     });
        //     let group: any = [];
        //     formDataMap.forEach(function (value, i) {
        //       let itemsChars = '';
        //       value.forEach((item, index, arr) => {
        //         itemsChars += '"' + item.name + '":"' + item.value + '",';
        //       });
        //       itemsChars = '{' + itemsChars.substring(0, itemsChars.length - 1) + '}';
        //       group.push(JSON.parse(itemsChars));
        //     });
        //     mapValues[key] = group;
        //     dat[key] = group;
        //     console.log('111111111', mapValues);
            
        //   });
        //   delete dat.exps;
        // }

        // setAssetData(dat);
        const params = { ident: dat.ip }
        setAssetData({ ...dat, ...params });
        form.resetFields();
        form.setFieldsValue(dat);
        setCurrentType(dat.type);
      });
    }
  };

  const handleChange = (value: string) => {
    // console.log(`selected ${value}`);
    form.setFieldsValue({ ident: value });
    // console.log('form', form.getFieldsValue(true));
  };

  // const mockVal = (str: string) => ({
  //   value: assetOptions.indexOf(str) === 0
  // });

  // const getPanelValue = (searchText: string) => {
  //   // console.log('getPanelValue', searchText);
  //   // console.log('getPanelValu2', assetOptions);
  //   if (searchText) {
  //     const arr = assetOptions1.filter(item => {
  //       if (item.value.includes(searchText)) {
  //         return true
  //       }
  //     })
  //     setAssetOptions(arr)
  //   } else {
  //     setAssetOptions(assetOptions1)
  //   }
  // }
  

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
    let param = {};
    param['limit'] = -1;
    getAssetsByCondition(param).then((res) => {
      let options = new Array();
      res.dat.list.map((v) => {
        assetList[v.id] = v;
        options.push({
          key: v.id,
          // value: v.id,
          value: v.ip,
          label: `[${v.type}]-[${v.ip}]-${v.name}`,
          type: v.type
        });
      });
      let options1= options.sort((a, b) => localeCompare(a.label, b.label));
      options = options1.filter(item => {
        if (item.type.includes('服务器') || item.type.includes('虚拟')) {
          return true
        }
      })
      setAssetOptions(options);
      // setAssetOptions1(options);
      setAssetList({ ...assetList });
      let ipOptions = new Array();
      res.dat.list.map((v) => {
        ipOptions.push({
          value: v.id,
          label: v.ip,
        });
      });
    });
  }, []);

  useEffect(() => {
    if (id) {
      loadAssetInfo(id);
    }
  }, [id]);

  const TabOperteClick = (tabIndex: string) => {

    setTabIndex(tabIndex);
    if (tabIndex != 'base_set' && id == null) {
      setHasSave(false);
    } else {
      setHasSave(true);
    }
  };

  const submitForm = async () => {
    if (editType !== 'edit') {
      await insertXHAsset(assetData);
      message.success('添加成功');
      history.goBack();
    } else {
      delete assetData['tags']; // 更新信息不包括tag，格式不符
      assetData.id = _.toNumber(id);
      await updateXHAsset(assetData);
      await formItems.map(async (v) => {
        const subItem: any[] = [];
        const expData = assetData[v.name]; //[{item}]
        expData &&
          await expData.map((item) => {
            const groupId = uuidv4();
            for (let key in item) {
              let row = {
                name: key,
                value: item[key],
                name_cn: properties[v.name + '.' + key],
                group_id: groupId,
                assets_id: _.toNumber(id),
                config_category: v.name,
              };
              subItem.push(row);
            }
          });
        await addXHAssetExpansion(subItem, id, v.name);
      });
      message.success('操作成功');
      history.goBack();
      // loadAssetInfo(id);
    }
  };

  const renderFormItem = (v) => {
    if (v.type === 'select') {
      return <Select key={'v' + v.name} style={{ width: '100%' }} options={v.options}></Select>;
    }
    if (v.type === 'password') {
      return <Input.Password key={'v' + v.name} placeholder={`请输入${v.label}`} />;
    }
    if (v.type === 'checkbox') {
      return <Checkbox></Checkbox>;
    }
    return <Input key={'v' + v.name} placeholder={`请填写${v.label}`} name={v.name} />;
  };

  const updateData = (changedValues, values) => {
    // console.log(changedValues);
    // console.log(values);
    const params = { ident: values.ip }
    setAssetData({ ...assetData, ...values, ...params });
  };

  // IP地址校验规则
  const validateIP = (rule, value) => {
    if(value){
      const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!regex.test(value)) {
        return Promise.reject('请输入合法的IP地址');
      }
      
      const parts = value.split('.').map(Number);
      if (parts.every(part => part === 0)) {
        return Promise.reject('请输入合法的IP地址');
      }
      if (parts.every(part => part === 255)) {
        return Promise.reject('请输入合法的IP地址');
      }
    }
    return Promise.resolve();
  };
  

  const formItemLayout = { labelCol: { span: 8 }, wrapperCol: { span: 10 } };
  return (
    <div className='asset_every'>
      <div className='assetmgt_header_select'>
        <Tabs
          className='assetmgt_list_2'
          activeKey={tabIndex}
          type='card'
          size='small'
          onTabClick={(key) => {
            TabOperteClick(key);
          }}
        >
          <Tabs.TabPane tab={'基本信息'} key='base_set' className='tab_header'></Tabs.TabPane>
          {formItems.map((groupItem, index) => {
            return <Tabs.TabPane tab={groupItem.label} key={groupItem.name} className='tab_header'></Tabs.TabPane>;
          })}
        </Tabs>
      </div>
      <Form
        name='asset'
        form={form}
        layout='horizontal'
        disabled={mode == 'view' ? true : false}
        {...formItemLayout}
        onFinish={submitForm}
        className='asset_xh_form'
        onValuesChange={updateData}
      >
        <Form.Item hidden name='id'>
          <Input></Input>
        </Form.Item>
        {tabIndex == 'base_set' && (
          <div className='card-wrapper'>
            <Card {...panelBaseProps} className='card_base'>
              <Row gutter={10}>
                <Col span={12}>
                  <Form.Item label='类型' name='type' rules={[{ required: true }]}>
                    <Select
                      style={{ width: '100%' }}
                      options={assetTypes}
                      placeholder='请选择资产类型'
                      disabled={id != null}
                      onChange={(val) => {
                        setCurrentType(val);
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='名称' name='name' rules={[{ required: true }]}>
                    <Input placeholder='请输入资产名称' />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  {/* <Form.Item label='IP地址' name='ip' rules={[{ required: true }]}>
                    <Input placeholder='请输入IP地址' />
                  </Form.Item> */}
                  <Form.Item label={t('IP地址')} name='ip' rules={[{ required: true }, { validator: validateIP }]}>
                    {/* <Select
                      showSearch
                      options={assetOptions}
                      placeholder='请选择IP地址'
                      onChange={handleChange}
                      // onChange={(v) => {
                      //   onAssetChange({
                      //     includes: v !== 0 ? [v] : [],
                      //     excludes: form.getFieldValue('excludes'),
                      //   });
                      //   buildPromqlWithAsset({});
                      //   setShowExcludes(v === 0);
                      // }}
                    /> */}
                    <AutoComplete
                      allowClear={true}
                      options={assetOptions}
                      onChange={handleChange}
                      // onSearch={(text) => getPanelValue(text)}
                      filterOption={(inputValue, assetOptions) =>
                        assetOptions!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                      }
                      placeholder="请输入IP地址"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='厂商' name='manufacturers' rules={[{ required: false }]}>
                    <Select
                      style={{ width: '100%' }}
                      allowClear
                      showSearch filterOption optionFilterProp={"label"}
                      options={factories.map(({ key, value }) => ({
                        label: value,
                        value: value,
                      }))}
                      placeholder='请选择厂商'
                    >
                      {/* {factories.map(({key, value}) => (
                      <Option value={value} key={key}>
                        <div style={{display:"flex"}}>
                          <div className='factory_icon_title'>{value}</div>
                          <div style={{ color: '#8c8c8c' }}><img src={'/image/factory/' + key + '.png'} className='factory_icon_image'></img></div>
                        </div>
                      </Option>
                    ))}   */}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='位置' name='position' rules={[{ required: false }]}>
                    <Input placeholder='请输入位置' />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='业务组' name='group_id' rules={[{ required: true }]}>
                    <Select
                      style={{ width: '100%' }}
                      options={busiGroups.map(({ id, name }) => ({
                        label: name,
                        value: id,
                      }))}
                      placeholder='请选择业务组'
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='备注' name='memo'>
                    <Input placeholder='填写备注' />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
            {params.length > 0 && (
              <Card {...panelBaseProps} title={'扩展属性'} className='card_base'>
                <Row gutter={10}>
                  {params.map((v) => {
                    return (
                      <Col span={12} key={`col-${v.name}`}>
                        <Form.Item
                          label={v.label}
                          name={['params', v.name]}
                          key={`formitem=${v.name}`}
                          valuePropName={v.type === 'checkbox' ? 'checked' : 'value'}
                          rules={[{ required: v.required === 'true' ? true : false }]}
                        >
                          {renderFormItem(v)}
                        </Form.Item>
                      </Col>
                    );
                  })}
                </Row>
              </Card>
            )}
          </div>
        )}
        {tabIndex != 'base_set' && (
          <div className='card-wrapper'>
            {formItems.map((groupItem, index) => {
              if (tabIndex == groupItem.name) {
                return (
                  <Fragment>
                    {groupItem.base.length > 0 && (
                      <Card {...panelBaseProps} key={'groupItem' + index} className='card_group'>
                        <Row gutter={10}>
                          {groupItem.base.map((v) => {
                            return (
                              <Col key={`col=${v.name}`} span={12}>
                                <Form.Item
                                  key={`form-item${v.name}`}
                                  label={v.label}
                                  name={v.name}
                                  rules={[{ required: v.required ? v.required : false, message: `请选择您的${v.label}` }]}
                                >
                                  {renderFormItem(v)}
                                </Form.Item>
                              </Col>
                            );
                          })}
                        </Row>
                      </Card>
                    )}
                    <Form.List key={'group_list_config_' + index} name={groupItem.name} initialValue={[{}]}>
                      {(field, { add, remove }) => {
                        return (
                          <Fragment>

                            <Card
                              {...panelBaseProps}
                              key={'groupItem-' + index}
                              className='card_group'
                              extra={(mode == 'edit') ?
                                <div>
                                  {mode == 'edit' && (
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
                                  )}
                                </div>
                                : null}
                            >
                              {field.map((item, _suoyi) => (
                                <Fragment>
                                  <div className='group_title' key={'groupForms_' + _suoyi}>
                                    <span style={{ marginLeft: '3px' }}>
                                      {'项'}-{_suoyi + 1}
                                    </span>
                                    {mode == 'edit' && (
                                      <MinusCircleOutlined
                                        className='dynamic-delete-button'
                                        style={{ position: 'absolute', color: 'red', right: '2%', marginTop: 5, marginLeft: 8 }}
                                        onClick={() => remove(_suoyi)}
                                      />
                                    )}
                                  </div>

                                  <Row gutter={10}>
                                    {groupItem.list.map((property, pindex_) => {
                                      return (
                                        <Col key={property.name + pindex_} span={12}>
                                          <Form.Item
                                            label={property.label}
                                            key={property.name + "_" + pindex_}
                                            name={[item.name, property.name]}
                                            rules={[{ required: property.required ? property.required : false, message: `请选择您的${property.label}` }]}
                                          >
                                            {renderFormItem(property)}
                                          </Form.Item>
                                        </Col>
                                      );
                                    })}
                                  </Row>
                                </Fragment>
                              ))}
                            </Card>
                          </Fragment>
                        );
                      }}
                    </Form.List>
                  </Fragment>
                );
              }
            })}
          </div>
        )}
        {mode == 'edit' && (
          <div className='button-wrapper'>
            <Form.Item>
              <Space>
                <Button type='primary' htmlType='submit' disabled={!hasSave}>
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
      {mode == 'view' && (
        <div className='asset_manage_button_zone'>
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
  );
}

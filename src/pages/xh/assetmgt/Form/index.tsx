// @ts-nocheck
import './style.less';
import React, { Fragment, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Button, Card, Checkbox, Col, Empty, Form, FormInstance, Input, message, Row, Select, Space, Spin, Tabs, DatePicker, Modal, InputNumber, Timeline, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import _, { forEach } from 'lodash';
import moment from 'moment';
import { CommonStateContext } from '@/App';
import { insertXHAsset, getXhAsset, getAssetsIdents, getAssetstypes, updateXHAsset, addXHAssetExpansion, getMaintenanceInfoById, editMaintenanceInfo, addMaintenanceHistory, getMaintenanceHistory, getAssetShelfHistory } from '@/services/assets';
import { getDictDataListByType } from '@/services/system/dict';
import { addDictDataBySingle } from '@/services/system/dictdata';

import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { useLocation, useHistory } from 'react-router-dom';
import queryString from 'query-string';
import { getAssetsByCondition } from '@/services/assets';
import localeCompare from '@/pages/dashboard/Renderer/utils/localeCompare';
import { serviceHierarchyOptions, deviceFormOptions } from '../catalog';
import { AutoComplete } from 'antd';
import { timestamp, timestampToCST, isSameDay, getPreviousWeekTimestamp } from '@/utils/day';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
const { TextArea } = Input;
const PASSWORD_PLACEHOLDER_VALUE = 'haveValue';

const ControlledPasswordField = ({ placeholder, value, onChange, hasStoredValue, onDraftChange }) => {
  const currentValue = value === PASSWORD_PLACEHOLDER_VALUE ? '' : value || '';

  const handleChange = (e) => {
    const nextValue = e.target.value;
    const formValue = !nextValue && hasStoredValue ? PASSWORD_PLACEHOLDER_VALUE : nextValue;
    onDraftChange?.(nextValue);
    onChange?.({
      target: {
        value: formValue,
      },
    });
  };

  return <Input.Password value={currentValue} onChange={handleChange} placeholder={placeholder || '请输入密码'} />;
};

export default function () {
  const { t } = useTranslation('assets');
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const { busiGroups } = useContext(CommonStateContext);
  const [formItems, setFormItems] = useState<any[]>([]);
  const [tabIndex, setTabIndex] = useState<string>('base_set');
  const [editType, setEditType] = useState<string>('insert');
  const history = useHistory();
  const backToAssetList = () => {
    history.push({ pathname: '/xh/assetmgt', state: { isops: true } });
  };

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
  const [manufacturerOptions, setManufacturerOptions] = useState<{ value: string; label: string }[]>([]);
  const [manufacturerSearch, setManufacturerSearch] = useState('');
  const [manufacturerLoading, setManufacturerLoading] = useState(false);
  const [addingManufacturer, setAddingManufacturer] = useState(false);
  // const [assetOptions1, setAssetOptions1] = useState<any[]>([]);
  const [maintenanceRecordModalOpen, setMaintenanceRecordModalOpen] = useState(false);
  const [maintenanceHistoryModalOpen, setMaintenanceHistoryModalOpen] = useState(false);
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [maintenanceStatusNum, setMaintenanceStatusNum] = useState<number | null>(null);
  const [maintenanceRecordForm] = Form.useForm();
  const [maintainersVal, setMaintainersVal] = useState('');
  const [scheduleMaintenanceDateOption, setScheduleMaintenanceDateOption] = useState<any[]>([]);
  const [scheduleMaintenanceDate, setScheduleMaintenanceDate] = useState('');
  const [maintenanceStatusOption, setMaintenanceStatusOption] = useState([]);
  const [nextMaintenaceDateNull, setNextMaintenaceDateNull] = useState(false);
  const [assetReleaseModalOpen, setAssetReleaseModalOpen] = useState(false); // 资产上下架历史弹窗
  const [assetReleaseHistory, setAssetReleaseHistory] = useState<any[]>([]);
  const isNull = useRef(nextMaintenaceDateNull);
  const [showRootWarning, setShowRootWarning] = useState(false);
  const [fields_with_a_password_entered, setFields_with_a_password_entered] = useState<any>([]);
  const panelBaseProps: any = {
    size: 'small',
    bodyStyle: { padding: '24px 24px 8px 24px' },
  };
  const alertSstatusOption = [
    {
      label: '到期前一天',
      value: 0
    },
    {
      label: '到期前三天',
      value: 1
    },
    {
      label: '到期前一周',
      value: 2
    },
    {
      label: '到期前两周',
      value: 3
    },
  ]
  const maintenanceStatusOpt = [
    {
      label: '维保中',
      value: 0
    },
    {
      label: '已正常',
      value: 1
    },
    {
      label: '待维保',
      value: 2
    }
  ]
  const maintenanceTypeOption = [
    {
      label: '例行检查',
      value: 0
    },
    {
      label: '故障修复',
      value: 1
    },
    {
      label: '到期维护',
      value: 2
    }
  ]

  const loadManufacturerOptions = useCallback(async (showError = true) => {
    setManufacturerLoading(true);
    try {
      const res = await getDictDataListByType('manufacturer');
      const seen = new Set<string>();
      const options = _.reduce(
        res.dat || [],
        (result: { value: string; label: string }[], item: any) => {
          const value = _.trim(_.toString(item?.dict_value));
          if (!value || seen.has(value)) {
            return result;
          }
          seen.add(value);
          result.push({
            value,
            label: value,
          });
          return result;
        },
        [],
      );
      setManufacturerOptions(options);
      return options;
    } catch (error) {
      if (showError) {
        message.error('厂商字典加载失败');
      }
      return [];
    } finally {
      setManufacturerLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManufacturerOptions();
  }, [loadManufacturerOptions]);

  const handleAddManufacturer = useCallback(async () => {
    const nextManufacturer = _.trim(manufacturerSearch);
    if (!nextManufacturer) {
      return;
    }

    const exists = manufacturerOptions.some((item) => item.value === nextManufacturer);
    if (exists) {
      form.setFieldsValue({ manufacturers: nextManufacturer });
      return;
    }

    setAddingManufacturer(true);
    try {
      await addDictDataBySingle({
        dict_key: nextManufacturer,
        type_code: 'manufacturer',
        dict_value: nextManufacturer,
        remark: '',
      });
      const options = await loadManufacturerOptions(false);
      const currentExists = options.some((item) => item.value === nextManufacturer);
      if (!currentExists) {
        setManufacturerOptions((prev) => prev.concat([{ value: nextManufacturer, label: nextManufacturer }]));
      }
      form.setFieldsValue({ manufacturers: nextManufacturer });
      setManufacturerSearch('');
      message.success('厂商新增成功');
    } catch (error: any) {
      await loadManufacturerOptions(false);
      message.error(error?.message || '厂商新增失败');
    } finally {
      setAddingManufacturer(false);
    }
  }, [form, loadManufacturerOptions, manufacturerOptions, manufacturerSearch]);

  const manufacturerNotFoundContent = useMemo(() => {
    if (manufacturerLoading) {
      return (
        <div style={{ padding: '12px 0', textAlign: 'center' }}>
          <Spin size='small' />
        </div>
      );
    }

    const nextManufacturer = _.trim(manufacturerSearch);
    if (!nextManufacturer) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无数据' />;
    }

    return (
      <div
        style={{ padding: '12px 0', textAlign: 'center' }}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
      >
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='没有匹配的厂商' />
        <Button type='link' icon={<PlusOutlined />} loading={addingManufacturer} onClick={handleAddManufacturer}>
          新增厂商 "{nextManufacturer}"
        </Button>
      </div>
    );
  }, [addingManufacturer, handleAddManufacturer, manufacturerLoading, manufacturerSearch]);

  useEffect(() => {
    // 根据选择资产类型生成表单
    const assetType: any = assetTypes.find((v) => v.name === currentType);

    if (assetType) {
      setParams(assetType.form || []); // 显示form表单
      console.log('assetType.form===', assetType.form)
      // http服务鉴权字段处理
      if (currentType == 'HTTP服务') {
        let formData = form.getFieldsValue(true);
        let httpform = assetType.form;
        // console.log(formData);
        // console.log(httpform);
        if (formData?.params?.use_auth) {
          let form1 = []
          if (formData.params.auth_type == 'oauth2' && formData.params.oauth2_use_refresh) {
            form1 = httpform
          } else if (formData.params.auth_type == 'oauth2') {
            form1 = httpform.filter((v) => !v.depends_on || !v.depends_on[0].oauth2_use_refresh);
          } else {
            form1 = httpform.filter((v) => !v.depends_on || !v.depends_on[0].auth_type);
          }
          setParams(form1 || []);
        } else {
          httpform = httpform.filter((v) => !v.depends_on);
          setParams(httpform || []);
        }
      }
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
      // 增加维保信息tab
      items.push({
        name: 'maintenance',
        label: '维保信息',
      })
      setProperties(properties);
      setFormItems(items);
    }
  }, [assetTypes, currentType]);

  const loadAssetInfo = (id) => {
    if (!!id) {
      setEditType('edit');
      getXhAsset(_.toString(id)).then(({ dat }) => {
        let expands = dat.exps;
        if (expands != null && expands.length > 0) {
          const map = new Map();
          expands.forEach((item, index, arr) => {
            if (!map.has(item.config_category)) {
              map.set(
                item.config_category,
                arr.filter((a) => a.config_category == item.config_category),
              );
            }
          });
          //以上分组加载数据
          let mapValues = {};
          map.forEach(function (value, key) {
            const formDataMap = new Map();
            value.forEach((item, index, arr) => {
              if (!formDataMap.has(item.group_id)) {
                formDataMap.set(
                  item.group_id,
                  arr.filter((a) => a.group_id == item.group_id),
                );
              }
            });
            let group: any = [];
            formDataMap.forEach(function (value, i) {
              let itemsChars = '';
              value.forEach((item, index, arr) => {
                itemsChars += '"' + item.name + '":"' + item.value + '",';
              });
              itemsChars = '{' + itemsChars.substring(0, itemsChars.length - 1) + '}';
              group.push(JSON.parse(itemsChars));
            });
            mapValues[key] = group;
            dat[key] = group;
          });
          delete dat.exps;
        }
        console.log("dat===", dat)
        const passwordFields = dat?.params?.fields_with_a_password_entered || [];
        const formData = _.cloneDeep(dat);
        passwordFields.forEach((fieldName) => {
          if (_.isNil(formData?.params?.[fieldName]) || formData.params[fieldName] === '') {
            formData.params[fieldName] = PASSWORD_PLACEHOLDER_VALUE;
          }
        });
        setFields_with_a_password_entered(passwordFields)
        const params = { ident: dat.ident }
        setAssetData({ ...dat, ...params });
        form.resetFields();
        form.setFieldsValue(formData);
        setCurrentType(dat.type);
      });
    }
  };

  const handleChange = useCallback((value: string) => {
    // const selectedOption = assetOptions.find((option) => option.value === value);
    // if (selectedOption) {
    //   form.setFieldsValue({ ident: selectedOption.ident, ip: selectedOption.ip });
    //   setAssetData((prev) => ({ ...prev, ident: selectedOption.ident, ip: selectedOption.ip }));
    // } else {
    //   // 手动输入或清除时，清空 ident
    //   form.setFieldsValue({ ident: undefined });
    //   setAssetData((prev) => ({ ...prev, ident: undefined, ip: value }));
    // }
  }, [form]);

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
    const loadData = async () => {
      const { dat } = await getAssetstypes();
      const types = dat.map(item => item.name).toString()
      let assetTypes = dat.map((v) => ({
        value: v.name,
        label: v.name,
        ...v,
      }));
      if (!id) {
        assetTypes = assetTypes.filter(item => item.value !== "物理服务器" && item.value !== "虚拟服务器")
      }
      setAssetTypes(assetTypes);
      // 资产信息新增时 设置资产类型的默认值
      const asset_type = localStorage.getItem('left_asset_type')
      if (!id && assetTypes.some(item => item.name === asset_type)) {
        form.setFieldsValue({
          type: asset_type,
        });
        setCurrentType(asset_type)
      }

      const param = { limit: -1, types };
      const res = await getAssetsByCondition(param);
      const options = res.dat?.list.map((v) => ({
        key: v.id,
        value: v.id,
        label: `[${v.type}]-[${v.ip}]-${v.name}`,
        type: v.type,
        ident: v.name,
        ip: v.ip,
      })).sort((a, b) => localeCompare(a.label, b.label))
        .filter(item => item.type.includes('服务器') || item.type.includes('虚拟'));

      setAssetOptions(options);
      setAssetList(res.dat?.list.reduce((acc, v) => ({ ...acc, [v.id]: v }), {}));
    };

    loadData();
  }, [id]);

  useEffect(() => {
    if (id && assetOptions.length > 0 && assetData) {
      const selectedOption = assetOptions.find((option) => option.ident === assetData.ident);
      console.log("selectedOption", selectedOption);
      if (selectedOption) {
        form.setFieldsValue({ ip: selectedOption.value });
        setAssetData((prev) => ({ ...prev, ip: selectedOption.value }));
      }
    }
  }, [assetOptions, assetData.id]);

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
    //  检查管理状态，如果是上架状态则清空下架原因
    if (assetData.is_shelf === true) {
      assetData.shelf_reason = ''
    }
    // ip地址后端需要ip与ident,但ip可能会重复，所以ident只能够通过资产id查询到，所以ip地址下拉框绑定id作为value
    let paramsData = assetData
    const selectedOption = assetOptions.find((option) => option.value === assetData.ip);
    if (selectedOption) {
      form.setFieldsValue({ ident: selectedOption.ident, ip: selectedOption.ip });
      setAssetData((prev) => ({ ...prev, ident: selectedOption.ident, ip: selectedOption.ip }));
      paramsData = { ...paramsData, ident: selectedOption.ident, ip: selectedOption.ip }
    }
    console.log("submitForm111", assetData, assetOptions, paramsData)

    if (editType !== 'edit') {
      await insertXHAsset(paramsData);
      message.success('添加成功');
      backToAssetList();
    } else {
      console.log("submitForm====", paramsData, map)
      const keys = Object.keys(map)
      keys.forEach(key => {
        paramsData.params[key] = map[key]
      })
      delete paramsData['tags']; // 更新信息不包括tag，格式不符
      paramsData.id = _.toNumber(id);
      await updateXHAsset(paramsData);
      await formItems.map(async (v) => {
        const subItem: any[] = [];
        const expData = paramsData[v.name]; //[{item}]
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
      if (form.getFieldsValue().asset_position) {
        saveMaintenanceInfo();
      }
      backToAssetList();
      // loadAssetInfo(id);
    }
  };
  let map = {}
  const AlwaysShowPlaceholderPassword = ({ placeholder, name, value, onChange, hasStoredValue }) => {
    const inputRef = useRef(null);
    const currentValue = value === PASSWORD_PLACEHOLDER_VALUE ? '' : value || '';

    const handleChange = (e) => {
      const nextValue = e.target.value;
      const formValue = !nextValue && hasStoredValue ? PASSWORD_PLACEHOLDER_VALUE : nextValue;
      map[name] = nextValue
      onChange?.({
        target: {
          value: formValue,
        },
      });
    };

    if (currentValue) {
      return <Input.Password value={currentValue} autoFocus onChange={handleChange} />;
    }

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <Input
          ref={inputRef}
          type="text"
          value={currentValue}
          onChange={handleChange}
          style={{
            color: 'transparent',
            textShadow: '0 0 0 transparent',
            caretColor: '#333',
          }}
        />
        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            position: 'absolute',
            left: 12,
            top: 0,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            color: currentValue ? '#ccc' : '#bfbfbf',
            pointerEvents: 'none',
            fontSize: 12,
            userSelect: 'none',
            whiteSpace: 'pre',
          }}
        >
          {placeholder || '请输入密码'}
        </div>
      </div>
    );
  };
  const renderFormItem = (v) => {

    if (v.type === 'select') {
      return <Select key={'v' + v.name} style={{ width: '100%' }} options={v.options} onChange={onSelectChange}></Select>;
    }
    if (v.type === 'password') {
      // console.log('password===', form.getFieldsValue(), fields_with_a_password_entered, v)
      if (mode == 'view') { //查看
        return <Input.Password key={'v' + v.name} visibilityToggle={false} />;
      }
      if (mode == 'edit' && id) { //编辑
        const hasStoredValue = fields_with_a_password_entered.includes(v.name);
        const placeholder = hasStoredValue ? '请输入密码，不输入代表不更新' : '请输入密码'

        return <ControlledPasswordField placeholder={placeholder} hasStoredValue={hasStoredValue} onDraftChange={(nextValue) => { map[v.name] = nextValue; }} />
      }
      return <Input.Password key={'v' + v.name} placeholder={`请输入${v.label}`} />;
    }
    if (v.type === 'checkbox') {
      return <Checkbox onChange={onCheckChange}></Checkbox>;
    }
    if (form.getFieldsValue() && form.getFieldsValue().type && form.getFieldsValue().type == '宿主机'
      && v.name === 'user') {
      console.log("suzhuji", v.name)
      return (
        <>
          <Input
            key={'v' + v.name}
            placeholder={`请填写${v.label}`}
            name={v.name}
            onChange={(e) => {
              const value = e.target.value;
              setShowRootWarning(value === 'root'); // 仅当输入 root 时显示提示
            }}
          />
          {showRootWarning && (
            <div
              style={{
                color: '#faad14',
                fontSize: 12,
                marginTop: 4,
                lineHeight: '16px',
              }}
            >
              请慎用 root 账号，建议使用已开通的监控账号。
            </div>
          )}
        </>
      );
    }
    return <Input key={'v' + v.name} placeholder={`请填写${v.label}`} name={v.name} />;
  };

  const onCheckChange = (e) => {
    // console.log(e);
    // http服务鉴权字段处理
    if (currentType == 'HTTP服务') {
      const assetType: any = assetTypes.find((v) => v.name === currentType);
      let httpform = assetType.form;
      let formData = form.getFieldsValue(true);
      let form1 = []
      // 点击复选框是否使用鉴权
      if (e.target.id == 'asset_params_use_auth') {
        // console.log(formData);
        if (assetType) {
          if (e.target.checked) {
            if (formData.params.auth_type == 'oauth2' && formData.params.oauth2_use_refresh) {
              form1 = httpform
            } else if (formData.params.auth_type == 'oauth2') {
              form1 = httpform.filter((v) => !v.depends_on || !v.depends_on[0].oauth2_use_refresh);
            } else {
              form1 = httpform.filter((v) => !v.depends_on || !v.depends_on[0].auth_type);
            }
          } else {
            form1 = httpform.filter((v) => !v.depends_on);
          }
          setParams(form1 || []);
        }
      }
      // 点击复选框启用refresh token
      if (e.target.id == 'asset_params_oauth2_use_refresh') {
        if (assetType) {
          if (e.target.checked) {
            form1 = httpform
          } else {
            form1 = httpform.filter((v) => !v.depends_on || !v.depends_on[0].oauth2_use_refresh);
          }
          setParams(form1 || []);
        }
      }
    }
  };

  const onSelectChange = (e) => {
    // console.log(e);
    // 点击选择框鉴权类型
    if (currentType == 'HTTP服务') {
      const assetType: any = assetTypes.find((v) => v.name === currentType);
      // http服务鉴权字段处理
      if (e == 'oauth2') {
        if (assetType) {
          let httpform = assetType.form;
          let form1 = httpform.filter((v) => !v.depends_on || !v.depends_on[0].auth_type || !v.depends_on[0].oauth2_use_refresh);
          setParams(form1 || []);
        }
      }
    }
  };

  const updateData = (changedValues, values) => {
    // 如果 values 中有 ident，使用 values.ident；否则保持 assetData.ident 不变
    const newData = { ...assetData, ...values };
    if (!values.hasOwnProperty('ident')) {
      newData.ident = assetData.ident;
    }
    setAssetData(newData);
  };

  // IP地址校验规则
  const validateIP = (rule, value) => {
    // if (value) {
    //   const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    //   if (!regex.test(value)) {
    //     return Promise.reject('请输入合法的IP地址');
    //   }

    //   const parts = value.split('.').map(Number);
    //   if (parts.every(part => part === 0)) {
    //     return Promise.reject('请输入合法的IP地址');
    //   }
    //   if (parts.every(part => part === 255)) {
    //     return Promise.reject('请输入合法的IP地址');
    //   }
    // }
    return Promise.resolve();
  };


  const formItemLayout = { labelCol: { span: 8 }, wrapperCol: { span: 10 } };
  // 获取维保信息详情
  const getMaintenanceInfo = async () => {
    try {
      // setMaintenanceStatusOption(maintenanceStatusOpt)
      const res = await getMaintenanceInfoById(_.toNumber(id));
      getMaintenanceHistoryData()
      if (res.dat) {
        const formattedData = formatMaintenanceData(res.dat);
        if (mode === 'edit') {
          // var dateToCheck = moment(timestampToCST(res.dat.next_maintenace_date));
          // var today = moment().startOf('day');
          if (res.dat.maintenance_status == 1) {
            let opts = maintenanceStatusOpt.filter(x => x.value == 1)
            setMaintenanceStatusOption(opts)
          } else {
            let opts = maintenanceStatusOpt.filter(x => x.value != 1)
            setMaintenanceStatusOption(opts)
          }
          setMaintenanceStatusNum(res.dat.maintenance_status.toString());
        }
        form.setFieldsValue(formattedData);
        if (isNull.current) {
          form.setFieldsValue({ next_maintenace_date: null });
        }

        // 计划维保日期option
        let dataStr = timestampToCST(res.dat.next_maintenace_date).toString()
        setScheduleMaintenanceDateOption([
          {
            label: dataStr,
            value: res.dat.next_maintenace_date
          },
          {
            label: '无计划',
            value: -1
          },
        ])
      }
    } catch (error) {
      console.error('Error fetching maintenance info:', error);
    }
  }

  const formatMaintenanceData = (data) => ({
    ...data,
    last_maintenace_date: data.last_maintenace_date ? moment(data.last_maintenace_date * 1000) : '',
    purchase_data: data.purchase_data ? moment(data.purchase_data * 1000) : '',
    next_maintenace_date: data.next_maintenace_date ? moment(data.next_maintenace_date * 1000) : '',
    warranty_date: data.warranty_date ? moment(data.warranty_date * 1000) : '',
  });

  //保存维保信息
  const saveMaintenanceInfo = () => {
    let formData = form.getFieldsValue();
    editMaintenanceInfo({
      asset_id: _.toNumber(id),
      asset_model: formData.asset_model,
      purchase_data: timestamp(formData.purchase_data),
      asset_position: formData.asset_position,
      warranty_date: timestamp(formData.warranty_date),
      last_maintenace_date: timestamp(formData.last_maintenace_date),
      next_maintenace_date: timestamp(formData.next_maintenace_date),
      maintainers: formData.maintainers,
      alert_status: 2,
      maintenance_status: formData.maintenance_status,
    }).then((res) => {
      message.success('操作成功');
    });
  }
  // show 维保记录弹框
  const showMaintenanceRecord = () => {
    maintenanceRecordForm.resetFields()
    // maintenanceRecordForm.setFieldsValue({})
    setMaintenanceRecordModalOpen(true);
  }

  const disabledDate = (current) => {
    return current && current < moment().startOf('day');
  };
  // 下次维保时间选择关联维保状态选择
  const nextMaintenaceDate = (date, dateString) => {
    form.setFieldsValue({ 'maintenance_status': '' })
    setMaintenanceStatus(dateString)
  }
  // 根据维保时间设置维保状态option及默认值
  const setMaintenanceStatus = (dateString) => {
    var dateToCheck = moment(dateString);
    var today = moment().startOf('day');
    if (dateToCheck.isSame(today, 'day')) {
      let opts = maintenanceStatusOpt.filter(x => x.value != 1)
      setMaintenanceStatusOption(opts)
      form.setFieldsValue({ maintenance_status: 2 })
    } else {
      let opts = maintenanceStatusOpt.filter(x => x.value == 1)
      setMaintenanceStatusOption(opts)
      form.setFieldsValue({ maintenance_status: 1 })
    }
  }
  // 维保记录新增
  const mrhandleOk = () => {
    try {
      maintenanceRecordForm.validateFields().then(values => {
        addMaintenanceHistory({
          ...values,
          asset_id: _.toNumber(id),
          actual_maintenance_date: timestamp(values.actual_maintenance_date),
        }).then(() => {
          setMaintenanceRecordModalOpen(false);
          setMaintenanceStatusOption(maintenanceStatusOpt)
          if (values.schedule_maintenance_date != -1) {
            setNextMaintenaceDateNull(abs => {
              isNull.current = true;
              return isNull.current;
            })
            message.success('操作成功,注意：请更新下次维保时间并且需点击保存按钮进行提交！若未保存则视为新增维保记录失败');
            getMaintenanceInfo()
          } else {
            message.success('操作成功');
          }
        }).catch(err => {
          message.error('添加维保记录失败，请重试');
        })
      });
    } catch (error) { }
  };
  // show 维保历史弹框
  const showmaintenanceHistory = () => {
    getMaintenanceHistoryData()
    setMaintenanceHistoryModalOpen(true);
  }
  const getMaintenanceHistoryData = (maintenanceDate = -1) => {
    getMaintenanceHistory({ id: _.toNumber(id), actual_maintenance_date: maintenanceDate }).then((res) => {
      setMaintenanceHistory(res.dat);
      // let next_maintenace_date = form.getFieldValue('next_maintenace_date')
      // let next_maintenace_date2 = next_maintenace_date['_i']/1000;
      // let findItem = res.dat.find(x=>isSameDay(x.actual_maintenance_date,next_maintenace_date2))

      // if(findItem.actual_maintenance_date){
      //   setScheduleMaintenanceDate(prevCount => prevCount= findItem.actual_maintenance_date)
      // }
    });
  }
  const maintenanceDateChange = (date, dateString) => {
    getMaintenanceHistoryData(!date ? -1 : timestamp(date))
  }
  const mhhandleOk = () => {
    setMaintenanceHistoryModalOpen(false);
  };

  // 使用 useMemo 缓存计算结果
  const sortedAssetOptions = useMemo(() => {
    return assetOptions.sort((a, b) => localeCompare(a.label, b.label));
  }, [assetOptions]);

  // 资产上下架历史弹窗
  const showAssetReleaseHistory = () => {
    getAssetReleaseHistory()
    setAssetReleaseModalOpen(true);
  }
  // 获取资产上下架历史
  const getAssetReleaseHistory = (date?: number) => {
    getAssetShelfHistory({ asset_id: _.toNumber(id), date }).then((res) => {
      setAssetReleaseHistory(res.dat?.dat);
    });
  }
  const assetReleaseDateChange = (date, dateString) => {
    // console.log('上下架日期',date, dateString);
    getAssetReleaseHistory(timestamp(date.startOf('day')))
  }

  return (
    <div className='asset_every'>
      <div className='assetmgt_header_select'>
        <Tabs
          className='assetmgt_list_2'
          activeKey={tabIndex}
          type='card'
          size='small'
          onTabClick={(key) => {
            if (key == 'maintenance') {
              getMaintenanceInfo()
            }
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
                    <Select
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      allowClear={true}
                      options={sortedAssetOptions}
                      optionFilterProp={"label"}
                      placeholder='请选择IP地址'
                      onChange={handleChange}
                      disabled={currentType === "物理服务器" || currentType === "虚拟服务器"}
                    // onChange={(v) => {
                    //   onAssetChange({
                    //     includes: v !== 0 ? [v] : [],
                    //     excludes: form.getFieldValue('excludes'),
                    //   });
                    //   buildPromqlWithAsset({});
                    //   setShowExcludes(v === 0);
                    // }}
                    />
                    {/* <AutoComplete
                      allowClear={true}
                      disabled={currentType === "物理服务器" || currentType === "虚拟服务器"}
                      options={sortedAssetOptions}
                      onChange={handleChange}
                      // onSearch={(text) => getPanelValue(text)}
                      filterOption={(inputValue, assetOptions) =>
                        assetOptions!.ip.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                      }
                      placeholder="请输入IP地址"
                    /> */}
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='厂商' name='manufacturers' rules={[{ required: false }]}>
                    <Select
                      style={{ width: '100%' }}
                      allowClear
                      showSearch
                      filterOption
                      optionFilterProp={"label"}
                      onSearch={(value) => {
                        setManufacturerSearch(value);
                      }}
                      onBlur={() => {
                        setManufacturerSearch('');
                      }}
                      notFoundContent={manufacturerNotFoundContent}
                      options={manufacturerOptions}
                      placeholder='请选择厂商'
                    />
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
                {/* <Col span={12}>
                  <Form.Item label='服务层级' name='service_level' rules={[{ required: false }]}>
                    <Select
                      style={{ width: '100%' }}
                      allowClear
                      options={serviceHierarchyOptions.map(({ label, value }) => ({
                        label: label,
                        value: value,
                      }))}
                      placeholder='请选择服务层级'
                    >
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='设备形态' name='device_type' rules={[{ required: false }]}>
                    <Select
                      style={{ width: '100%' }}
                      allowClear
                      options={deviceFormOptions.map(({ label, value }) => ({
                        label: label,
                        value: value,
                      }))}
                      placeholder='请选择设备形态'
                    >
                    </Select>
                  </Form.Item>
                </Col> */}
                <Col span={12}>
                  <Form.Item label='备注' name='memo'>
                    <Input placeholder='填写备注' />
                  </Form.Item>
                </Col>
                {/* 管理状态：上架资产、下架资产 */}
                <Col span={12}>
                  <Form.Item label='管理状态' name='is_shelf' rules={[{ required: true }]} initialValue={true}>
                    <Select
                      style={{ width: '100%' }}
                      allowClear
                      placeholder='请选择管理状态'
                    >
                      {mode === 'view' ? (
                        // 查看模式：已上架、已下架
                        <>
                          <Select.Option value={true}>已上架</Select.Option>
                          <Select.Option value={false}>已下架</Select.Option>
                        </>
                      ) : (
                        // 编辑/新增模式：上架资产、下架资产
                        <>
                          <Select.Option value={true}>上架资产</Select.Option>
                          <Select.Option value={false}>下架资产</Select.Option>
                        </>
                      )}
                    </Select>
                  </Form.Item>
                  {mode === 'view' && (
                    <span className='hsBtn' style={{ fontSize: '12px', position: 'absolute', left: '76%', top: '15%' }} onClick={showAssetReleaseHistory} >上下架历史</span>
                  )}
                </Col>
                {form.getFieldValue('is_shelf') === false && (
                  <Col span={24}>
                    <Form.Item
                      labelCol={{ span: 4 }}
                      wrapperCol={{ span: 17 }}
                      label='下架原因'
                      name='shelf_reason'
                      rules={[{
                        required: true,
                        message: '请填写下架原因'
                      }]}
                    >
                      <Input.TextArea
                        placeholder='请填写下架原因'
                        rows={4}
                      />
                    </Form.Item>
                  </Col>
                )}

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
        {tabIndex != 'base_set' && tabIndex != 'maintenance' && (
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
        {/* 维保信息 */}
        {tabIndex == 'maintenance' && (
          <div className='card-wrapper' >
            <Card {...panelBaseProps} className='card_base' style={{ padding: '1rem 0' }}>
              <Row>
                <Col span={4} offset={22}>
                  <span className='hsBtn' onClick={showmaintenanceHistory}>维保历史</span>
                </Col>
              </Row>
              <Row gutter={10}>
                <Col span={12}>
                  <Form.Item label='资产型号' name='asset_model'>
                    <Input placeholder='请输入资产型号' />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='购置日期' name='purchase_data' >
                    <DatePicker format='YYYY-MM-DD' style={{ width: '100%' }} placeholder='请选择购置日期' />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='所在位置' name='asset_position' rules={[{ required: true }]}>
                    <Input placeholder='请输入所在位置' />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='保修期至' name='warranty_date' rules={[{ required: false }]}>
                    <DatePicker format='YYYY-MM-DD' style={{ width: '100%' }} placeholder='请选择保修期至' />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='上次维保日期' name='last_maintenace_date'>
                    <DatePicker format='YYYY-MM-DD' disabled style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='下次维保日期' name='next_maintenace_date' rules={[{ required: true }]}>
                    <DatePicker format='YYYY-MM-DD' onChange={nextMaintenaceDate} disabledDate={disabledDate} style={{ width: '100%' }} placeholder='请选择下次维保日期' />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='维保人员' name='maintainers' rules={[{ required: true }, { pattern: /^[\u4e00-\u9fa5]+$/, message: '请输入有效的中文!' }]}>
                    <Input placeholder='请输入维保人员' />
                  </Form.Item>
                </Col>
                {/* <Col span={12}>
                  <Form.Item label='维保提醒' name='alert_status' rules={[{ required: true }]}>
                    <Select
                      style={{ width: '100%' }}
                      options={alertSstatusOption}
                      placeholder='请选择维保提醒'
                    />
                  </Form.Item>
                </Col> */}
                <Col span={12}>
                  <Form.Item label='维保状态' name='maintenance_status' rules={[{ required: true }]}>
                    {/* disabled={maintenanceStatusNum && maintenanceStatusNum != '2'} */}
                    <Select
                      style={{ width: '100%' }}
                      options={maintenanceStatusOption}
                      placeholder='请选择维保状态'
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row>
                <Col span={12} offset={3}>
                  <Button type="primary" disabled={!maintenanceStatusNum} onClick={showMaintenanceRecord}>新增维保记录</Button>
                </Col>
              </Row>
            </Card>
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
                    backToAssetList();
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
              backToAssetList();
            }}
          >
            关闭
          </Button>
        </div>
      )}
      {/* 新增维保记录弹框 */}
      <Modal title="新增维保记录" width='50%' visible={maintenanceRecordModalOpen} onOk={mrhandleOk} onCancel={() => { setMaintenanceRecordModalOpen(false) }}>
        <Form
          name="basic"
          form={maintenanceRecordForm}
          labelCol={{
            span: 8,
          }}
          wrapperCol={{
            span: 16,
          }}
        >
          <Row gutter={10}>
            <Col span={12}>
              <Form.Item
                label="维保类型"
                name="maintenance_type"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Select
                  style={{ width: '100%' }}
                  options={maintenanceTypeOption}
                  placeholder='请选择维保类型'
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="维保人"
                name="maintainers"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Input placeholder='请输入维保人' />
              </Form.Item>
            </Col>

          </Row>
          <Row gutter={10}>
            <Col span={12}>
              <Form.Item
                label="计划维保日期"
                name="schedule_maintenance_date"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Select
                  style={{ width: '100%' }}
                  options={scheduleMaintenanceDateOption}
                  placeholder='请选择计划维保日期'
                />

              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="实际维保日期"
                name="actual_maintenance_date"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <DatePicker format='YYYY-MM-DD' style={{ width: '100%' }} placeholder='请选择维保日期' />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={10}>
            <Col span={12}>
              <Form.Item
                label="维保费用(元)"
                name="expenses"
              >
                <InputNumber min="0" placeholder='请输入维保费用' style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="维保服务商"
                name="maintenance_provider"
              >
                <Input placeholder='请输入维保服务商' />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Form.Item
                label="维保内容"
                name="content"
                rules={[
                  {
                    required: true,
                  },
                ]}
                labelCol={{
                  span: 4,
                }}
                wrapperCol={{
                  span: 20,
                }}
              >
                <TextArea autoSize={{ minRows: 3, maxRows: 10 }} placeholder='请输入维保内容' style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 维保历史弹框 */}
      <Modal title="维保历史" width='50%' footer={null} visible={maintenanceHistoryModalOpen} onOk={mhhandleOk} onCancel={() => { setMaintenanceHistoryModalOpen(false) }}>
        <div style={{ marginBottom: '1rem' }}>
          <span>维保日期&nbsp;&nbsp;</span>
          <DatePicker allowClear style={{ width: '30%' }} onChange={maintenanceDateChange} placeholder='请选择维保日期' />
        </div>
        <Timeline style={{ maxHeight: '500px', overflowY: 'auto', padding: '.5rem 0' }}>
          {
            maintenanceHistory.length && (
              maintenanceHistory.map((x, index) => {
                return (
                  <Timeline.Item color="green" key={index}>
                    <div className='one'>
                      <span>{timestampToCST(x.actual_maintenance_date)} </span>
                      <Tag color="blue">{maintenanceTypeOption.filter(item => item.value == x.maintenance_type)[0]?.label}</Tag>
                      {
                        x.expenses.toString() && (
                          <Tag color="orange">{x.expenses.toString()}</Tag>
                        )
                      }
                      {
                        x.maintenance_provider && (
                          <Tag color="green">{x.maintenance_provider}</Tag>
                        )
                      }
                    </div>
                    <div style={{ margin: '.3rem 0' }}>维保人：{x.maintainers}</div>
                    <div style={{ padding: '.3rem 0', background: '#F2F8FF' }}>维保内容：{x.content}</div>
                  </Timeline.Item>
                )
              })
            )
          }
        </Timeline>
      </Modal>

      {/* 资产上下架历史弹窗 */}
      <Modal title="资产上下架历史" width='50%' footer={null} visible={assetReleaseModalOpen} onOk={() => { setAssetReleaseModalOpen(false) }} onCancel={() => { setAssetReleaseModalOpen(false) }}>
        <div style={{ marginBottom: '1rem' }}>
          <span>选择日期&nbsp;&nbsp;</span>
          <DatePicker allowClear format='YYYY-MM-DD' style={{ width: '30%' }} onChange={assetReleaseDateChange} placeholder='请选择上下架日期' />
        </div>
        <div style={{ marginLeft: '2rem' }}>
          <div style={{ marginBottom: '.5rem' }}>共{assetReleaseHistory.length}条记录</div>
          <Timeline style={{ maxHeight: '500px', overflowY: 'auto', padding: '.5rem 0' }}>
            {
              assetReleaseHistory.length && (
                assetReleaseHistory.map((x, index) => {
                  return (
                    <Timeline.Item key={index} color="#2977d7">
                      <Space>
                        <span>{moment.unix(x.operation_time).format('YYYY-MM-DD HH:mm:ss')} </span>
                        <Tag color={x.is_shelf ? "success" : "default"}>{x.is_shelf ? "上架资产" : "下架资产"} </Tag>
                      </Space>
                      <div style={{ margin: '.5rem 0' }}>操作人：{x.operator}</div>
                      {!x.is_shelf && (
                        <div style={{ padding: '.5rem 0', background: '#F2F8FF' }}>下架原因：{x.reason}</div>
                      )}
                    </Timeline.Item>
                  )
                })
              )
            }
          </Timeline>
        </div>
      </Modal>
    </div>
  );
}

import React, { useContext, useEffect, useState } from 'react';
import { Button, Dropdown, Input, Menu, message, Modal, Space, Table, Tag, Tree, Switch, Row, Card, Checkbox, Form, Select, Radio } from 'antd';
import PageLayout from '@/components/pageLayout';
import { useTranslation } from 'react-i18next';
import { CheckCircleOutlined, SyncOutlined, GroupOutlined, SearchOutlined, DoubleLeftOutlined } from '@ant-design/icons';
const { confirm } = Modal;
import { SetConfigTables, SetConfigForms } from './catalog'
import { CommonStateContext } from '@/App';
import CommonModal from '@/components/CustomForm/CommonModal';
import './locale';
import './style.less';
import _ from 'lodash';
import { assetsType } from '@/store/assetsInterfaces';
import { deleteAssets, getAssets, getOrganizationTree, updateOrganization, deleteOrganization, addOrganization } from '@/services/assets';
import RefreshIcon from '@/components/RefreshIcon';
import { Link, useHistory } from 'react-router-dom';





interface DataType {
  key: React.ReactNode;
  name: string;
  age: number;
  address: string;
  children?: DataType[];
}

export default function () {
  const { t } = useTranslation('assets');
  const commonState = useContext(CommonStateContext);
  const [treeData, setTreeData] = useState<any[]>();
  const [refreshKey, setRefreshKey] = useState(_.uniqueId('refreshKey_'));
  const history = useHistory();
  const [query, setQuery] = useState<string>('');
  const [props, setProps] = useState<any>({});
  const [initData, setInitData] = useState({});
  const [formData, setFormData] = useState<any>({});
  const [businessForm, setBusinessForm] = useState<any>({});
  const [filterType, setFilterType] = useState<string>("");
  const [searchVal, setSearchVal] = useState<any>(null);
  const { Option } = Select;
  const [refreshing, setRefreshing] = useState(false);

  
  const handleRefresh = () => {
    setRefreshing(true);
    // 添加数据刷新逻辑
  
    setTimeout(() => {
      // 添加数据刷新逻辑...
      setRefreshing(false);
    }, 500); // 模拟延迟
  };
   

  const loadingTree = () => {
    getOrganizationTree({}).then(({ dat }) => {
      setTreeData(dat);
      initData["parent_id"] = dat;
      setInitData({ ...initData })
    });
  };

  useEffect(() => {
    loadingTree();
  }, [query]);

  const renderFields = (text, record, field, currentConfigId) => {
    console.log("渲染数据列", text, record, field, currentConfigId);
    let value = record[field];
    return value;
  }

  const formSubmit = (param, businessForm) => {
    if (businessForm["operate"] == "添加") {
      addOrganization(param).then(() => {
        message.success("添加成功");
        loadingTree();
        businessForm.isOpen = false;
        setBusinessForm(_.cloneDeep(businessForm))
      });
    } else if (businessForm["operate"] == "修改") {
      param.id = parseInt(businessForm["operateId"]);
      if (param.id == param.parent_id) {
        message.error("上级组织机构不能选择当前要修改的组织机构")
        return;
      }
      updateOrganization(param).then(() => {
        loadingTree();
        message.success("修改成功");
        businessForm.isOpen = false;
        setBusinessForm(_.cloneDeep(businessForm))
      });
    }

  }

  const handleClick = (action: string, record?: any) => {

    let configId = "organization_set";
    let businessZip = SetConfigForms[configId];
    businessZip.Modal.title = "-" + businessZip.Modal.title;
    businessZip.renderFields = (text, record, field) => {
      return renderFields(text, record, field, configId);
    };
    businessForm["businessId"] = configId;
    businessForm["isOpen"] = true;
    if (action == "create") {
      businessForm["operate"] = "添加";
      businessForm["operateId"] = null;
      setFormData(null)
    } else {
      businessForm["operate"] = "修改";
      businessForm["operateId"] = record.id;
      if (record.parent_id == 0) {
        delete record.parent_id;
      }
      setFormData(record)
    }
    setBusinessForm(_.cloneDeep(businessForm))
    businessZip.Modal.cancel = () => {
      businessForm.isOpen = false;
      setBusinessForm(_.cloneDeep(businessForm))
    };
    businessZip.Modal.submit = async (values) => {
      formSubmit(values, businessForm)
    };
    businessZip.initData = initData;
    setProps((businessZip));
    console.log("初始化页面加载信息", businessZip);

  }
  const onSearchQuery = (e) => {
    let val = e.target.value;
    setQuery(val);
  };
  const deleteNode = (node) => {
    deleteOrganization(node.id).then(() => {
      loadingTree();
    });
  };


  return (
    <PageLayout icon={<GroupOutlined />} title={'License使用信息'}>
      <div className='assets-list' style={{ height: '30px', lineHeight: '39px' }}>
        <Row className='event-table-search'>
          <div className='event-table-search-left' style={{ marginLeft: '10px' }}>
           
            <Input
              placeholder="资产名称、资产类型、IP地址"
              style={{ width: "360px", marginRight: "20px" }}
              suffix={
                <Space>
                  <SearchOutlined style={{ color: '#1890ff' }} />
                </Space>
              }
            />
            <Select placeholder="设备类型" style={{ width: "120px" }}>
              <Option value1>设备类型</Option>
              <Option value="服务器">X86服务器</Option>
            </Select>
          </div>


          <div className='user-manage-operate' style={{ textAlign: 'right' }}>
            <Button type='primary' onClick={handleRefresh} icon={<SyncOutlined spin={refreshing} />} style={{ position:'absolute',right:0, marginLeft: 'auto' }}>
            同步License
            </Button>
          </div>
        </Row>

        <Table
          dataSource={treeData}
          rowSelection={{

          }}
          pagination={false}
          columns={[
            {
              title: '设备',
              dataIndex: '设备',
              render(value, record, index) {
                return value;
              },
            },
            {
              title: '设备序列号',
              dataIndex: '设备序列号',
            },
            {
              title: '设备类型',
              dataIndex: '设备类型',
            },
            {
              title: '采集器信息',
              dataIndex: '采集器信息',
            },
            {
              title: '首次创建监测',
              dataIndex: '首次创建监测',
            },
            {
              title: '所在机房',
              dataIndex: '所在机房',
            },
            {
              title: '位置',
              dataIndex: '位置',
            },
          ]}
          rowKey='id'
          size='small'
        ></Table>




        <CommonModal
          Modal={props.Modal}
          Form={props.Form}
          initial={initData}
          defaultValue={formData}
          operate={businessForm.operate}
          isOpen={businessForm.isOpen} >
        </CommonModal>
      </div>
    </PageLayout>
  );
}

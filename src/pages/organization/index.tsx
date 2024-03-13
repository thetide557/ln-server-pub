import React, { useContext, useEffect, useState } from 'react';
import { Button, Dropdown, Input, Menu, message, Modal, Space, Table, Tag, Tree, Switch, Row } from 'antd';
import PageLayout from '@/components/pageLayout';
import { useTranslation } from 'react-i18next';
import { CheckCircleOutlined, DownOutlined, GroupOutlined, SearchOutlined } from '@ant-design/icons';
import { EditOutlined, PlusOutlined, MinusOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons';
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

  const renderFields = (text,record, field, currentConfigId)=>{
    console.log("渲染数据列",text,record,field,currentConfigId);
    let value = record[field];
    return value;
  }

  const formSubmit = (param, businessForm) => {    
    if(businessForm["operate"] =="添加"){
      addOrganization(param).then(() => {
        message.success("添加成功");
        loadingTree();
        businessForm.isOpen = false;
        setBusinessForm(_.cloneDeep(businessForm))
      });
    }else if(businessForm["operate"]=="修改"){
      param.id = parseInt(businessForm["operateId"]);
      if(param.id==param.parent_id){
          message.error("上级组织机构不能选择当前要修改的组织机构")
          return ;
      }
      updateOrganization(param).then(() => {
        loadingTree();
        message.success("修改成功");
        businessForm.isOpen = false;
        setBusinessForm(_.cloneDeep(businessForm))
      });
    }
    
  }

  const handleClick = (action:string,record?:any)=>{

    let configId ="organization_set";
    let businessZip =SetConfigForms[configId];
        businessZip.Modal.title = "-" + businessZip.Modal.title;
        businessZip.renderFields =(text,record,field)=>{
           return renderFields(text,record,field,configId);
        };        
        businessForm["businessId"] = configId;
        businessForm["isOpen"] = true;
        if(action=="create"){
            businessForm["operate"] ="添加";
            businessForm["operateId"] = null;
            setFormData(null)
        }else{
            businessForm["operate"] ="修改";
            businessForm["operateId"] =record.id;
            if(record.parent_id==0){
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
    <PageLayout icon={<GroupOutlined />} title={'组织管理'}>          
          <div className='assets-list'>
          <Row className='event-table-search'>
              <div className='event-table-search-left'>
                <Input className={'searchInput_1'} prefix={<SearchOutlined />}  onPressEnter={onSearchQuery} placeholder={t('输入组织名称进行检索')} />
               
              </div>
              <div className='event-table-search-right'>
                  <div className='user-manage-operate'>
                    <Button type='primary' onClick={() => handleClick('create')}>
                      {t('common:btn.add')}
                    </Button>
                  </div>
              </div>
            </Row>
            <Table
              dataSource={treeData}
              rowSelection={{
                
              }}
              pagination={false}
              columns={[
                {
                  title: '组织名称',
                  dataIndex: 'name',
                  render(value, record, index) {
                    return  value ;
                  },
                },               
                {
                  title: '城市',
                  dataIndex: 'city',
                },
                {
                  title: '地址',
                  dataIndex: 'address',
                },
                {
                  title: t('机构负责人'),
                  dataIndex: 'manger',
                },
                {
                  title: '联系电话',
                  dataIndex: 'phone',
                },
                {
                  title: '描述',
                  dataIndex: 'description',
                },                
                {
                  title: t('common:table.operations'),
                  width: '180px',
                  render: (text: string, record: assetsType) => (
                    <div className='table-operator-area'>
                      <Button size='small'className='oper-name' type='link' onClick={() => {
                        handleClick("update", record);
                      }}>
                        修改
                      </Button>                     
                      <a
                        style={{
                          color: 'red',
                          marginLeft: '16px',
                          marginTop:'3px'
                        }}
                        onClick={async () => {
                          Modal.confirm({
                            title: t('common:confirm.delete'),
                            onOk: async () => {
                              await deleteNode(record);
                              message.success(t('common:success.delete'));
                            },

                            onCancel() {},
                          });
                        }}
                      >
                        {t('common:btn.delete')}
                      </a>
                    </div>
                  ),
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

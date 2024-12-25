import React, { useContext, useEffect, useState } from 'react';
import { Button, Dropdown, Input, Menu, message, Modal, Space, Table, Tag, Tree, Switch, Row, Card, Checkbox, Form, Select, Radio } from 'antd';
import PageLayout from '@/components/pageLayout';
import { useTranslation } from 'react-i18next';
import { CheckCircleOutlined, SyncOutlined, GroupOutlined, SearchOutlined, DoubleLeftOutlined, DeliveredProcedureOutlined, DoubleRightOutlined, PlusSquareOutlined, EditOutlined } from '@ant-design/icons';
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
import { getCertificate, getLicense, saveLicense, updateLicense } from '@/services/license';
import { getParametersList, saveCustomerName } from '@/services/parameters';
import moment from 'moment';
import { exportTempletZip } from '@/pages/historyEvents/services';
import { useAntdTable } from 'ahooks';
const { TextArea } = Input

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
  const { profile, permList } = useContext(CommonStateContext);
  const [treeData, setTreeData] = useState<any[]>();
  const [refreshKey, setRefreshKey] = useState(_.uniqueId('refreshKey_'));
  const history = useHistory();
  const [query, setQuery] = useState<string>('');
  const [props, setProps] = useState<any>({});
  const [initData, setInitData] = useState({});
  const [formData, setFormData] = useState<any>({});
  const [businessForm, setBusinessForm] = useState<any>({});
  const [modalShow, setModalShow] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>("一体化综合运维管理平台")
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false); // 表单编辑状态，默认为 false
  const [selectRowKeys, setSelectRowKeys] = useState<any[]>([]);
  // const [rowKeys, setRowKeys] = useState<any[]>([]);
  const [radioCheck, setRadioCheck] = useState<any>();
  const [licenseId, setLicenseId] = useState<any>();
  const [filter, setFilter] = useState<any | {
    group?: number;
    severity?: number;
    query: string;
    start: number;
    end: number;
    type: any | number;
  }>({
    query: '',
    filter: '',
    type: null,
    start: 0,
    end: 0,
  });
  const handleEdit = () => {
    setEditing(true); // 点击编辑按钮后，将编辑状态设置为 true
  };
  const [form] = Form.useForm();
  const lOptions = [
    { label: '只发送一次', value: "once" },
    { label: '每天发送一次', value: "days" },
  ];
  const [clientForm] = Form.useForm();
  // 处理许可配置保存逻辑
  const handleSave = (values) => {

    console.log(values);
    values["nodes"] = parseInt(values["nodes"], 10);
    values["frequency"] = radioCheck;
    values["id"] = licenseId;
    updateLicense(values)
    message.success('操作成功');
    //history.back();
    setEditing(false); // 保存后，将编辑状态设置为 false
  };
  const toggleForm = () => {
    setShowForm(!showForm);
  };
  const loadingTree = () => {
    getOrganizationTree({}).then(({ dat }) => {
      setTreeData(dat);
      initData["parent_id"] = dat;
      setInitData({ ...initData })
    });
  };
  const loadClientName = () => {
    getParametersList().then((res) => {
      setCustomerName(res.dat.client)
    });
  }
  useEffect(() => {
    loadClientName();
    getCertificate().then(({ dat }) => {
      setTreeData(dat);
      initData["parent_id"] = dat;
      setInitData({ ...initData })
    });
    getLicense().then(({ dat }) => {
      if (dat.frequency == "once") {
        setRadioCheck("once");
      } else if (dat.frequency == "days") {
        setRadioCheck("days");
      }
      setLicenseId(dat.id);
      form.setFieldsValue(dat);
    })
  }, [query]);

  const renderFields = (text, record, field, currentConfigId) => {
    console.log("渲染数据列", text, record, field, currentConfigId);
    let value = record[field];
    return value;
  }
  const handleLogLeverChange = (e) => {
    const selectedValue = e.target.value;
    setRadioCheck(selectedValue);
    //console.log('setRadioCheck:', selectedValue);

  };
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
  const submitClientForm = (values) => {
    console.log(values);
    saveCustomerName(values).then((res) => {
      setModalShow(false);
      loadClientName();
      message.success("客户名称设置成功");
    });


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
  const handleModal = (action: string, rowKeys: any[] | null) => {
    if (action == "open") {
      let url = "/api/n9e/xh/license/export-xls";
      let exportTitle = "证书";
      let body = {}
      // debugger;
      console.log("RRRR", rowKeys);
      if (rowKeys != null) {
        body["ids"] = rowKeys;
        console.log("IIII", body);
      }
      exportTempletZip(url, filter, (rowKeys != null && rowKeys.length > 0) ? { ids: rowKeys } : null).then((res) => {
        let blob = new Blob([res], {
          // 下载的文件类型(此处可更改：具体取值参考以下链接地址)
          type: 'application/zip',
        });
        let url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        let fileType = ".zip"
        const fileName = exportTitle + "日志_" + moment().format('MMDDHHmmss') + fileType //decodeURI(res.headers['filename']);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
      })

    }
  }



  return (
    <PageLayout icon={<GroupOutlined />} title={'许可证管理'}>
      <div className='assets-list' style={{ height: '30px', lineHeight: '39px' }}>
        <Row className='event-table-search'>
          <div className='event-table-search-left' style={{ marginLeft: '10px' }}>
            客户名称：{customerName || "一体化综合运维管理平台"}
            {
              (profile.roles?.includes("Admin") || permList.includes("/license/base/setName")) && <EditOutlined
                style={{
                  marginLeft: '8px',
                  fontSize: '14px',
                }}
                onClick={() => {
                  clientForm.setFieldsValue({ name: customerName })
                  setModalShow(true)
                }}
              ></EditOutlined>
            }

          </div>
          <div className='event-table-search-right'>
            <div className='user-manage-operate'>
              {
                (profile.roles?.includes("Admin") || permList.includes("/license/base/exportAll")) && <Button type='primary' className='license_batch_import_btn' onClick={() => {
                  if (selectRowKeys.length <= 0) {
                    Modal.confirm({
                      title: "确认导出所有许可信息吗",
                      onOk: async () => {
                        handleModal("open", null);
                      },
                      onCancel() { },
                    });
                  } else {
                    handleModal("open", selectRowKeys);
                  }

                }} >
                  批量导出
                </Button>
              }

            </div>
          </div>
        </Row>
        <Table
          dataSource={treeData}
          rowKey='id'
          rowSelection={{
            onChange: (_, rows) => {
              setSelectRowKeys(rows ? rows.map(({ id }) => id) : []);
              console.log(selectRowKeys);
            },
            selectedRowKeys: selectRowKeys
          }}
          pagination={false}
          columns={[
            {
              title: '序列号',
              dataIndex: 'serial_number',
              ellipsis: true,
              align: 'center',
              render(value, record, index) {
                return value;
              },
            },
            {
              title: '采集器信息',
              dataIndex: 'manger',
              ellipsis: true,
              align: 'center',
              render(value, record, index) {
                return value;
              },
            },
            {
              title: '主版本号',
              dataIndex: 'target_version',
              ellipsis: true,
              align: 'center',
              render(value, record, index) {
                return value;
              },
            },

            {
              title: '采集器版本号',
              dataIndex: 'phone',
              ellipsis: true,
              align: 'center',
              render(value, record, index) {
                return value;
              },
            },
            {
              title: '有效期',
              dataIndex: 'start',
              ellipsis: true,
              align: 'center',
              render(value, record, index) {
                const sdate = moment.unix(record.start_time);
                const edate = moment.unix(record.end_time);
                const sformattedTime = sdate.format('YYYY-MM-DD HH:mm:ss'); // 使用 format 方法将时间格式化为 24 小时制的时间
                const eformattedTime = edate.format('YYYY-MM-DD HH:mm:ss');
                return sformattedTime + '-' + eformattedTime;

              },
            },
            {
              title: '许可节点数',
              dataIndex: 'permission_node',
              ellipsis: true,
              align: 'center',
              render(value, record, index) {
                return value;
              },
            },
            {
              title: '已用许可节点',
              dataIndex: 'used_node',
              ellipsis: true,
              align: 'center',
              render(value, record, index) {
                return value;
              },
            },
            {
              title: '操作',
              width: '180px',
              align: 'center',
              render: (text: string, record: assetsType) => (
                <div className='table-operator-area'>
                  {
                    (profile.roles?.includes("Admin") || permList.includes("/license/base/update")) && <Button size='small' style={{ backgroundColor: "#57B894" }} className='oper-name' type='link' icon={<SyncOutlined />}
                      onClick={() => {
                        localStorage.setItem("license_select_detail", JSON.stringify(record))
                        history.push(`/license/base/${record.id}`);
                      }}
                    >
                      更新证书
                    </Button>
                  }
                  {
                    (profile.roles?.includes("Admin") || permList.includes("/license/base/export")) && <Button size='small' style={{ backgroundColor: "#4095E5" }} className='oper-name' type='link' icon={<DeliveredProcedureOutlined />}
                      onClick={() => {
                        let ids = new Array();
                        ids.push(record.id);
                        handleModal("open", ids);
                      }}>
                      导出
                    </Button>
                  }
                </div>
              ),
            },
          ]}
          size='small'
        ></Table>

        <Card
          hoverable
          title='License 通知设置'
          className='notice_set'
          // extra={<a href="#"><DoubleLeftOutlined style={{ transform: 'rotate(270deg)' }} /> 更多 </a>} style={{ width: 300 }}
          extra={
            <a type="link" className='license_more' onClick={toggleForm}>
              {showForm ? (
                <>
                  <DoubleLeftOutlined style={{ transform: 'rotate(270deg)' }} /> 收起
                </>
              ) : (
                <>
                  <DoubleLeftOutlined style={{ transform: 'rotate(270deg)' }} /> 更多
                </>
              )}
            </a>
          }
          style={{ width: 300 }}
        >
          {showForm && <Form
            form={form}
            name="basic"
            labelCol={{ span: 10 }}
            wrapperCol={{ span: 16 }}
            style={{ maxWidth: 890 }}
            initialValues={{ remember: true }}
            className='license_submit_form'
            onFinish={handleSave}
            // onFinishFailed={onFinishFailed}
            autoComplete="off"
          >
            <Form.Item
              label="License 到期提醒时间"
              name="days"
            // rules={[{ required: true,message: '请选择 License 到期提醒时间'}]}

            //rules={[{ required: true, message: '请选择 License 到期提醒时间' }]}
            >
              <Select style={{ width: '90px' }} disabled={!editing} options={[
                { value: 7, label: '7天' },
                { value: 10, label: '10天' },
                { value: 30, label: '1个月' },
                { value: 60, label: '2个月' },
                { value: 90, label: '3个月' }

              ]}>
              </Select>
            </Form.Item>

            <Form.Item
              label="剩余节点提醒"
            >
              <div className='hint_message'>
                数量少于
                <Form.Item
                  name="nodes"
                  rules={[{ required: true, message: '输入剩余节点提醒' }]}
                >
                  <Input disabled={!editing} />
                </Form.Item>
                开始提醒
              </div>
            </Form.Item>

            <Form.Item
              name="frequency"
              label="提醒频率"
            >
              <Radio.Group disabled={!editing} options={lOptions} onChange={handleLogLeverChange}>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              name="email"
              label="通知的邮箱地址"
            >
              <TextArea disabled={!editing} placeholder='多个邮件用英文分号隔开'> </TextArea>
            </Form.Item>
            {/* <Form.Item
              name="微信号"
              label="微信号"
              valuePropName="checked"
            >
              <TextArea disabled={!editing} placeholder='多个微信号用英文分号隔开(对接的微信才能发送通知)'>Remember me</TextArea>
            </Form.Item> */}

            <Form.Item wrapperCol={{ offset: 12, span: 16 }} className='submit_button'>
              <Space >
                {( // 当不处于编辑状态时，显示编辑按钮
                  (profile.roles?.includes("Admin") || permList.includes("/license/base/put")) && <Button onClick={handleEdit}>
                    编辑
                  </Button>
                )}
                {
                  (profile.roles?.includes("Admin") || permList.includes("/license/base/save")) && <Button type="primary" htmlType="submit" disabled={!editing}>
                    保存
                  </Button>
                }
              </Space>
            </Form.Item>
          </Form>}

        </Card>
        <Modal
          visible={modalShow}
          title={"设置客户名称"}
          destroyOnClose={true}
          width={350}
          confirmLoading={false}
          cancelButtonProps={{ style: { display: 'none' } }}
          okButtonProps={{
            disabled: true,
            style: { display: 'none' },
          }}
          okText={"提交"}

          onCancel={() => {
            setModalShow(false);
          }}
        >

          <Form form={clientForm} onFinish={submitClientForm} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} labelAlign='left' >
            <Form.Item label='客户名称' name='name' rules={[
              {
                required: true,
              }]}>
              <Input />
            </Form.Item>
            <Form.Item>
              <Space className='client_form_submit'>
                <Button type='primary' htmlType='submit' >
                  保存
                </Button>
                <Button
                  onClick={() => {
                    setModalShow(false);
                  }}
                >
                  关闭
                </Button>
              </Space>
            </Form.Item>


          </Form>
        </Modal>
      </div>
    </PageLayout>
  );
}

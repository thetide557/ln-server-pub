
import React, { useState, useRef, useEffect } from 'react';
import { Button, message, Modal, Table } from 'antd';
import { PlusOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { getDictTypeList, getDictDataListByType, removeDictType, updateDictData,addDictType, updateDictType, exportDictType } from '@/services/system/dict';
import UpdateForm from './edit';
import ItemForm from './item';

import DictTag from '@/components/DictTag';
import { ColumnType } from 'antd/lib/table';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';

export default function () {
  /**
   * 添加节点
   *
   * @param fields
   */
  const handleAdd = async (fields: API.System.DictType) => {
    const hide = message.loading('正在添加');

    if (fields.id == null) {
      try {
        const resp = await addDictType({ ...fields });
        hide();
        if (resp.err === "") {
          message.success('添加成功');
          getTypeList()
        } else {
          message.error(resp.err);
        }
        return true;
      } catch (error) {
        hide();
        message.error('添加失败请重试！');
        return false;
      }
    } else {
      const hide = message.loading('正在更新');
      try {
        const resp = await updateDictType(fields);
        hide();
        if (resp.err === "") {
          message.success('更新成功');
          getTypeList()
        } else {
          message.error(resp.err);
        }
        return true;
      } catch (error) {
        hide();
        message.error('配置失败请重试！');
        return false;
      }

    }


  };

  /**
   * 更新节点
   *
   * @param fields
   */
  const handleUpdate = async (fields: API.System.DictType) => {
    const hide = message.loading('正在更新');
    try {
      const resp = await updateDictType(fields);
      hide();
      if (resp.code === 200) {
        message.success('更新成功');
      } else {
        message.error(resp.msg);
      }
      return true;
    } catch (error) {
      hide();
      message.error('配置失败请重试！');
      return false;
    }
  };

  /**
   * 删除节点
   *
   * @param selectedRows
   */
  const handleRemove = async (selectedRows: API.System.DictType[]) => {
    const hide = message.loading('正在删除');
    if (!selectedRows) return true;
    try {
      var index = 0;
      selectedRows.map((row) =>{
        index++;
        removeDictType(""+row.id).then(res=>{
          if(index===selectedRows.length){
            getTypeList()
            message.success('删除成功');  
            hide();
          }
        });    
      }); 
      setSelectedRows([]) 
      
    } catch (error) {
      hide();
      message.error('删除失败，请重试');
      return false;
    }
      
  };

  const handleRemoveOne = async (selectedRow: API.System.DictType) => {
    const hide = message.loading('正在删除');
    if (!selectedRow) return true;
    try {
      const params = [selectedRow.id];
      const resp = await removeDictType(params.join(','));
      hide();
      if (resp.code === 200) {
        message.success('删除成功，即将刷新');
      } else {
        message.error(resp.msg);
      }
      return true;
    } catch (error) {
      hide();
      message.error('删除失败，请重试');
      return false;
    }
  };

  /**
   * 导出数据
   *
   * 
   */
  const handleExport = async () => {
    const hide = message.loading('正在导出');
    try {
      // await exportDictType();
      hide();
      message.success('导出成功');
      return true;
    } catch (error) {
      hide();
      message.error('导出失败，请重试');
      return false;
    }
  };
 

  const columns: ColumnType<API.System.DictType>[] = [
    {
      title: "字典编码",
      dataIndex: 'type_code',

    },
    {
      title: "字典类型",
      dataIndex: 'dict_name',
    },
    {
      title: "备注",
      dataIndex: 'remark',
    },

    {
      title: "操作",
      dataIndex: 'option',
      width: '220px',
      render: (_, record) => [
        <Button
          type="link"
          size="small"
          key={record.id+"edit"}
          //   hidden={!access.hasPerms('system:dictType:edit')}
          onClick={() => {
            setModalVisible(true);
            setCurrentRow(record);
          }}
        >
          编辑
        </Button>,
          <Button
          type="link"
          size="small"
          key="edit"
          //   hidden={!access.hasPerms('system:dictType:edit')}
          onClick={() => {
               
               getDictDataListByType(record.type_code).then((res) => {
                  setDictCode(record.type_code);
                  setSelectedItem(res.dat);
                  setItemVisible(true);
              }) 
          }}
        >
          设置数据项
        </Button>,
        <Button
          type="link"
          size="small"
          danger
          key="batchRemove"
          //   hidden={!access.hasPerms('system:dictType:remove')}
          onClick={async () => {
            Modal.confirm({
              title: '删除',
              content: '确定删除该项吗？',
              okText: '确认',
              cancelText: '取消',
              onOk: async () => {
                const success = await removeDictType(""+record.id);
                if (success) {
                  getTypeList();
                }
              },
            });
          }}
        >
          删除
        </Button>,
      ],
    },
  ];


  // const formTableRef = useRef<FormInstance>();  
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [itemVisible, setItemVisible] = useState<boolean>(false);
  // const actionRef = useRef<ActionType>();
  const [list, setList] = useState<any[]>([]);
  const [currentRow, setCurrentRow] = useState<API.System.DictType>();
  const [selectedItem, setSelectedItem] = useState<[]>([]);
  const [dictCode, setDictCode] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<API.System.DictType[]>([]);
  const [statusOptions, setStatusOptions] = useState<any>([]);
  //   const access = useAccess();
  const pagination = usePagination({ PAGESIZE_KEY: 'alert-rules-pagesize' });

  useEffect(() => {
    
    getTypeList();

  }, []);

  const getTypeList = () => {
    getDictTypeList(null).then((res) => {
      setList(res.dat.list);
    });
  }

  

  return (
    <PageLayout>
      <div>
        <Button
          type="primary"
          key="add"
          //   hidden={!access.hasPerms('system:dictType:add')}
          onClick={async () => {
            setCurrentRow(undefined);
            setModalVisible(true);
          }}
          style={{ color: '#fff', backgroundColor: '#0A4B9D' }}
        >
          <PlusOutlined />新建
        </Button>
        <Button
          type="primary"
          key="remove"
          style={{ color: '#fff', backgroundColor: '#0A4B9D' }}
          hidden={selectedRows?.length === 0 }
          onClick={async () => {
            Modal.confirm({
              title: '是否确认删除所选数据项?',
              icon: <ExclamationCircleOutlined />,
              content: '请谨慎操作',
              async onOk() {
                const success = await handleRemove(selectedRows);
                if (success) {
                    setSelectedRows([]);
                }
              },
              onCancel() { },
            });
          }}
        >
          <DeleteOutlined />
          删除
        </Button>
        <Table
          tableLayout='fixed'
          size='small'
          rowKey={(r, i) => (r.id)}
          key={"rowSelection"}
          pagination={pagination}
          // loading={loading}
          dataSource={list}
          rowSelection={{
            onChange: (_, selectedRows) => {
              setSelectedRows(selectedRows);
            },
          }}
          columns={columns}
        />
        <UpdateForm
          onSubmit={async (values) => {
            let success = false;
            if (values.id) {
              success = await handleUpdate({ ...values } as API.System.DictType);
            } else {
              success = await handleAdd({ ...values } as API.System.DictType);
            }
            if (success) {
              setModalVisible(false);
              setCurrentRow(undefined);
            }
          }}
          onCancel={() => {
            setModalVisible(false);
            setCurrentRow(undefined);
          }}
          open={modalVisible}
          values={currentRow || {}}
          statusOptions={statusOptions}
        />
        <ItemForm
          onSubmit={async (values) => {
            debugger
            let success = false;
             var items = new Array
             values.users.forEach(element => {
              var param ={
                  "dict_key": element.dict_key,
                  "type_code":dictCode,
                  "dict_value": element.dict_value,
                  "remark": element.remark
              };
              items.push(param);
             });
              success = await updateDictData(dictCode,items);          
            if (success) {
              setItemVisible(false);
              setSelectedItem([]);
            }
          }}
          onCancel={() => {
            setItemVisible(false);
            setSelectedItem([]);
          }}
          open={itemVisible}
          values={selectedItem}
        />
      </div>
    </PageLayout>
  );
};

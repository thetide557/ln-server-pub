import { message, Table, Upload, Button, Space, Modal, Form, Input, Tooltip } from 'antd';
import React, { useEffect, useState } from 'react';

import PageLayout from '@/components/pageLayout';
import { InboxOutlined, UploadOutlined, DownloadOutlined, DeleteOutlined, AlignCenterOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { getAllVersion, updateTarget } from '@/services/version';
import { getMonObjectUpdateList } from '@/services/targets';
import RefreshIcon from '@/components/RefreshIcon';
import type { UploadProps } from 'antd';
import { exportTempletZip } from '@/pages/historyEvents/services';
import { RcFile } from 'antd/es/upload';
import { useAntdTable, useInterval } from 'ahooks';
import Cookies from 'js-cookie';
const { Dragger } = Upload;
import _ from 'lodash';
import moment from 'moment';
import { useTranslation, Trans } from 'react-i18next';
import { BusiGroupItem } from '@/store/commonInterface';
import './index.less'

interface ITargetProps {
  id: number;
  cluster: string;
  group_id: number;
  group_obj: object | null;
  ident: string;
  note: string;
  tags: string[];
  update_at: number;
  ip_address: string;
}

export const pageSizeOptions = ['10', '20', '50', '100'];



export default function () {
  const [tableData, setTableData] = useState<any[]>([]);
  const [modalShow, setModalShow] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [selectedIdents, setSelectedIdents] = useState<string[]>([]);
  const GREEN_COLOR = '#3FC453';
  const YELLOW_COLOR = '#FF9919';
  const RED_COLOR = '#FF656B';
  const LOST_COLOR = '#CCCCCC';
  const [fileName, setFileName] = useState<string>('');

  const beforeUpload = (file: RcFile) => {
    console.log(file);

    const iszip = file.type === 'application/zip' || file.type === 'application/x-zip-compressed' || file.name.endsWith('.zip');
    if (!iszip) {
      message.error('只允许上传zip压缩文件');
      return false
    }
    // let regExp = /^[a-z]+-(?:\d[.]?)+-(\w+)-(\w+).zip$/g;
    let regExp = /^[a-z]+-[a-z]+-[a-zA-Z0-9.]+-(\w+)-(\w+)\.zip$/g;
    const isLt = regExp.test(file.name);
    if (!isLt) {
      message.error('文件命名格式不规范，请参照说明');
      return false
    }
    let fileName = file.name.split('-');
    if (fileName[3] != "linux" && fileName[3] != "windows" && fileName[3] != "darwin") {
      message.error("文件命名错误(操作系统)");
      return false
    }
    if (fileName[4].split(".")[0] != "amd64" && fileName[4].split(".")[0] != "386" && fileName[4].split(".")[0] != "arm" && fileName[4].split(".")[0] != "arm64") {
      message.error("文件命名错误(架构)");
      return false
    }
    return iszip && isLt;
  };

  const columns = [
    {
      title: '版本名称',
      dataIndex: 'filename',
      key: 'filename',
      width: "50%",
      sorter: (a, b) => { return a.filename.localeCompare(b.filename); },
    },
    {
      title: '大小',
      dataIndex: 'filesize',
      key: 'filesize',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: "15%",
      render: (text, record) => (
        <Space>
          <Button icon={<AlignCenterOutlined />} onClick={() => handleModal("update", record.filename)}>
            更新
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleModal("download", record.filename)}>
            下载
          </Button>
          <Button icon={<DeleteOutlined />} onClick={() => handleModal("delete", record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const columns1: any[] = [
    {
      title: '标识',
      dataIndex: 'ident',
      key: 'ident',
      align: 'center',
    },
    {
      title: '业务组',
      dataIndex: 'group_obj',
      key: 'group_obj',
      align: 'center',
      render(groupObj: BusiGroupItem | null) {
        return groupObj ? groupObj.name : '';
      },
    },
    {
      title: (
        <Space>
          心跳时间
          <Tooltip title={<Trans ns='targets' i18nKey='update_at_tip' components={{ 1: <br /> }} />}>
            <QuestionCircleOutlined />
          </Tooltip>
        </Space>
      ),
      width: 100,
      dataIndex: 'update_at',
      align: 'center',
      render: (val, reocrd) => {
        let result = moment.unix(val).format('YYYY-MM-DD HH:mm:ss');
        let backgroundColor = GREEN_COLOR;
        if (reocrd.target_up === 0) {
          backgroundColor = RED_COLOR;
        } else if (reocrd.target_up === 1) {
          backgroundColor = YELLOW_COLOR;
        }
        return (
          <div
            className='table-td-fullBG'
            style={{
              backgroundColor,
            }}
          >
            {result}
          </div>
        );
      },
    },
    {
      title: '来源IP',
      dataIndex: 'remote_addr',
      align: 'center',
      render: (val, reocrd) => {
        if (reocrd.cpu_num === -1) return 'unknown';
        return val;
      },
    },
    {
      title: '探针版本',
      dataIndex: 'current_version',
      align: 'center',
      render: (val, record) => {
        if (record.current_version === '') return 'unknown';
        return (
          <>{val}</>
        );
      },
    }
  ];

  const featchData = ({ current, pageSize }: { current: number; pageSize: number }): Promise<any> => {
    const query = {
      query: '',
      bgid: -1,
      limit: pageSize,
      p: current,
    };
    return getMonObjectUpdateList(query).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };
  const { tableProps, run } = useAntdTable(featchData, {
    manual: true,
    defaultPageSize: 30,
  });


  const handleModal = (action: string, rowKeys: any | null) => {
    if (action == "download") {
      let url = "/api/n9e/target/version/export-zip";
      let body = {}
      //debugger;
      if (rowKeys != null) {
        body["filename"] = rowKeys;
      }
      exportTempletZip(url, body, null).then((res) => {
        let blob = new Blob([res], {
          // 下载的文件类型(此处可更改：具体取值参考以下链接地址)
          type: 'application/zip',
        });
        let url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', rowKeys);
        document.body.appendChild(link);
        link.click();

      })
    } else if (action === "delete" && rowKeys) {
      // 删除逻辑
      Modal.confirm({
        title: "确定要删除该版本吗",
        onOk: async () => {
          const filenameToDelete = rowKeys.filename;
          // 调用删除接口
          // 请确保在服务端实现删除版本的接口，并根据需要修改下面的接口路径和请求方法
          // fetch(`/api/n9e/target/version/delete-gz`, {
          fetch(`/api/n9e/target/version/delete-zip?filename=${filenameToDelete}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${Cookies.get('access_token') || ''}`,
            },
          })
            .then(response => {
              if (response.ok) {
                message.success('删除成功');
                // 更新表格数据源
                loadingVersions();
              } else {
                message.error('删除失败');
              }
            })
            .catch(error => {
              console.error('删除请求错误:', error);
              message.error('删除请求错误');
            });
        },
        onCancel() { },
      });
    } else if (action === "update") {
      setModalShow(true);
      setFileName(rowKeys);
      form.setFieldsValue({ ip: '' });
      setSelectedIdents([]);
      setSelectedRowKeys([]);
      run({
        current: 1,
        pageSize: tableProps.pagination?.pageSize,
      });
    }
  };


  const loadingVersions = () => {
    getAllVersion({}).then(res => {
      setTableData(res.dat)
    })
  }

  // IP 地址校验规则
  const validateIP = (_: any, value: string) => {
    if (!value) {
      // 允许为空，表示使用默认值
      return Promise.resolve();
    }

    // IP:PORT 格式正则表达式
    const ipPortRegex = /^(\d{1,3}\.){3}\d{1,3}:(\d{1,5})$/;

    if (!ipPortRegex.test(value)) {
      return Promise.reject('请输入正确的IP:PORT格式，如：127.0.0.1:17000');
    }

    // 进一步验证 IP 地址各段数值范围
    const [ipPart, portPart] = value.split(':');
    const ipSegments = ipPart.split('.');

    // 验证 IP 地址每段在 0-255 范围内
    for (let segment of ipSegments) {
      const num = parseInt(segment, 10);
      if (num < 0 || num > 255) {
        return Promise.reject('IP地址每段应在0-255之间');
      }
    }

    // 验证端口号在 1-65535 范围内
    const portNum = parseInt(portPart, 10);
    if (portNum < 1 || portNum > 65535) {
      return Promise.reject('端口号应在1-65535之间');
    }

    return Promise.resolve();
  };

  const handleOk = () => {
    form.validateFields()
      .then((values) => {
        console.log('表单值:', values);
        console.log('选中的目标:', selectedIdents);
        console.log('选中的行键:', selectedRowKeys);
        let host: string = ''
        if (!values.ip) {
          host = window.location.host;
        } else {
          host = values.ip;
        }
        const url = `http://${host}/agent/package?filename=${fileName}`;
        const params = {
          hosts: selectedIdents,
          filename: fileName,
          account: "root",
          download_user: '',
          download_pass: '',
          batch: 0,
          tolerance: 0,
          timeout: 300,
          pause: '',
          download_url: url,
        }
        console.log(params);

        // 在这里执行更新操作
        updateTarget(params).then(res => {
          if (res.dat?.task_id) {
            const { task_id } = res.dat;
            message.success('探针执行更新成功,2分钟后请前往系统管理-探针管理中查看更新结果。');
            setModalShow(false);
            loadingVersions()
            // location.href = `/job-tasks/${task_id}/result`;
            // setTimeout(() => {
            //   window.open(`/job-tasks/${task_id}/result`)
            // }, 1000);

          }
        });
      })
      .catch((error) => {
        console.log('表单验证失败:', error);
      });
  }

  useEffect(() => {
    loadingVersions();
  }, []);


  const props: UploadProps = {
    name: 'file',
    multiple: false,
    action: '/api/n9e/target/version',

    headers: { Authorization: `Bearer ${Cookies.get('access_token') || ''}` },

    onChange(info) {
      const { status, response } = info.file;
      // if (status !== 'uploading') {
      //   console.log(info.file, info.fileList);
      // }
      if (status === 'done') {
        console.log('上传成功的response:', response);
        message.success(`${info.file.name} 文件上传成功`);
        // 更新表格数据源
        loadingVersions();
      } else if (status === 'error') {
        message.error(`${info.file.name} 文件上传失败`);
      }
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  return (
    <PageLayout title='更新探针'>
      <div style={{ height: 150, overflow: 'visible' }}>
        <div style={{ padding: 20, marginBottom: 20 }}>
          探针上传需要按规范文件名上传,文件名需要包括版本号,操作系统,架构,并通过zip压缩后上传.<br></br> 如:ln-agent-v1.0.0-linux-amd64.zip
        </div>
        <div style={{ textAlign: 'right' }}>
          <Space style={{ marginRight: '5px' }}>
            <RefreshIcon
              onClick={() => {
                loadingVersions();
              }}
            />
          </Space>
          <Upload {...props} showUploadList={false} beforeUpload={beforeUpload}>
            <Button icon={<UploadOutlined />}>点击或拖放文件上传</Button>
          </Upload>
          <Table columns={columns} dataSource={tableData} />

        </div>
      </div>
      {/* 更新弹窗 */}
      <Modal
        visible={modalShow}
        title={"更新探针"}
        width={700}
        destroyOnClose={true}
        confirmLoading={false}
        onCancel={() => {
          setModalShow(false);
        }}
        onOk={handleOk}
      >
        <Form form={form} >
          <Form.Item
            label='IP地址'
            name='ip'
            rules={[{ validator: validateIP }]}
            initialValue=''
          >
            <Input placeholder='请输入内网ip:port(例：127.0.0.1:17000,不填默认当前ip:port)' />
          </Form.Item>
        </Form>
        <Table
          className='target-modal'
          rowKey='id'
          columns={columns1}
          size='small'
          {...tableProps}
          onRow={(record) => ({
            onClick: () => {
              const id = record.id;
              const isSelected = selectedRowKeys.includes(id);

              // 切换选择状态
              let newSelectedRowKeys: (string | number)[];
              let newSelectedIdents: string[];

              if (isSelected) {
                // 如果已选中，则取消选中
                newSelectedRowKeys = selectedRowKeys.filter(key => key !== id);
                newSelectedIdents = selectedIdents.filter(ident => ident !== record.ident);
              } else {
                // 如果未选中，则添加到选中列表
                newSelectedRowKeys = [...selectedRowKeys, id];
                newSelectedIdents = [...selectedIdents, record.ident];
              }

              setSelectedRowKeys(newSelectedRowKeys);
              setSelectedIdents(newSelectedIdents);
            },
          })}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: selectedRowKeys,
            onChange(selectedRowKeys, selectedRows: ITargetProps[]) {
              setSelectedRowKeys(selectedRowKeys);
              setSelectedIdents(selectedRows ? selectedRows.map(({ ident }) => ident) : []);
            },
          }}
          pagination={{
            ...tableProps.pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `总共 ${total} 条`,
            pageSizeOptions: [10, 20, 30, 50, 100],
          }}
        />
      </Modal>
    </PageLayout>
  );
}




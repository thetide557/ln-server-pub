import { message, Table, Upload, Button, Space } from 'antd';
import React, { useEffect, useState } from 'react';

import PageLayout from '@/components/pageLayout';
import { InboxOutlined, UploadOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAllVersion, } from '@/services/version';

import type { UploadProps } from 'antd';
import { exportTempletZip } from '@/pages/historyEvents/services';
import { RcFile } from 'antd/es/upload';
import Cookies from 'js-cookie';
const { Dragger } = Upload;



export default function () {
  const [tableData, setTableData] = useState<any[]>([]);

  const beforeUpload = (file: RcFile) => {
    const iszip = file.type === 'application/x-gzip';
    if (!iszip) {
      message.error('只允许上传gz压缩文件');
      return false
    }
    let regExp = /^[a-z]+-(?:\d[.]?)+-(\w+)-(\w+).gz$/g;
    const isLt = regExp.test(file.name);
    if (!isLt) {
      message.error('文件命名格式不规范，请参照说明');
      return false
    }
    let fileName = file.name.split('-');
    if (fileName[2] != "linux" && fileName[2] != "windows" && fileName[2] != "darwin"){
       message.error("文件命名错误(操作系统)");
       return false
    }
    if (fileName[3].split(".")[0] != "amd64" && fileName[3].split(".")[0] != "386" && fileName[3].split(".")[0] != "arm" && fileName[3].split(".")[0] != "arm64"){
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


  const handleModal = (action: string, rowKeys: any | null) => {
    if (action == "download") {
      let url = "/api/n9e/target/version/export-gz";
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
      const confirmDelete = window.confirm("确定要删除该版本吗？");
      if (confirmDelete) {
        const filenameToDelete = rowKeys.filename;

        // 调用删除接口
        // 请确保在服务端实现删除版本的接口，并根据需要修改下面的接口路径和请求方法
        // fetch(`/api/n9e/target/version/delete-gz`, {
        fetch(`/api/n9e/target/version/delete-gz?filename=${filenameToDelete}`, {
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
      }
    }
  };


  const loadingVersions = () => {
    getAllVersion({}).then(res => {
      setTableData(res.dat)
    })
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
    <PageLayout title='探针版本上传'>
      <div style={{ height: 150, overflow: 'visible' }}>
        <div style={{ padding: 20, marginBottom: 20 }}>
          探针上传需要按规范文件名上传,文件名需要包括版本号,操作系统,架构,并通过gzip压缩后上传.<br></br> 如:categraf-1.0.0-linux-amd64.gz
        </div>
        <div style={{ textAlign: 'right' }}>
          <Upload {...props} showUploadList={false} beforeUpload={beforeUpload}>
            <Button icon={<UploadOutlined />}>点击或拖放文件上传</Button>
          </Upload>
          <Table columns={columns} dataSource={tableData} />

        </div>
      </div>
    </PageLayout>
  );
}




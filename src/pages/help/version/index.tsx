/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React, { useEffect, useState, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { InboxOutlined } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import SystemInfoSvg from '../../../../public/image/system-info.svg';
import pkgJson from '../../../../package.json';
import './locale';
import { Divider, message, Upload, UploadProps } from 'antd';
import { CommonStateContext } from '@/App';
import Cookies from 'js-cookie';

import React, { useEffect, useState, useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import Icon, { InboxOutlined } from "@ant-design/icons";
import PageLayout from "@/components/pageLayout";
import SystemInfoSvg from "../../../../public/image/system-info.svg";
import pkgJson from "../../../../package.json";
import "./locale";
import { Card, Col, Divider, message, Row, Upload, UploadProps, Tabs } from "antd";
import { CommonStateContext } from "@/App";
import Cookies from "js-cookie";
import RunForm from "@/pages/sxxc/taskManage/components/runForm";
import { reject } from "lodash";
import Targets from "@/pages/targets/version"
const { Dragger } = Upload;
import "./index.less";

const props: UploadProps = {
  name: 'file',
  multiple: false,
  maxCount: 1,
  action: '/api/n9e/server/update',
  headers: { Authorization: `Bearer ${Cookies.get('access_token') || ''}` },
  onChange(info) {
    const { status } = info.file;
    if (status !== 'uploading') {
      console.log(info.file, info.fileList);
    }
    if (status === 'done') {
      message.success(`${info.file.name} 文件上传成功.`);
    } else if (status === 'error') {
      message.error(`${info.file.name} 文件上传失败.`);
    }
  },
  onDrop(e) {
    console.log('Dropped files', e.dataTransfer.files);
  },
};

export default function version() {
  const { t } = useTranslation('version');
  const [backendVersion, setBackendVersion] = useState('');
  const { profile, permList } = useContext(CommonStateContext);
  const [projectList, setProjectList] = useState([] as any);
  const taskRef = useRef(null as any);
  useEffect(() => {
    fetch('/api/n9e/version')
      .then((res) => {
        return res.text();
      })
      .then((res) => {
        setBackendVersion(res);
      });
  }, []);
  const props: UploadProps = {
    name: "file",
    multiple: false,
    maxCount: 1,
    action: "/api/n9e/server/update",
    headers: { Authorization: `Bearer ${Cookies.get("access_token") || ""}` },
    // data: () => ({ hosts: projectList.toString() }),
    // beforeUpload(file, fileList) {
    //   let projectList = taskRef.current.serveList;
    //   setProjectList(projectList)
    //   if (!projectList.length) {
    //     message.warning('请先选择项目！');
    //     return false
    //   } else {
    //     return file
    //   }
    // },
    onChange(info) {
      const { status } = info.file;
      if (status !== "uploading") {
        console.log(info.file, info.fileList);
      }
      if (status === "done") {
        message.success(`${info.file.name} 文件上传成功.`);
      } else if (status === "error") {
        message.error(`${info.file.name} 文件上传失败.`);
      }
    },
    onDrop(e) {
      console.log("Dropped files", e.dataTransfer.files);
    },
  };
  return (
   <div>
      <Tabs defaultActiveKey="1" className="version-tabs" size="large">
        <Tabs.TabPane tab="系统版本" key="1">
          <PageLayout
            title={
              <>
                {t("title")}
              </>
            }
          > <div>
              <ul style={{ padding: "20px 30px" }}>
                <li>
                  {t("frontend")}：{"v2.0"}
                </li>
                {/* <li>
            {t('backend')}：{backendVersion}
          </li> */}
              </ul>
              <Divider></Divider>
              {(profile.roles?.includes("Admin") ||
                permList.includes("/help/version/update")) && (
                  <div>
                    {/* <Row gutter={16}>
                      <Col span={12}>
                        <Card>
                          <RunForm ref={taskRef} />
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card>
                          <Dragger {...props}>
                            <p className="ant-upload-drag-icon">
                              <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">
                              点击或拖放系统升级包（ln-server.gz）到这个区域上传
                            </p>
                          </Dragger>
                        </Card>
                      </Col>
                    </Row> */}
                    <Dragger {...props}>
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">
                        点击或拖放系统升级包（ln-server.gz）到这个区域上传
                      </p>
                    </Dragger>
                  </div>
                )}
            </div></PageLayout>

        </Tabs.TabPane>
        <Tabs.TabPane tab="探针版本" key="2">
          <Targets />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}

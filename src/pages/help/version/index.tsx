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

const { Dragger } = Upload;

const props: UploadProps = {
  name: 'file',
  multiple: false,
  maxCount: 1,
  action: '/api/n9e/server/update',
  headers: { Authorization: `Bearer ${sessionStorage.getItem('access_token') || ''}` },
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
  useEffect(() => {
    fetch('/api/n9e/version')
      .then((res) => {
        return res.text();
      })
      .then((res) => {
        setBackendVersion(res);
      });
  }, []);

  return (
    <PageLayout
      title={
        <>
          <Icon component={SystemInfoSvg as any} /> {t('title')}
        </>
      }
    >
      <div>
        <ul style={{ padding: '20px 30px' }}>
          <li>
            {t('frontend')}：{pkgJson.version}
          </li>
          <li>
            {t('backend')}：{backendVersion}
          </li>
        </ul>
        <Divider></Divider>
        {
          (profile.roles?.includes("Admin") || permList.includes("/help/version/update")) && <div style={{ height: 150, overflow: 'visible' }}>
            <Dragger {...props}>
              <p className='ant-upload-drag-icon'>
                <InboxOutlined />
              </p>
              <p className='ant-upload-text'>点击或拖放系统升级包到这个区域上传</p>
            </Dragger>
          </div>
        }
      </div>
    </PageLayout>
  );
}

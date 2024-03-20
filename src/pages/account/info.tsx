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
import React, { useState, useEffect, useContext } from 'react';
import { Form, Input, Button, Modal, Row, Col, message, Image, Select, Upload } from 'antd';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { getNotifyChannels } from '@/services/manage';
import { ContactsItem } from '@/store/manageInterface';
import { CommonStateContext } from '@/App';
import { UpdateProfile } from '@/services/account';
import type { UploadChangeParam } from 'antd/es/upload';
import { getMyPortrait } from '@/services/log_set';
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload/interface';
const { confirm } = Modal;
const { Option } = Select;
export default function Info() {
  const { t } = useTranslation('account');
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [contactsList, setContactsList] = useState<ContactsItem[]>([]);
  const { profile, setProfile } = useContext(CommonStateContext);
  const [selectAvatar, setSelectAvatar] = useState<string>(profile.portrait || '/image/avatar1.png');
  const [customAvatar, setCustomAvatar] = useState('');
  const [imageUrl, setImageUrl] = useState<string>();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const { id, nickname, email, phone, contacts, portrait } = profile;
    form.setFieldsValue({
      nickname,
      email,
      phone,
      contacts,
    });
    if (portrait?.startsWith('http')) {
      setCustomAvatar(portrait);
    }
  }, [profile]);
  useEffect(() => {
    getNotifyChannels().then((data: Array<ContactsItem>) => {
      setContactsList(data);
    });
    getMyPortrait().then((res) => {
      setLoading(false);
      if(res.dat!=null && res.dat!=""){
        setImageUrl(_.cloneDeep("/api/n9e/"+res.dat+"?"+Math.random()));
      }
    });
  }, []);

  const props: UploadProps = {
    name: 'photo',
    action: '/api/n9e/xh/users/photo',
    headers: {
      authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
    },

  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      updateProfile();
    } catch (err) {
      console.log(err);
    }
  };

  const handleOk = () => {
    if (customAvatar) {
      if (!customAvatar.startsWith('http')) {
        message.error(t('pictureMsg'));
        return;
      }

      fetch(customAvatar, { mode: 'no-cors' })
        .then(() => {
          setIsModalVisible(false);
          handleSubmit();
        })
        .catch((err) => {
          message.error(err);
        });
    } else {
      setIsModalVisible(false);
      handleSubmit();
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const updateProfile = () => {
    const { nickname, email, phone, moreContacts } = form.getFieldsValue();
    let { contacts } = form.getFieldsValue();

    if (moreContacts && moreContacts.length > 0) {
      _.forEach(moreContacts, (item) => {
        const { key, value } = item;

        if (key && value) {
          if (contacts) {
            contacts[key] = value;
          } else {
            contacts = {
              [key]: value,
            };
          }
        }
      });
    }

    for (let key in contacts) {
      if (!contacts[key]) {
        delete contacts[key];
      }
    }

    const newData = {
      ...profile,
      portrait: customAvatar || selectAvatar,
      nickname,
      email,
      phone,
      contacts,
    };

    UpdateProfile(newData).then(() => {
      setProfile(newData);
      message.success(t('common:success.modify'));
    });
  };

  const avatarList = new Array(8).fill(0).map((_, i) => i + 1);

  const handleImgClick = (i) => {
    setSelectAvatar(`/image/avatar${i}.png`);
  };

  const getBase64 = (img: RcFile, callback: (url: string) => void) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => callback(reader.result as string));
    reader.readAsDataURL(img);
  };

  
  const handleChange: UploadProps['onChange'] = (info: UploadChangeParam<UploadFile>) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (info.file.status === 'done') {
      getMyPortrait().then((res) => {
          setLoading(false);
          if(res.dat!=null && res.dat!=""){
            setImageUrl(_.cloneDeep("/api/n9e/"+res.dat+"?"+Math.random()));
            confirm({
              title: '系统提醒',
              content: '头像已修改，确定立即生效？',
              onOk() {
                window.location.reload();
              },
              onCancel() {
                console.log('Cancel')
              },
            })
          }
      });
      
    }
  };

  const uploadButton = (
    <button style={{ border: 0, background: 'none' }} type="button">
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>修改头像</div>
    </button>
  );
  const beforeUpload = (file: RcFile) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('您只能上传图片格式文件[Png/Jpg]!');
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片大小不能超过2M!');
    }
    return isJpgOrPng && isLt2M;
  };
  return (
    <>
      <Form form={form} layout='vertical'>
        <Row
          gutter={10}
          style={{
            marginBottom: '24px',
          }}
          className='row_info_col'
        >
          <Col span={16}>
            <Row
              gutter={16}
              style={{
                marginBottom: '24px',
              }}
            >
              <Col span={4}>
                <div>
                  <label>{t('profile.username')}：</label>
                  <span>{profile.username}</span>
                </div>
              </Col>
              <Col span={4}>
                <div>
                  <label>{t('profile.role')}：</label>
                  <span>{profile.roles?.join(', ')}</span>
                </div>
              </Col>
            </Row>
            <Form.Item label={<span>{t('profile.nickname')}：</span>} name='nickname'>
              <Input />
            </Form.Item>
            <Form.Item label={<span>{t('profile.phone')}：</span>} name='phone'>
              <Input />
            </Form.Item>
            <Form.Item label={<span>{t('profile.email')}：</span>} name='email'>
              <Input />
            </Form.Item>
           

            {profile.contacts &&
              Object.keys(profile.contacts)
                .sort()
                .map((key, i) => {
                  let contact = contactsList.find((item) => item.key === key);
                  return (
                    <div key={i}>
                      {contact ? (
                        <Form.Item label={contact.label + '：'} name={['contacts', key]} key={i}>
                          <Input />
                        </Form.Item>
                      ) : null}
                    </div>
                  );
                })}
            <Form.Item>
              <Button type='primary' onClick={handleSubmit}>
                {t('save')}
              </Button>
            </Form.Item>
          </Col>
          <Col span={8}>
            <div className='avatar'>
              <Upload
                name="avatar"
                {...props}
                
                listType="picture-card"
                className="avatar-uploader"
                showUploadList={false}
                beforeUpload={beforeUpload}
                onChange={handleChange}
            >
              {imageUrl ?<div><Image title='点击修改我的头像 ' preview={false} src={imageUrl} width={'100%'} ></Image></div> : uploadButton}
            </Upload>
            <div title='点击头像图片进行更改'>{imageUrl?'我的头像':null}</div>
            </div>
          </Col>
        </Row>
      </Form>
      <Modal title={t('editPicture')} visible={isModalVisible} onOk={handleOk} onCancel={handleCancel} wrapClassName='avatar-modal'>
        <div className='avatar-content'>
          {avatarList.map((i) => {
            return (
              <div key={i} className={`/image/avatar${i}.png` === selectAvatar ? 'avatar active' : 'avatar'} onClick={() => handleImgClick(i)}>
                <img src={`/image/avatar${i}.png`} />
              </div>
            );
          })}
        </div>
        <Input addonBefore={<span>{t('pictureURL')}:</span>} onChange={(e) => setCustomAvatar(e.target.value)} value={customAvatar} />
      </Modal>
    </>
  );
}

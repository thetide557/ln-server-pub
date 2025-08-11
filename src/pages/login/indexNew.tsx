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
import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, message, Checkbox } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { PictureOutlined, UserOutlined, LockOutlined, SafetyCertificateTwoTone, LockTwoTone, IdcardTwoTone } from '@ant-design/icons';
import { ifShowCaptcha, getCaptcha, getSsoConfig, getSystemTheme, authLogin, authLoginLdap, getRSAConfig, getDeepseektoken, getRedirectURLCAS, getRedirectURL } from '@/services/login';
import './login.less';
// import cookie from "react-cookies";
// @ts-ignore
import useSsoWay from 'plus:/parcels/SSOConfigs/useSsoWay';

import { useTranslation } from 'react-i18next';
import { RsaEncry } from '@/utils/rsa';
import _, { set } from 'lodash';
import { useLocalStorage } from 'react-use';
import { getBigScreen, getBigScreen2 } from '@/services/sxxc/bigScreen';
import { getBusiGroups } from '@/services/common';
import Cookies from 'js-cookie';

export interface DisplayName {
  oidc: string;
  cas: string;
  oauth: string;
}


export default function Login() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const location = useLocation();

  const redirect = location.search && new URLSearchParams(location.search).get('redirect');
  const [displayName, setDisplayName] = useState<DisplayName>({
    oidc: 'OIDC',
    cas: 'CAS',
    oauth: 'OAuth',
  });

  const [theme, setTheme] = useLocalStorage("platform_theme", {
    title: '工控网运维系统',
    logo: '/image/topmenu/logo.png',
    icon: '/image/plticon.png',
  });


  const [showcaptcha, setShowcaptcha] = useState(false);
  const verifyimgRef = useRef<HTMLImageElement>(null);
  const captchaidRef = useRef<string>();
  const [remember, setRemember] = useState(false);
  const [rememberLdap, setRememberLdap] = useState(false);
  const [loading, setLoading] = useState(false)
  const [loadingLdap, setLoadingLdap] = useState(false)
  // 切换登录方式
  const [toggle, setToggle] = useState(true);
  // 其他登录方式列表
  const [otherLogin, setOtherLogin] = useState<any>([
    {
      key: 'LDAP',
      value: 'LDAP登录'
    },
    {
      key: 'CAS',
      value: 'CAS登录'
    },
    {
      key: 'OIDC',
      value: 'OIDC登录'
    }
  ]);
  const [activeKey, setActiveKey] = useState<string>('LDAP')

  const refreshCaptcha = () => {
    getCaptcha().then((res) => {
      if (res.dat && verifyimgRef.current) {
        verifyimgRef.current.src = res.dat.imgdata;
        captchaidRef.current = res.dat.captchaid;
      } else {
        message.warning('获取验证码失败');
      }
    });
  };
  useSsoWay();

  const getCaptchas = () => {
    getCaptcha().then((res) => {
      if (res.dat && verifyimgRef.current) {
        verifyimgRef.current.src = res.dat.imgdata;
        captchaidRef.current = res.dat.captchaid;
      } else {
        message.warning('获取验证码失败');
      }
    });
  }

  const toggleLogin = (flag: any) => {
    setToggle(flag);
    getCaptchas()
  };

  useEffect(() => {
    // 从 localStorage 中读取用户的登录信息
    const username = localStorage.getItem('username');
    const password = localStorage.getItem('password');
    const remember = localStorage.getItem('remember') === 'true';

    if (username) {
      form.setFieldsValue({
        username,
      });
    }
    // 如果记住密码，则填充表单
    if (remember && password) {
      form.setFieldsValue({
        // username,
        password,
        remember
      });
    }
    // 更新记住密码的状态
    setRemember(remember);

    // ldap登录
    const usernameLdap = localStorage.getItem('usernameLdap');
    const passwordLdap = localStorage.getItem('passwordLdap');
    const rememberLdap = localStorage.getItem('rememberLdap') === 'true';
    if (usernameLdap) {
      form.setFieldsValue({
        usernameLdap: usernameLdap,
      });
    }
    if (rememberLdap && passwordLdap) {
      form.setFieldsValue({
        passwordLdap: passwordLdap,
        rememberLdap: rememberLdap
      });
    }
    // console.log(form.getFieldsValue(true))
    setRememberLdap(rememberLdap);

    getSsoConfig().then((res) => {
      if (res.dat) {
        setDisplayName({
          oidc: res.dat.oidcDisplayName,
          cas: res.dat.casDisplayName,
          oauth: res.dat.oauthDisplayName,
        });
      }
    });

    ifShowCaptcha().then((res) => {
      setShowcaptcha(res?.dat?.show);
      if (res?.dat?.show) {
        getCaptchas()
      }
    });
  }, []);

  const handleRememberChange = (type: any, e: any) => {
    if (type === 'account') {
      setRemember(e.target.checked);
    } else {
      setRememberLdap(e.target.checked);
    }
  };
  const handleSubmit = (type: any) => {
    if (type === 'account') {
      form.validateFields().then(() => {
        login();
      });
    } else {
      form.validateFields().then(() => {
        loginLdap();
      });
    }
  };


  const login = async () => {
    setLoading(true)
    let { username, password, verifyvalue } = form.getFieldsValue();
    // 将用户的登录信息存储到 localStorage 中
    localStorage.setItem('username', username);
    localStorage.setItem('password', password);
    localStorage.setItem('remember', remember ? 'true' : 'false');
    // const rsaConf = await getRSAConfig();
    // const {
    //   dat: { OpenRSA, RSAPublicKey },
    // } = rsaConf;
    // const authPassWord = OpenRSA ? RsaEncry(password, RSAPublicKey) : password;
    authLogin(username, password, captchaidRef.current!, verifyvalue)
      .then((res) => {
        const { dat, err } = res;
        const { access_token, refresh_token } = dat;
        Cookies.set('access_token', access_token);
        Cookies.set('refresh_token', refresh_token);
        // 嵌入的子项目之前用的local
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        // 资产管理默认左侧树
        localStorage.setItem('left_asset_type', '-1');
        // 获取deepseek的toekn
        getDeepseektoken().then(res => {
          localStorage.setItem('deepseek_token', res.dat.deepseek_token);
        })
        if (!err) {
          getBusiGroups().then(res => {
            let busiGroups = res.dat;
            let groupIds = ''
            if (busiGroups.length > 0) {
              groupIds = busiGroups.map(item => item.id).toString()
            }
            getBigScreen2(groupIds).then(res => {
              const list = res.dat?.list?.filter((item: any) => item.type == 1) || [];
              if (list.length > 0) {
                window.location.href = '/screenView'
              } else {
                window.location.href = '/home';
              }
            }).catch(_ => {
              window.location.href = '/home';
            })
          }).catch(_ => {
            window.location.href = '/home';
          })
        }
      })
      .catch(() => {
        setLoading(false)
        if (showcaptcha) {
          refreshCaptcha();
        }
      });
  };

  // ldap登录
  const loginLdap = async () => {
    setLoadingLdap(true)
    let { usernameLdap: username, passwordLdap: password, verifyvalueLdap: verifyvalue } = form.getFieldsValue();
    // 将用户的登录信息存储到 localStorage 中
    localStorage.setItem('usernameLdap', username);
    localStorage.setItem('passwordLdap', password);
    localStorage.setItem('rememberLdap', rememberLdap ? 'true' : 'false');
    // const rsaConf = await getRSAConfig();
    // const {
    //   dat: { OpenRSA, RSAPublicKey },
    // } = rsaConf;
    // const authPassWord = OpenRSA ? RsaEncry(password, RSAPublicKey) : password;
    authLoginLdap(username, password, captchaidRef.current!, verifyvalue)
      .then((res) => {
        const { dat, err } = res;
        const { access_token, refresh_token } = dat;
        Cookies.set('access_token', access_token);
        Cookies.set('refresh_token', refresh_token);
        // 嵌入的子项目之前用的local
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        // 资产管理默认左侧树
        localStorage.setItem('left_asset_type', '-1');
        // 获取deepseek的toekn
        getDeepseektoken().then(res => {
          localStorage.setItem('deepseek_token', res.dat.deepseek_token);
        })
        if (!err) {
          getBusiGroups().then(res => {
            let busiGroups = res.dat;
            let groupIds = ''
            if (busiGroups.length > 0) {
              groupIds = busiGroups.map(item => item.id).toString()
            }
            getBigScreen2(groupIds).then(res => {
              const list = res.dat?.list?.filter((item: any) => item.type == 1) || [];
              if (list.length > 0) {
                window.location.href = '/screenView'
              } else {
                window.location.href = '/home';
              }
            }).catch(_ => {
              window.location.href = '/home';
            })
          }).catch(_ => {
            window.location.href = '/home';
          })
        }
      })
      .catch(() => {
        setLoadingLdap(false)
        if (showcaptcha) {
          refreshCaptcha();
        }
      });
  };

  const handleOtherLogin = (key: any) => {
    setActiveKey(key)
    switch (key) {
      case 'CAS':
        getRedirectURLCAS().then(res => {
          localStorage.setItem("CAS_state", res.dat?.state)
          window.location.href = res.dat?.redirect;
        })
        break;
      case 'OIDC':
        getRedirectURL().then(res => {
          window.location.href = res.dat;
        })
    }
  };

  return (
    <div className='login-warp'>
      <div className='login-panel'>
        <div className='login-main'>
          <div className='title'> {theme?.title}</div>
          <div className='main'> </div>
        </div>
        <div className='integration'>
          <div className='login-bg'>
            <div className='toggle-title'>
              <div className={`form_title ${toggle ? 'title-active' : ''}`} onClick={() => toggleLogin(true)}>账号登录</div>
              <div className={`form_title ${!toggle ? 'title-active' : ''}`} onClick={() => {
                toggleLogin(false);
                setActiveKey('LDAP');
              }}>单点登录</div>
            </div>
            {
              toggle ? (
                <>
                  <Form form={form} layout='vertical' className='login_form' requiredMark={true}>
                    <Form.Item
                      name='username'
                      rules={[
                        {
                          required: true,
                          message: t('请输入用户名'),
                        },
                      ]}
                    >
                      <Input placeholder={t('请输入用户名')} prefix={<IdcardTwoTone />} />
                    </Form.Item>
                    <Form.Item
                      name='password'
                      rules={[
                        {
                          required: true,
                          message: t('请输入密码'),
                        },
                      ]}
                    >
                      <Input type='password' placeholder={t('请输入密码')} onPressEnter={() => handleSubmit('account')} prefix={<LockTwoTone className='site-form-item-icon' />} />
                    </Form.Item>

                    <div className='verifyimg-div'>
                      <Form.Item
                        name='verifyvalue'
                        className='verifyimg-input'
                        rules={[
                          {
                            required: showcaptcha,
                            message: t('请输入验证码'),
                          },
                        ]}
                        hidden={!showcaptcha}
                      >
                        <Input className='code1' placeholder={t('请输入验证码')} onPressEnter={() => handleSubmit('account')} prefix={<SafetyCertificateTwoTone className='site-form-item-icon' />} />
                      </Form.Item>
                      <img className='img11'
                        ref={verifyimgRef}
                        style={{
                          display: showcaptcha ? 'inline-block' : 'none'
                        }}
                        onClick={refreshCaptcha}
                        alt='点击获取验证码'
                      />
                    </div>
                    <Form.Item className='form-remeber' name="remember" valuePropName='checked' wrapperCol={{ offset: 0, span: 24 }}>
                      <Checkbox onChange={(event) => handleRememberChange('account', event)}>记住密码</Checkbox>
                    </Form.Item>

                    <Form.Item>
                      <Button loading={loading} type='primary' className='submit_button' onClick={() => handleSubmit('account')} onKeyPress={e => {
                        handleSubmit('account')
                      }}>
                        {t('登录')}
                      </Button>
                    </Form.Item>
                  </Form>
                </>
              ) : <>
                <Form form={form} layout='vertical' className='login_form' requiredMark={true}>
                  <Form.Item
                    name='usernameLdap'
                    rules={[
                      {
                        required: true,
                        message: t('请输入用户名'),
                      },
                    ]}
                  >
                    <Input placeholder={t('请输入用户名')} prefix={<IdcardTwoTone />} />
                  </Form.Item>
                  <Form.Item
                    name='passwordLdap'
                    rules={[
                      {
                        required: true,
                        message: t('请输入密码'),
                      },
                    ]}
                  >
                    <Input type='password' placeholder={t('请输入密码')} onPressEnter={() => handleSubmit('ldap')} prefix={<LockTwoTone className='site-form-item-icon' />} />
                  </Form.Item>

                  <div className='verifyimg-div'>
                    <Form.Item
                      name='verifyvalueLdap'
                      className='verifyimg-input'
                      rules={[
                        {
                          required: showcaptcha,
                          message: t('请输入验证码'),
                        },
                      ]}
                      hidden={!showcaptcha}
                    >
                      <Input className='code1' placeholder={t('请输入验证码')} onPressEnter={() => handleSubmit('ldap')} prefix={<SafetyCertificateTwoTone className='site-form-item-icon' />} />
                    </Form.Item>
                    <img className='img11'
                      ref={verifyimgRef}
                      style={{
                        display: showcaptcha ? 'inline-block' : 'none'
                      }}
                      onClick={refreshCaptcha}
                      alt='点击获取验证码'
                    />
                  </div>
                  {/* <Form.Item className='form-remeber' name="rememberLdap" valuePropName='checked' wrapperCol={{ offset: 0, span: 24 }}>
                    <Checkbox onChange={(event) => handleRememberChange('ldap', event)}>记住密码</Checkbox>
                  </Form.Item> */}

                  <Form.Item>
                    <Button loading={loadingLdap} type='primary' className='submit_button' onClick={() => handleSubmit('ldap')} onKeyPress={e => {
                      handleSubmit('ldap')
                    }}>
                      {t('登录')}
                    </Button>
                  </Form.Item>
                </Form>
                <div className='login-other'>
                  <div className='login-other-title'>其他登录方式：</div>
                  <div className='login-other-content'>
                    {
                      otherLogin.map((item: any) => {
                        return (
                          <div className={`login-other-item ${activeKey == item.key ? 'active-text' : ''}`} key={item.key} onClick={() => handleOtherLogin(item.key)}>
                            <div className='login-other-item-text'>{item.value}</div>
                          </div>
                        )
                      })
                    }
                  </div>
                </div>
              </>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

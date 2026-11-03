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
import { ifShowCaptcha, getCaptcha, getSsoConfig, getSystemTheme, authLogin, authLoginLdap, getRSAConfig, getDeepseektoken, getRedirectURLCAS, getRedirectURL, getRedirectURLOAuth } from '@/services/login';
import './loginSso.less';
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
import { aesEncrypt, aesDecrypt } from '@/utils/aes';
// N33 批 F：登录成功后的站内回跳（照上游 `ee48e701:src/pages/login/index.tsx:189`）
// N36 批 A（A-2b）：`getSafeRedirect` 把地址栏里的 `?redirect=` 过一遍白名单，再发给 SSO 跳出接口
import { goAfterLogin, getSafeRedirect } from './redirect';

export interface DisplayName {
  oidc: string;
  cas: string;
  oauth: string;
}


export default function LoginSso() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const location = useLocation();

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
    },
    {
      key: 'OAuth2',
      value: 'OAuth2登录'
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
    const password = aesDecrypt(localStorage.getItem('password') || '');
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
    const passwordLdap = aesDecrypt(localStorage.getItem('passwordLdap') || '');
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
    localStorage.setItem('password', aesEncrypt(password));
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
          // N33 批 F：照上游 `ee48e701:src/pages/login/index.tsx:189` 加回跳；只跳站内路径（`redirect.ts`）
          goAfterLogin(() => {
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
          }, location.search);
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
    localStorage.setItem('passwordLdap', aesEncrypt(password));
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
          // N33 批 F：照上游 `ee48e701:src/pages/login/index.tsx:189` 加回跳；只跳站内路径（`redirect.ts`）
          goAfterLogin(() => {
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
          }, location.search);
        }
      })
      .catch(() => {
        setLoadingLdap(false)
        if (showcaptcha) {
          refreshCaptcha();
        }
      });
  };

  /**
   * 点「CAS / OIDC / OAuth2 登录」时，先问后端要第三方登录页的地址，拿到就把浏览器送过去。
   *
   * N36 批 A 在这里改了三件事（依据：后端第八份交接第一节 3、第二节 2；lead 拍板 D-N36-1 / D-N36-2）：
   *
   * 1. **判据从 dat 的 `valid` 字段换成 `res.dat?.redirect`**（有地址就跳）。
   *    `valid` 是公司私有改造加的字段，上游后端没有；u-sec 把它定成「**用户传上来的回跳地址**
   *    是不是安全的站内路径」（`ln-server center/router/router_login.go:36-50` 的
   *    `isSafeInternalRedirect`），**不是**「SSO 配置能不能用」。原来这里当成后者判，于是
   *    只要我们开始往后端发 `redirect`（就是下面第 2 件事），一个不安全的回跳值就会被
   *    误读成「CAS 配置失败」，明明能跳的也不跳了。换成判 `redirect` 非空，语义上等价于
   *    上游 fe 的 `if (!res.dat)`（`ee48e701:src/pages/login/index.tsx:121`），
   *    与后端三条分支都对得上：已登录 → 回原样地址（能跳）；SSO 未启用 → 回空串（不跳、弹错误）；
   *    启用未登录 → 回第三方登录地址（能跳）。后端保留 `valid` 做它的安全检查结果，前端不再读它。
   *
   * 2. **把 `redirect` 发给后端**，值取 `getSafeRedirect(location.search)`
   *    （`./redirect:86`，N33 批 F 写的白名单，只放行站内相对路径，取不到或不合法回 `undefined`，
   *    那时 `services/login.ts` 整个查询参数都不发、后端用它自己的默认 `/`）。
   *    有了它，SSO 绕一圈回来才知道该把用户送回哪一页（401 时 `src/utils/request.ts:69-72`
   *    把当前地址挂在 `/login?redirect=…` 上，回调页 `goAfterLogin` 再用）。
   *    **一定要先过白名单**：后端「用户已经登录」那条分支会把收到的值原样回传
   *    （`router_login.go:1241-1248`），这里判到有地址就跳——直接把地址栏原值发出去，
   *    等于谁构造一条 `/login?redirect=https://evil.example` 就能把已登录用户送去外站。
   *
   * 3. **CAS 的 `state` 非空才存**。`state` 是 CAS 流程防跨站请求伪造（CSRF）的一次性串：
   *    后端 `Authorize` 生成并存进 redis，前端要原样带去 CAS 服务器、回调时再带回来核对
   *    （`loginCallbackCas` 从 query 里取 `state` 交给 `ValidateServiceTicket`）。
   *    后端只在「CAS 已启用且用户未登录」那条分支回 `state`，另外两条（已登录、CAS 未启用）
   *    压根不跳 CAS、没有 `state`（`router_login.go:1274-1275` 的注释写明「前端按 dat.state
   *    非空才存」）。不加这个 `if`，那两条分支会把字符串 `"undefined"` 写进 localStorage，
   *    留给下一次真的 CAS 回调去核对。存完再跳，顺序照上游
   *    （`ee48e701:src/pages/login/index.tsx:125-127`）。
   *
   * 三处 `message.error` 的文案一个字没动。
   */
  const handleOtherLogin = (key: any) => {
    setActiveKey(key)
    // 登录完要回哪一页：已经过了 ./redirect 的白名单，拿不到或不合法就是 undefined（那时不发这个参数）
    const safeRedirect = getSafeRedirect(location.search);
    switch (key) {
      case 'CAS':
        getRedirectURLCAS(safeRedirect).then(res => {
          if (res.dat?.redirect) {
            if (res.dat?.state) {
              localStorage.setItem("CAS_state", res.dat.state)
            }
            window.location.href = res.dat?.redirect;
          } else {
            message.error('获取CAS登录地址失败，请检查CAS登录配置')
          }
        }).catch(_ => {
          message.error('获取CAS登录地址失败，请检查CAS登录配置')
        })
        break;
      case 'OIDC':
        getRedirectURL(safeRedirect).then(res => {
          if (res.dat?.redirect) {
            window.location.href = res.dat?.redirect;
          } else {
            message.error('获取OIDC登录地址失败，请检查OIDC登录配置')
          }
        }).catch(_ => {
          message.error('获取OIDC登录地址失败，请检查OIDC登录配置')
        })
        break;
      case 'OAuth2':
        getRedirectURLOAuth(safeRedirect).then(res => {
          if (res.dat?.redirect) {
            window.location.href = res.dat?.redirect;
          } else {
            message.error('获取OAuth2登录地址失败，请检查OAuth2登录配置')
          }
        }).catch(_ => {
          message.error('获取OAuth2登录地址失败，请检查OAuth2登录配置')
        })
        break;
    }
  };

  return (
    <div className='login-warp-sso'>
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

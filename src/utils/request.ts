/** Request 网络请求工具 更详细的 api 文档: https://github.com/umijs/umi-request */
import { extend } from "umi-request";
import { message, notification } from "antd";
import _ from "lodash";
import { UpdateAccessToken } from "@/services/login";
import qs from 'qs';
import { isObject ,sampleSize} from 'lodash-es';
import { sm2Decrypt, sm2Encrypt, sm2Sign, sm2Verify, sm4Decrypt, sm4Encrypt ,randomString} from '@/utils/crypto';

/** 异常处理程序，所有的error都被这里处理，页面无法感知具体error */
const errorHandler = (error: Error): Response => {
  // 忽略掉 setting getter-only property "data" 的错误
  // 这是 umi-request 的一个 bug，当触发 abort 时 catch callback 里面不能 set data
  if (
    error.name !== "AbortError" &&
    error.message !== 'setting getter-only property "data"'
  ) {
    // @ts-ignore
    if (!error.silence) {
      // notification.error({
      //   message: error.message,
      // });
      message.error(error.message);
      throw error;
    }
    // 暂时认定只有开启 silence 的时候才需要传递 error 详情以便更加精确的处理错误
    // @ts-ignore
    if (error.silence) {
      throw error;
    } else {
      message.error(error.message);
      // throw new Error();
      throw error;
    }
  }
  throw error;
};

/** 处理后端返回的错误信息 */
const processError = (res: any): string => {
  if (res?.error) {
    return _.isString(res?.error) ? res.error : JSON.stringify(res?.error);
  }
  if (res?.err) {
    return _.isString(res?.err) ? res.err : JSON.stringify(res?.err);
  }
  if (res?.errors) {
    return _.isString(res?.errors) ? res.errors : JSON.stringify(res?.errors);
  }
  if (res?.message) {
    return _.isString(res?.message)
      ? res.message
      : JSON.stringify(res?.message);
  }
  return JSON.stringify(res);
};

/** 配置request请求时的默认参数 */
const request = extend({
  errorHandler,
  credentials: "include",
});


// 对请求参数按照键名进行排序，并使用 qs.stringify 方法将参数转换为字符串。
const stringifyAndSort = (obj: any) =>
  qs.stringify(obj, {
    encode: false,
    sort(f, s) {
      const lim = Math.min(f.length, s.length);
      let i = 0;
      while (i < lim && f[i] === s[i]) ++i;
      if (i < lim) return f[i] < s[i] ? -1 : 1;
      return f.length - s.length;
    }
  });
 const isFormData = (value: any): value is FormData => value instanceof FormData;
 // 对请求数据进行处理，包括签名和加密操作。
const packRequestData = (config) => {
  // 检查请求方法是否为 post 或者 put ，如果不是则直接返回，不进行后续处理。
  // if (config.method !== 'post') return;
  if (!['post', 'put'].includes(config.method?.toLowerCase())) return;
  // 检查请求数据是否为 FormData 类型或者不是对象类型，如果是则直接返回，不进行后续处理。
  if (isFormData(config.data) || !isObject(config.data)) return;

  let data: Record<string, any> = {};
  const clientKey = sessionStorage.getItem("clientKey");  // 客户端私钥  sm2
  const serverKey = sessionStorage.getItem("serverKey")  // 服务端公钥 登录成功之后拿到
  // console.log("请求配置",config);
  // 签名
  if (!config.noSignature && clientKey) {
    const headers = config.headers;
    const nonce = headers.nonce;
    const timestamp = headers.timestamp;
    // console.log("请求加密数据",config.data);
    data.s_si = sm2Sign(clientKey, stringifyAndSort({ ...config.data, nonce, timestamp }));  //使用 sm2Sign 函数对包含请求数据、 nonce 和 timestamp 的对象进行签名，并将签名结果存储在 data.s_si 中。  签名数据
    // console.log("请求签名数据",stringifyAndSort({ ...config.data, nonce, timestamp }));
  }
  // 加密  请求数据用SM4加密
  if (!config.noEncryption && serverKey) {
    // console.log("加密数据",JSON.stringify(config.data));
    const biz = JSON.stringify(config.data);  // 将请求数据转换为字符串，并赋值给变量 biz。
    const keyiv = randomString(32);  // 生成一个 32 位的随机字符串 keyiv ，前 16 位作为 SM4 加密的密钥，后 16 位作为偏移量。
    console.log("要加密的数据",keyiv.substring(0, 16), keyiv.substring(16, 32), biz,biz.length)
    data.s_biz = sm4Encrypt(keyiv.substring(0, 16), keyiv.substring(16, 32), biz);  // 使用 sm4Encrypt 函数对 biz 进行加密，并将加密结果存储在 data.s_biz 中。  请求data的加密值
    console.log("加密后的请求数据",data.s_biz)
    data.s_k = sm2Encrypt(serverKey, keyiv);   // 对 keyiv 进行加密，结果存储在 data.s_k 中。  sm4加密的密钥和偏移量的加密值
  } else {
    data = { ...config.data, ...data };
  }

  config.data = data;
};


// 对服务器响应的数据进行解密和签名验证处理。
export const unpackRequestData = (responseData,config) => {
  let data;
  const clientKey = sessionStorage.getItem("clientKey");  // 客户端私钥  sm2
  const serverKey = sessionStorage.getItem("serverKey")  // 服务端公钥 登录成功之后拿到
  // 从响应的配置中提取 noEncryption 和 noSignature 选项，用于判断是否需要进行解密和签名验证。
  const { noEncryption, noSignature } = config ;
  // 如果 noEncryption 为 false 且存在客户端私钥 clientKey ，则进行解密处理
  if (!noEncryption && clientKey) {
  // if (clientKey) {
    // 对 response.data.s_k 进行解密，得到密钥和偏移量的组合keyiv。
    const keyiv = sm2Decrypt(clientKey, responseData.s_k);
    // 使用 keyiv 的前 16 位作为 SM4 解密的密钥，后 16 位作为偏移量，对 response.data.s_biz 进行解密，得到解密后的业务数据 biz。
    const biz = sm4Decrypt(keyiv.substring(0, 16), keyiv.substring(16, 32), responseData.s_biz);
    data = JSON.parse(biz);
    // console.log('解密后的业务数据', data);
  } else {
    data = responseData;
  }
  // 如果 noSignature 为 false 且存在服务器公钥 serverKey ，则进行签名验证处理
  if (!noSignature && serverKey) {
    const sign = responseData.s_si || data.s_si;
    delete data.s_si;
    // console.log("服务端密钥",serverKey,"验签数据","排序之前的数据",data,"排序之后的数据",stringifyAndSort(data),"签名",sign);
    if (!sm2Verify(serverKey, stringifyAndSort(data), sign)) {
      const msg = '数据异常，请稍后再试';
      message.error(msg);
      throw new Error(msg);
    }
  }
  return data;
};

// 请求拦截   添加请求头 加密请求参数
request.interceptors.request.use((url, options) => {
  let headers = {
    ...options.headers,
  };
  headers["Authorization"] = `Bearer ${
    sessionStorage.getItem("access_token") || ""
  }`;
  headers["X-Language"] =
    localStorage.getItem("language") === "en_US" ? "en" : "zh";
  // headers["Bg-debug"] = 1;
  headers["nonce"] = randomString();
  headers["timestamp"] = new Date().getTime();
  options.headers = headers;
  // console.log("环境变量",import.meta.env.VITE_TRANSPORT_SECURITY)
  if (import.meta.env.VITE_TRANSPORT_SECURITY === 'enabled') {
    // console.log("请求数据",url,options)
    packRequestData(options);
  } else {
    headers["Bg-debug"] = 1
  }
  return {
    url,
    options: { ...options, headers },
  };
});

/**
 * 响应拦截   解密和签名验证
 */
request.interceptors.response.use(
  async (response, options) => {
    // console.log("响应拦截器",response,options)
    const { status } = response;
    if (status === 200) {
      if (options.responseType == "blob") {
        return response;
      } else {
        return response
          .clone()
          .json()
          .then((encryptData) => {
            const { url } = response;

            let data;
            // TODO：解密响应
            if (import.meta.env.VITE_TRANSPORT_SECURITY === 'enabled') {
              // 检查响应数据是对象类型
              if (isObject(encryptData) ) {
                data = unpackRequestData(encryptData,options);
              }
            }else{
              data = encryptData
            }
            // const data = unpackRequestData(encryptData,options)
            // const data = encryptData
            // console.log("响应数据",encryptData,"响应配置",response,options,"解密后的响应数据",data);
            
            // TODO: 糟糕的逻辑，后端返回的数据结构不统一，需要兼容
            // /n9e/datasource/ 返回的数据结构是 { error: '', data: [] }
            // proxy/prometheus 返回的数据结构是 { status: 'success', data: {} }
            // proxy/elasticsearch 返回的数据结构是 { ...data }
            // proxy/jeager 返回的数据结构是 { data: [], errors: [] }
            if (
              _.some([`sxxcTask`], (item) => {
                return url.includes(item);
              })
            ) {
              return data;
            } else if (
              _.some(["/api/n9e/proxy", "/probe/v1"], (item) => {
                return url.includes(item);
              })
            ) {
              return data;
            } else if (
              _.some(["/api/v1", "/api/v2", "/api/n9e/datasource"], (item) => {
                return url.includes(item);
              })
            ) {
              if (!data.error) {
                return { ...data, success: true };
              } else {
                throw {
                  name: processError(data),
                  message: processError(data),
                  silence: options.silence,
                  data,
                  response,
                };
              }
            } else {
              // n9e 和 n9e-plus 大部分接口返回的数据结构是 { err: '', dat: {} }
              if (
                data.err === "" ||
                data.status === "success" ||
                data.error === ""
              ) {
                return { ...data, success: true };
              } else {
                throw {
                  name: processError(data),
                  message: processError(data),
                  silence: options.silence,
                  data,
                  response,
                };
              }
            }
          });
      }
    } else if (status === 401) {
      if (response.url.indexOf("/api/n9e/auth/refresh") > 0) {
        location.href = `/login${
          location.pathname != "/"
            ? "?redirect=" + location.pathname + location.search
            : ""
        }`;
      } else {
        sessionStorage.getItem("refresh_token")
          ? UpdateAccessToken().then((res) => {
              console.log("401 err", res);
              if (res.err) {
                location.href = `/login${
                  location.pathname != "/"
                    ? "?redirect=" + location.pathname + location.search
                    : ""
                }`;
              } else {
                const { access_token, refresh_token } = res.dat;
                sessionStorage.setItem("access_token", access_token);
                sessionStorage.setItem("refresh_token", refresh_token);
                // 嵌入的子项目之前用的local
                localStorage.setItem('access_token', res.dat.refresh_token);
                localStorage.setItem('refresh_token', res.dat.refresh_token);
                location.href = `${location.pathname}${location.search}`;
              }
            })
          : (location.href = `/login${
              location.pathname != "/"
                ? "?redirect=" + location.pathname + location.search
                : ""
            }`);
      }
    } else {
      return response
        .clone()
        .text()
        .then((encryptData) => {
          // TODO:解密响应
          const encryptObj = JSON.parse(encryptData);
          let data;
          if (import.meta.env.VITE_TRANSPORT_SECURITY === 'enabled') {
            if (isObject(encryptObj) ) {
              data = unpackRequestData(encryptObj,options);
            }
          }else{
            data = encryptObj
          }
          let errObj = {};
          try {
            // const parsed = JSON.parse(data);
            // const errMessage = processError(parsed);
            // errObj = {
            //   name: errMessage,
            //   message: errMessage,
            //   data: parsed,
            // };
            
            const errMessage = processError(data);
            errObj = {
              name: errMessage,
              message: errMessage,
              data
            };
          } catch (error) {
            errObj = {
              name: data,
              message: data,
            };
          }
          throw {
            ...errObj,
            silence: options.silence,
          };
        });
    }
  },
  {
    global: false,
  }
);

export default request;

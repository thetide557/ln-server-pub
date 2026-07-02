/** Request 网络请求工具 更详细的 api 文档: https://github.com/umijs/umi-request */
import { extend } from "umi-request";
import { message, notification } from "antd";
import _ from "lodash";
import { UpdateAccessToken } from "@/services/login";
import Cookies from 'js-cookie';

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
  // credentials: "include",
  credentials: "omit",  // 无论是否跨域，都不携带 Cookie。
});

// 全局变量：缓存正在进行的刷新 Token 请求，防止并发 401 时重复调用 refresh 接口
let refreshTokenPromise: Promise<any> | null = null;

request.interceptors.request.use((url, options) => {
  let headers = {
    ...options.headers,
  };
  headers["Authorization"] = `Bearer ${Cookies.get("access_token") || ""
    }`;
  headers["X-Language"] =
    localStorage.getItem("language") === "en_US" ? "en" : "zh";
  headers["Bg-debug"] = 1;
  return {
    url,
    options: { ...options, headers },
  };
});

/**
 * 响应拦截
 */
request.interceptors.response.use(
  async (response, options) => {
    // console.log(response);
    const { status } = response;
    if (status === 200) {
      if (options.responseType == "blob") {
        return response;
      } else {
        return response
          .clone()
          .json()
          .then((data) => {
            const { url } = response;
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
      return response.clone().text().then((text) => {
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { err: text };
        }

        if (data?.err_code === 'LOGIN_CONFLICT') {
          message.warning(data.err || '您已在其他地方登录，请重新登录');
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setTimeout(() => {
            location.href = `/login${location.pathname != "/"
                ? "?redirect=" + location.pathname + location.search
                : ""
              }`;
          }, 1000);
          throw {
            name: 'LOGIN_CONFLICT',
            message: '',
            silence: true,
            data,
            response,
          };
        }

        if (response.url.indexOf("/api/n9e/auth/refresh") > 0) {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          message.warning('登录状态已过期，请重新登录');
          setTimeout(() => {
            location.href = `/login${location.pathname != "/"
                  ? "?redirect=" + location.pathname + location.search
                  : ""
            }`;
          }, 1000);
          throw {
            name: 'UNAUTHORIZED',
            message: '',
            silence: true,
            data,
            response,
          };
        }

        if (Cookies.get("refresh_token")) {
          // 检查是否正在进行刷新请求，防止并发 401 时重复调用 refresh 接口
          if (!refreshTokenPromise) {
            // 只有第一个 401 请求会发起刷新，后续请求共享同一个 Promise
            refreshTokenPromise = UpdateAccessToken().then((res) => {
              // 刷新完成后必须清空缓存，否则下次 Token 过期时无法发起新的刷新
              refreshTokenPromise = null;
              if (res.err) {
                // 刷新失败，清除 Token 并跳转登录页
                Cookies.remove("access_token");
                Cookies.remove("refresh_token");
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                message.warning('登录状态已过期，请重新登录');
                setTimeout(() => {
                  location.href = `/login${location.pathname != "/"
                    ? "?redirect=" + location.pathname + location.search
                    : ""
                  }`;
                }, 1000);
              } else {
                // 刷新成功，更新新的 Token 到 Cookies 和 localStorage
                const { access_token, refresh_token } = res.dat;
                Cookies.set("access_token", access_token);
                Cookies.set("refresh_token", refresh_token);
                localStorage.setItem('access_token', access_token);
                localStorage.setItem('refresh_token', refresh_token);
              }
              return res;
            }).catch(() => {
              // 刷新异常，清空缓存并抛出错误
              refreshTokenPromise = null;
              throw {
                name: 'UNAUTHORIZED',
                message: '',
                silence: true,
                data,
                response,
              };
            });
          }
          // 所有 401 请求共享同一个刷新 Promise 的结果
          return refreshTokenPromise.then((res) => {
            // console.log('res1111111111', res);
            if (res.err) {
              // 刷新失败，抛出错误中断 Promise 链
              throw {
                name: 'UNAUTHORIZED',
                message: '',
                silence: true,
                data,
                response,
              };
            }
            // 刷新成功，重新发送原始请求（带上新 Token）
            const { access_token } = res.dat;
            // console.log('options', options);
            const newOptions = {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${access_token}`,
              },
            };
            return request(response.url, newOptions);
          });
        } else {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          location.href = `/login${location.pathname != "/"
              ? "?redirect=" + location.pathname + location.search
              : ""
            }`;
          throw {
            name: 'UNAUTHORIZED',
            message: '',
            silence: true,
            data,
            response,
          };
        }
      });
    } else {
      return response
        .clone()
        .text()
        .then((data) => {
          let errObj = {};
          try {
            const parsed = JSON.parse(data);
            const errMessage = processError(parsed);
            errObj = {
              name: errMessage,
              message: errMessage,
              data: parsed,
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

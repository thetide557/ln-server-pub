type Buf = number;
declare function _malloc(len: number): Buf;   // 分配内存
declare function allocateUTF8(str: string): Buf; // 将字符串转换为UTF8编码 内存地址
declare function _free(buf: Buf): void;  // 释放内存
declare function UTF8ToString(buf: Buf): string;  // 将UTF8编码转换为字符串
declare function _sm2g(out: Buf): number;  // 生成密钥对
declare function _sm2e(key: Buf, data: Buf, out: Buf): number;  // 加密,key 表示 SM2 公钥， data 表示要加密的数据， out 存储加密结果。
declare function _sm2d(key: Buf, data: Buf, out: Buf): number;  // 解密,key 表示 SM2 私钥， data 表示要解密的数据， out 存储解密结果。
declare function _sm2s(key: Buf, data: Buf, out: Buf): number;  // 签名，key 表示 SM2 私钥， data 表示要签名的数据， out 表示存储签名结果。
declare function _sm2v(key: Buf, data: Buf, signData: Buf): number;  // 验签 key 表示 SM2 公钥， data 表示要验证的数据， signData 表示签名数据。
declare function _sm3d(data: Buf, dgst: Buf): number; // 计算SM3杂凑值，data 表示要计算哈希的数据， dgst 表示存储哈希结果。
declare function _sm4e(key: Buf, iv: Buf, data: Buf, out: Buf): number; // 加密，key 表示 SM4 加密密钥， iv 表示初始化向量， data 表示要加密的数据， out 存储加密结果。
declare function _sm4d(key: Buf, iv: Buf, data: Buf, out: Buf): number;  // 解密，key 表示 SM4 解密密钥， iv 表示初始化向量， data 表示要解密的数据， out 存储解密结果。


import { sampleSize} from 'lodash-es';

/**
 * 生成密钥对
 * @returns 包含公钥和私钥的对象
 */
export const sm2GenerateKey = () => {
  const buf = _malloc(132);  // 分配132字节的内存
  _sm2g(buf);  // 生成密钥对

  const keys = UTF8ToString(buf);  // 将内存中的密钥转换为字符串
  _free(buf);  // 释放内存
  // 返回公钥（前 88 个字符）和私钥（后 44 个字符）
  return {
    publicKey: keys.substring(0, 88),
    privateKey: keys.substring(88, 132)
  };
};

// 使用 SM2 公钥对明文进行加密。
export const sm2Encrypt = (publicKey: string, plaintext: string) => {
  const key = allocateUTF8(publicKey);    // 将公钥转换为UTF8编码
  const text = allocateUTF8(plaintext);   // 将明文转换为UTF8编码
  const buf = _malloc(366);               // 分配366字节的内存，存储加密结果
  _sm2e(key, text, buf);                  // 加密
  _free(key);
  _free(text);
  const ciphertext = UTF8ToString(buf);   // 将加密结果转换为字符串
  _free(buf);
  return ciphertext;                      // 返回加密结果
};

// 使用 SM2 私钥对密文进行解密。
export const sm2Decrypt = (privateKey: string, ciphertext: string) => {
  const key = allocateUTF8(privateKey);
  const text = allocateUTF8(ciphertext);
  const buf = _malloc(255);
  _sm2d(key, text, buf);
  _free(key);
  _free(text);
  const plaintext = UTF8ToString(buf);
  _free(buf);
  return plaintext;
};

// 使用 SM2 私钥对数据进行签名。
export const sm2Sign = (privateKey: string, data: string) => {
  const key = allocateUTF8(privateKey);
  const text = allocateUTF8(data);
  const buf = _malloc(96);
  _sm2s(key, text, buf);
  _free(key);
  _free(text);
  const sign = UTF8ToString(buf);
  _free(buf);
  return sign;
};

// 使用 SM2 公钥验证签名。
export const sm2Verify = (publicKey: string, data: string, signData: string) => {
  const key = allocateUTF8(publicKey);
  const dataBuf = allocateUTF8(data);
  const signDataBuf = allocateUTF8(signData);
  const rslt = _sm2v(key, dataBuf, signDataBuf);  // 验证签名
  _free(key);
  _free(dataBuf);
  _free(signDataBuf);
  return rslt === 1;    // 返回验证结果，判断验签结果是否为1
};
// 计算 SM3 哈希值。
export const sm3Digest = (data: string) => {
  const dataBuf = allocateUTF8(data);
  const dgstBuf = _malloc(44);
  _sm3d(dataBuf, dgstBuf);
  _free(dataBuf);

  const dgst = UTF8ToString(dgstBuf);
  _free(dgstBuf);
  return dgst;
};

// 使用 SM4 算法对数据进行加密（CBC 模式，PKCS7 填充）
export const sm4Encrypt = (key: string, iv: string, data: string) => {
  const keyBuf = allocateUTF8(key);
  const ivBuf = allocateUTF8(iv);
  const dataBuf = allocateUTF8(data);
  const outBuf = _malloc(Math.ceil((Math.ceil(data.length / 16 + 1) * 16) / 3) * 4);  // 根据数据长度计算并分配足够的内存用于存储加密结果。
  _sm4e(keyBuf, ivBuf, dataBuf, outBuf);
  _free(keyBuf);
  _free(ivBuf);
  _free(dataBuf);
  const ciphertext = UTF8ToString(outBuf);
  _free(outBuf);
  return ciphertext;
};

// cbc mode, pkcs7
/**
 * 使用 SM4 算法对数据进行解密（CBC 模式，PKCS7 填充）
 * @param key 解密密钥
 * @param iv 初始化向量
 * @param data 加密后的数据
 * @returns 解密后的数据
 */
export const sm4Decrypt = (key: string, iv: string, data: string) => {
  const keyBuf = allocateUTF8(key);
  const ivBuf = allocateUTF8(iv);
  const dataBuf = allocateUTF8(data);

  const outBuf = _malloc((data.length / 4) * 3);  //根据密文长度计算并分配足够的内存用于存储解密结果。
  _sm4d(keyBuf, ivBuf, dataBuf, outBuf);
  _free(keyBuf);
  _free(ivBuf);
  _free(dataBuf);
  const plaintext = UTF8ToString(outBuf);
  _free(outBuf);
  return plaintext;
};



export function base64ToHex(base64Str) {
  const binaryPassword = atob(base64Str);
  let hexPassword = '';
  for (let i = 0; i < binaryPassword.length; i++) {
    const hex = binaryPassword.charCodeAt(i).toString(16).padStart(2, '0');
    hexPassword += hex;
  }
  return hexPassword;
}


  /**
   * 生成随机字符串
   * @param {*} len 默认16，最大62
   * @return {*} 随机字符串
   */
  export const randomString = (function () {
    const sample = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return function (len = 16) {
      return sampleSize(sample, len).join('');
    };
  })();
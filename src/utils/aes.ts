import CryptoJS from 'crypto-js';

export const DEFAULT_AES_SECRET = 'secret-lingniu12';
export const CIPHER_PREFIX = '{{cipher}}';

export function aesEncrypt(plainText: string, secret: string = DEFAULT_AES_SECRET): string {
  if (plainText == null || plainText === '') return plainText;
  if (plainText.startsWith(CIPHER_PREFIX)) return plainText;

  const key = CryptoJS.enc.Utf8.parse(secret);
  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  const combined = iv.concat(encrypted.ciphertext);
  const base64 = CryptoJS.enc.Base64.stringify(combined);

  return `${CIPHER_PREFIX}${base64}`;
}

export function aesDecrypt(cipherText: string, secret: string = DEFAULT_AES_SECRET): string {
  if (cipherText == null || cipherText === '') return cipherText;
  if (!cipherText.startsWith(CIPHER_PREFIX)) return cipherText;

  const key = CryptoJS.enc.Utf8.parse(secret);
  const b64 = cipherText.slice(CIPHER_PREFIX.length);
  const combined = CryptoJS.enc.Base64.parse(b64);

  const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
  const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4), combined.sigBytes - 16);

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: ciphertext } as any,
    key,
    {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  );

  return decrypted.toString(CryptoJS.enc.Utf8);
}
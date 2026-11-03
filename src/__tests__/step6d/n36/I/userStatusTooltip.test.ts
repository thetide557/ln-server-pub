/**
 * N36 追加批 I（后端第十一份第三节「对前端的四句」第二句）·
 * 用户列表「禁用」开关的提示里说清「禁用是立刻生效的」。
 *
 * 要证的事：`src/pages/user/users.tsx:255` 的 tooltip 不再是光秃秃的「已启用 / 已禁用」，
 * 而是走 `user.status_tip_enabled` / `user.status_tip_disabled` 两个键，并且
 * **三个语种包（zh_CN / zh_HK / en_US）都有这两个键、都提到「立即」**。
 *
 * 为什么要测：后端 128 补测实测「账号被禁用后 JWT / PAT 立即 401」（安 3，PASS），
 * 也就是禁用一按下去，那个账号已经登录的会话当场就失效、不等令牌过期。
 * 原来的提示看不出这一点，管理员容易以为「要等一会儿才生效」。
 * 这类改动最容易出的错是「只改了中文、漏了另外两个语种」——漏了的那个语种
 * i18next 会直接把键名原样显示在界面上（例：界面上出现 `user.status_tip_enabled` 这串字），
 * 所以这里逐个语种核一遍。
 *
 * 顺带说一句事实（见 `n36/改动清单-I1.md` 第三节①）：上游 `v9.1.0` 的用户页
 * （`src/pages/user/users.tsx`，312 行）**没有「禁用用户」这个功能**
 * （`git -C fe grep -n 'status\|禁用\|disable' v9.1.0 -- src/pages/user/users.tsx` 零命中），
 * 禁用是羚牛自己加的，所以这句文案没有上游原文可以照抄，是本批自己写的。
 */
import zh_CN from '@/pages/user/locale/zh_CN';
import zh_HK from '@/pages/user/locale/zh_HK';
import en_US from '@/pages/user/locale/en_US';

const KEYS = ['status_tip_enabled', 'status_tip_disabled'] as const;

describe('N36-I · 禁用开关的提示文案三语种齐全', () => {
  it.each([
    ['zh_CN', zh_CN, ['立即失效']],
    ['zh_HK', zh_HK, ['立即失效']],
    ['en_US', en_US, ['immediately']],
  ])('用例：%s 两个键都在，且提到「立即生效」这层意思', (_lang, bundle: any, mustContain: string[]) => {
    KEYS.forEach((key) => {
      const text = bundle?.user?.[key];
      expect(typeof text).toBe('string');
      expect((text as string).length).toBeGreaterThan(0);
      // 两条提示里至少各有一处点明「立即」
      expect(mustContain.some((word) => (text as string).includes(word))).toBe(true);
    });
  });
});

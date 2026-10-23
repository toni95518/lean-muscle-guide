import { env } from "../env";
import { HttpError } from "./errors";

// Exchanges the code from wx.login() for the user's openid.
// Docs: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html
export async function exchangeWechatCode(code: string): Promise<{ openid: string; sessionKey: string }> {
  if (!env.WECHAT_APPID || !env.WECHAT_SECRET) {
    throw new HttpError(501, "wechat_not_configured", "WeChat login is not set up on this server");
  }
  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.search = new URLSearchParams({
    appid: env.WECHAT_APPID,
    secret: env.WECHAT_SECRET,
    js_code: code,
    grant_type: "authorization_code",
  }).toString();

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const body = (await res.json()) as { openid?: string; session_key?: string; errcode?: number; errmsg?: string };
  if (!res.ok || !body.openid || !body.session_key) {
    throw new HttpError(401, "wechat_login_failed", `WeChat rejected the login code${body.errmsg ? `: ${body.errmsg}` : ""}`);
  }
  // session_key decrypts WeChat Sports (wx.getWeRunData) data; keep it server-side only.
  return { openid: body.openid, sessionKey: body.session_key };
}

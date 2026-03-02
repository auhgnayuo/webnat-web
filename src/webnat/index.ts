/**
 * Webnat 模块入口
 *
 * 提供全局唯一的 Webnat 实例，通过单例模式确保整个应用共享同一个连接。
 * 当 UserAgent 不包含 "Webnat/" 标记时，说明当前不在 Webnat 原生容器中运行，
 * 此时导出 undefined。
 */

import { getWindowAsAny } from '../utils';
import { WebnatImpl } from './webnat-impl';
import { Webnat } from './webnat';

/**
 * 获取全局 Webnat 实例
 *
 * 通过检测 UserAgent 中是否包含 "Webnat/" 标记来判断是否在原生容器中运行。
 * - 在原生容器中：返回 Webnat 实例
 * - 在普通浏览器中：返回 undefined
 */
export default (() => {
  if (!/\bWebnat\//.test(navigator.userAgent)) {
    return undefined;
  }
  let v = getWindowAsAny().__web_webnat__;
  if (!v) {
    v = new WebnatImpl();
    getWindowAsAny().__web_webnat__ = v;
  }
  return v as Webnat;
})() as Webnat | undefined;

/**
 * 导出 Webnat 接口类型
 */
export type { Webnat };

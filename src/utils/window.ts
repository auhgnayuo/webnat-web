/**
 * 获取全局 window 对象
 * @returns 返回浏览器环境中的 window 对象
 */
export function getWindow() {
  return window;
}

/**
 * 获取全局 window 对象并转换为 any 类型
 * @returns 返回类型为 any 的 window 对象，用于绕过类型检查
 */
export function getWindowAsAny() {
  return window as any;
}

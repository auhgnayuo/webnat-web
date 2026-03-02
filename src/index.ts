/**
 * Webnat 模块入口
 *
 * 统一导出 Webnat 实例和类型定义
 *
 * 导出内容：
 * - default: Webnat 单例实例
 * - Webnat: Webnat 接口类型定义
 * - WebnatError: 错误类
 * - WebnatErrorCode: 错误码枚举
 */
export { default } from './webnat';
export type { Webnat } from './webnat';
export { WebnatError, WebnatErrorCode } from './webnat/error';

import { Param } from "./message";

/**
 * Webnat 接口
 *
 * 提供 Native 与 Web 之间完整的双向通信能力，包括：
 * - 原始消息收发
 * - 广播消息的发布与订阅
 * - 远程方法调用
 */
export interface Webnat {
  /**
   * 发送原始消息
   *
   * @param param 消息体，可以是任意可序列化的数据（Param 类型）
   */
  raw: (param: Param) => void;

  /**
   * 注册原始消息接收回调函数
   *
   * 用于接收来自 Native 端的原始消息
   *
   * @param listener 消息接收回调函数
   * 注意：同一个回调函数重复注册只会生效一次
   */
  onRaw: (listener: (param: Param) => void) => void;

  /**
   * 移除原始消息接收回调函数
   *
   * @param listener 要移除的回调函数（必须与注册时的函数引用完全相同）
   */
  offRaw: (listener: (param: Param) => void) => void;

  /**
   * 广播消息
   *
   * 向 Native 发送广播消息
   *
   * @param name 事件名称
   * @param param 事件参数
   */
  broadcast: (name: string, param: Param) => void;

  /**
   * 订阅广播消息
   *
   * 注册指定事件名称的回调函数
   *
   * @param name 事件名称
   * @param listener 事件回调函数
   * 注意：同一个事件可注册多个监听器
   */
  onBroadcast: (name: string, listener: (param: Param) => void) => void;

  /**
   * 取消订阅广播消息
   *
   * 移除指定事件名称的回调函数
   *
   * @param name 事件名称
   * @param listener 要移除的回调函数（必须与注册时的函数引用完全相同）
   */
  offBroadcast: (name: string, listener: (param: Param) => void) => void;

  /**
   * 异步流式监听指定事件名称的广播消息
   *
   * 用法示例：
   *   for await (const params of webnat.listenBroadcast("event")) { ... }
   *
   * @param name 事件名称
   * @returns AsyncIterable<Param> 可异步遍历的事件参数序列
   */
  listenBroadcast: (name: string) => AsyncIterable<Param>;

  /**
   * 调用远端方法
   *
   * @param func 方法描述对象
   * @param func.method 方法名称
   * @param func.param 方法参数
   * @param options 调用选项
   * @param options.timeout 超时时间（毫秒），超时后自动取消并抛出 'Operation Timeout' 错误
   * @param options.onNotification 收到通知消息时的回调函数
   * @param options.signal 可选，AbortSignal，用于主动取消操作；若传入时已是 aborted 状态，Promise 会立即拒绝（cancelled）
   * @returns Promise，resolve 时返回结果，reject 时返回错误
   */
  method: (
    func: {
      method: string;
      param?: Param;
    },
    options?: {
      timeout?: number;
      onNotification?: (param: Param) => void;
      signal?: AbortSignal;
    }
  ) => Promise<Param>;

  /**
   * 注册方法处理函数
   *
   * 用于响应来自 Native 端的方法调用请求
   *
   * @param method 方法名称
   * @param listener 处理回调函数
   * @param listener.param Native 端调用时传递的参数
   * @param listener.signal AbortSignal，当操作被取消时会触发 abort 事件
   * @param listener.notify 通知函数，用于在执行过程中主动向调用方发送通知
   * 注意：同一方法名只允许注册一个处理函数，后注册会覆盖先注册
   */
  onMethod: (
    method: string,
    listener: (
      param: Param,
      signal: AbortSignal,
      notify: (param: Param) => void
    ) => Promise<Param>
  ) => void;

  /**
   * 移除方法处理函数
   *
   * @param method 方法名称
   * @param listener 要移除的处理函数（必须与注册时的函数引用完全相同）
   */
  offMethod: (
    method: string,
    listener: (
      param: Param,
      signal: AbortSignal,
      notify: (param: Param) => void
    ) => Promise<Param>
  ) => void;
}

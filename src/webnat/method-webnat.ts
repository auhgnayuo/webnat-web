/**
 * MethodWebnat - 方法调用消息传递器实现类
 *
 * 实现请求-响应模式的远程方法调用（RPC）机制。
 *
 * 适用场景：
 * - 需要获取返回值的方法调用
 * - 异步操作（如文件读取、网络请求等）
 * - 需要超时控制的场景
 * - 需要主动取消的长时间操作
 *
 * 核心特性：
 * - 支持超时控制
 * - 支持通知机制
 * - 支持 AbortSignal 取消机制
 * - 自动错误传递
 * - 每个调用有唯一 ID，支持并发多个调用
 *
 * 消息格式：使用 Message 协议
 * - 调用请求：包含 invoke 字段
 * - 调用结果：包含 reply 字段
 * - 通知请求：包含 notify 字段
 * - 取消请求：包含 abort 字段
 */

import { getUuid } from '../utils';
import { WebnatError } from './error';
import { Message, Param } from './message';

export class MethodWebnat {
  /**
   * 方法处理函数映射表
   *
   * key: 方法名称
   * value: 方法处理函数
   *
   * 用于处理来自对端的方法调用请求
   *
   * 注意：每个方法名称只能注册一个处理函数
   */
  private listeners: Map<
    string,
    (
      param: Param,
      signal: AbortSignal,
      notify: (param: Param) => void
    ) => Promise<Param>
  > = new Map();

  /**
   * 调用通知回调函数映射表
   *
   * key: 调用 ID
   * value: 通知回调函数
   *
   * 用于在方法调用过程中发送通知
   */
  private onNotifications: Map<string, (param: Param) => void> = new Map();

  /**
   * 调用完成回调函数映射表
   *
   * key: 调用 ID
   * value: 完成回调函数（接收 result 或 error）
   *
   * 用于在收到方法调用结果时 resolve 或 reject 对应的 Promise
   */
  private onCompletes: Map<
    string,
    (result: Param, error: WebnatError | null) => void
  > = new Map();

  /**
   * 调用取消函数映射表
   *
   * key: 调用 ID
   * value: 取消函数
   *
   * 用于主动取消正在执行的方法调用
   */
  private aborts: Map<string, () => void> = new Map();

  /**
   * 构造函数
   *
   * @param id 连接唯一标识符
   * @param sendMessage 发送消息的函数
   */
  constructor(
    private id: string,
    private sendMessage: (message: Message) => void
  ) {
  }

  // ==================== 公共 API ====================

  /**
   * 注册方法处理函数
   *
   * 用于响应对端发起的方法调用请求
   *
   * @param method 方法名称
   * @param listener 处理回调函数
   * @param listener.param Native 端调用时传递的参数
   * @param listener.signal AbortSignal，当操作被取消时会触发 abort 事件
   * @param listener.notify 通知函数，用于在执行过程中主动向调用方发送通知
   * 注意：同一方法名只允许注册一个处理函数，后注册会覆盖先注册
   */
  on(
    method: string,
    listener: (
      param: Param,
      signal: AbortSignal,
      notify: (param: Param) => void
    ) => Promise<Param>
  ) {
    this.listeners.set(method, listener);
  }

  /**
   * 移除方法处理函数
   *
   * @param method 方法名称
   * @param listener 要移除的处理函数（必须与注册时的函数引用完全相同）
   */
  off(
    method: string,
    listener: (
      param: Param,
      signal: AbortSignal,
      notify: (param: Param) => void
    ) => Promise<Param>
  ) {
    if (listener === this.listeners.get(method)) {
      this.listeners.delete(method);
    }
  }

  /**
   * 调用远端方法
   *
   * 发送方法调用请求并等待结果返回。支持超时控制、主动取消和通知机制。
   *
   * @param func 方法描述对象
   * @param func.method 方法名称
   * @param func.param 方法参数（可选）
   * @param options 调用选项
   * @param options.timeout 超时时间（毫秒），超时后自动取消并抛出 'Operation Timeout' 错误
   * @param options.onNotification 收到通知消息时的回调函数
   * @param options.signal 可选，AbortSignal，用于主动取消操作
   * @returns Promise<Param>，resolve 时返回结果，reject 时返回错误
   */
  async method(
    func: {
      method: string;
      param?: Param;
    },
    options?: {
      timeout?: number;
      onNotification?: (param: Param) => void;
      signal?: AbortSignal;
    }
  ): Promise<Param> {
    // 生成唯一调用 ID
    const id = getUuid();

    const cancelAbort = (() => {
      const signal = options?.signal;
      if (!signal) {
        return () => { };
      }
      // 定义取消函数
      const abort = () => {
        // 触发完成回调函数，返回取消错误
        const onComplete = this.onCompletes.get(id);
        if (!onComplete) {
          return;
        }
        onComplete(null, WebnatError.cancelled());
        // 超时后发送取消请求
        const abortMessage = Message.abort(this.id, id);
        this.sendMessage(abortMessage);
      };
      signal.addEventListener('abort', abort);
      return () => {
        signal.removeEventListener('abort', abort);
      };
    })();

    const cancelTimeout = (() => {
      const timeout = options?.timeout;
      if (!timeout || timeout <= 0) {
        return () => { };
      }
      const timer = setTimeout(() => {
        // 触发完成回调函数，返回超时错误
        const onComplete = this.onCompletes.get(id);
        if (!onComplete) {
          return;
        }
        onComplete(null, WebnatError.timeout());
        // 超时后发送取消请求
        const abortMessage = Message.abort(this.id, id);
        this.sendMessage(abortMessage);
      }, timeout);
      return () => {
        clearTimeout(timer);
      };
    })();

    const cancelOnNotification = (() => {
      const onNotification = options?.onNotification;
      if (!onNotification) {
        return () => { };
      }
      this.onNotifications.set(id, onNotification);
      return () => {
        this.onNotifications.delete(id);
      };
    })();

    try {
      // 发送方法调用请求
      const invokeMessage = Message.invoke(this.id, id, func.method, func.param);
      this.sendMessage(invokeMessage);
      // 等待方法执行结果
      return await new Promise((resolve, reject) => {
        this.onCompletes.set(id, (result: Param, error: WebnatError | null) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      });
    } finally {
      // 清理资源
      this.onCompletes.delete(id);
      cancelOnNotification();
      cancelTimeout();
      cancelAbort();
    }
  }

  // ==================== 消息接收 ====================

  /**
   * 接收消息
   *
   * 处理四种类型的方法消息：
   * 1. INVOKE：执行方法调用请求
   * 2. REPLY：接收方法调用结果
   * 3. NOTIFY：接收通知消息
   * 4. ABORT：取消方法调用
   *
   * @param message Message 对象，必须包含 invoke、reply、notify 或 abort 字段之一
   */
  receive = async (message: Message): Promise<void> => {
    if (message.reply) {
      // 处理方法调用结果
      const { id, result, error } = message.reply;
      const onComplete = this.onCompletes.get(id);
      if (onComplete) {
        onComplete(result ?? null, WebnatError.from(error));
      }
      return;
    }
    if (message.abort) {
      // 处理取消请求
      const { id } = message.abort;
      this.aborts.get(id)?.();
      return;
    }

    if (message.notify) {
      // 处理通知请求
      const { id, param } = message.notify;
      const onNotification = this.onNotifications.get(id);
      if (onNotification) {
        onNotification(param ?? null);
      }
      return;
    }

    if (message.invoke) {
      // 处理方法调用请求
      const { id, method, param } = message.invoke;
      if (!id || typeof id !== 'string') {
        throw new Error(`Invalid method message: call ID must be string, got ${typeof id}`);
      }

      let isCompleted = { value: false };

      // 创建 AbortController 以支持取消操作
      const abortController = new AbortController();
      this.aborts.set(id, () => {
        if (isCompleted.value) {
          return;
        }
        abortController.abort();
      });
      // 通知函数
      const notify = (param: Param) => {
        if (isCompleted.value) {
          return;
        }
        const notifyMessage = Message.notify(this.id, id, param);
        this.sendMessage(notifyMessage);
      };
      try {
        if (!method || typeof method !== 'string') {
          throw WebnatError.unimplemented(method);
        }
        const listener = this.listeners.get(method);
        if (!listener) {
          throw WebnatError.unimplemented(method);
        }

        // 执行方法处理函数
        const result = await listener(
          param ?? null,
          abortController.signal,
          notify
        );

        // 如果未完成
        if (!isCompleted.value) {
          const replyMessage = Message.reply(this.id, id, result, undefined);
          this.sendMessage(replyMessage);
        }
      } catch (error) {
        // 如果未完成
        if (!isCompleted.value) {
          const errorParam = WebnatError.from(error);
          const replyMessage = Message.reply(this.id, id, undefined, errorParam ? { code: errorParam.code, message: errorParam.message } : undefined);
          this.sendMessage(replyMessage);
        }
      } finally {
        // 清理取消函数
        isCompleted.value = true;
        this.aborts.delete(id);
      }
    }
  };

  // ==================== 生命周期方法 ====================

  /**
   * 卸载消息处理器
   *
   * 清理所有资源：
   * 1. 通知所有等待结果的调用：连接已关闭
   * 2. 取消所有正在执行的方法处理
   * 3. 清理所有映射表
   */
  unload = () => {
    // 通知所有等待结果的调用：连接已关闭
    const onCompletes = Array.from(this.onCompletes.values());
    onCompletes.forEach(onComplete => {
      onComplete(null, WebnatError.closed());
    });

    // 取消所有正在执行的方法处理
    const aborts = Array.from(this.aborts.values());
    aborts.forEach(abort => abort());

    // 清理所有映射表
    this.onCompletes.clear();
    this.onNotifications.clear();
    this.aborts.clear();
    this.listeners.clear();
  };
}

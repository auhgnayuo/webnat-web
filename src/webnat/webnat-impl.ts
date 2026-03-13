/**
 * WebnatImpl - Webnat 门面实现类
 *
 * 统一整合原始消息、广播消息与方法调用等多种 Webnat 能力的门面（Facade）类。
 */

import { BroadcastWebnat } from './broadcast-webnat';
import { Message, Param } from './message';
import { MethodWebnat } from './method-webnat';
import { RawWebnat } from './raw-webnat';
import { Webnat } from './webnat';
import { getUuid, getWindow, getWindowAsAny } from '../util';

export class WebnatImpl implements Webnat {
  /**
   * 连接唯一标识符
   * 用于区分不同的连接实例（mainframe或各个 iframe）
   */
  readonly id = getUuid();

  /** 原始消息传递器实例 */
  private rawWebnat: RawWebnat = new RawWebnat(this.id, (message: Message) => {
    this.sendMessage(message);
  });

  /** 广播消息传递器实例 */
  private broadcastWebnat: BroadcastWebnat = new BroadcastWebnat(
    this.id,
    (message: Message) => {
      this.sendMessage(message);
    }
  );

  /** 方法调用消息传递器实例 */
  private methodWebnat: MethodWebnat = new MethodWebnat(this.id, (message: Message) => {
    this.sendMessage(message);
  });

  /**
   * iframe 消息转发映射表
   *
   * key: iframe 的连接 ID
   * value: 向该 iframe 发送消息的函数（通过 postMessage）
   *
   * 仅 mainframe 维护，用于将 Native 消息转发到目标 iframe。
   * 当 iframe 发送 OPEN 消息时注册，发送 CLOSE 消息时移除。
   */
  private transmits: Map<string, (message: Message) => void> = new Map();

  constructor() {
    this.load();
  }

  // ==================== 原始消息 API ====================

  /**
   * 注册原始消息接收回调函数
   *
   * 用于接收来自对端的原始消息
   *
   * @param listener 消息接收回调函数
   * 注意：同一个回调函数重复注册只会生效一次
   */
  onRaw(listener: (param: Param) => void): void {
    return this.rawWebnat.on(listener);
  }

  /**
   * 移除原始消息接收回调函数
   *
   * @param listener 要移除的回调函数（必须与注册时的函数引用完全相同）
   */
  offRaw(listener: (param: Param) => void): void {
    return this.rawWebnat.off(listener);
  }

  /**
   * 发送原始消息
   *
   * @param param 消息体，可以是任意可序列化的数据（Param 类型）
   * @param options 选项
   */
  raw(param: Param): void {
    this.rawWebnat.raw(param);
  }

  // ==================== 广播消息 API ====================

  /**
   * 订阅广播消息
   *
   * 注册指定事件名称的回调函数
   *
   * @param name 事件名称
   * @param listener 事件回调函数
   * 注意：同一个事件可注册多个监听器
   */
  onBroadcast(name: string, listener: (param: Param) => void): void {
    return this.broadcastWebnat.on(name, listener);
  }

  /**
   * 取消订阅广播消息
   *
   * 移除指定事件名称的回调函数
   *
   * @param name 事件名称
   * @param listener 要移除的回调函数（必须与注册时的函数引用完全相同）
   */
  offBroadcast(name: string, listener: (param: Param) => void): void {
    return this.broadcastWebnat.off(name, listener);
  }

  /**
   * 异步流式监听指定事件名称的广播消息
   *
   * 用法示例：
   *   for await (const param of webnat.listenBroadcast("event")) { ... }
   *
   * @param name 事件名称
   * @returns AsyncIterable<Param> 可异步遍历的事件参数序列
   */
  listenBroadcast(name: string): AsyncIterable<Param> {
    return this.broadcastWebnat.listen(name);
  }

  /**
   * 广播消息
   *
   * 向 Native 发送广播消息
   *
   * @param name 事件名称
   * @param param 事件参数
   */
  broadcast(name: string, param: Param): void {
    this.broadcastWebnat.broadcast(name, param);
  }

  // ==================== 方法调用 API ====================

  /**
   * 注册方法处理函数
   *
   * 用于响应 Native 端发起的方法调用请求
   *
   * @param method 方法名称
   * @param listener 处理回调函数
   * @param listener.param 对端调用时传递的参数
   * @param listener.signal AbortSignal，当操作被取消时会触发 abort 事件
   * @param listener.notify 通知函数，用于在执行过程中主动向调用方发送通知
   * 注意：同一方法名只允许注册一个处理函数，后注册会覆盖先注册
   */
  onMethod(
    method: string,
    listener: (
      param: Param,
      signal: AbortSignal,
      notify: (param: Param) => void
    ) => Promise<Param>
  ) {
    return this.methodWebnat.on(method, listener);
  }

  /**
   * 移除方法处理函数
   *
   * @param method 方法名称
   * @param listener 要移除的处理函数（必须与注册时的函数引用完全相同）
   */
  offMethod(
    method: string,
    listener: (
      param: Param,
      signal: AbortSignal,
      notify: (param: Param) => void
    ) => Promise<Param>
  ) {
    return this.methodWebnat.off(method, listener);
  }

  /**
   * 调用远端方法
   *
   * @param func 方法描述对象
   * @param func.method 方法名称
   * @param func.param 方法参数
   * @param options 调用选项
   * @param options.timeout 超时时间（毫秒），超时后自动取消并抛出 'Operation Timeout' 错误
   * @param options.onNotification 收到通知消息时的回调函数
   * @param options.signal 可选，AbortSignal，用于主动取消操作
   * @returns Promise，resolve 时返回结果，reject 时返回错误
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
    return this.methodWebnat.method(func, options);
  }

  // ==================== 消息接收 ====================

  /**
   * 接收来自 Native 的消息
   *
   * 仅供 mainframe 调用，用于接收 Native 发送的消息块（可能包含多条消息）。
   * 消息块会被 MessageReceiver 按换行符分割并解码，然后分发到目标连接。
   *
   * @throws {Error} 如果非 mainframe 调用此方法，会抛出错误
   */
  receive = (message: Message) => {
    try {
      if (!this.isMainframe()) {
        throw new Error(`Only mainframe can receive messages from Native`);
      }
      // 验证消息魔数
      if (message.magic !== Message.MAGIC) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Invalid message magic, expected '${Message.MAGIC}', got '${message.magic}'`);
        }
        return;
      }
      if (message.to === this.id) {
        this.rawWebnat.receive(message);
        this.broadcastWebnat.receive(message);
        this.methodWebnat.receive(message);
      }else {
        const transmit = this.transmits.get(message.to);
        if (transmit) {
          transmit(message);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
    }
  };

  // ==================== 生命周期方法 ====================

  /**
   * 加载连接
   *
   * 初始化事件监听并建立与 Native 的连接：
   * 1. 注册 unload 事件监听器（页面卸载时清理）
   * 2. 注册 message 事件监听器（处理来自 iframe/mainframe 的消息）
   * 3. 发送 OPEN 消息通知 Native 端连接已建立
   */
  private load = () => {
    getWindow().addEventListener('unload', this.unload);
    getWindow().addEventListener('message', this.onEvent);

    // 通知 Native 端连接已建立
    const message = Message.open(this.id, { origin: getWindow().location.origin, isMainframe: this.isMainframe() });
    this.sendMessage(message);
  };

  /**
   * 卸载连接
   *
   * 页面卸载时调用，清理资源并通知 Native 端连接关闭：
   * 1. 移除事件监听器
   * 2. 如果是 mainframe，代理通知 Native 所有 iframe 连接已关闭
   * 3. 通知 Native 当前连接已关闭（立即发送）
   * 4. 清理各个消息处理器的资源
   */
  private unload = () => {
    // 移除事件回调函数
    getWindow().removeEventListener('unload', this.unload);
    getWindow().removeEventListener('message', this.onEvent);

    this.transmits.forEach((_, id) => {
      const message = Message.close(id);
      this.sendMessage(message);
    });
    // 通知 Native 当前连接已关闭（立即发送，不等待定时器）
    const message = Message.close(this.id);
    this.sendMessage(message);
    // 清理各个消息处理器的资源
    this.methodWebnat.unload();
    this.broadcastWebnat.unload();
    this.rawWebnat.unload();
  };

  // ==================== 私有辅助方法 ====================

  /**
   * 判断当前窗口是否为 mainframe
   *
   * 首次调用时判断环境并缓存结果，后续调用直接返回缓存值
   *
   * @returns true 表示 mainframe，false 表示 iframe
   */
  private isMainframe = (): boolean => {
    // 首次调用时判断环境并重写自身
    const result = getWindow().self === getWindow().top;
    this.isMainframe = () => result;
    return result;
  };

  /**
   * 消息事件处理函数
   *
   * 处理 Web 端收到的 postMessage 事件，支持两种消息格式：
   * 1. 字符串格式：JSON 字符串（来自 Native）
   * 2. 对象格式：通过 postMessage 发送的 Message 对象
   *
   * 根据当前环境（mainframe 或 iframe）进行不同处理：
   *
   * **mainframe 处理来自 iframe 的消息**：
   * - OPEN 动作：注册 iframe 的消息转发函数到 transmits 映射表
   * - CLOSE 动作：从 transmits 映射表移除 iframe 的消息转发函数
   * - 其他动作：原样转发给 Native（通过 sender）
   *
   * **iframe 处理来自 mainframe 的消息**：
   * - 验证消息目标是否为当前连接（message.to === this.id）
   * - 如果是，分发给 rawWebnat、broadcastWebnat、methodWebnat
   * - 如果不是，忽略（可能是其他 iframe 的消息）
   *
   * @param event MessageEvent 事件对象，包含消息数据
   */
  private onEvent = (event: any) => {
    try {
      let message: Message;
      if (
        event.data &&
        typeof event.data === 'object' &&
        typeof event.data.from === 'string' &&
        typeof event.data.to === 'string' &&
        event.data.magic === Message.MAGIC
      ) {
        // Message 对象（通过 postMessage 发送）
        // 已通过 magic 验证
        message = event.data as Message;
      } else {
        // 不是有效的消息格式，忽略
        return;
      }

      if (this.isMainframe()) {
        // mainframe 处理来自 iframe 的消息
        const { from, to } = message;
        if (to === Message.NATIVE_UUID) {
          if (message.open) {
            // 注册 iframe 的消息转发函数
            const source = event.source;
            this.transmits.set(from, (message: Message) => {
              source.postMessage(message, '*');
            });
          } else if (message.close) {
            // 移除 iframe 的消息转发函数
            this.transmits.delete(from);
          }
          this.sendMessage(message);
        }
      } else {
        // iframe 处理来自 mainframe 的消息
        // 验证消息目标是否为当前连接
        if (message.to === this.id) {
          // 当前连接是目标，分发给各个消息处理器
          try {
            this.rawWebnat.receive(message);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(error);
            }
          }
          try {
            this.broadcastWebnat.receive(message);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(error);
            }
          }
          try {
            this.methodWebnat.receive(message);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(error);
            }
          }
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
    }
  };

  /**
   * 发送消息
   *
   * 根据当前环境选择发送方式：
   * - mainframe：通过 sender 发送给 Native（支持批量发送和立即发送）
   * - iframe：通过 postMessage 发送给 mainframe，由 mainframe 转发给 Native
   *
   * @param message 消息对象
   */
  private sendMessage = (message: Message) => {
    if (this.isMainframe()) {
      // mainframe 直接发送给 Native
      this.sendMessageToNative(message);
    } else {
      // iframe 通过 postMessage 发送给 mainframe 转发
      getWindow().top?.postMessage(message, '*');
    }
  };

  /**
   * 发送消息给 Native
   *
   * 首次调用时根据平台检测并缓存 handler，后续直接调用（性能优化）。
   * 使用自重写模式（self-rewriting）避免每次调用都进行平台检测。
   *
   * 支持平台：
   * - iOS/macOS: window.webkit.messageHandlers.__native_webnat__.postMessage
   *   - 直接传递对象（Message 对象）
   * - Android/HarmonyOS: window.__native_webnat__.postMessage
   *   - 需要传递 JSON 字符串，Native 端需要手动解析
   *
   * @param message 消息对象（iOS 直接传递对象，Android 传递 JSON 字符串）
   * @throws {Error} 不支持的平台时抛出错误
   */
  private sendMessageToNative = (message: Message) => {
    const win = getWindowAsAny();
    let handler: ((message: Message) => void) | null = null;
    if (win.webkit?.messageHandlers?.__native_webnat__?.postMessage) {
      // iOS/macOS 平台：直接传递对象
      const iosHandler = win.webkit.messageHandlers.__native_webnat__;
      handler = (message: Message) => iosHandler.postMessage(message);
    } else if (win.__native_webnat__?.postMessage) {
      // Android/HarmonyOS 平台：需要传递 JSON 字符串
      const androidHandler = win.__native_webnat__;
      handler = (message: Message) => androidHandler.postMessage(JSON.stringify(message));
    }
    if (handler) {
      // 检测到可用平台后，重写自身为直接调用（避免后续的平台检测）
      this.sendMessageToNative = (message: Message) =>
        handler!(message);
    } else {
      // 未检测到可用平台，重写自身为抛出错误
      this.sendMessageToNative = (_: Message) => {
        throw new Error(`Unsupported platform: unable to find Native handler`);
      };
    }
    this.sendMessageToNative(message);
  };
}

/**
 * BroadcastWebnat - 广播消息传递器实现类
 *
 * 实现发布-订阅模式的消息传递机制
 *
 * 消息格式：使用 Message 协议，包含 broadcast 字段
 */

import { Message, Param } from './message';

export class BroadcastWebnat {
  /**
   * 广播事件回调函数映射表
   *
   * key: 广播事件名称
   * value: 该事件的回调函数数组
   */
  private listeners: Map<string, ((param: Param) => void)[]> = new Map();
  
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
   * 订阅广播消息
   *
   * 注册指定事件名称的回调函数
   *
   * @param name 事件名称
   * @param listener 事件回调函数
   * 注意：同一个事件可注册多个监听器
   */
  on = (name: string, listener: (param: Param) => void) => {
    const listeners = this.listeners.get(name);
    if (!listeners) {
      // 首次订阅该事件，创建新的回调函数数组
      this.listeners.set(name, [listener]);
    } else {
      // 如果已存在，先移除再添加（防止重复注册）
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      listeners.push(listener);
    }
  };

  /**
   * 取消订阅广播消息
   *
   * 移除指定事件名称的回调函数
   *
   * @param name 事件名称
   * @param listener 要移除的回调函数（必须与注册时的函数引用完全相同）
   */
  off = (name: string, listener: (param: Param) => void) => {
    const listeners = this.listeners.get(name);
    if (listeners) {
      const filteredListeners = listeners.filter(item => item !== listener);
      if (filteredListeners.length === 0) {
        // 没有订阅者了，删除该事件的映射
        this.listeners.delete(name);
      } else {
        // 还有其他订阅者，更新回调函数数组
        this.listeners.set(name, filteredListeners);
      }
    }
  };

  /**
   * 异步流式监听指定事件名称的广播消息
   *
   * 使用异步生成器实现流式监听，支持无限循环接收事件。
   * 当循环退出时（break/return），会自动取消监听。
   *
   * 用法示例：
   *   for await (const param of broadcastWebnat.listen("event")) { ... }
   *
   * @param name 事件名称
   * @returns AsyncIterable<Param> 可异步遍历的事件参数序列
   */
  async *listen(name: string): AsyncIterable<Param> {
    const queue: Param[] = [];
    let wake: (() => void) | null = null;

    const listener = (param: Param) => {
      queue.push(param);
      if (wake) {
        const fn = wake;
        wake = null;
        fn();
      }
    };

    // 注册监听器
    this.on(name, listener);

    try {
      while (true) {
        // 队列里有事件就立即 yield
        if (queue.length > 0) {
          yield queue.shift()!;
          continue;
        }

        // 队列为空，等待下一个事件到来
        await new Promise<void>(resolve => {
          wake = resolve;
          // 在设置 wake 之后再次检查队列，防止竞态条件
          // 如果事件在检查队列和创建 Promise 之间到达，立即 resolve
          if (queue.length > 0) {
            wake = null;
            resolve();
          }
        });
      }
    } finally {
      // 循环退出时自动取消监听
      this.off(name, listener);
    }
  }

  /**
   * 广播消息
   *
   * 向 Native 发送广播消息
   *
   * @param name 事件名称
   * @param param 事件参数
   */
  broadcast = (name: string, param: Param): void => {
    const message = Message.broadcast(this.id, name, param);
    this.sendMessage(message);
  };

  // ==================== 消息接收 ====================

  /**
   * 接收消息
   *
   * 从 Message 对象中提取广播消息，并根据事件名称分发给对应的订阅者。
   *
   * @param message Message 对象，必须包含 broadcast 字段
   */
  receive = (message: Message): void => {
    if (!message.broadcast) {
      return;
    }
    const name = message.broadcast.name;
    const param = message.broadcast.param ?? null;
    if (!name || typeof name !== 'string') {
      throw new Error(`Invalid broadcast name: expected string, got ${typeof name}`);
    }
    // 触发该事件名称的所有回调函数
    const listeners = this.listeners.get(name);
    if (listeners) {
      // 创建快照，避免回调函数中修改列表导致的问题
      const snapshot = listeners.slice();
      snapshot.forEach(listener => {
        try {
          listener(param);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(error);
          }
        }
      });
    }
  };
  
  // ==================== 生命周期方法 ====================

  /**
   * 卸载消息处理器
   *
   */
  unload = () => {
  };
}

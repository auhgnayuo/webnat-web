/**
 * RawWebnat - 原始消息传递器实现类
 *
 * 提供最基础的消息发送和接收功能，不做任何额外处理。
 *
 * 适用场景：
 * - 简单的数据传输
 * - 不需要消息分类的场景
 * - 自定义消息格式的场景
 *
 * 消息格式：使用 Message 协议，包含 raw 字段
 */

import { Message, Param } from './message';

export class RawWebnat {
  /** 原始消息接收回调函数列表 */
  private listeners: ((param: Param) => void)[] = [];

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
   * 注册原始消息接收回调函数
   *
   * 用于接收来自 Native 端的原始消息
   *
   * @param listener 消息接收回调函数
   * 注意：同一个回调函数重复注册只会生效一次
   */
  on = (listener: (param: Param) => void) => {
    // 如果已存在，先移除再添加（防止重复注册）
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
    this.listeners.push(listener);
  };

  /**
   * 移除原始消息接收回调函数
   *
   * @param listener 要移除的回调函数（必须与注册时的函数引用完全相同）
   */
  off = (listener: (param: Param) => void) => {
    this.listeners = this.listeners.filter(item => item !== listener);
  };

  /**
   * 发送原始消息
   *
   * @param param 消息体，可以是任意可序列化的数据（Param 类型）
   */
  raw = (param: Param): void => {
    const message = Message.raw(this.id, param);
    this.sendMessage(message);
  };

  // ==================== 消息接收 ====================

  /**
   * 接收消息
   *
   * 从 Message 对象中提取原始消息并分发给所有回调函数。
   *
   * @param message Message 对象，必须包含 raw 字段
   */
  receive = (message: Message): void => {
    if (!message.raw) {
      return;
    }
    const param = message.raw.param ?? null;
    // 创建快照，避免回调函数中修改列表导致的问题
    const snapshot = this.listeners.slice();
    snapshot.forEach(listener => {
      try {
        listener(param);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(error);
        }
      }
    });
  };

  // ==================== 生命周期方法 ====================

  /**
   * 卸载消息处理器
   *
   */
  unload = () => {
  };
}

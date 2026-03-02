/**
 * 参数类型
 * 
 * 支持可序列化的数据类型，包括：
 * - 基本类型：string、number、boolean、null
 * - 数组：Param[]
 * - 对象：{ [key: string]: Param }
 * 
 * 用于消息的参数传递，支持嵌套结构
 */
export type Param =
  | string
  | number
  | boolean
  | null
  | Param[]
  | { [key: string]: Param };

/**
 * 连接打开消息
 * 
 * 用于建立连接时的初始化消息，可以携带初始化参数
 */
export interface Open {
  /** 可选的初始化参数 */
  readonly param?: Param;
}

/**
 * 连接打开消息类
 * 
 * 用于创建连接打开消息实例
 */
export class Open implements Open {
  /**
   * @param param 可选的初始化参数
   */
  constructor(public readonly param?: Param) { }
}

/**
 * 连接关闭消息
 * 
 * 用于关闭连接时的消息，可以携带关闭原因等参数
 */
export interface Close {
  /** 可选的关闭参数（如关闭原因等） */
  readonly param?: Param;
}

/**
 * 连接关闭消息类
 * 
 * 用于创建连接关闭消息实例
 */
export class Close implements Close {
  /**
   * @param param 可选的关闭参数（如关闭原因等）
   */
  constructor(public readonly param?: Param) { }
}

/**
 * 原始消息
 * 
 * 用于发送任意原始数据，不经过任何特殊处理
 */
export interface Raw {
  /** 原始消息的参数数据 */
  readonly param?: Param;
}

/**
 * 原始消息类
 * 
 * 用于创建原始消息实例
 */
export class Raw implements Raw {
  /**
   * @param param 原始消息的参数数据
   */
  constructor(public readonly param?: Param) { }
}

/**
 * 广播消息
 * 
 * 用于向所有订阅者发送事件通知，支持事件名称和参数
 */
export interface Broadcast {
  /** 广播事件名称 */
  readonly name: string;
  /** 广播事件的参数数据 */
  readonly param?: Param;
}

/**
 * 广播消息类
 * 
 * 用于创建广播消息实例
 */
export class Broadcast implements Broadcast {
  /**
   * @param name 广播事件名称
   * @param param 广播事件的参数数据
   */
  constructor(public readonly name: string, public readonly param?: Param) { }
}

/**
 * 方法调用消息
 * 
 * 用于远程方法调用（RPC），包含调用 ID、方法名和参数
 */
export interface Invoke {
  /** 调用 ID，用于匹配请求和响应 */
  readonly id: string;
  /** 要调用的方法名称 */
  readonly method: string;
  /** 方法调用的参数 */
  readonly param?: Param;
}

/**
 * 方法调用消息类
 * 
 * 用于创建方法调用消息实例
 */
export class Invoke implements Invoke {
  /**
   * @param id 调用 ID，用于匹配请求和响应
   * @param method 要调用的方法名称
   * @param param 方法调用的参数
   */
  constructor(public readonly id: string, public readonly method: string, public readonly param?: Param) { }
}

/**
 * 方法调用响应消息
 * 
 * 用于返回方法调用的结果或错误，包含调用 ID、结果或错误信息
 */
export interface Reply {
  /** 调用 ID，用于匹配对应的请求 */
  readonly id: string;
  /** 方法调用的成功结果（与 error 互斥） */
  readonly result?: Param;
  /** 方法调用的错误信息（与 result 互斥） */
  readonly error?: Param;
}

/**
 * 方法调用响应消息类
 * 
 * 用于创建方法调用响应消息实例
 */
export class Reply implements Reply {
  /**
   * @param id 调用 ID，用于匹配对应的请求
   * @param result 方法调用的成功结果（与 error 互斥）
   * @param error 方法调用的错误信息（与 result 互斥）
   */
  constructor(public readonly id: string, public readonly result?: Param, public readonly error?: Param) { }
}

/**
 * 通知消息
 * 
 * 用于在方法调用执行过程中向调用方发送进度通知或中间结果
 */
export interface Notify {
  /** 调用 ID，用于匹配对应的请求 */
  readonly id: string;
  /** 通知的参数数据 */
  readonly param?: Param;
}

/**
 * 通知消息类
 * 
 * 用于创建通知消息实例
 */
export class Notify implements Notify {
  /**
   * @param id 调用 ID，用于匹配对应的请求
   * @param param 通知的参数数据
   */
  constructor(public readonly id: string, public readonly param?: Param) { }
}

/**
 * 中止消息
 * 
 * 用于取消正在执行的方法调用
 */
export interface Abort {
  /** 调用 ID，用于匹配要取消的请求 */
  readonly id: string;
}

/**
 * 中止消息类
 * 
 * 用于创建中止消息实例
 */
export class Abort implements Abort {
  /**
   * @param id 调用 ID，用于匹配要取消的请求
   */
  constructor(public readonly id: string) { }
}

/**
 * 消息接口
 * 
 * 所有消息的统一格式，包含发送方、接收方和具体的消息类型
 * 消息类型是互斥的，一条消息只能包含一种类型的消息体
 */
export interface Message {
  /** 消息魔数 */
  readonly magic: string;
  /** 消息发送方的标识 */
  readonly from: string;
  /** 消息接收方的标识 */
  readonly to: string;
  /** 连接打开消息（与其他消息类型互斥） */
  readonly open?: Open;
  /** 连接关闭消息（与其他消息类型互斥） */
  readonly close?: Close;
  /** 原始消息（与其他消息类型互斥） */
  readonly raw?: Raw;
  /** 广播消息（与其他消息类型互斥） */
  readonly broadcast?: Broadcast;
  /** 方法调用消息（与其他消息类型互斥） */
  readonly invoke?: Invoke;
  /** 方法调用响应消息（与其他消息类型互斥） */
  readonly reply?: Reply;
  /** 通知消息（与其他消息类型互斥） */
  readonly notify?: Notify;
  /** 中止消息（与其他消息类型互斥） */
  readonly abort?: Abort;
}

/**
 * 消息类
 * 
 * 用于创建消息实例
 * 所有消息都包含发送方（from）和接收方（to）标识，以及一种具体的消息类型
 */
export class Message implements Message {
  /** Native 端的 UUID 标识符 */
  static readonly NATIVE_UUID = '00000000-0000-0000-0000-000000000000';
  /** 消息魔数常量 */
  static readonly MAGIC = 'WEBNAT';
  
  /** 消息魔数 */
  public readonly magic: string = Message.MAGIC;
  
  /**
   * @param from 消息发送方的标识
   * @param to 消息接收方的标识
   * @param open 连接打开消息（与其他消息类型互斥）
   * @param close 连接关闭消息（与其他消息类型互斥）
   * @param raw 原始消息（与其他消息类型互斥）
   * @param broadcast 广播消息（与其他消息类型互斥）
   * @param invoke 方法调用消息（与其他消息类型互斥）
   * @param reply 方法调用响应消息（与其他消息类型互斥）
   * @param notify 通知消息（与其他消息类型互斥）
   * @param abort 中止消息（与其他消息类型互斥）
   */
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly open?: Open,
    public readonly close?: Close,
    public readonly raw?: Raw,
    public readonly broadcast?: Broadcast,
    public readonly invoke?: Invoke,
    public readonly reply?: Reply,
    public readonly notify?: Notify,
    public readonly abort?: Abort
  ) {
    // magic 字段在类属性中已初始化为 Message.MAGIC
  }

  // ==================== 连接管理 ====================

  /**
   * 创建连接打开消息
   * 
   * @param from 发送方标识
   * @param param 可选的初始化参数
   * @returns Message 实例
   */
  static open(from: string, param?: Param): Message {
    return new Message(from, Message.NATIVE_UUID, new Open(param));
  }

  /**
   * 创建连接关闭消息
   * 
   * @param from 发送方标识
   * @param param 可选的关闭参数
   * @returns Message 实例
   */
  static close(from: string, param?: Param): Message {
    return new Message(from, Message.NATIVE_UUID, undefined, new Close(param));
  }

  // ==================== 基础消息 ====================

  /**
   * 创建原始消息
   * 
   * @param from 发送方标识
   * @param param 原始消息的参数数据
   * @returns Message 实例
   */
  static raw(from: string, param?: Param): Message {
    return new Message(from, Message.NATIVE_UUID, undefined, undefined, new Raw(param));
  }

  /**
   * 创建广播消息
   * 
   * @param from 发送方标识
   * @param name 广播事件名称
   * @param param 广播事件的参数数据
   * @returns Message 实例
   */
  static broadcast(from: string, name: string, param?: Param): Message {
    return new Message(from, Message.NATIVE_UUID, undefined, undefined, undefined, new Broadcast(name, param));
  }

  // ==================== 方法调用 ====================

  /**
   * 创建方法调用消息
   * 
   * @param from 发送方标识
   * @param id 调用 ID
   * @param method 方法名称
   * @param param 方法参数
   * @returns Message 实例
   */
  static invoke(from: string, id: string, method: string, param?: Param): Message {
    return new Message(from, Message.NATIVE_UUID, undefined, undefined, undefined, undefined, new Invoke(id, method, param));
  }

  /**
   * 创建方法调用响应消息
   * 
   * @param from 发送方标识
   * @param id 调用 ID
   * @param result 成功结果（与 error 互斥）
   * @param error 错误信息（与 result 互斥）
   * @returns Message 实例
   */
  static reply(from: string, id: string, result?: Param, error?: Param): Message {
    return new Message(from, Message.NATIVE_UUID, undefined, undefined, undefined, undefined, undefined, new Reply(id, result, error));
  }

  /**
   * 创建通知消息
   * 
   * @param from 发送方标识
   * @param id 调用 ID
   * @param param 通知的参数数据
   * @returns Message 实例
   */
  static notify(from: string, id: string, param?: Param): Message {
    return new Message(from, Message.NATIVE_UUID, undefined, undefined, undefined, undefined, undefined, undefined, new Notify(id, param));
  }

  /**
   * 创建中止消息
   * 
   * @param from 发送方标识
   * @param id 调用 ID
   * @returns Message 实例
   */
  static abort(from: string, id: string): Message {
    return new Message(from, Message.NATIVE_UUID, undefined, undefined, undefined, undefined, undefined, undefined, undefined, new Abort(id));
  }

}

/**
 * WebnatErrorCode 枚举
 * 
 * 定义 Webnat 内置错误码。
 * 负数表示系统级、通用错误码，保证与业务自定义 code 不冲突。
 */
export enum WebnatErrorCode {
    /** 未知错误 */
    UNKNOWN = -1,
    /** 操作被取消 */
    CANCELLED = -999,
    /** 超时 */
    TIMEOUT = -1001,
    /** 连接已关闭 */
    CLOSED = -1004,
    /** 方法未实现 */
    UNIMPLEMENTED = -1010,
    /** 消息反序列化失败 */
    DESERIALIZATION_FAILED = -1011,
    /** 消息序列化失败 */
    SERIALIZATION_FAILED = -1012,
}

export interface WebnatError {
    readonly code: number;
    readonly message: string;
}

/**
 * WebnatError 类
 * 
 * 表示 Webnat 协议内的标准错误对象，包含错误码和错误消息。
 */
export class WebnatError implements WebnatError {
    constructor(public readonly code: number, public readonly message: string) { }
    /**
     * 从任意 error 对象转为 WebnatError 实例。
     * 如果提供的 error 对象有 code，则使用对应 code，否则返回 UNKNOWN。
     * @param error 任意异常对象
     * @returns WebnatError
     */
    static from(error: any): WebnatError | null {
        if (error === null || error === undefined) {
            return null;
        }
        if (typeof error === 'object') {
            const code = (() => {
                const v = error.code;
                if (!v) {
                    return WebnatErrorCode.UNKNOWN;
                }
                if (typeof v === 'number') {
                    return v;
                }
                try {
                    const c = parseInt(v as string);
                    if (!isFinite(c)) {
                        return WebnatErrorCode.UNKNOWN;
                    }
                    return c;
                } catch (_) {
                    return WebnatErrorCode.UNKNOWN;
                }
            })();
            const message = (() => {
                const v = error.message;
                if (!v) {
                    return 'Unknown Error';
                }
                if (typeof v === 'string') {
                    return v;
                }
                return `${v}`;
            })();
            return new WebnatError(code, message);
        }
        return new WebnatError(WebnatErrorCode.UNKNOWN, `${error}`);
    }

    /**
     * 常用错误工厂：超时
     */
    static timeout(): WebnatError {
        return new WebnatError(WebnatErrorCode.TIMEOUT, 'Operation Timeout');
    }

    /**
     * 常用错误工厂：操作被取消
     */
    static cancelled(): WebnatError {
        return new WebnatError(WebnatErrorCode.CANCELLED, 'Operation Cancelled');
    }

    /**
     * 常用错误工厂：连接已关闭
     */
    static closed(): WebnatError {
        return new WebnatError(WebnatErrorCode.CLOSED, 'Connection Closed');
    }

    /**
     * 常用错误工厂：方法未实现
     * @param obj 可选，未实现的方法描述
     */
    static unimplemented(obj?: any): WebnatError {
        const message = obj ? `Unimplemented Method: ${obj}` : 'Unimplemented Method';
        return new WebnatError(WebnatErrorCode.UNIMPLEMENTED, message);
    }

    /**
     * 常用错误工厂：消息反序列化失败
     * @param obj 可选，额外描述
     */
    static deserializationFailed(obj?: any): WebnatError {
        const message = obj ? `Message Deserialization Failed: ${obj}` : 'Message Deserialization Failed';
        return new WebnatError(WebnatErrorCode.DESERIALIZATION_FAILED, message);
    }

    /**
     * 常用错误工厂：消息序列化失败
     * @param obj 可选，额外描述
     */
    static serializationFailed(obj?: any): WebnatError {
        const message = obj ? `Message Serialization Failed: ${obj}` : 'Message Serialization Failed';
        return new WebnatError(WebnatErrorCode.SERIALIZATION_FAILED, message);
    }
}
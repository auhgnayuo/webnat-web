# Webnat

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Webnat 是一个用于 Web 与 Native 之间通信的 TypeScript 库。支持多种通信模式，支持 iOS、macOS、Android 和 HarmonyOS 平台。

## 特性

- **多平台支持** - 支持 iOS、Android 和 HarmonyOS
- **iframe 支持** - 自动处理主框架和 iframe 之间的消息转发
- **三种通信模式** - 支持双向的原始消息、广播消息和方法调用（RPC）
- **超时和取消** - 内置超时控制和主动取消机制

## 安装

```bash
# npm
npm install webnat

# yarn
yarn add webnat

# pnpm
pnpm add webnat
```

或在 `package.json` 中添加：

```json
{
  "dependencies": {
    "webnat": "1.2.0"
  }
}
```

## 相关项目

Webnat 需要配合 Native 端实现使用：

| 平台 | 仓库 |
|------|------|
| iOS / macOS (Swift) | [webnat-darwin](https://github.com/auhgnayuo/webnat-darwin) |
| Android (Kotlin) | [webnat-android](https://github.com/auhgnayuo/webnat-android) |
| HarmonyOS (ArkTS) | [webnat-ohos](https://github.com/auhgnayuo/webnat-ohos) |

## 基本使用

### 1. 初始化

```typescript
import webnat from 'webnat';
```

### 2. 发送和接收消息

```typescript
// 发送原始消息
webnat.raw("param");
webnat.raw({ param: "param" });

// 监听原始消息
webnat.onRaw((param) => {
  console.log('raw:', param);
});

// 广播消息
webnat.broadcast('name', null);
webnat.broadcast('name', 'param');
webnat.broadcast('name', { param: 'param' });

// 监听广播消息
webnat.onBroadcast('name', (param) => {
  console.log('broadcast:', param);
});

// 流式监听广播消息（使用 async/await）
for await (const param of webnat.listenBroadcast('name')) {
  console.log('broadcast:', param);
}

// 调用 Native 方法
const result = await webnat.method(
  {
    method: 'getUserInfo',
    param: { userId: 123 }
  },
  { timeout: 5000 }
);
console.log('User info:', result);

// 注册方法供 Native 调用
webnat.onMethod('getUserInfo', async (param, signal, notify) => {
  // 可以发送途中的通知（如进度更新）
  notify({ progress: 50 });

  const result = await doSomething();
  return result;
});
```

## 协议

本项目采用 MIT 协议开源。

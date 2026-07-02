# Webnat

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[中文文档](./README_CN.md)

A lightweight WebView-Native bridge library for the Web. Supports multiple communication modes with iOS, macOS, Android, and HarmonyOS.

## Features

- **Multi-platform Support** - iOS, Android, and HarmonyOS
- **iframe Support** - Automatic message forwarding between main frame and iframes
- **Three Communication Modes** - Bidirectional raw messages, broadcast messages, and method calls (RPC)
- **Timeout & Cancellation** - Built-in timeout control and active cancellation mechanism

## Installation

```bash
# npm
npm install webnat

# yarn
yarn add webnat

# pnpm
pnpm add webnat
```

Or add to your `package.json`:

```json
{
  "dependencies": {
    "webnat": "1.2.0"
  }
}
```

## Related Projects

Webnat requires a Native-side implementation:

| Platform | Repository |
|----------|------------|
| iOS / macOS (Swift) | [webnat-darwin](https://github.com/auhgnayuo/webnat-darwin) |
| Android (Kotlin) | [webnat-android](https://github.com/auhgnayuo/webnat-android) |
| HarmonyOS (ArkTS) | [webnat-ohos](https://github.com/auhgnayuo/webnat-ohos) |

## Usage

### 1. Initialization

```typescript
import webnat from 'webnat';
```

### 2. Send and Receive Messages

```typescript
// Send raw message
webnat.raw("param");
webnat.raw({ param: "param" });

// Listen for raw messages
webnat.onRaw((param) => {
  console.log('raw:', param);
});

// Broadcast
webnat.broadcast('name', null);
webnat.broadcast('name', 'param');
webnat.broadcast('name', { param: 'param' });

// Listen for broadcasts
webnat.onBroadcast('name', (param) => {
  console.log('broadcast:', param);
});

// Stream broadcasts (async/await)
for await (const param of webnat.listenBroadcast('name')) {
  console.log('broadcast:', param);
}

// Call Native method
const result = await webnat.method(
  {
    method: 'getUserInfo',
    param: { userId: 123 }
  },
  { timeout: 5000 }
);
console.log('User info:', result);

// Register method for Native to call
webnat.onMethod('getUserInfo', async (param, signal, notify) => {
  notify({ progress: 50 });

  const result = await doSomething();
  return result;
});
```

## License

This project is licensed under the MIT License.

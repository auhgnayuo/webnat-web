<template>
  <div class="webnat-test">
    <div class="buttons">
      <button @click="sendRaw" class="btn btn-raw">发送 Raw</button>
      <button @click="sendBroadcast" class="btn btn-broadcast">发送 Broadcast</button>
      <button @click="sendMethod" class="btn btn-method">发送 Method</button>
    </div>
    <div class="logs">
      <div class="logs-header">
        <span>日志</span>
        <button @click="clearLogs" class="btn-clear">清空</button>
      </div>
      <div class="logs-content" ref="logsContent">
        <div
          v-for="(log, index) in logs"
          :key="index"
          :class="['log-item', log.type]"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-type">{{ log.typeText }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import webnat from 'webnat';

// UTF-8 边界字符测试数据
const UTF8_BOUNDARY_CHARS = {
  // 单字节字符 (ASCII)
  ascii: 'Hello World! 123',
  // 双字节字符 (Latin-1)
  latin1: 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏ',
  // 三字节字符 (CJK)
  cjk: '你好世界！中文测试',
  // 四字节字符 (Emoji, 特殊符号)
  emoji: '😀😁😂🤣😃😄😅',
  // 混合字符
  mixed: 'Hello 你好 😀 世界 World! 测试 Test 123',
  // 边界情况
  boundaries: '\u0000\u007F\u0080\u07FF\u0800\uFFFF\uD800\uDFFF',
  // 特殊字符
  special: "\n\r\t\\/\"'`{}[]()<>",
  // 空字符串
  empty: '',
  // 长字符串
  long: 'A'.repeat(1000) + '你'.repeat(100) + '😀'.repeat(50),
};

// 生成测试参数
function generateTestParam() {
  return {
    ascii: UTF8_BOUNDARY_CHARS.ascii,
    latin1: UTF8_BOUNDARY_CHARS.latin1,
    cjk: UTF8_BOUNDARY_CHARS.cjk,
    emoji: UTF8_BOUNDARY_CHARS.emoji,
    mixed: UTF8_BOUNDARY_CHARS.mixed,
    boundaries: UTF8_BOUNDARY_CHARS.boundaries,
    special: UTF8_BOUNDARY_CHARS.special,
    empty: UTF8_BOUNDARY_CHARS.empty,
    long: UTF8_BOUNDARY_CHARS.long,
    array: [
      UTF8_BOUNDARY_CHARS.ascii,
      UTF8_BOUNDARY_CHARS.cjk,
      UTF8_BOUNDARY_CHARS.emoji,
    ],
    nested: {
      level1: {
        level2: {
          level3: UTF8_BOUNDARY_CHARS.mixed,
        },
      },
    },
  };
}

export default {
  name: 'WebnatTest',
  data() {
    return {
      logs: [],
    };
  },
  mounted() {
    // 注册 raw 消息接收
    webnat.onRaw((param) => {
      this.addLog('received', 'raw', `收到 Raw 消息: ${JSON.stringify(param, null, 2)}`);
    });

    // 注册 broadcast 消息接收
    webnat.onBroadcast('test-broadcast', (param) => {
      this.addLog('received', 'broadcast', `收到 Broadcast 消息: ${JSON.stringify(param, null, 2)}`);
    });

    // 注册 method 处理函数
    webnat.onMethod('test-method', async (param, signal, notify) => {
      this.addLog('received', 'method', `收到 Method 调用: ${JSON.stringify(param, null, 2)}`);
      
      // 发送通知
      notify({ progress: 50, message: '处理中...' });
      
      // 模拟异步处理
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      // 返回结果
      return {
        success: true,
        result: 'Method 调用成功',
        receivedParam: param,
      };
    });
  },
  methods: {
    addLog(type, category, message) {
      const now = new Date();
      const time = now.toLocaleTimeString() + '.' + now.getMilliseconds().toString().padStart(3, '0');
      
      const typeText = {
        sent: '发送',
        received: '接收',
        error: '错误',
      }[type] || type;

      const categoryText = {
        raw: 'Raw',
        broadcast: 'Broadcast',
        method: 'Method',
      }[category] || category;

      this.logs.push({
        time,
        type,
        typeText,
        category,
        categoryText,
        message: `${categoryText}: ${message}`,
      });

      // 自动滚动到底部
      this.$nextTick(() => {
        const logsContent = this.$refs.logsContent;
        if (logsContent) {
          logsContent.scrollTop = logsContent.scrollHeight;
        }
      });
    },
    sendRaw() {
      try {
        const param = generateTestParam();
        webnat.raw(param);
        this.addLog('sent', 'raw', `发送 Raw 消息: ${JSON.stringify(param, null, 2)}`);
      } catch (error) {
        this.addLog('error', 'raw', `发送 Raw 消息失败: ${error.message}`);
      }
    },
    sendBroadcast() {
      try {
        const param = generateTestParam();
        webnat.broadcast('test-broadcast', param);
        this.addLog('sent', 'broadcast', `发送 Broadcast 消息: ${JSON.stringify(param, null, 2)}`);
      } catch (error) {
        this.addLog('error', 'broadcast', `发送 Broadcast 消息失败: ${error.message}`);
      }
    },
    async sendMethod() {
      try {
        const param = generateTestParam();
        this.addLog('sent', 'method', `发送 Method 调用: ${JSON.stringify(param, null, 2)}`);
        
        const result = await webnat.method(
          {
            method: 'test-method',
            param: param,
          },
          {
            timeout: 5000,
            onNotification: (notification) => {
              this.addLog('received', 'method', `收到 Method 通知: ${JSON.stringify(notification, null, 2)}`);
            },
          }
        );
        
        this.addLog('received', 'method', `Method 调用成功: ${JSON.stringify(result, null, 2)}`);
      } catch (error) {
        this.addLog('error', 'method', `Method 调用失败: ${error.message || JSON.stringify(error, null, 2)}`);
      }
    },
    clearLogs() {
      this.logs = [];
    },
  },
};
</script>

<style scoped>
.webnat-test {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
  background-color: #fff;
}

.buttons {
  flex-shrink: 0;
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn {
  flex: 1;
  padding: 12px 20px;
  font-size: 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn:hover {
  opacity: 0.9;
}

.btn:active {
  opacity: 0.8;
}

.btn-raw {
  background-color: #4caf50;
  color: white;
}

.btn-broadcast {
  background-color: #2196f3;
  color: white;
}

.btn-method {
  background-color: #ff9800;
  color: white;
}

.logs {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background-color: #f9f9f9;
  min-height: 0;
}

.logs-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ddd;
  font-weight: bold;
  font-size: 14px;
}

.btn-clear {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background-color: white;
  cursor: pointer;
}

.btn-clear:hover {
  background-color: #f0f0f0;
}

.logs-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  min-height: 0;
}

.log-item {
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 3px;
  background-color: white;
  border-left: 3px solid #ccc;
}

.log-item.sent {
  border-left-color: #4caf50;
  background-color: #e8f5e9;
}

.log-item.received {
  border-left-color: #2196f3;
  background-color: #e3f2fd;
}

.log-item.error {
  border-left-color: #f44336;
  background-color: #ffebee;
}

.log-time {
  color: #666;
  margin-right: 8px;
  font-size: 11px;
}

.log-type {
  display: inline-block;
  padding: 2px 6px;
  margin-right: 8px;
  border-radius: 2px;
  font-size: 11px;
  font-weight: bold;
}

.log-item.sent .log-type {
  background-color: #4caf50;
  color: white;
}

.log-item.received .log-type {
  background-color: #2196f3;
  color: white;
}

.log-item.error .log-type {
  background-color: #f44336;
  color: white;
}

.log-message {
  color: #333;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

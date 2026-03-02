<template>
  <div id="app">
    <div class="mainframe">
      <WebnatTest />
    </div>
    <div class="iframe-container">
      <iframe
        ref="iframe"
        :src="iframeSrc"
        class="iframe"
        frameborder="0"
        @load="onIframeLoad"
        @error="onIframeError"
      ></iframe>
      <div v-if="iframeLoading" class="iframe-loading">加载中...</div>
      <div v-if="iframeError" class="iframe-error">加载失败: {{ iframeError }}</div>
    </div>
  </div>
</template>

<script>
import WebnatTest from './components/WebnatTest.vue';

export default {
  name: 'App',
  components: {
    WebnatTest,
  },
  data() {
    return {
      iframeSrc: '/iframe.html',
      iframeLoading: true,
      iframeError: null,
    };
  },
  mounted() {
    // 确保 iframe 在 mounted 后加载
    this.$nextTick(() => {
      // 延迟一下确保 DOM 完全渲染
      setTimeout(() => {
        if (this.$refs.iframe) {
          const iframe = this.$refs.iframe;
          // 检查 iframe 是否已经加载
          try {
            if (iframe.contentWindow && iframe.contentWindow.document) {
              // iframe 已经加载
              this.iframeLoading = false;
            }
          } catch (e) {
            // 跨域限制，无法访问，但可能已经加载
            this.iframeLoading = false;
          }
        }
      }, 100);
    });
  },
  methods: {
    onIframeLoad() {
      this.iframeLoading = false;
      this.iframeError = null;
      console.log('Iframe loaded successfully');
    },
    onIframeError() {
      this.iframeLoading = false;
      this.iframeError = '无法加载 iframe 内容';
      console.error('Iframe load error');
    },
  },
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* width: 100vw; */
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.mainframe {
  flex: 1;
  height: 50%;
  min-height: 0;
  border-bottom: 2px solid #333;
  overflow: hidden;
  position: relative;
  background-color: #fff;
}

.iframe-container {
  flex: 1;
  height: 50%;
  min-height: 0;
  overflow: hidden;
  position: relative;
  background-color: #fff;
}

.iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  background-color: #fff;
  visibility: visible;
  opacity: 1;
}

.iframe-loading,
.iframe-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 10px 20px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 4px;
  font-size: 14px;
  z-index: 10;
}

.iframe-error {
  background-color: rgba(244, 67, 54, 0.9);
}
</style>
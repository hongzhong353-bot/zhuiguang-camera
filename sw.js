/* 追光相机 Service Worker（v5.1）：缓存应用外壳 + 语音引擎 CDN 文件，支持离线打开与安装到主屏幕。
   应用外壳缓存名带版本号，新版发布后旧缓存自动清理。语音文件（WASM 运行时 + 模型）
   是带版本号的不可变 CDN 地址，首次加载后缓存进独立缓存，后续打开直接读缓存、离线也能用语音。 */
const CACHE_NAME = 'zhuiguang-camera-v5.1';
const VOICE_CACHE_NAME = 'zhuiguang-camera-voice-v5.1';
const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'icon.svg',
  'china-area.json'
];
// v5.1：语音引擎文件——只缓存这几个带版本号的固定地址，不缓存其它第三方请求
const VOICE_URLS = [
  'https://cdn.jsdelivr.net/npm/@sherpaw/kws@0.3.0/',
  'https://cdn.jsdelivr.net/npm/@sherpaw/preloader@0.3.0/',
  'https://modelscope.cn/models/pkufool/sherpa-onnx-kws-zipformer-wenetspeech-3.3M-2024-01-01/resolve/master/',
  'https://huggingface.co/moeru-ai/sherpa-onnx-kws-zipformer-wenetspeech-3.3M-2024-01-01/resolve/main/install/bin/wasm/preload.data'
];
function isVoiceUrl(url){
  return VOICE_URLS.some((prefix) => url.startsWith(prefix));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== VOICE_CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (isVoiceUrl(url)){
    // v5.1：语音文件运行时缓存（cache-first；只存 200 响应）
    event.respondWith(
      caches.open(VOICE_CACHE_NAME).then((cache) =>
        cache.match(event.request, { ignoreSearch: true }).then((hit) => {
          if (hit) return hit;
          return fetch(event.request).then((res) => {
            if (res && res.status === 200) cache.put(event.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }
  const reqUrl = new URL(url);
  if (reqUrl.origin !== self.location.origin) return; // 只处理本站请求与语音 CDN，不碰其它第三方
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((hit) => hit || fetch(event.request))
  );
});

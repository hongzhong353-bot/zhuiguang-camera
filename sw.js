/* 追光相机 Service Worker（v5.0）：缓存应用外壳，支持离线打开与安装到主屏幕。
   只缓存本站应用外壳文件；缓存名带版本号，新版发布后旧缓存自动清理。 */
const CACHE_NAME = 'zhuiguang-camera-v5.0';
const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'icon.svg',
  'china-area.json'
];

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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // 只处理本站请求，不碰第三方
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((hit) => hit || fetch(event.request))
  );
});

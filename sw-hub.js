// AMT 통합 허브 서비스워커
// 역할: 앱(허브) 껍데기를 캐시에 보관 → 오프라인에서도 아이콘으로 열림
// 방식: "네트워크 우선" → 인터넷 되면 항상 최신, 안 되면 캐시로 대체
//       (그래서 허브를 나중에 수정해도 옛날 화면에 갇히지 않음)

const CACHE = 'amt-hub-v20260620-v5';
const SHELL = ['./', './index.html'];

// 설치: 껍데기 미리 저장
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL).catch(function () {});
    })
  );
});

// 활성화: 옛날 캐시 청소
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// 요청 처리: 허브 자기 출처만 담당 (탭 안 다른 앱들은 각자 알아서)
self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;

  let sameOrigin = false;
  try { sameOrigin = (new URL(req.url).origin === self.location.origin); }
  catch (err) { sameOrigin = false; }
  if (!sameOrigin) return; // 다른 앱(iframe) 요청엔 손대지 않음

  // 네트워크 우선 → 실패 시 캐시 → 그래도 없으면 index.html
  e.respondWith(
    fetch(req).then(function (res) {
      const copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      return res;
    }).catch(function () {
      return caches.match(req).then(function (r) {
        return r || caches.match('./index.html');
      });
    })
  );
});

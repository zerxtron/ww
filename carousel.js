(() => {
  const CACHE_NAME = 'wedding-media-v1';
  const queue = [];       // 已載入的媒體項目（依 createdAt 排序）
  const seenKeys = new Set();
  let currentIndex = 0;
  let isPlaying = false;
  let timer = null;

  const container   = document.getElementById('carousel-container');
  const emptyState  = document.getElementById('empty-state');
  const overlay     = document.getElementById('carousel-overlay');
  const msgEl       = document.getElementById('carousel-message');
  const nameEl      = document.getElementById('carousel-name');

  // ── 快取工具 ──────────────────────────────────────────────
  async function cachedFetch(url) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url);
    if (cached) return URL.createObjectURL(await cached.blob());

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`fetch failed: ${resp.status}`);
    await cache.put(url, resp.clone());
    return URL.createObjectURL(await resp.blob());
  }

  // ── DOM 建立 ──────────────────────────────────────────────
  function buildImageEl(blobUrl, item) {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.id = 'carousel-media';
      img.src = blobUrl;
      img.alt = item.message || '';
      img.onload  = () => resolve(img);
      img.onerror = reject;
    });
  }

  function buildVideoEl(blobUrl) {
    const video = document.createElement('video');
    video.id = 'carousel-media';
    video.src = blobUrl;
    video.muted = false;
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    return video;
  }

  // ── 輪播主邏輯 ────────────────────────────────────────────
  async function playItem(item) {
    isPlaying = true;
    clearTimeout(timer);

    let blobUrl;
    try {
      blobUrl = await cachedFetch(item.url);
    } catch (e) {
      console.error('媒體載入失敗，跳過', e);
      advance();
      return;
    }

    // 移除舊媒體元素
    const oldMedia = document.getElementById('carousel-media');
    if (oldMedia) oldMedia.remove();

    overlay.classList.remove('visible');
    emptyState.style.display = 'none';

    let mediaEl;
    if (item.type === 'image') {
      mediaEl = await buildImageEl(blobUrl, item);
      container.insertBefore(mediaEl, overlay);
      showOverlay(item);
      timer = setTimeout(advance, CONFIG.IMAGE_DISPLAY_SECONDS * 1000);
    } else {
      mediaEl = buildVideoEl(blobUrl);
      container.insertBefore(mediaEl, overlay);
      showOverlay(item);
      mediaEl.onended = advance;
      mediaEl.onerror = advance;
      mediaEl.play().catch(() => {
        // 自動播放被阻擋時靜音重試
        mediaEl.muted = true;
        mediaEl.play().catch(advance);
      });
    }
  }

  function showOverlay(item) {
    msgEl.textContent  = item.message || '';
    nameEl.textContent = item.name    || '';
    nameEl.style.display = item.name ? '' : 'none';
    overlay.classList.add('visible');
  }

  function advance() {
    clearTimeout(timer);
    if (queue.length === 0) {
      isPlaying = false;
      showEmpty();
      return;
    }
    currentIndex = (currentIndex + 1) % queue.length;
    playItem(queue[currentIndex]);
  }

  function showEmpty() {
    const oldMedia = document.getElementById('carousel-media');
    if (oldMedia) oldMedia.remove();
    overlay.classList.remove('visible');
    emptyState.style.display = '';
  }

  // ── Firebase 監聽 ─────────────────────────────────────────
  db.ref('carousel').on('child_added', (snap) => {
    const key  = snap.key;
    const item = snap.val();
    if (!item || !item.url || seenKeys.has(key)) return;
    seenKeys.add(key);

    // 插入並保持 createdAt 排序
    queue.push(item);
    queue.sort((a, b) => a.createdAt - b.createdAt);

    if (!isPlaying) {
      currentIndex = queue.indexOf(item);
      playItem(item);
    }
  });
})();

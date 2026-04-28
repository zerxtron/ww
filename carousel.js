(() => {
  const queue = [];
  const seenKeys = new Set();
  let currentIndex = 0;
  let isPlaying = false;
  let timer = null;

  const container  = document.getElementById('carousel-container');
  const emptyState = document.getElementById('empty-state');
  const overlay    = document.getElementById('carousel-overlay');
  const msgEl      = document.getElementById('carousel-message');
  const nameEl     = document.getElementById('carousel-name');

  // ── DOM 建立 ──────────────────────────────────────────────
  function buildImageEl(url, item) {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.id  = 'carousel-media';
      img.src = url;
      img.alt = item.message || '';
      img.onload  = () => resolve(img);
      img.onerror = reject;
    });
  }

  function buildVideoEl(url) {
    const video = document.createElement('video');
    video.id          = 'carousel-media';
    video.src         = url;
    video.muted       = false;
    video.autoplay    = true;
    video.playsInline = true;
    video.controls    = false;
    return video;
  }

  // ── 輪播主邏輯 ────────────────────────────────────────────
  async function playItem(item) {
    isPlaying = true;
    clearTimeout(timer);

    const oldMedia = document.getElementById('carousel-media');
    if (oldMedia) oldMedia.remove();

    overlay.classList.remove('visible');
    emptyState.style.display = 'none';

    if (item.type === 'image') {
      let mediaEl;
      try {
        mediaEl = await buildImageEl(item.url, item);
      } catch {
        console.error('圖片載入失敗，跳過', item.url);
        advance();
        return;
      }
      container.insertBefore(mediaEl, overlay);
      showOverlay(item);
      timer = setTimeout(advance, CONFIG.IMAGE_DISPLAY_SECONDS * 1000);
    } else {
      const mediaEl = buildVideoEl(item.url);
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
    msgEl.textContent = item.message || '';
    nameEl.textContent = item.name || '';
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

    queue.push(item);
    queue.sort((a, b) => a.createdAt - b.createdAt);

    if (!isPlaying) {
      currentIndex = queue.indexOf(item);
      playItem(item);
    }
  });
})();

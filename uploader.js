(() => {
  const form          = document.getElementById('upload-form');
  const fileInput     = document.getElementById('file-input');
  const nameInput     = document.getElementById('uploader-name');
  const messageInput  = document.getElementById('uploader-message');
  const submitBtn     = document.getElementById('submit-btn');
  const progressWrap  = document.getElementById('progress-wrap');
  const progressBar   = document.getElementById('progress-bar');
  const progressLabel = document.getElementById('progress-label');
  const errorMsg      = document.getElementById('error-msg');
  const successScreen = document.getElementById('success-screen');
  const uploadAnother = document.getElementById('upload-another-btn');
  const previewWrap   = document.getElementById('file-preview-wrap');
  const fileNameDisp  = document.getElementById('file-name-display');
  const dropZone      = document.getElementById('drop-zone');

  let processedFile = null;   // 處理後準備上傳的 File/Blob
  let processedType = null;   // 'image' | 'video'

  // ── 錯誤顯示 ─────────────────────────────────────────────
  function showError(text) {
    errorMsg.textContent = text;
    errorMsg.style.display = 'block';
  }

  function clearError() {
    errorMsg.style.display = 'none';
    errorMsg.textContent = '';
  }

  // ── 預覽 ──────────────────────────────────────────────────
  function showPreview(blobOrFile, type) {
    previewWrap.style.display = 'block';
    previewWrap.innerHTML = '';

    const el = type === 'video'
      ? document.createElement('video')
      : document.createElement('img');

    el.src = URL.createObjectURL(blobOrFile);
    if (type === 'video') { el.controls = true; el.muted = true; }
    previewWrap.appendChild(el);

    fileNameDisp.textContent = blobOrFile.name || '';
    document.getElementById('file-name-display').textContent = blobOrFile.name || '';
  }

  // ── 圖片壓縮 ──────────────────────────────────────────────
  function compressImage(blob, filename) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        const maxEdge = CONFIG.IMAGE_MAX_LONG_EDGE_PX;
        if (width > maxEdge || height > maxEdge) {
          if (width >= height) { height = Math.round(height * maxEdge / width); width = maxEdge; }
          else                  { width = Math.round(width * maxEdge / height); height = maxEdge; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (b) => {
            if (!b) { reject(new Error('壓縮失敗')); return; }
            resolve(new File([b], filename.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          },
          'image/jpeg',
          CONFIG.IMAGE_JPEG_QUALITY
        );
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // ── 影片時長驗證 ──────────────────────────────────────────
  function getVideoDuration(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    });
  }

  // ── 檔案處理主流程 ────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return;
    clearError();
    processedFile = null;
    processedType = null;
    previewWrap.style.display = 'none';
    previewWrap.innerHTML = '';

    const ext = file.name.split('.').pop().toLowerCase();
    const mime = file.type.toLowerCase();

    // 影片分支
    if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv'].includes(ext)) {
      if (!mime.includes('mp4') && ext !== 'mp4') {
        showError(`不支援的影片格式「${ext.toUpperCase()}」。請上傳 MP4（H.264）格式。`);
        fileInput.value = '';
        return;
      }
      const sizeMB = file.size / 1024 / 1024;
      if (sizeMB > CONFIG.MAX_VIDEO_SIZE_MB) {
        showError(`影片大小（${sizeMB.toFixed(1)} MB）超過上限 ${CONFIG.MAX_VIDEO_SIZE_MB} MB，請壓縮後再上傳。`);
        fileInput.value = '';
        return;
      }
      let duration;
      try { duration = await getVideoDuration(file); } catch { duration = 0; }
      if (duration > CONFIG.MAX_VIDEO_DURATION_SECONDS) {
        const mins = Math.floor(duration / 60);
        const secs = Math.round(duration % 60);
        showError(`影片時長（${mins}分${secs}秒）超過上限 3 分鐘，請剪輯後再上傳。`);
        fileInput.value = '';
        return;
      }
      processedFile = file;
      processedType = 'video';
      showPreview(file, 'video');
      return;
    }

    // 圖片分支
    const imgExts = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
    if (!mime.startsWith('image/') && !imgExts.includes(ext)) {
      showError(`不支援的檔案格式「${ext.toUpperCase()}」。請上傳圖片（JPG/PNG/WEBP/HEIC）或 MP4 影片。`);
      fileInput.value = '';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '處理中…';

    try {
      let blob = file;

      // HEIC 轉換
      if (ext === 'heic' || ext === 'heif' || mime === 'image/heic' || mime === 'image/heif') {
        if (typeof heic2any === 'undefined') throw new Error('heic2any 未載入');
        blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 1 });
        if (Array.isArray(blob)) blob = blob[0];
      }

      // 壓縮
      const compressed = await compressImage(blob, file.name);
      processedFile = compressed;
      processedType = 'image';
      showPreview(compressed, 'image');
    } catch (e) {
      showError('圖片處理失敗，請換一張圖片再試。');
      console.error(e);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '送出祝福 ✨';
    }
  }

  // ── 拖曳 ──────────────────────────────────────────────────
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  // ── 上傳 ──────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const message = messageInput.value.trim();
    if (!message) { showError('請填寫祝福話語！'); messageInput.focus(); return; }
    if (!processedFile) { showError('請選擇要上傳的圖片或影片。'); return; }

    const name = nameInput.value.trim();
    const ts   = Date.now();
    const safeName = processedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const folder   = processedType === 'video' ? 'videos' : 'images';
    const path     = `wedding-media/${folder}/${ts}_${safeName}`;

    submitBtn.disabled = true;
    progressWrap.style.display = 'block';
    progressBar.style.width = '0%';
    progressLabel.textContent = '上傳中… 0%';

    try {
      const ref  = storage.ref(path);
      const task = ref.put(processedFile);

      await new Promise((resolve, reject) => {
        task.on(
          'state_changed',
          (snap) => {
            const pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
            progressBar.style.width = pct + '%';
            progressLabel.textContent = `上傳中… ${pct}%`;
          },
          reject,
          resolve
        );
      });

      const url = await ref.getDownloadURL();

      await db.ref('carousel').push({
        type:      processedType,
        url,
        name:      name || null,
        message,
        order:     0,
        createdAt: ts,
      });

      progressLabel.textContent = '上傳完成！';
      progressBar.style.width = '100%';

      setTimeout(() => {
        form.closest('.upload-form-wrap').style.display = 'none';
        successScreen.style.display = 'block';
      }, 600);

    } catch (err) {
      console.error(err);
      showError('上傳失敗，請確認網路連線後再試。');
      progressWrap.style.display = 'none';
      submitBtn.disabled = false;
    }
  });

  // ── 再上傳一次 ────────────────────────────────────────────
  uploadAnother.addEventListener('click', () => {
    form.reset();
    processedFile = null;
    processedType = null;
    previewWrap.style.display = 'none';
    previewWrap.innerHTML = '';
    progressWrap.style.display = 'none';
    successScreen.style.display = 'none';
    form.closest('.upload-form-wrap').style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = '送出祝福 ✨';
    clearError();
  });
})();

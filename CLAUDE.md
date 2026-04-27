# 婚禮輪播系統 — 專案進度

## 實作狀態

所有核心檔案已完成，待填入 Firebase 設定後即可部署使用。

## 檔案結構

```
wedding-carousel/
├── index.html          ✅ 展示頁（全螢幕輪播，無 UI 操作元件）
├── upload.html         ✅ 上傳頁（賓客手機用，拖曳上傳、預覽、成功畫面）
├── config.js           ✅ Firebase 設定佔位 + CONFIG 常數 + initializeApp
├── carousel.js         ✅ 輪播邏輯：DB 監聽、Cache API 快取、圖片定時／影片等結束切換
├── uploader.js         ✅ 上傳邏輯：HEIC 轉換、Canvas 壓縮、影片驗證、進度條、DB 寫入
├── style.css           ✅ 展示頁（深色婚禮主題）+ 上傳頁（米色手機友善）共用樣式
└── wedding-carousel-spec.md  📄 原始規格文件
```

## 待用戶完成

1. **建立 Firebase 專案**：依 `wedding-carousel-spec.md` 步驟 1–7 操作（Storage、Realtime Database、Rules）
2. **新增 GitHub Secrets**：repo → Settings → Secrets and variables → Actions，依序新增：
   - `FIREBASE_API_KEY`、`FIREBASE_AUTH_DOMAIN`、`FIREBASE_DATABASE_URL`
   - `FIREBASE_PROJECT_ID`、`FIREBASE_STORAGE_BUCKET`、`FIREBASE_MESSAGING_SENDER_ID`、`FIREBASE_APP_ID`
3. **啟用 GitHub Pages**：repo → Settings → Pages → Source 選 **"GitHub Actions"**
4. **Push 到 main**：CI 自動注入金鑰並部署，完成後取得網址
5. **製作 QR Code**：將 `upload.html` 網址製作成 QR Code 供賓客掃描

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | 純 HTML + CSS + Vanilla JS（無框架） |
| 媒體儲存 | Firebase Storage（`wedding-media/images/`、`wedding-media/videos/`） |
| 即時同步 | Firebase Realtime Database（`carousel/` 節點） |
| 快取 | Cache API，以 Storage URL 為 key |
| HEIC 轉換 | `heic2any@0.0.4`（CDN） |
| 圖片壓縮 | Canvas API，最長邊 1920px，JPEG quality 0.85 |
| 部署 | GitHub Pages |

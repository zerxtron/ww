# 婚禮輪播系統 — 專案實作說明文件

> 供 Claude Code 使用的完整規格與實作指引

---

## 專案概述

婚禮現場即時媒體輪播系統，讓賓客可透過手機上傳祝福照片／影片與文字，並即時顯示在婚禮展示螢幕上。

---

## 系統架構

### 技術選型

| 層級 | 技術 |
|------|------|
| 前端 | 純 HTML + CSS + Vanilla JavaScript（單頁應用） |
| 媒體儲存 | Firebase Storage |
| 即時同步 | Firebase Realtime Database |
| 部署 | GitHub Pages（或任意靜態網頁空間） |

### 頁面結構

系統包含兩個獨立頁面：

```
index.html        → 展示頁（投影幕／大電視用）
upload.html       → 上傳頁（賓客手機用，透過 QR Code 開啟）
```

### 網路使用情境

```
賓客手機  →（自身行動數據 4G/5G）→ Firebase（上傳媒體）
展示電腦  →（會場有線網路）→ Firebase（接收更新通知）
展示電腦  →（瀏覽器本地快取）→ 輪播媒體（減少重複流量）
```

---

## 功能規格

### 展示頁（index.html）

- 全螢幕顯示，無任何 UI 操作元件
- 輪播邏輯：
  - **影片**：播放完整影片後才切換下一則
  - **圖片**：固定顯示 `IMAGE_DISPLAY_SECONDS`（預設 8 秒）後切換
- 祝福文字疊加顯示於媒體下方（含上傳者姓名）
- 監聽 Firebase Realtime Database，有新內容時自動排入輪播佇列，無需重新整理頁面
- 媒體首次載入後快取至瀏覽器本地，避免重複請求 Firebase Storage

### 上傳頁（upload.html）

- 欄位：
  - 媒體檔案選擇（圖片或影片）
  - 上傳者姓名（選填）
  - 祝福話語（必填）
- 上傳進度條顯示
- 上傳完成後顯示成功訊息
- 上傳完成後，資料自動寫入 Firebase Realtime Database，展示頁即時收到通知

---

## 媒體規格與限制

### 圖片

| 項目 | 規格 |
|------|------|
| 允許格式 | JPG、PNG、WEBP、**HEIC**（自動轉換） |
| HEIC 處理 | 使用 `heic2any` 套件在前端轉換為 JPG |
| 大小限制 | 前端自動壓縮至 **1MB 以內**（使用 Canvas API） |
| 壓縮方式 | 等比縮放至最長邊 1920px，JPEG quality 0.85 |

### 影片

| 項目 | 規格 |
|------|------|
| 允許格式 | MP4（H.264）|
| 排除格式 | MOV、AVI、MKV（上傳時顯示格式錯誤提示） |
| 檔案大小上限 | **150MB** |
| 時長上限 | **3 分鐘**（180 秒） |
| 超出限制 | 顯示明確錯誤訊息，說明原因，不進行上傳 |

---

## Firebase 資料結構

### Realtime Database

```json
{
  "carousel": {
    "-UniqueId1": {
      "type": "image",
      "url": "https://firebasestorage.googleapis.com/...",
      "name": "小明",
      "message": "新婚快樂！百年好合！",
      "order": 1,
      "createdAt": 1700000000000
    },
    "-UniqueId2": {
      "type": "video",
      "url": "https://firebasestorage.googleapis.com/...",
      "name": "小美",
      "message": "祝福你們永遠幸福！",
      "order": 2,
      "createdAt": 1700000001000
    }
  }
}
```

> `order` 欄位保留供未來實作排序管理功能使用，目前以 `createdAt` 時間順序輪播。

### Storage 路徑結構

```
wedding-media/
  images/
    {timestamp}_{filename}.jpg
  videos/
    {timestamp}_{filename}.mp4
```

---

## 常數設定（寫死在程式碼中）

在 `config.js` 或程式頂部集中定義以下常數，方便日後調整：

```javascript
const CONFIG = {
  IMAGE_DISPLAY_SECONDS: 8,        // 圖片顯示秒數
  MAX_VIDEO_SIZE_MB: 150,          // 影片大小上限（MB）
  MAX_VIDEO_DURATION_SECONDS: 180, // 影片時長上限（秒）
  IMAGE_MAX_LONG_EDGE_PX: 1920,    // 圖片壓縮最長邊
  IMAGE_JPEG_QUALITY: 0.85,        // 圖片壓縮品質
};
```

---

## Firebase 設定步驟（給開發者）

1. 前往 [https://console.firebase.google.com](https://console.firebase.google.com) 建立新專案
2. 左側選單 → **Storage** → 啟用，選擇離台灣最近的地區（`asia-east1`）
3. 左側選單 → **Realtime Database** → 建立資料庫，選擇測試模式
4. 左側選單 → **專案設定** → 新增網頁應用程式 → 複製 Firebase config 物件
5. 將 config 填入程式碼中標示 `// TODO: 填入 Firebase 設定` 的位置：

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

6. Storage Rules 設定（允許公開讀寫，婚禮當天使用）：

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /wedding-media/{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

7. Realtime Database Rules：

```json
{
  "rules": {
    "carousel": {
      ".read": true,
      ".write": true
    }
  }
}
```

---

## 展示頁快取策略

為避免 Firebase Storage 流量超出免費額度（每日 1GB），展示頁採用以下快取機制：

```javascript
// 使用 IndexedDB 或 Cache API 將媒體 Blob 儲存於本地
// 輪播時優先從本地快取讀取，若不存在才從 Firebase 下載
```

實作要點：
- 以 Firebase Storage URL 為 key 存入快取
- 快取命中率預期 > 90%（婚禮當天媒體數量有限）

---

## 未來可擴充功能（本次暫不實作）

- **輪播順序管理頁**：管理員可拖曳調整素材順序（`order` 欄位已預留）
- **審核功能**：上傳內容需管理員審核後才進入輪播
- **黑名單過濾**：自動過濾不當內容
- **輪播暫停**：展示頁可按鍵暫停目前輪播

---

## 專案目錄結構建議

```
wedding-carousel/
├── index.html          # 展示頁
├── upload.html         # 上傳頁
├── config.js           # 常數設定 + Firebase config
├── carousel.js         # 展示頁邏輯
├── uploader.js         # 上傳頁邏輯
├── style.css           # 共用樣式
└── README.md           # 部署說明
```

---

## 部署方式

1. 將專案推送至 GitHub repository
2. GitHub → Settings → Pages → 選擇 `main` branch 部署
3. 取得展示頁網址：`https://yourname.github.io/wedding-carousel/`
4. 取得上傳頁網址：`https://yourname.github.io/wedding-carousel/upload.html`
5. 將上傳頁網址製作成 QR Code，印製於桌卡或投影片上供賓客掃描

---

*文件版本：1.0 | 依據需求討論結論整理*

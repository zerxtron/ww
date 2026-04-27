// TODO: 填入 Firebase 設定（參見 wedding-carousel-spec.md 步驟 4）
const firebaseConfig = {
  apiKey:            "__FIREBASE_API_KEY__",
  authDomain:        "__FIREBASE_AUTH_DOMAIN__",
  databaseURL:       "__FIREBASE_DATABASE_URL__",
  projectId:         "__FIREBASE_PROJECT_ID__",
  storageBucket:     "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId:             "__FIREBASE_APP_ID__"
};

const CONFIG = {
  IMAGE_DISPLAY_SECONDS: 8,
  MAX_VIDEO_SIZE_MB: 150,
  MAX_VIDEO_DURATION_SECONDS: 180,
  IMAGE_MAX_LONG_EDGE_PX: 1920,
  IMAGE_JPEG_QUALITY: 0.85,
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();

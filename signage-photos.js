// サイネージ向けスタイル写真管理（Firebase Storage + Firestore default-clone）
//
// このファイルは ES Module として読み込まれる（index.html で <script type="module">）。
// 既存の compat SDK (br.js) と独立して動作するため、Firebase modular SDK v9 を CDN から
// 直接 import し、`getFirestore(app, 'default-clone')` で名前付きDB を明示参照する。
//
// 書き込み先:
//   - Firestore: signage_photos コレクション（画像メタデータ）, custom/custom（切替間隔）
//   - Storage:   signage/photos/<uuid>.<ext>
//
// Firebase 設定値はフロントエンドに直接埋め込み（Cloud Run の /firebase-config が 500 を
// 返すため）。Web SDK の apiKey は秘密情報ではなく、実際のアクセス制御は Firestore/Storage
// の Security Rules で担保している。
//
// === フィーチャーフラグ ===
// URLクエリパラメータ ?signage_photos=on が付与されている場合のみ機能が有効化される。
// 動作確認・Firebase Rules 適用後にこのフラグチェックを削除する想定。
// 一度フラグONで開いた後は localStorage に記憶され、以降は同じブラウザで自動有効化される。
//   - 強制無効化: ?signage_photos=off

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';

const APP_NAME = 'signagePhotosApp';
const FIRESTORE_DATABASE_ID = 'default-clone';
const STORAGE_PREFIX = 'signage/photos';
const COLLECTION_NAME = 'signage_photos';
const SETTINGS_DOC_PATH = ['custom', 'custom'];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const FEATURE_FLAG_KEY = 'signagePhotosFeatureEnabled';
const FEATURE_FLAG_PARAM = 'signage_photos';

function isFeatureEnabled() {
    try {
        const params = new URLSearchParams(window.location.search);
        const param = params.get(FEATURE_FLAG_PARAM);
        if (param === 'on') {
            try { localStorage.setItem(FEATURE_FLAG_KEY, '1'); } catch (_) {}
            return true;
        }
        if (param === 'off') {
            try { localStorage.removeItem(FEATURE_FLAG_KEY); } catch (_) {}
            return false;
        }
        try {
            return localStorage.getItem(FEATURE_FLAG_KEY) === '1';
        } catch (_) {
            return false;
        }
    } catch (_) {
        return false;
    }
}

const state = {
    initialized: false,
    db: null,
    storage: null,
    elements: null,
};

function log(...args) {
    console.log('[サイネージ写真]', ...args);
}

function setStatus(text, kind = 'info') {
    const el = state.elements?.status;
    if (!el) return;
    el.textContent = text;
    el.style.color = kind === 'error' ? '#ff6b6b'
        : kind === 'success' ? '#28a745'
        : '#ffffff';
}

// Firebase Web SDK 用の設定値。
// Cloud Run バックエンドの /firebase-config エンドポイントが 500 を返すため、
// Firebase Console で発行された設定をフロントエンドに直接埋め込む。
// ※ Web SDK の apiKey はクライアント識別子であり秘密情報ではない。
//   実際のアクセス制御は Firestore/Storage Rules で行っている。
const FIREBASE_CONFIG = Object.freeze({
    apiKey: 'AIzaSyCy0XSXqR_DXSzbVDguB4wasju7Kaxbdmk',
    authDomain: 'degitalsignage-reservation.firebaseapp.com',
    projectId: 'degitalsignage-reservation',
    storageBucket: 'degitalsignage-reservation.firebasestorage.app',
    messagingSenderId: '676711147915',
    appId: '1:676711147915:web:737bc702001d44ffa2e78e',
});

async function loadFirebaseConfig() {
    return FIREBASE_CONFIG;
}

async function ensureFirebase() {
    if (state.initialized) return;

    const config = await loadFirebaseConfig();
    if (!config.storageBucket) {
        throw new Error('firebase-config に storageBucket が含まれていません。バックエンド側の対応が必要です。');
    }

    let app;
    if (getApps().some(a => a.name === APP_NAME)) {
        app = getApp(APP_NAME);
    } else {
        app = initializeApp(config, APP_NAME);
    }

    state.db = getFirestore(app, FIRESTORE_DATABASE_ID);
    state.storage = getStorage(app);
    state.initialized = true;
    log('Firebase 初期化完了 (DB:', FIRESTORE_DATABASE_ID, ', Bucket:', config.storageBucket, ')');
}

function generateUuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback: time + random
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function pickExtension(filename, contentType) {
    if (filename && filename.includes('.')) {
        return filename.split('.').pop().toLowerCase();
    }
    if (contentType && contentType.startsWith('image/')) {
        const sub = contentType.split('/')[1];
        if (sub === 'jpeg') return 'jpg';
        return sub;
    }
    return 'jpg';
}

async function loadPhotoList() {
    const listEl = state.elements?.list;
    if (!listEl) return;

    listEl.innerHTML = '';
    try {
        const q = query(collection(state.db, COLLECTION_NAME), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            listEl.innerHTML = '<p style="color: #888; font-style: italic;">登録された写真はありません</p>';
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data() || {};
            const card = document.createElement('div');
            card.className = 'signage-photo-card';
            card.style.cssText = 'border: 1px solid #444; border-radius: 6px; padding: 8px; background: #2a2a2a; width: 160px; display: flex; flex-direction: column; gap: 6px;';

            const img = document.createElement('img');
            img.src = data.downloadUrl || '';
            img.alt = data.filename || docSnap.id;
            img.style.cssText = 'width: 100%; height: 200px; object-fit: cover; border-radius: 4px; background: #000;';
            img.loading = 'lazy';

            const name = document.createElement('div');
            name.textContent = data.filename || docSnap.id;
            name.style.cssText = 'color: #ffffff; font-size: 12px; word-break: break-all;';

            const delBtn = document.createElement('button');
            delBtn.textContent = '🗑️ 削除';
            delBtn.className = 'btn btn-danger';
            delBtn.style.cssText = 'padding: 4px 8px; font-size: 12px;';
            delBtn.addEventListener('click', () => handleDelete(docSnap.id, data.storagePath));

            card.appendChild(img);
            card.appendChild(name);
            card.appendChild(delBtn);
            listEl.appendChild(card);
        });

        log(`一覧描画: ${snapshot.size}件`);
    } catch (err) {
        console.error('[サイネージ写真] 一覧取得エラー:', err);
        setStatus(`一覧取得に失敗しました: ${err.message}`, 'error');
    }
}

async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const uploadBtn = state.elements?.uploadBtn;
    if (uploadBtn) uploadBtn.disabled = true;

    let successCount = 0;
    let failCount = 0;
    setStatus(`アップロード中... 0/${files.length}`);

    try {
        await ensureFirebase();

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                if (!file.type || !file.type.startsWith('image/')) {
                    throw new Error('画像ファイルではありません');
                }
                if (file.size > MAX_FILE_BYTES) {
                    throw new Error(`ファイルサイズが上限(${MAX_FILE_BYTES / 1024 / 1024}MB)を超えています`);
                }

                const uuid = generateUuid();
                const ext = pickExtension(file.name, file.type);
                const storagePath = `${STORAGE_PREFIX}/${uuid}.${ext}`;

                const ref = storageRef(state.storage, storagePath);
                await uploadBytes(ref, file, { contentType: file.type });
                const downloadUrl = await getDownloadURL(ref);

                // order: ms精度に乱数を付けて衝突回避
                const order = Date.now() * 1000 + Math.floor(Math.random() * 1000);

                await addDoc(collection(state.db, COLLECTION_NAME), {
                    filename: file.name,
                    storagePath,
                    downloadUrl,
                    contentType: file.type,
                    size: file.size,
                    order,
                    createdAt: serverTimestamp(),
                });

                successCount++;
                setStatus(`アップロード中... ${i + 1}/${files.length}`);
            } catch (err) {
                console.error(`[サイネージ写真] ${file.name} アップロード失敗:`, err);
                failCount++;
            }
        }

        if (failCount === 0) {
            setStatus(`${successCount}件のアップロード完了`, 'success');
        } else {
            setStatus(`${successCount}件成功 / ${failCount}件失敗`, failCount > 0 ? 'error' : 'success');
        }

        await loadPhotoList();
    } catch (err) {
        console.error('[サイネージ写真] アップロード処理エラー:', err);
        setStatus(`アップロードに失敗しました: ${err.message}`, 'error');
    } finally {
        if (uploadBtn) uploadBtn.disabled = false;
        if (event.target) event.target.value = '';
    }
}

async function handleDelete(docId, storagePath) {
    if (!confirm('この写真を削除しますか？')) return;
    try {
        await ensureFirebase();
        // Firestore を先に削除（orphan storage は許容、orphan firestore はサイネージで参照不能になるため避ける）
        await deleteDoc(doc(state.db, COLLECTION_NAME, docId));
        if (storagePath) {
            try {
                await deleteObject(storageRef(state.storage, storagePath));
            } catch (err) {
                console.warn('[サイネージ写真] Storage 削除失敗（Firestore は既に削除済み）:', err);
            }
        }
        setStatus('削除しました', 'success');
        await loadPhotoList();
    } catch (err) {
        console.error('[サイネージ写真] 削除エラー:', err);
        setStatus(`削除に失敗しました: ${err.message}`, 'error');
    }
}

async function loadInterval() {
    try {
        await ensureFirebase();
        const ref = doc(state.db, ...SETTINGS_DOC_PATH);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const data = snap.data() || {};
            const interval = data.photoIntervalSeconds;
            if (typeof interval === 'number' && interval >= 1) {
                if (state.elements?.intervalInput) {
                    state.elements.intervalInput.value = String(interval);
                }
                log('現在の切替間隔:', interval, '秒');
            }
        }
    } catch (err) {
        console.error('[サイネージ写真] 切替間隔取得エラー:', err);
    }
}

async function handleSaveInterval() {
    const input = state.elements?.intervalInput;
    if (!input) return;
    const value = parseInt(input.value, 10);
    if (!Number.isFinite(value) || value < 1 || value > 600) {
        setStatus('切替間隔は 1〜600 秒で指定してください', 'error');
        return;
    }
    const saveBtn = state.elements?.intervalSaveBtn;
    if (saveBtn) saveBtn.disabled = true;

    try {
        await ensureFirebase();
        const ref = doc(state.db, ...SETTINGS_DOC_PATH);
        await setDoc(ref, { photoIntervalSeconds: value }, { merge: true });
        setStatus(`切替間隔を ${value} 秒に保存しました`, 'success');
        log('切替間隔を保存:', value);
    } catch (err) {
        console.error('[サイネージ写真] 切替間隔保存エラー:', err);
        setStatus(`保存に失敗しました: ${err.message}`, 'error');
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

function gatherElements() {
    return {
        uploadBtn: document.getElementById('signage-photo-upload-btn'),
        fileInput: document.getElementById('signage-photo-input'),
        intervalInput: document.getElementById('signage-photo-interval-input'),
        intervalSaveBtn: document.getElementById('signage-photo-interval-save-btn'),
        list: document.getElementById('signage-photos-list'),
        status: document.getElementById('signage-photos-status'),
    };
}

function bind() {
    const els = state.elements;
    if (!els) return false;
    if (!els.uploadBtn || !els.fileInput || !els.list) {
        return false;
    }

    els.uploadBtn.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', handleUpload);
    if (els.intervalSaveBtn) {
        els.intervalSaveBtn.addEventListener('click', handleSaveInterval);
    }
    return true;
}

function removeSectionFromDom() {
    // 「サイネージ写真管理」セクション全体を DOM から取り除く（誤操作防止）
    try {
        const list = document.getElementById('signage-photos-list');
        const section = list?.closest('.section');
        if (section && section.parentElement) {
            section.parentElement.removeChild(section);
        }
    } catch (err) {
        console.warn('[サイネージ写真] セクション除去エラー:', err);
    }
}

async function initialize() {
    if (!isFeatureEnabled()) {
        // フィーチャーフラグ OFF: UIを完全に取り除き、Firebase 初期化も行わない
        removeSectionFromDom();
        log('機能フラグOFFのため初期化スキップ（有効化: URLに ?signage_photos=on を付与）');
        return;
    }

    state.elements = gatherElements();
    if (!bind()) {
        log('要素が見つからないため初期化をスキップ');
        return;
    }
    log('初期化（機能フラグON）');

    try {
        await ensureFirebase();
        await Promise.all([loadInterval(), loadPhotoList()]);
    } catch (err) {
        console.error('[サイネージ写真] 初期化エラー:', err);
        setStatus(`初期化に失敗しました: ${err.message}`, 'error');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

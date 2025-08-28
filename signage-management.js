// デジタルサイネージ管理機能 - 修正版

// グローバル変数
let customSettings = {
    message: '',
    news: true
};

// 初期化フラグ
let signageManagementInitialized = false;

// DOM要素（動的に取得）
function getSignageDOMElements() {
    return {
        changeCustomMessageBtn: document.getElementById('change-custom-message-btn'),
        toggleNewsDisplayBtn: document.getElementById('toggle-news-display-btn'),
        customMessageModal: document.getElementById('custom-message-modal'),
        updateCustomMessageBtn: document.getElementById('update-custom-message-btn'),
        cancelCustomMessageBtn: document.getElementById('cancel-custom-message-btn'),
        customMessageInput: document.getElementById('custom-message-input')
    };
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeSignageManagement();
});

function initializeSignageManagement() {
    // 重複初期化を防ぐ
    if (signageManagementInitialized) {
        console.log('[サイネージ管理] 既に初期化済み - スキップ');
        return;
    }

    console.log('[サイネージ管理] 初期化開始');
    
    // イベントリスナー設定（イベント委譲を使用）
    setupEventDelegation();
    
    // 初期データ読み込み
    loadCustomSettings();
    
    signageManagementInitialized = true;
    console.log('[サイネージ管理] 初期化完了');
}

// イベント委譲を使用したイベントリスナー設定
function setupEventDelegation() {
    // documentレベルでイベントをキャッチ
    document.addEventListener('click', function(event) {
        const target = event.target;
        
        // カスタムメッセージ変更ボタン
        if (target && target.id === 'change-custom-message-btn') {
            event.preventDefault();
            console.log('[サイネージ管理] カスタムメッセージ変更ボタンがクリックされました');
            openCustomMessageModal();
            return;
        }
        
        // ニュース表示切り替えボタン
        if (target && target.id === 'toggle-news-display-btn') {
            event.preventDefault();
            console.log('[サイネージ管理] ニュース表示切り替えボタンがクリックされました');
            toggleNewsDisplay();
            return;
        }
        
        // カスタムメッセージ更新ボタン
        if (target && target.id === 'update-custom-message-btn') {
            event.preventDefault();
            console.log('[サイネージ管理] カスタムメッセージ更新ボタンがクリックされました');
            handleUpdateCustomMessage();
            return;
        }
        
        // カスタムメッセージキャンセルボタン
        if (target && target.id === 'cancel-custom-message-btn') {
            event.preventDefault();
            console.log('[サイネージ管理] カスタムメッセージキャンセルボタンがクリックされました');
            closeCustomMessageModal();
            return;
        }
        
        // 定型文ボタン
        if (target && target.classList.contains('template-btn')) {
            event.preventDefault();
            const template = target.dataset.template;
            console.log('[サイネージ管理] 定型文ボタンがクリックされました:', template);
            applyTemplate(template);
            return;
        }
        
        // モーダル外クリック
        if (target && target.id === 'custom-message-modal') {
            closeCustomMessageModal();
            return;
        }
    });
    
    console.log('[サイネージ管理] イベント委譲設定完了');
}

// 定型文適用
function applyTemplate(template) {
    const elements = getSignageDOMElements();
    if (elements.customMessageInput && template) {
        elements.customMessageInput.value = template;
        console.log('[サイネージ管理] 定型文適用:', template);
    }
}

// カスタム設定を読み込み
async function loadCustomSettings() {
    console.log('[サイネージ管理] カスタム設定読み込み開始');
    
    try {
        // API_BASE_URLが定義されているかチェック
        if (typeof API_BASE_URL === 'undefined') {
            console.warn('[サイネージ管理] API_BASE_URLが定義されていません');
            updateSignageUI();
            return;
        }

        const response = await fetch(`${API_BASE_URL}/custom`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[サイネージ管理] API応答:', data);
        
        if (data.success) {
            customSettings = {
                message: data.message || '',
                news: data.news !== undefined ? data.news : true
            };
            
            console.log('[サイネージ管理] カスタム設定更新:', customSettings);
            updateSignageUI();
        } else {
            console.warn('[サイネージ管理] カスタム設定の読み込みに失敗:', data.error);
            updateSignageUI();
        }
    } catch (error) {
        console.error('[サイネージ管理] カスタム設定読み込みエラー:', error);
        // デフォルト値で表示を更新
        updateSignageUI();
    }
}

// サイネージUIを更新
function updateSignageUI() {
    console.log('[サイネージ管理] UI更新開始:', customSettings);
    
    // カスタムメッセージ表示更新
    const currentCustomMessageSpan = document.getElementById('current-custom-message');
    if (currentCustomMessageSpan) {
        const messageText = customSettings.message || '設定されていません';
        currentCustomMessageSpan.textContent = messageText;
        currentCustomMessageSpan.style.color = customSettings.message ? '#ffffff' : '#888';
        currentCustomMessageSpan.style.fontStyle = customSettings.message ? 'normal' : 'italic';
        console.log('[サイネージ管理] カスタムメッセージ表示更新:', messageText);
    } else {
        console.warn('[サイネージ管理] current-custom-message要素が見つかりません');
    }
    
    // ニュース表示ステータス更新
    const currentNewsStatusSpan = document.getElementById('current-news-status');
    if (currentNewsStatusSpan) {
        const statusText = customSettings.news ? 'ON' : 'OFF';
        currentNewsStatusSpan.textContent = statusText;
        currentNewsStatusSpan.style.color = customSettings.news ? '#28a745' : '#dc3545';
        currentNewsStatusSpan.style.fontWeight = 'bold';
        console.log('[サイネージ管理] ニュース表示ステータス更新:', statusText);
    } else {
        console.warn('[サイネージ管理] current-news-status要素が見つかりません');
    }
    
    // ニュース表示ボタンのテキスト更新
    const toggleNewsDisplayBtn = document.getElementById('toggle-news-display-btn');
    if (toggleNewsDisplayBtn) {
        toggleNewsDisplayBtn.textContent = customSettings.news ? 'ニュース非表示' : 'ニュース表示';
        toggleNewsDisplayBtn.className = customSettings.news ? 'btn btn-warning' : 'btn btn-success';
        console.log('[サイネージ管理] ニュース表示ボタン更新:', toggleNewsDisplayBtn.textContent);
    } else {
        console.warn('[サイネージ管理] toggle-news-display-btn要素が見つかりません');
    }
}

// カスタムメッセージモーダルを開く
function openCustomMessageModal() {
    console.log('[サイネージ管理] カスタムメッセージモーダルを開く');
    
    const elements = getSignageDOMElements();
    
    // 現在のメッセージをフォームに設定
    if (elements.customMessageInput) {
        elements.customMessageInput.value = customSettings.message || '';
        // フォーカスは少し遅延させる
        setTimeout(() => {
            if (elements.customMessageInput) {
                elements.customMessageInput.focus();
            }
        }, 100);
    } else {
        console.warn('[サイネージ管理] customMessageInput要素が見つかりません');
    }
    
    if (elements.customMessageModal) {
        elements.customMessageModal.classList.add('active');
        console.log('[サイネージ管理] モーダル表示完了');
    } else {
        console.error('[サイネージ管理] customMessageModal要素が見つかりません');
        alert('カスタムメッセージモーダルを開けませんでした。ページを再読み込みしてください。');
    }
}

// カスタムメッセージモーダルを閉じる
function closeCustomMessageModal() {
    console.log('[サイネージ管理] カスタムメッセージモーダルを閉じる');
    
    const elements = getSignageDOMElements();
    
    if (elements.customMessageModal) {
        elements.customMessageModal.classList.remove('active');
    }
    
    // フォームをリセット
    if (elements.customMessageInput) {
        elements.customMessageInput.value = '';
    }
}

// カスタムメッセージ更新処理
async function handleUpdateCustomMessage() {
    console.log('[サイネージ管理] カスタムメッセージ更新処理開始');
    
    const elements = getSignageDOMElements();
    const newMessage = elements.customMessageInput ? elements.customMessageInput.value.trim() : '';
    
    console.log('[サイネージ管理] 新しいメッセージ:', newMessage);
    
    // ボタン無効化
    if (elements.updateCustomMessageBtn) {
        elements.updateCustomMessageBtn.disabled = true;
        elements.updateCustomMessageBtn.textContent = '更新中...';
    }
    
    try {
        // API_BASE_URLが定義されているかチェック
        if (typeof API_BASE_URL === 'undefined') {
            throw new Error('API_BASE_URLが定義されていません');
        }

        const response = await fetch(`${API_BASE_URL}/custom/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: newMessage })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[サイネージ管理] API応答:', data);
        
        if (data.success) {
            customSettings.message = newMessage;
            updateSignageUI();
            closeCustomMessageModal();
            
            const successMessage = newMessage ? 
                `カスタムメッセージを更新しました。\n「${newMessage}」` :
                'カスタムメッセージをクリアしました。';
            
            alert(successMessage);
            console.log('[サイネージ管理] カスタムメッセージ更新成功');
        } else {
            throw new Error(data.error || 'カスタムメッセージの更新に失敗しました');
        }
    } catch (error) {
        console.error('[サイネージ管理] カスタムメッセージ更新エラー:', error);
        alert(`カスタムメッセージの更新に失敗しました。\nエラー: ${error.message}`);
    } finally {
        // ボタン再有効化
        if (elements.updateCustomMessageBtn) {
            elements.updateCustomMessageBtn.disabled = false;
            elements.updateCustomMessageBtn.textContent = 'メッセージ更新';
        }
    }
}

// ニュース表示切り替え
async function toggleNewsDisplay() {
    console.log('[サイネージ管理] ニュース表示切り替え処理開始');
    
    const newNewsStatus = !customSettings.news;
    console.log('[サイネージ管理] 新しいニュース表示状態:', newNewsStatus);
    
    // 確認ダイアログ
    const confirmMessage = `ニュース表示を${newNewsStatus ? 'ON' : 'OFF'}にしますか？`;
    if (!confirm(confirmMessage)) {
        console.log('[サイネージ管理] ニュース表示切り替えキャンセル');
        return;
    }
    
    const elements = getSignageDOMElements();
    
    // ボタン無効化
    if (elements.toggleNewsDisplayBtn) {
        elements.toggleNewsDisplayBtn.disabled = true;
        elements.toggleNewsDisplayBtn.textContent = '更新中...';
    }
    
    try {
        // API_BASE_URLが定義されているかチェック
        if (typeof API_BASE_URL === 'undefined') {
            throw new Error('API_BASE_URLが定義されていません');
        }

        const response = await fetch(`${API_BASE_URL}/custom/news`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ news: newNewsStatus })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[サイネージ管理] API応答:', data);
        
        if (data.success) {
            customSettings.news = newNewsStatus;
            updateSignageUI();
            
            alert(`ニュース表示を${newNewsStatus ? 'ON' : 'OFF'}にしました。`);
            console.log('[サイネージ管理] ニュース表示切り替え成功');
        } else {
            throw new Error(data.error || 'ニュース表示設定の更新に失敗しました');
        }
    } catch (error) {
        console.error('[サイネージ管理] ニュース表示更新エラー:', error);
        alert(`ニュース表示設定の更新に失敗しました。\nエラー: ${error.message}`);
    } finally {
        // ボタン再有効化
        if (elements.toggleNewsDisplayBtn) {
            elements.toggleNewsDisplayBtn.disabled = false;
            updateSignageUI(); // ボタンテキストを元に戻す
        }
    }
}

// リアルタイム更新処理（外部から呼び出される）
function handleCustomMessageUpdate(data) {
    if (data && data.message !== undefined) {
        customSettings.message = data.message;
        updateSignageUI();
        console.log('[サイネージ管理] リアルタイム更新 - カスタムメッセージ:', data.message);
    }
}

function handleNewsDisplayUpdate(data) {
    if (data && data.news !== undefined) {
        customSettings.news = data.news;
        updateSignageUI();
        console.log('[サイネージ管理] リアルタイム更新 - ニュース表示:', data.news);
    }
}

// auth.js のupdateSignageDisplay関数から呼び出される
function updateSignageUIFromAuth() {
    console.log('[サイネージ管理] auth.jsからのUI更新要求');
    updateSignageUI();
}

// グローバル関数として公開
window.handleCustomMessageUpdate = handleCustomMessageUpdate;
window.handleNewsDisplayUpdate = handleNewsDisplayUpdate;
window.loadCustomSettings = loadCustomSettings;
window.updateSignageUIFromAuth = updateSignageUIFromAuth;

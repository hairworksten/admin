// デジタルサイネージ管理機能

// グローバル変数
let customSettings = {
    message: '',
    news: true
};

// DOM要素
const changeCustomMessageBtn = document.getElementById('change-custom-message-btn');
const toggleNewsDisplayBtn = document.getElementById('toggle-news-display-btn');
const customMessageModal = document.getElementById('custom-message-modal');
const updateCustomMessageBtn = document.getElementById('update-custom-message-btn');
const cancelCustomMessageBtn = document.getElementById('cancel-custom-message-btn');
const customMessageInput = document.getElementById('custom-message-input');

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeSignageManagement();
});

function initializeSignageManagement() {
    // イベントリスナー設定
    if (changeCustomMessageBtn) {
        changeCustomMessageBtn.addEventListener('click', openCustomMessageModal);
    }
    
    if (toggleNewsDisplayBtn) {
        toggleNewsDisplayBtn.addEventListener('click', toggleNewsDisplay);
    }
    
    if (updateCustomMessageBtn) {
        updateCustomMessageBtn.addEventListener('click', handleUpdateCustomMessage);
    }
    
    if (cancelCustomMessageBtn) {
        cancelCustomMessageBtn.addEventListener('click', closeCustomMessageModal);
    }
    
    // 定型文ボタンのイベントリスナー
    const templateBtns = document.querySelectorAll('.template-btn');
    templateBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const template = this.dataset.template;
            if (customMessageInput) {
                customMessageInput.value = template;
            }
        });
    });
    
    // モーダル外クリックで閉じる
    if (customMessageModal) {
        customMessageModal.addEventListener('click', function(e) {
            if (e.target === customMessageModal) {
                closeCustomMessageModal();
            }
        });
    }
    
    // 初期データ読み込み
    loadCustomSettings();
}

// カスタム設定を読み込み
async function loadCustomSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/custom`);
        const data = await response.json();
        
        if (data.success) {
            customSettings = {
                message: data.message || '',
                news: data.news !== undefined ? data.news : true
            };
            
            updateSignageUI();
        } else {
            console.warn('カスタム設定の読み込みに失敗:', data.error);
            updateSignageUI();
        }
    } catch (error) {
        console.error('カスタム設定読み込みエラー:', error);
        updateSignageUI();
    }
}

// サイネージUIを更新
function updateSignageUI() {
    // カスタムメッセージ表示更新
    const currentCustomMessageSpan = document.getElementById('current-custom-message');
    if (currentCustomMessageSpan) {
        currentCustomMessageSpan.textContent = customSettings.message || '設定されていません';
        currentCustomMessageSpan.style.color = customSettings.message ? '#ffffff' : '#888';
        currentCustomMessageSpan.style.fontStyle = customSettings.message ? 'normal' : 'italic';
    }
    
    // ニュース表示ステータス更新
    const currentNewsStatusSpan = document.getElementById('current-news-status');
    if (currentNewsStatusSpan) {
        currentNewsStatusSpan.textContent = customSettings.news ? 'ON' : 'OFF';
        currentNewsStatusSpan.style.color = customSettings.news ? '#28a745' : '#dc3545';
        currentNewsStatusSpan.style.fontWeight = 'bold';
    }
    
    // ニュース表示ボタンのテキスト更新
    if (toggleNewsDisplayBtn) {
        toggleNewsDisplayBtn.textContent = customSettings.news ? 'ニュース非表示' : 'ニュース表示';
        toggleNewsDisplayBtn.className = customSettings.news ? 'btn btn-warning' : 'btn btn-success';
    }
}

// カスタムメッセージモーダルを開く
function openCustomMessageModal() {
    // 現在のメッセージをフォームに設定
    if (customMessageInput) {
        customMessageInput.value = customSettings.message || '';
        customMessageInput.focus();
    }
    
    if (customMessageModal) {
        customMessageModal.classList.add('active');
    }
}

// カスタムメッセージモーダルを閉じる
function closeCustomMessageModal() {
    if (customMessageModal) {
        customMessageModal.classList.remove('active');
    }
    
    // フォームをリセット
    if (customMessageInput) {
        customMessageInput.value = '';
    }
}

// カスタムメッセージ更新処理
async function handleUpdateCustomMessage() {
    const newMessage = customMessageInput ? customMessageInput.value.trim() : '';
    
    // ボタン無効化
    if (updateCustomMessageBtn) {
        updateCustomMessageBtn.disabled = true;
        updateCustomMessageBtn.textContent = '更新中...';
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/custom/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: newMessage })
        });
        
        const data = await response.json();
        
        if (data.success) {
            customSettings.message = newMessage;
            updateSignageUI();
            closeCustomMessageModal();
            
            const successMessage = newMessage ? 
                `カスタムメッセージを更新しました。\n「${newMessage}」` :
                'カスタムメッセージをクリアしました。';
            
            alert(successMessage);
        } else {
            throw new Error(data.error || 'カスタムメッセージの更新に失敗しました');
        }
    } catch (error) {
        console.error('カスタムメッセージ更新エラー:', error);
        alert(`カスタムメッセージの更新に失敗しました。\nエラー: ${error.message}`);
    } finally {
        // ボタン再有効化
        if (updateCustomMessageBtn) {
            updateCustomMessageBtn.disabled = false;
            updateCustomMessageBtn.textContent = 'メッセージ更新';
        }
    }
}

// ニュース表示切り替え
async function toggleNewsDisplay() {
    const newNewsStatus = !customSettings.news;
    
    // 確認ダイアログ
    const confirmMessage = `ニュース表示を${newNewsStatus ? 'ON' : 'OFF'}にしますか？`;
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // ボタン無効化
    if (toggleNewsDisplayBtn) {
        toggleNewsDisplayBtn.disabled = true;
        toggleNewsDisplayBtn.textContent = '更新中...';
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/custom/news`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ news: newNewsStatus })
        });
        
        const data = await response.json();
        
        if (data.success) {
            customSettings.news = newNewsStatus;
            updateSignageUI();
            
            alert(`ニュース表示を${newNewsStatus ? 'ON' : 'OFF'}にしました。`);
        } else {
            throw new Error(data.error || 'ニュース表示設定の更新に失敗しました');
        }
    } catch (error) {
        console.error('ニュース表示更新エラー:', error);
        alert(`ニュース表示設定の更新に失敗しました。\nエラー: ${error.message}`);
    } finally {
        // ボタン再有効化
        if (toggleNewsDisplayBtn) {
            toggleNewsDisplayBtn.disabled = false;
            updateSignageUI(); // ボタンテキストを元に戻す
        }
    }
}

// リアルタイム更新処理（外部から呼び出される）
function handleCustomMessageUpdate(data) {
    if (data && data.message !== undefined) {
        customSettings.message = data.message;
        updateSignageUI();
        console.log('[サイネージ管理] カスタムメッセージ更新:', data.message);
    }
}

function handleNewsDisplayUpdate(data) {
    if (data && data.news !== undefined) {
        customSettings.news = data.news;
        updateSignageUI();
        console.log('[サイネージ管理] ニュース表示更新:', data.news);
    }
}

// グローバル関数として公開
window.handleCustomMessageUpdate = handleCustomMessageUpdate;
window.handleNewsDisplayUpdate = handleNewsDisplayUpdate;
window.loadCustomSettings = loadCustomSettings;

// デジタルサイネージ管理機能 - 重複処理防止版

// グローバル変数（auth.jsで定義済みの場合は使用、未定義の場合は初期化）
if (typeof window.customSettings === 'undefined') {
    window.customSettings = {
        message: '',
        news: true
    };
}

// 初期化フラグと処理中フラグ
let signageManagementInitialized = false;
let isUpdatingCustomMessage = false;
let isTogglingNewsDisplay = false;

// DOM要素（動的に取得）
function getSignageDOMElements() {
    return {
        changeCustomMessageBtn: document.getElementById('change-custom-message-btn'),
        toggleNewsDisplayBtn: document.getElementById('toggle-news-display-btn'),
        customMessageModal: document.getElementById('custom-message-modal'),
        updateCustomMessageBtn: document.getElementById('update-custom-message-btn'),
        cancelCustomMessageBtn: document.getElementById('cancel-custom-message-btn'),
        customMessageInput: document.getElementById('custom-message-input'),
        currentCustomMessageSpan: document.getElementById('current-custom-message'),
        currentNewsStatusSpan: document.getElementById('current-news-status')
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
    loadCustomSettingsLocal();
    
    signageManagementInitialized = true;
    console.log('[サイネージ管理] 初期化完了');
}

// イベント委譲を使用したイベントリスナー設定
function setupEventDelegation() {
    // documentレベルでイベントをキャッチ（重複防止付き）
    document.addEventListener('click', function(event) {
        const target = event.target;
        
        // カスタムメッセージ変更ボタン
        if (target && target.id === 'change-custom-message-btn') {
            event.preventDefault();
            event.stopPropagation(); // イベントバブリング停止
            
            console.log('[サイネージ管理] カスタムメッセージ変更ボタンがクリックされました');
            openCustomMessageModal();
            return;
        }
        
        // ニュース表示切り替えボタン
        if (target && target.id === 'toggle-news-display-btn') {
            event.preventDefault();
            event.stopPropagation(); // イベントバブリング停止
            
            // 重複処理防止
            if (isTogglingNewsDisplay) {
                console.log('[サイネージ管理] ニュース表示切り替え処理中 - 重複実行を防止');
                return;
            }
            
            console.log('[サイネージ管理] ニュース表示切り替えボタンがクリックされました');
            toggleNewsDisplay();
            return;
        }
        
        // カスタムメッセージ更新ボタン
        if (target && target.id === 'update-custom-message-btn') {
            event.preventDefault();
            event.stopPropagation();
            
            // 重複処理防止
            if (isUpdatingCustomMessage) {
                console.log('[サイネージ管理] カスタムメッセージ更新処理中 - 重複実行を防止');
                return;
            }
            
            console.log('[サイネージ管理] カスタムメッセージ更新ボタンがクリックされました');
            handleUpdateCustomMessage();
            return;
        }
        
        // カスタムメッセージキャンセルボタン
        if (target && target.id === 'cancel-custom-message-btn') {
            event.preventDefault();
            event.stopPropagation();
            console.log('[サイネージ管理] カスタムメッセージキャンセルボタンがクリックされました');
            closeCustomMessageModal();
            return;
        }
        
        // 定型文ボタン
        if (target && target.classList.contains('template-btn')) {
            event.preventDefault();
            event.stopPropagation();
            const template = target.dataset.template;
            console.log('[サイネージ管理] 定型文ボタンがクリックされました:', template);
            applyTemplate(template);
            return;
        }
        
        // モーダル外クリック
        if (target && target.id === 'custom-message-modal') {
            event.stopPropagation();
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

// カスタム設定を読み込み（ローカル版）
async function loadCustomSettingsLocal() {
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
            // グローバルのcustomSettingsを更新
            window.customSettings = {
                message: data.message || '',
                news: data.news !== undefined ? data.news : true
            };
            
            console.log('[サイネージ管理] カスタム設定更新:', window.customSettings);
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
    console.log('[サイネージ管理] UI更新開始:', window.customSettings);
    
    const elements = getSignageDOMElements();
    
    // カスタムメッセージ表示更新
    if (elements.currentCustomMessageSpan) {
        const messageText = window.customSettings.message || '設定されていません';
        elements.currentCustomMessageSpan.textContent = messageText;
        elements.currentCustomMessageSpan.style.color = window.customSettings.message ? '#ffffff' : '#888';
        elements.currentCustomMessageSpan.style.fontStyle = window.customSettings.message ? 'normal' : 'italic';
        console.log('[サイネージ管理] カスタムメッセージ表示更新:', messageText);
    } else {
        console.warn('[サイネージ管理] current-custom-message要素が見つかりません');
    }
    
    // ニュース表示ステータス更新
    if (elements.currentNewsStatusSpan) {
        const statusText = window.customSettings.news ? 'ON' : 'OFF';
        elements.currentNewsStatusSpan.textContent = statusText;
        elements.currentNewsStatusSpan.style.color = window.customSettings.news ? '#28a745' : '#dc3545';
        elements.currentNewsStatusSpan.style.fontWeight = 'bold';
        console.log('[サイネージ管理] ニュース表示ステータス更新:', statusText);
    } else {
        console.warn('[サイネージ管理] current-news-status要素が見つかりません');
    }
    
    // ニュース表示ボタンのテキスト更新
    if (elements.toggleNewsDisplayBtn) {
        elements.toggleNewsDisplayBtn.textContent = window.customSettings.news ? 'ニュース非表示' : 'ニュース表示';
        elements.toggleNewsDisplayBtn.className = window.customSettings.news ? 'btn btn-warning' : 'btn btn-success';
        console.log('[サイネージ管理] ニュース表示ボタン更新:', elements.toggleNewsDisplayBtn.textContent);
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
        elements.customMessageInput.value = window.customSettings.message || '';
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
    
    // 処理中フラグをリセット
    isUpdatingCustomMessage = false;
}

// カスタムメッセージ更新処理（重複処理防止版）
async function handleUpdateCustomMessage() {
    console.log('[サイネージ管理] カスタムメッセージ更新処理開始');
    
    // 重複処理防止
    if (isUpdatingCustomMessage) {
        console.log('[サイネージ管理] カスタムメッセージ更新処理中 - 重複実行を防止');
        return;
    }
    
    isUpdatingCustomMessage = true;
    
    const elements = getSignageDOMElements();
    const newMessage = elements.customMessageInput ? elements.customMessageInput.value.trim() : '';
    
    console.log('[サイネージ管理] 新しいメッセージ:', newMessage);
    
    // ボタン無効化（視覚的フィードバック）
    if (elements.updateCustomMessageBtn) {
        elements.updateCustomMessageBtn.disabled = true;
        elements.updateCustomMessageBtn.textContent = '💾 更新中...';
        elements.updateCustomMessageBtn.style.opacity = '0.7';
        elements.updateCustomMessageBtn.style.cursor = 'not-allowed';
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
            window.customSettings.message = newMessage;
            updateSignageUI();
            
            // 成功時のボタン表示
            if (elements.updateCustomMessageBtn) {
                elements.updateCustomMessageBtn.textContent = '✅ 更新完了';
                elements.updateCustomMessageBtn.style.backgroundColor = '#28a745';
                elements.updateCustomMessageBtn.style.color = '#ffffff';
            }
            
            // 少し遅延してモーダルを閉じる
            setTimeout(() => {
                closeCustomMessageModal();
                
                // 成功メッセージを表示（1回のみ）
                const successMessage = newMessage ? 
                    `✅ カスタムメッセージを更新しました\n\n📝 新しいメッセージ:\n「${newMessage}」` :
                    '✅ カスタムメッセージをクリアしました';
                
                alert(successMessage);
                
            }, 1000);
            
            console.log('[サイネージ管理] カスタムメッセージ更新成功');
        } else {
            throw new Error(data.error || 'カスタムメッセージの更新に失敗しました');
        }
    } catch (error) {
        console.error('[サイネージ管理] カスタムメッセージ更新エラー:', error);
        alert(`❌ カスタムメッセージの更新に失敗しました\n\n🔧 エラー詳細:\n${error.message}`);
    } finally {
        // ボタン再有効化
        if (elements.updateCustomMessageBtn) {
            elements.updateCustomMessageBtn.disabled = false;
            elements.updateCustomMessageBtn.textContent = '💾 メッセージ更新';
            elements.updateCustomMessageBtn.style.opacity = '1';
            elements.updateCustomMessageBtn.style.cursor = 'pointer';
            elements.updateCustomMessageBtn.style.backgroundColor = '#ff6b35';
        }
        
        // 処理完了フラグをリセット
        isUpdatingCustomMessage = false;
    }
}

// ニュース表示切り替え（重複処理防止版）
async function toggleNewsDisplay() {
    console.log('[サイネージ管理] ニュース表示切り替え処理開始');
    
    // 重複処理防止
    if (isTogglingNewsDisplay) {
        console.log('[サイネージ管理] ニュース表示切り替え処理中 - 重複実行を防止');
        return;
    }
    
    isTogglingNewsDisplay = true;
    
    const newNewsStatus = !window.customSettings.news;
    console.log('[サイネージ管理] 新しいニュース表示状態:', newNewsStatus);
    
    // 確認ダイアログ
    const confirmMessage = `📺 ニュース表示を${newNewsStatus ? 'ON' : 'OFF'}にしますか？\n\n${newNewsStatus ? '📰 ニュースが表示されるようになります' : '🚫 ニュース表示が停止されます'}`;
    
    if (!confirm(confirmMessage)) {
        console.log('[サイネージ管理] ニュース表示切り替えキャンセル');
        isTogglingNewsDisplay = false;
        return;
    }
    
    const elements = getSignageDOMElements();
    
    // ボタン無効化（視覚的フィードバック）
    if (elements.toggleNewsDisplayBtn) {
        elements.toggleNewsDisplayBtn.disabled = true;
        elements.toggleNewsDisplayBtn.textContent = '⚙️ 更新中...';
        elements.toggleNewsDisplayBtn.style.opacity = '0.7';
        elements.toggleNewsDisplayBtn.style.cursor = 'not-allowed';
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
            window.customSettings.news = newNewsStatus;
            
            // 成功時のボタン表示
            if (elements.toggleNewsDisplayBtn) {
                const successIcon = newNewsStatus ? '✅📰' : '✅🚫';
                elements.toggleNewsDisplayBtn.textContent = `${successIcon} 更新完了`;
                elements.toggleNewsDisplayBtn.style.backgroundColor = '#28a745';
                elements.toggleNewsDisplayBtn.style.color = '#ffffff';
            }
            
            // 少し遅延してUIを更新
            setTimeout(() => {
                updateSignageUI();
                
                // 成功メッセージを表示（1回のみ）
                const successMessage = `✅ ニュース表示を${newNewsStatus ? 'ON' : 'OFF'}にしました\n\n📺 ${newNewsStatus ? 'ニュースが表示されます' : 'ニュース表示が停止されます'}`;
                alert(successMessage);
                
            }, 1000);
            
            console.log('[サイネージ管理] ニュース表示切り替え成功');
        } else {
            throw new Error(data.error || 'ニュース表示設定の更新に失敗しました');
        }
    } catch (error) {
        console.error('[サイネージ管理] ニュース表示更新エラー:', error);
        alert(`❌ ニュース表示設定の更新に失敗しました\n\n🔧 エラー詳細:\n${error.message}`);
    } finally {
        // ボタン再有効化
        if (elements.toggleNewsDisplayBtn) {
            elements.toggleNewsDisplayBtn.disabled = false;
            elements.toggleNewsDisplayBtn.style.opacity = '1';
            elements.toggleNewsDisplayBtn.style.cursor = 'pointer';
        }
        
        // UIを元に戻す（少し遅延）
        setTimeout(() => {
            updateSignageUI();
        }, 1500);
        
        // 処理完了フラグをリセット
        isTogglingNewsDisplay = false;
    }
}

// リアルタイム更新処理（外部から呼び出される）
function handleCustomMessageUpdate(data) {
    if (data && data.message !== undefined) {
        window.customSettings.message = data.message;
        updateSignageUI();
        console.log('[サイネージ管理] リアルタイム更新 - カスタムメッセージ:', data.message);
    }
}

function handleNewsDisplayUpdate(data) {
    if (data && data.news !== undefined) {
        window.customSettings.news = data.news;
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
window.loadCustomSettingsLocal = loadCustomSettingsLocal;
window.updateSignageUIFromAuth = updateSignageUIFromAuth;

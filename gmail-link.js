// ホットペッパー連携（Gmail）の連携ボタン・状態表示
// バックエンドの /api/gmail/status, /api/gmail/auth, /api/gmail/disconnect を利用する。

function initGmailLink() {
    const statusEl = document.getElementById('gmail-status');
    const connectBtn = document.getElementById('gmail-connect-btn');
    const disconnectBtn = document.getElementById('gmail-disconnect-btn');
    const messageEl = document.getElementById('gmail-message');
    if (!statusEl || !connectBtn || !disconnectBtn) return;

    // 連携開始：バックエンドの認可エンドポイントへ遷移（Google同意画面へ）
    connectBtn.addEventListener('click', () => {
        window.location.href = `${API_BASE_URL}/gmail/auth`;
    });

    // 連携解除
    disconnectBtn.addEventListener('click', async () => {
        if (!confirm('Gmail連携を解除しますか？\n解除するとホットペッパー予約の自動取り込みが停止します。')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/gmail/disconnect`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showGmailMessage('連携を解除しました', 'success');
            } else {
                showGmailMessage(data.message || '解除に失敗しました', 'error');
            }
        } catch (e) {
            showGmailMessage('通信エラーが発生しました', 'error');
        }
        loadGmailStatus();
    });

    // コールバックから戻ってきた場合の通知（?gmail_connected=1）
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected') === '1') {
        showGmailMessage('Gmail連携が完了しました', 'success');
        // URLからパラメータを除去
        window.history.replaceState({}, '', window.location.pathname);
    }

    loadGmailStatus();
}

async function loadGmailStatus() {
    const statusEl = document.getElementById('gmail-status');
    const connectBtn = document.getElementById('gmail-connect-btn');
    const disconnectBtn = document.getElementById('gmail-disconnect-btn');
    if (!statusEl) return;

    try {
        const res = await fetch(`${API_BASE_URL}/gmail/status`);
        const data = await res.json();
        if (!data.success) {
            statusEl.textContent = '連携状態の取得に失敗しました';
            return;
        }
        if (!data.configured) {
            statusEl.innerHTML = '⚠️ Gmail連携は未設定です（管理者にお問い合わせください）';
            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'none';
            return;
        }
        if (data.connected) {
            const email = data.account_email ? `（${data.account_email}）` : '';
            statusEl.innerHTML = `✅ 連携済み${email}`;
            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'inline-block';
        } else {
            statusEl.innerHTML = '未連携';
            connectBtn.style.display = 'inline-block';
            disconnectBtn.style.display = 'none';
        }
    } catch (e) {
        statusEl.textContent = '連携状態の取得に失敗しました';
    }
}

function showGmailMessage(text, type) {
    const messageEl = document.getElementById('gmail-message');
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `message ${type === 'success' ? 'success' : 'error'}`;
    setTimeout(() => { messageEl.textContent = ''; messageEl.className = 'message'; }, 5000);
}

document.addEventListener('DOMContentLoaded', initGmailLink);

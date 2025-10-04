// リアルタイム更新機能 - Server-Sent Events (SSE) + Firestore リスナー実装

class RealtimeUpdates {
    constructor() {
        this.eventSource = null;
        this.reconnectTimeout = null;
        this.reconnectInterval = 3000; // 3秒後に再接続
        this.maxReconnectInterval = 30000; // 最大30秒
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.isConnected = false;
        this.firestoreEnabled = false;
        
        this.init();
    }
    
    init() {
        console.log('[リアルタイム更新] 初期化開始');
        
        // SSE接続開始
        this.connect();
        
        // Firestoreリスナー初期化を試行
        this.initializeFirestore();
        
        // ページが非表示になったときは接続を閉じる
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.disconnect();
            } else {
                // ページが再表示されたら再接続
                setTimeout(() => {
                    if (!this.isConnected) {
                        this.connect();
                        this.initializeFirestore();
                    }
                }, 1000);
            }
        });
        
        // ページ離脱時に接続を閉じる
        window.addEventListener('beforeunload', () => {
            this.disconnect();
        });
    }
    
    async initializeFirestore() {
        try {
            console.log('[リアルタイム更新] Firestore リスナー初期化試行');
            
            // Firestoreリスナー機能が利用可能かチェック
            if (typeof initializeFirestoreListener === 'function') {
                const success = await initializeFirestoreListener();
                if (success) {
                    this.firestoreEnabled = true;
                    console.log('[リアルタイム更新] Firestore リスナー有効化成功');
                    this.showNotification('Firestore リアルタイム監視が有効になりました', 'success', 3000);
                } else {
                    console.warn('[リアルタイム更新] Firestore リスナー初期化失敗');
                    this.showNotification('Firestore リスナーの初期化に失敗しました', 'warning', 4000);
                }
            } else {
                console.warn('[リアルタイム更新] Firestore リスナー機能が見つかりません');
            }
        } catch (error) {
            console.error('[リアルタイム更新] Firestore初期化エラー:', error);
        }
    }
    
    connect() {
        if (this.eventSource) {
            return; // 既に接続中
        }
        
        console.log('[リアルタイム更新] SSEサーバーに接続中...');
        
        try {
            this.eventSource = new EventSource(`${API_BASE_URL}/events`);
            
            this.eventSource.onopen = () => {
                console.log('[リアルタイム更新] SSEサーバーに接続されました');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.reconnectInterval = 3000;
                this.showConnectionStatus('connected');
            };
            
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleServerMessage(data);
                } catch (error) {
                    console.error('[リアルタイム更新] SSEメッセージ解析エラー:', error);
                }
            };
            
            this.eventSource.onerror = (error) => {
                console.warn('[リアルタイム更新] SSE接続エラー:', error);
                this.isConnected = false;
                this.showConnectionStatus('error');
                
                if (this.eventSource.readyState === EventSource.CLOSED) {
                    this.eventSource = null;
                    this.attemptReconnect();
                }
            };
            
        } catch (error) {
            console.error('[リアルタイム更新] SSE接続失敗:', error);
            this.attemptReconnect();
        }
    }
    
    disconnect() {
        console.log('[リアルタイム更新] 接続を切断します');
        
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        // Firestoreリスナーも切断
        if (this.firestoreEnabled && typeof disconnectFirestoreListener === 'function') {
            disconnectFirestoreListener();
            this.firestoreEnabled = false;
        }
        
        this.isConnected = false;
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[リアルタイム更新] 最大再接続試行回数に達しました');
            this.showConnectionStatus('failed');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectInterval * this.reconnectAttempts, this.maxReconnectInterval);
        
        console.log(`[リアルタイム更新] ${delay/1000}秒後にSSE再接続します (試行 ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.showConnectionStatus('reconnecting', this.reconnectAttempts);
        
        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }
    
    handleServerMessage(data) {
        console.log('[リアルタイム更新] SSEメッセージ受信:', data.type, data);
        
        switch (data.type) {
            case 'connected':
                console.log('[リアルタイム更新] SSE接続確認');
                break;
                
            case 'heartbeat':
                // ハートビート - 何もしない
                break;
                
            case 'reservation_added':
                this.handleReservationAdded(data.data, 'sse');
                break;
                
            case 'reservation_updated':
                this.handleReservationUpdated(data.data, 'sse');
                break;
                
            case 'break_mode_updated':
                this.handleBreakModeUpdated(data.data, 'sse');
                break;
                
            case 'population_updated':
                this.handlePopulationUpdated(data.data, 'sse');
                break;
                
            case 'custom_message_updated':
                this.handleCustomMessageUpdated(data.data, 'sse');
                break;
                
            case 'news_display_updated':
                this.handleNewsDisplayUpdated(data.data, 'sse');
                break;
                
            default:
                console.log('[リアルタイム更新] 未知のSSEメッセージタイプ:', data.type);
        }
    }
    
    handleReservationAdded(data, source = 'unknown') {
        console.log(`[リアルタイム更新] 新しい予約が追加されました (${source}):`, data.reservation);
        
        // 予約データを更新
        if (typeof reservations !== 'undefined' && Array.isArray(reservations)) {
            // 重複チェック
            const existingIndex = reservations.findIndex(r => 
                r.reservationNumber === data.reservation.reservationNumber ||
                r.id === data.reservation.id ||
                r.firestore_id === data.reservation.firestore_id
            );
            
            if (existingIndex === -1) {
                reservations.push({
                    ...data.reservation,
                    id: data.reservation.id || data.reservation.reservationNumber
                });
                
                // UI更新
                this.updateUI('reservation_added');
                
                // 通知表示（Firestoreからの場合はより詳細な通知）
                const message = source === 'firestore' ? 
                    data.message || '外部サイトから新しい予約が追加されました' :
                    data.message || '新しい予約が追加されました';
                
                this.showNotification(message, 'success');
            }
        }
    }
    
    handleReservationUpdated(data, source = 'unknown') {
        console.log(`[リアルタイム更新] 予約が更新されました (${source}):`, data.reservation);
        
        // 予約データを更新
        if (typeof reservations !== 'undefined' && Array.isArray(reservations)) {
            const index = reservations.findIndex(r => 
                r.id === data.reservation.id || 
                r.reservationNumber === data.reservation.reservationNumber ||
                r.firestore_id === data.reservation.firestore_id
            );
            
            if (index !== -1) {
                reservations[index] = {
                    ...reservations[index],
                    ...data.reservation
                };
                
                // UI更新
                this.updateUI('reservation_updated');
                
                const message = source === 'firestore' ? 
                    data.message || '外部サイトから予約が更新されました' :
                    data.message || '予約が更新されました';
                
                this.showNotification(message, 'info');
            }
        }
    }
    
    handleBreakModeUpdated(data, source = 'unknown') {
        console.log(`[リアルタイム更新] 休憩モードが更新されました (${source}):`, data);
        
        // グローバルの休憩モード状態を更新
        if (typeof breakMode !== 'undefined') {
            breakMode.turn = data.turn;
            breakMode.custom = data.custom;
            
            // サイネージ表示を更新
            if (typeof updateSignageDisplay === 'function') {
                updateSignageDisplay();
            }
            
            // 予約表示を更新
            if (typeof displayReservations === 'function') {
                displayReservations();
            }
            
            const message = source === 'firestore' ? 
                (data.message || (data.turn ? '外部から休憩開始' : '外部から営業再開')) :
                (data.message || '休憩モードが更新されました');
            
            this.showNotification(message, 'info');
        }
    }
    
    handlePopulationUpdated(data, source = 'unknown') {
        console.log(`[リアルタイム更新] 待ち人数が更新されました (${source}):`, data.count);
        
        // 現在の待ち人数を更新
        const currentPopulationSpan = document.getElementById('current-population');
        if (currentPopulationSpan) {
            currentPopulationSpan.textContent = data.count;
        }
        
        // 軽い更新なので通知は控えめに
        const message = source === 'firestore' ? 
            `外部から待ち人数更新: ${data.count}人` :
            `待ち人数: ${data.count}人`;
        
        this.showNotification(message, 'info', 2000);
    }
    
    handleCustomMessageUpdated(data, source = 'unknown') {
        console.log(`[リアルタイム更新] カスタムメッセージが更新されました (${source}):`, data.message);
        
        // グローバルのカスタム設定を更新
        if (typeof customSettings !== 'undefined') {
            customSettings.message = data.message;
        }
        
        // サイネージ管理の関数を呼び出し
        if (typeof handleCustomMessageUpdate === 'function') {
            handleCustomMessageUpdate(data);
        }
        
        const message = source === 'firestore' ? 
            data.notification || '外部からカスタムメッセージが更新されました' :
            data.notification || 'カスタムメッセージが更新されました';
        
        this.showNotification(message, 'info');
    }
    
    handleNewsDisplayUpdated(data, source = 'unknown') {
        console.log(`[リアルタイム更新] ニュース表示が更新されました (${source}):`, data.news);
        
        // グローバルのカスタム設定を更新
        if (typeof customSettings !== 'undefined') {
            customSettings.news = data.news;
        }
        
        // サイネージ管理の関数を呼び出し
        if (typeof handleNewsDisplayUpdate === 'function') {
            handleNewsDisplayUpdate(data);
        }
        
        const message = source === 'firestore' ? 
            data.notification || `外部からニュース表示が${data.news ? 'ON' : 'OFF'}になりました` :
            data.notification || `ニュース表示が${data.news ? 'ON' : 'OFF'}になりました`;
        
        this.showNotification(message, 'info');
    }
    
    updateUI(updateType) {
        console.log('[リアルタイム更新] UI更新:', updateType);
        
        // 予約表示を更新
        if (typeof displayReservations === 'function') {
            displayReservations();
        }
        
        // カレンダーが表示されている場合は更新
        const calendarTab = document.getElementById('calendar-tab');
        if (calendarTab && calendarTab.classList.contains('active')) {
            if (typeof renderCalendar === 'function') {
                setTimeout(() => {
                    renderCalendar();
                }, 100);
            }
        }
    }
    
    showNotification(message, type = 'info', duration = 4000) {
        // 通知表示エリアを探すまたは作成
        let notificationArea = document.getElementById('realtime-notifications');
        if (!notificationArea) {
            notificationArea = document.createElement('div');
            notificationArea.id = 'realtime-notifications';
            notificationArea.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(notificationArea);
        }
        
        // 通知要素を作成
        const notification = document.createElement('div');
        notification.style.cssText = `
            background-color: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-size: 14px;
            animation: slideInRight 0.3s ease-out;
            cursor: pointer;
            border: 2px solid rgba(255,255,255,0.2);
            max-width: 100%;
            word-wrap: break-word;
        `;
        
        notification.textContent = message;
        
        // クリックで閉じる
        notification.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        notificationArea.appendChild(notification);
        
        // 指定時間後に自動削除
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
        
        console.log(`[リアルタイム更新] 通知表示: ${message}`);
    }
    
    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }
    
    getNotificationColor(type) {
        switch (type) {
            case 'success':
                return '#28a745';
            case 'error':
                return '#dc3545';
            case 'warning':
                return '#ffc107';
            case 'info':
            default:
                return '#17a2b8';
        }
    }
    
    showConnectionStatus(status, attempts = 0) {
        // 接続状態表示エリアを探すまたは作成
        let statusArea = document.getElementById('connection-status');
        if (!statusArea) {
            statusArea = document.createElement('div');
            statusArea.id = 'connection-status';
            statusArea.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                color: white;
                display: none;
                min-width: 150px;
                text-align: center;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(statusArea);
        }
        
        let message = '';
        let backgroundColor = '';
        let show = true;
        
        switch (status) {
            case 'connected':
                message = this.firestoreEnabled ? 
                    'リアルタイム更新: SSE + Firestore接続中' :
                    'リアルタイム更新: SSE接続中';
                backgroundColor = '#28a745';
                // 接続成功時は3秒後に非表示
                setTimeout(() => {
                    statusArea.style.display = 'none';
                }, 3000);
                break;
                
            case 'reconnecting':
                message = `SSE再接続中... (${attempts}/${this.maxReconnectAttempts})`;
                backgroundColor = '#ffc107';
                break;
                
            case 'error':
                message = 'SSE接続エラー';
                backgroundColor = '#dc3545';
                break;
                
            case 'failed':
                message = 'SSE接続失敗';
                backgroundColor = '#6c757d';
                break;
                
            default:
                show = false;
        }
        
        if (show) {
            statusArea.textContent = message;
            statusArea.style.backgroundColor = backgroundColor;
            statusArea.style.display = 'block';
        } else {
            statusArea.style.display = 'none';
        }
    }
}

// CSS アニメーションを追加
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    #realtime-notifications > div:hover {
        background-color: rgba(255,255,255,0.1) !important;
        transform: scale(1.02);
        transition: all 0.2s ease;
    }
    
    /* Firestore通知用の特別なスタイル */
    .firestore-notification {
        border-left: 4px solid #4285f4 !important;
    }
`;
document.head.appendChild(style);

// グローバルインスタンス
let realtimeUpdates = null;

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', function() {
    // ログインしている場合のみリアルタイム更新を開始
    if (currentUser || localStorage.getItem('currentUser')) {
        console.log('[リアルタイム更新] システム初期化');
        realtimeUpdates = new RealtimeUpdates();
    }
});

// ログイン成功時にリアルタイム更新を開始
function startRealtimeUpdates() {
    if (!realtimeUpdates) {
        console.log('[リアルタイム更新] ログイン後の初期化');
        realtimeUpdates = new RealtimeUpdates();
    }
}

// ログアウト時にリアルタイム更新を停止
function stopRealtimeUpdates() {
    if (realtimeUpdates) {
        console.log('[リアルタイム更新] システム停止');
        realtimeUpdates.disconnect();
        realtimeUpdates = null;
    }
}

// グローバルに公開
window.startRealtimeUpdates = startRealtimeUpdates;
window.stopRealtimeUpdates = stopRealtimeUpdates;

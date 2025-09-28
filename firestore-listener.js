// Firestore リアルタイムリスナー機能

class FirestoreListener {
    constructor() {
        this.db = null;
        this.unsubscribeReservations = null;
        this.unsubscribeBreakMode = null;
        this.unsubscribePopulation = null;
        this.isInitialized = false;
        this.lastProcessedReservations = new Map(); // 重複処理防止用
        this.firebaseConfig = null; // サーバーから取得
    }
    
    async initialize() {
        if (this.isInitialized) {
            console.log('[Firestore Listener] 既に初期化済み');
            return;
        }
        
        console.log('[Firestore Listener] 初期化開始');
        
        try {
            // Firebase初期化確認
            if (typeof firebase === 'undefined') {
                console.error('[Firestore Listener] Firebase SDKが読み込まれていません');
                return false;
            }
            
            // サーバーからFirebase設定を取得
            const configSuccess = await this.loadFirebaseConfig();
            if (!configSuccess) {
                console.error('[Firestore Listener] Firebase設定の取得に失敗しました');
                return false;
            }
            
            // 既に初期化されているかチェック
            if (!firebase.apps.length) {
                // Firebaseアプリを初期化
                firebase.initializeApp(this.firebaseConfig);
                console.log('[Firestore Listener] Firebase アプリ初期化完了');
            } else {
                console.log('[Firestore Listener] Firebase アプリは既に初期化済み');
            }
            
            // Firestoreインスタンス取得
            this.db = firebase.firestore();
            
            // 接続テスト
            await this.testConnection();
            
            // リスナー設定
            this.setupReservationsListener();
            this.setupBreakModeListener();
            this.setupPopulationListener();
            
            this.isInitialized = true;
            console.log('[Firestore Listener] 初期化完了');
            
            // 成功通知
            if (typeof realtimeUpdates !== 'undefined' && realtimeUpdates) {
                realtimeUpdates.showNotification('Firestore リアルタイム監視開始', 'success');
            }
            
            return true;
            
        } catch (error) {
            console.error('[Firestore Listener] 初期化エラー:', error);
            this.showFirebaseConfigError(error);
            return false;
        }
    }
    
    async loadFirebaseConfig() {
        try {
            console.log('[Firestore Listener] サーバーからFirebase設定を取得中...');
            
            const response = await fetch(`${API_BASE_URL}/firebase-config`);
            const data = await response.json();
            
            if (data.success && data.config) {
                this.firebaseConfig = data.config;
                console.log('[Firestore Listener] Firebase設定取得成功');
                return true;
            } else {
                console.error('[Firestore Listener] Firebase設定取得失敗:', data.error);
                return false;
            }
            
        } catch (error) {
            console.error('[Firestore Listener] Firebase設定取得エラー:', error);
            return false;
        }
    }
    
    async testConnection() {
        try {
            // 簡単な読み取りテストで接続確認
            const testDoc = await this.db.collection('test').limit(1).get();
            console.log('[Firestore Listener] 接続テスト成功');
        } catch (error) {
            if (error.code === 'permission-denied') {
                console.warn('[Firestore Listener] 接続成功（権限制限あり）');
            } else {
                throw error;
            }
        }
    }
    
    setupReservationsListener() {
        console.log('[Firestore Listener] 予約監視リスナー設定開始');
        
        // 予約コレクションの変更を監視
        this.unsubscribeReservations = this.db.collection('reservations')
            .onSnapshot(
                (snapshot) => {
                    console.log('[Firestore Listener] 予約データ変更検知');
                    
                    snapshot.docChanges().forEach((change) => {
                        const docId = change.doc.id;
                        const data = change.doc.data();
                        
                        // データに基本情報を追加
                        const reservationData = {
                            ...data,
                            id: docId,
                            firestore_id: docId
                        };
                        
                        console.log(`[Firestore Listener] 変更タイプ: ${change.type}, 予約ID: ${docId}`);
                        
                        switch (change.type) {
                            case 'added':
                                this.handleReservationAdded(reservationData);
                                break;
                            case 'modified':
                                this.handleReservationModified(reservationData, change.oldIndex, change.newIndex);
                                break;
                            case 'removed':
                                this.handleReservationRemoved(reservationData);
                                break;
                        }
                    });
                },
                (error) => {
                    console.error('[Firestore Listener] 予約監視エラー:', error);
                    this.handleListenerError('reservations', error);
                }
            );
    }
    
    handleReservationAdded(reservationData) {
        const docId = reservationData.id;
        const currentTime = Date.now();
        
        // 重複処理防止（5秒以内の同じドキュメントの処理をスキップ）
        if (this.lastProcessedReservations.has(docId)) {
            const lastProcessed = this.lastProcessedReservations.get(docId);
            if (currentTime - lastProcessed < 5000) {
                console.log(`[Firestore Listener] 予約追加の重複処理をスキップ: ${docId}`);
                return;
            }
        }
        
        this.lastProcessedReservations.set(docId, currentTime);
        
        console.log('[Firestore Listener] 外部から予約追加:', reservationData);
        
        // グローバル予約配列に追加（重複チェック付き）
        if (typeof reservations !== 'undefined' && Array.isArray(reservations)) {
            const existingIndex = reservations.findIndex(r => 
                r.id === docId || 
                r.reservationNumber === reservationData.reservationNumber ||
                r.firestore_id === docId
            );
            
            if (existingIndex === -1) {
                reservations.push(reservationData);
                console.log('[Firestore Listener] 予約配列に追加完了');
                
                // UI更新
                this.updateAllUI('external_reservation_added');
                
                // 通知表示
                const customerName = reservationData['Name-f'] || '名前なし';
                const reservationTime = `${reservationData.date} ${reservationData.Time}`;
                this.showNotification(
                    `外部サイトから新しい予約: ${customerName} (${reservationTime})`, 
                    'success'
                );
                
                // 音声通知（オプション）
                this.playNotificationSound();
                
            } else {
                console.log('[Firestore Listener] 予約は既に存在します（追加スキップ）');
            }
        }
    }
    
    handleReservationModified(reservationData, oldIndex, newIndex) {
        const docId = reservationData.id;
        
        console.log('[Firestore Listener] 外部から予約変更:', reservationData);
        
        // グローバル予約配列を更新
        if (typeof reservations !== 'undefined' && Array.isArray(reservations)) {
            const existingIndex = reservations.findIndex(r => 
                r.id === docId || 
                r.reservationNumber === reservationData.reservationNumber ||
                r.firestore_id === docId
            );
            
            if (existingIndex !== -1) {
                const oldData = reservations[existingIndex];
                reservations[existingIndex] = {
                    ...reservations[existingIndex],
                    ...reservationData
                };
                
                console.log('[Firestore Listener] 予約配列の更新完了');
                
                // UI更新
                this.updateAllUI('external_reservation_updated');
                
                // 変更内容の詳細通知
                const customerName = reservationData['Name-f'] || '名前なし';
                let changeDetails = [];
                
                if (oldData.states !== reservationData.states) {
                    const statusNames = {0: '来店前', 1: '来店済み', 2: 'キャンセル済み'};
                    changeDetails.push(`ステータス: ${statusNames[reservationData.states]}`);
                }
                
                if (oldData.Time !== reservationData.Time) {
                    changeDetails.push(`時間: ${reservationData.Time}`);
                }
                
                const changeText = changeDetails.length > 0 ? 
                    ` (${changeDetails.join(', ')})` : '';
                
                this.showNotification(
                    `外部サイトから予約変更: ${customerName}${changeText}`, 
                    'info'
                );
            } else {
                // 存在しない場合は新規追加として処理
                console.log('[Firestore Listener] 変更対象が見つからないため新規追加として処理');
                this.handleReservationAdded(reservationData);
            }
        }
    }
    
    handleReservationRemoved(reservationData) {
        const docId = reservationData.id;
        
        console.log('[Firestore Listener] 外部から予約削除:', reservationData);
        
        // グローバル予約配列から削除
        if (typeof reservations !== 'undefined' && Array.isArray(reservations)) {
            const existingIndex = reservations.findIndex(r => 
                r.id === docId || 
                r.reservationNumber === reservationData.reservationNumber ||
                r.firestore_id === docId
            );
            
            if (existingIndex !== -1) {
                reservations.splice(existingIndex, 1);
                console.log('[Firestore Listener] 予約配列から削除完了');
                
                // UI更新
                this.updateAllUI('external_reservation_removed');
                
                // 通知表示
                const customerName = reservationData['Name-f'] || '名前なし';
                this.showNotification(
                    `外部サイトから予約削除: ${customerName}`, 
                    'warning'
                );
            }
        }
    }
    
    setupBreakModeListener() {
        console.log('[Firestore Listener] 休憩モード監視リスナー設定開始');
        
        this.unsubscribeBreakMode = this.db.collection('break').doc('settings')
            .onSnapshot(
                (doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        console.log('[Firestore Listener] 外部から休憩モード変更:', data);
                        
                        // グローバル休憩モード状態を更新
                        if (typeof breakMode !== 'undefined') {
                            const oldTurn = breakMode.turn;
                            breakMode.turn = data.turn || false;
                            breakMode.custom = data.custom || '';
                            
                            // UI更新
                            if (typeof updateSignageDisplay === 'function') {
                                updateSignageDisplay();
                            }
                            
                            if (typeof displayReservations === 'function') {
                                displayReservations();
                            }
                            
                            // 状態変更時のみ通知
                            if (oldTurn !== breakMode.turn) {
                                const message = breakMode.turn ? 
                                    `外部から休憩開始: ${breakMode.custom}` : 
                                    '外部から営業再開';
                                
                                this.showNotification(message, 'info');
                            }
                        }
                    }
                },
                (error) => {
                    console.error('[Firestore Listener] 休憩モード監視エラー:', error);
                    this.handleListenerError('break-mode', error);
                }
            );
    }
    
    setupPopulationListener() {
        console.log('[Firestore Listener] 人数監視リスナー設定開始');
        
        this.unsubscribePopulation = this.db.collection('now_population').doc('signage')
            .onSnapshot(
                (doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        const newCount = data.now || 0;
                        
                        console.log('[Firestore Listener] 外部から人数変更:', newCount);
                        
                        // 現在の待ち人数を更新
                        const currentPopulationSpan = document.getElementById('current-population');
                        if (currentPopulationSpan) {
                            const oldCount = parseInt(currentPopulationSpan.textContent) || 0;
                            currentPopulationSpan.textContent = newCount;
                            
                            // 変更があった場合のみ軽い通知
                            if (oldCount !== newCount) {
                                this.showNotification(
                                    `外部から待ち人数更新: ${newCount}人`, 
                                    'info', 
                                    2000
                                );
                            }
                        }
                    }
                },
                (error) => {
                    console.error('[Firestore Listener] 人数監視エラー:', error);
                    this.handleListenerError('population', error);
                }
            );
    }
    
    handleListenerError(listenerName, error) {
        console.error(`[Firestore Listener] ${listenerName} エラー:`, error);
        
        // 権限エラーの場合は設定の確認を促す
        if (error.code === 'permission-denied') {
            this.showNotification(
                `${listenerName} の監視権限がありません。Firebase設定を確認してください。`, 
                'warning', 
                6000
            );
        } else {
            this.showNotification(
                `${listenerName} の監視でエラーが発生しました`, 
                'error', 
                4000
            );
        }
        
        // 再接続を試行（5秒後）
        setTimeout(() => {
            console.log(`[Firestore Listener] ${listenerName} の再接続を試行`);
            if (listenerName === 'reservations') {
                this.setupReservationsListener();
            } else if (listenerName === 'break-mode') {
                this.setupBreakModeListener();
            } else if (listenerName === 'population') {
                this.setupPopulationListener();
            }
        }, 5000);
    }
    
    updateAllUI(updateType) {
        console.log('[Firestore Listener] UI更新:', updateType);
        
        try {
            // 予約表示を更新
            if (typeof displayReservations === 'function') {
                displayReservations();
            }
            
            // カレンダーが表示されている場合は更新
            const calendarTab = document.getElementById('calendar-tab');
            if (calendarTab && calendarTab.classList.contains('active')) {
                setTimeout(() => {
                    if (typeof renderCalendar === 'function') {
                        renderCalendar();
                    }
                }, 200);
            }
            
        } catch (error) {
            console.error('[Firestore Listener] UI更新エラー:', error);
        }
    }
    
    showNotification(message, type = 'info', duration = 4000) {
        console.log(`[Firestore Listener] 通知: ${message}`);
        
        // realtimeUpdatesの通知機能を使用
        if (typeof realtimeUpdates !== 'undefined' && realtimeUpdates) {
            realtimeUpdates.showNotification(message, type, duration);
        } else {
            // フォールバック: コンソール出力
            console.log(`通知 [${type}]: ${message}`);
        }
    }
    
    playNotificationSound() {
        try {
            // 音声通知（ブラウザの制限により無音の場合があります）
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBzuR2Ov8hD8NF3vJ8N2QQAoUXrTp66hVFApGn+DyvmUgBzuR2Ov8hD8NFw==');
            audio.volume = 0.1;
            audio.play().catch(() => {
                // ブラウザが音声再生を拒否した場合は無視
            });
        } catch (error) {
            // 音声再生エラーは無視
        }
    }
    
    showFirebaseConfigError(error) {
        let errorMessage = 'Firebase初期化エラーが発生しました。';
        
        if (error.message && error.message.includes('API key')) {
            errorMessage = 'Firebase APIキーが設定されていないか無効です。';
        } else if (error.message && error.message.includes('Project ID')) {
            errorMessage = 'Firebase プロジェクトIDが設定されていません。';
        } else if (error.message && error.message.includes('permission')) {
            errorMessage = 'Firebase アクセス権限が不足しています。';
        }
        
        console.error('[Firestore Listener] Firebase設定エラー:', errorMessage);
        
        this.showNotification(
            `${errorMessage} 管理者にお問い合わせください。`,
            'error',
            8000
        );
    }
    
    disconnect() {
        console.log('[Firestore Listener] リスナー切断開始');
        
        try {
            if (this.unsubscribeReservations) {
                this.unsubscribeReservations();
                this.unsubscribeReservations = null;
            }
            
            if (this.unsubscribeBreakMode) {
                this.unsubscribeBreakMode();
                this.unsubscribeBreakMode = null;
            }
            
            if (this.unsubscribePopulation) {
                this.unsubscribePopulation();
                this.unsubscribePopulation = null;
            }
            
            this.isInitialized = false;
            console.log('[Firestore Listener] 全リスナー切断完了');
            
        } catch (error) {
            console.error('[Firestore Listener] 切断エラー:', error);
        }
    }
}

// グローバルインスタンス
let firestoreListener = null;

// 初期化関数
function initializeFirestoreListener() {
    if (!firestoreListener) {
        console.log('[Firestore Listener] インスタンス作成');
        firestoreListener = new FirestoreListener();
    }
    
    return firestoreListener.initialize();
}

// 切断関数
function disconnectFirestoreListener() {
    if (firestoreListener) {
        firestoreListener.disconnect();
    }
}

// グローバル関数として公開
window.initializeFirestoreListener = initializeFirestoreListener;
window.disconnectFirestoreListener = disconnectFirestoreListener;
    
    async initialize() {
        if (this.isInitialized) {
            console.log('[Firestore Listener] 既に初期化済み');
            return;
        }
        
        console.log('[Firestore Listener] 初期化開始');
        
        try {
            // Firebase初期化確認
            if (typeof firebase === 'undefined') {
                console.error('[Firestore Listener] Firebase SDKが読み込まれていません');
                return false;
            }
            
            // 既に初期化されているかチェック
            if (!firebase.apps.length) {
                // Firebaseアプリを初期化
                firebase.initializeApp(this.firebaseConfig);
                console.log('[Firestore Listener] Firebase アプリ初期化完了');
            } else {
                console.log('[Firestore Listener] Firebase アプリは既に初期化済み');
            }
            
            // Firestoreインスタンス取得
            this.db = firebase.firestore();
            
            // 接続テスト
            await this.testConnection();
            
            // リスナー設定
            this.setupReservationsListener();
            this.setupBreakModeListener();
            this.setupPopulationListener();
            
            this.isInitialized = true;
            console.log('[Firestore Listener] 初期化完了');
            
            // 成功通知
            if (typeof realtimeUpdates !== 'undefined' && realtimeUpdates) {
                realtimeUpdates.showNotification('Firestore リアルタイム監視開始', 'success');
            }
            
            return true;
            
        } catch (error) {
            console.error('[Firestore Listener] 初期化エラー:', error);
            
            // Firebase設定のヒント表示
            this.showFirebaseConfigHint();
            
            return false;
        }
    }
    
    async testConnection() {
        try {
            // 簡単な読み取りテストで接続確認
            const testDoc = await this.db.collection('test').limit(1).get();
            console.log('[Firestore Listener] 接続テスト成功');
        } catch (error) {
            if (error.code === 'permission-denied') {
                console.warn('[Firestore Listener] 接続成功（権限制限あり）');
            } else {
                throw error;
            }
        }
    }
    
    setupReservationsListener() {
        console.log('[Firestore Listener] 予約監視リスナー設定開始');
        
        // 予約コレクションの変更を監視
        this.unsubscribeReservations = this.db.collection('reservations')
            .onSnapshot(
                (snapshot) => {
                    console.log('[Firestore Listener] 予約データ変更検知');
                    
                    snapshot.docChanges().forEach((change) => {
                        const docId = change.doc.id;
                        const data = change.doc.data();
                        
                        // データに基本情報を追加
                        const reservationData = {
                            ...data,
                            id: docId,
                            firestore_id: docId
                        };
                        
                        console.log(`[Firestore Listener] 変更タイプ: ${change.type}, 予約ID: ${docId}`);
                        
                        switch (change.type) {
                            case 'added':
                                this.handleReservationAdded(reservationData);
                                break;
                            case 'modified':
                                this.handleReservationModified(reservationData, change.oldIndex, change.newIndex);
                                break;
                            case 'removed':
                                this.handleReservationRemoved(reservationData);
                                break;
                        }
                    });
                },
                (error) => {
                    console.error('[Firestore Listener] 予約監視エラー:', error);
                    this.handleListenerError('reservations', error);
                }
            );
    }
    
    handleReservationAdded(reservationData) {
        const docId = reservationData.id;
        const currentTime = Date.now();
        
        // 重複処理防止（5秒以内の同じドキュメントの処理をスキップ）
        if (this.lastProcessedReservations.has(docId)) {
            const lastProcessed = this.lastProcessedReservations.get(docId);
            if (currentTime - lastProcessed < 5000) {
                console.log(`[Firestore Listener] 予約追加の重複処理をスキップ: ${docId}`);
                return;
            }
        }
        
        this.lastProcessedReservations.set(docId, currentTime);
        
        console.log('[Firestore Listener] 外部から予約追加:', reservationData);
        
        // グローバル予約配列に追加（重複チェック付き）
        if (typeof reservations !== 'undefined' && Array.isArray(reservations)) {
            const existingIndex = reservations.findIndex(r => 
                r.id === docId || 
                r.reservationNumber === reservationData.reservationNumber ||
                r.firestore_id === docId
            );
            
            if (existingIndex === -1) {
                reservations.push(reservationData);
                console.log('[Firestore Listener] 予約配列に追加完了');
                
                // UI更新
                this.updateAllUI('external_reservation_added');
                
                // 通知表示
                const customerName = reservationData['Name-f'] || '名前なし';
                const reservationTime = `${reservationData.date} ${reservationData.Time}`;
                this.showNotification(
                    `外部サイトから新しい予約: ${customerName} (${reservationTime})`, 
                    'success'
                );
                
                // 音声通知（オプション）
                this.playNotificationSound();
                
            } else {
                console.log('[Firestore Listener] 予約は既に存在します（追加スキップ）');
            }
        }
    }
    
    handleReservationModified(reservationData, oldIndex, newIndex) {
        const docId = reservationData.id;
        
        console.log('[Firestore Listener] 外部から予約変更:', reservationData);
        
        // グローバル予約配列を更新
        if (typeof reservations !== 'undefined' && Array.isArray(reservations)) {
            const existingIndex = reservations.findIndex(r => 
                r.id === docId || 
                r.reservationNumber === reservationData.reservationNumber ||
                r.firestore_id === docId
            );
            
            if (existingIndex !== -1) {
                const oldData = reservations[existingIndex];
                reservations[existingIndex] = {
                    ...reservations[existingIndex],
                    ...reservationData
                };
                
                console.log('[Firestore Listener] 予約配列の更新完了');
                
                // UI更新
                this.updateAllUI('external_reservation_updated');
                
                // 変更内容の詳細通知
                const customerName = reservationData['Name-f'] || '名前なし';
                let changeDetails = [];
                
                if (oldData.states !== reservationData.states) {
                    const statusNames = {0: '来店前', 1: '来店済み', 2: 'キャンセル済み'};
                    changeDetails.push(`ステータス: ${statusNames[reservationData.states]}`);
                }
                
                if (oldData.Time !== reservationData.Time) {
                    changeDetails.push(`時間: ${reservationData.Time}`);
                }
                
                const changeText = changeDetails.length > 0 ? 
                    ` (${changeDetails.join(', ')})` : '';
                
                this.showNotification(
                    `外部サイトから予約変更: ${customerName}${changeText}`, 
                    'info'
                );
            } else {
                // 存在しない場合は新規追加として処理
                console.log('[Firestore Listener] 変更対象が見つからないため新規追加として処理');
                this.handleReservationAdded(reservationData);
            }
        }
    }
    
    handleReservationRemoved(reservationData) {
        const docId = reservationData.id;
        
        console.log('[Firestore Listener] 外部から予約削除:', reservationData);
        
        // グローバル予約配列から削除
        if (typeof reservations !== 'undefined' && Array.isArray(reservations)) {
            const existingIndex = reservations.findIndex(r => 
                r.id === docId || 
                r.reservationNumber === reservationData.reservationNumber ||
                r.firestore_id === docId
            );
            
            if (existingIndex !== -1) {
                reservations.splice(existingIndex, 1);
                console.log('[Firestore Listener] 予約配列から削除完了');
                
                // UI更新
                this.updateAllUI('external_reservation_removed');
                
                // 通知表示
                const customerName = reservationData['Name-f'] || '名前なし';
                this.showNotification(
                    `外部サイトから予約削除: ${customerName}`, 
                    'warning'
                );
            }
        }
    }
    
    setupBreakModeListener() {
        console.log('[Firestore Listener] 休憩モード監視リスナー設定開始');
        
        this.unsubscribeBreakMode = this.db.collection('break').doc('settings')
            .onSnapshot(
                (doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        console.log('[Firestore Listener] 外部から休憩モード変更:', data);
                        
                        // グローバル休憩モード状態を更新
                        if (typeof breakMode !== 'undefined') {
                            const oldTurn = breakMode.turn;
                            breakMode.turn = data.turn || false;
                            breakMode.custom = data.custom || '';
                            
                            // UI更新
                            if (typeof updateSignageDisplay === 'function') {
                                updateSignageDisplay();
                            }
                            
                            if (typeof displayReservations === 'function') {
                                displayReservations();
                            }
                            
                            // 状態変更時のみ通知
                            if (oldTurn !== breakMode.turn) {
                                const message = breakMode.turn ? 
                                    `外部から休憩開始: ${breakMode.custom}` : 
                                    '外部から営業再開';
                                
                                this.showNotification(message, 'info');
                            }
                        }
                    }
                },
                (error) => {
                    console.error('[Firestore Listener] 休憩モード監視エラー:', error);
                    this.handleListenerError('break-mode', error);
                }
            );
    }
    
    setupPopulationListener() {
        console.log('[Firestore Listener] 人数監視リスナー設定開始');
        
        this.unsubscribePopulation = this.db.collection('now_population').doc('signage')
            .onSnapshot(
                (doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        const newCount = data.now || 0;
                        
                        console.log('[Firestore Listener] 外部から人数変更:', newCount);
                        
                        // 現在の待ち人数を更新
                        const currentPopulationSpan = document.getElementById('current-population');
                        if (currentPopulationSpan) {
                            const oldCount = parseInt(currentPopulationSpan.textContent) || 0;
                            currentPopulationSpan.textContent = newCount;
                            
                            // 変更があった場合のみ軽い通知
                            if (oldCount !== newCount) {
                                this.showNotification(
                                    `外部から待ち人数更新: ${newCount}人`, 
                                    'info', 
                                    2000
                                );
                            }
                        }
                    }
                },
                (error) => {
                    console.error('[Firestore Listener] 人数監視エラー:', error);
                    this.handleListenerError('population', error);
                }
            );
    }
    
    handleListenerError(listenerName, error) {
        console.error(`[Firestore Listener] ${listenerName} エラー:`, error);
        
        // 権限エラーの場合は設定の確認を促す
        if (error.code === 'permission-denied') {
            this.showNotification(
                `${listenerName} の監視権限がありません。Firebase設定を確認してください。`, 
                'warning', 
                6000
            );
        } else {
            this.showNotification(
                `${listenerName} の監視でエラーが発生しました`, 
                'error', 
                4000
            );
        }
        
        // 再接続を試行（5秒後）
        setTimeout(() => {
            console.log(`[Firestore Listener] ${listenerName} の再接続を試行`);
            if (listenerName === 'reservations') {
                this.setupReservationsListener();
            } else if (listenerName === 'break-mode') {
                this.setupBreakModeListener();
            } else if (listenerName === 'population') {
                this.setupPopulationListener();
            }
        }, 5000);
    }
    
    updateAllUI(updateType) {
        console.log('[Firestore Listener] UI更新:', updateType);
        
        try {
            // 予約表示を更新
            if (typeof displayReservations === 'function') {
                displayReservations();
            }
            
            // カレンダーが表示されている場合は更新
            const calendarTab = document.getElementById('calendar-tab');
            if (calendarTab && calendarTab.classList.contains('active')) {
                setTimeout(() => {
                    if (typeof renderCalendar === 'function') {
                        renderCalendar();
                    }
                }, 200);
            }
            
        } catch (error) {
            console.error('[Firestore Listener] UI更新エラー:', error);
        }
    }
    
    showNotification(message, type = 'info', duration = 4000) {
        console.log(`[Firestore Listener] 通知: ${message}`);
        
        // realtimeUpdatesの通知機能を使用
        if (typeof realtimeUpdates !== 'undefined' && realtimeUpdates) {
            realtimeUpdates.showNotification(message, type, duration);
        } else {
            // フォールバック: コンソール出力
            console.log(`通知 [${type}]: ${message}`);
        }
    }
    
    playNotificationSound() {
        try {
            // 音声通知（ブラウザの制限により無音の場合があります）
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBzuR2Ov8hD8NF3vJ8N2QQAoUXrTp66hVFApGn+DyvmUgBzuR2Ov8hD8NFw==');
            audio.volume = 0.1;
            audio.play().catch(() => {
                // ブラウザが音声再生を拒否した場合は無視
            });
        } catch (error) {
            // 音声再生エラーは無視
        }
    }
    
    showFirebaseConfigHint() {
        const hintMessage = `
Firestore リアルタイム監視を有効にするには:

1. Firebase Console (console.firebase.google.com) でプロジェクト設定を確認
2. firestore-listener.js の firebaseConfig を実際の値に更新
3. Firestore セキュリティルールで読み取り権限を設定

例:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /reservations/{document} {
      allow read: if true;
    }
  }
}
        `;
        
        console.warn('[Firestore Listener] 設定ヒント:', hintMessage);
        
        this.showNotification(
            'Firebase設定が必要です。コンソールを確認してください。',
            'warning',
            8000
        );
    }
    
    disconnect() {
        console.log('[Firestore Listener] リスナー切断開始');
        
        try {
            if (this.unsubscribeReservations) {
                this.unsubscribeReservations();
                this.unsubscribeReservations = null;
            }
            
            if (this.unsubscribeBreakMode) {
                this.unsubscribeBreakMode();
                this.unsubscribeBreakMode = null;
            }
            
            if (this.unsubscribePopulation) {
                this.unsubscribePopulation();
                this.unsubscribePopulation = null;
            }
            
            this.isInitialized = false;
            console.log('[Firestore Listener] 全リスナー切断完了');
            
        } catch (error) {
            console.error('[Firestore Listener] 切断エラー:', error);
        }
    }
}

// グローバルインスタンス
let firestoreListener = null;

// 初期化関数
function initializeFirestoreListener() {
    if (!firestoreListener) {
        console.log('[Firestore Listener] インスタンス作成');
        firestoreListener = new FirestoreListener();
    }
    
    return firestoreListener.initialize();
}

// 切断関数
function disconnectFirestoreListener() {
    if (firestoreListener) {
        firestoreListener.disconnect();
    }
}

// グローバル関数として公開
window.initializeFirestoreListener = initializeFirestoreListener;
window.disconnectFirestoreListener = disconnectFirestoreListener;

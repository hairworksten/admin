// APIベースURL
const API_BASE_URL = 'https://reservation-api-knn6yth7rq-an.a.run.app/api';

// メニューカラー定義
const MENU_COLORS = [
    '#ff6b35', '#28a745', '#dc3545', '#6f42c1', 
    '#20c997', '#fd7e14', '#007bff', '#ffc107'
];

// ユーティリティ関数
function getMenuColorByIndex(index) {
    return MENU_COLORS[index % MENU_COLORS.length];
}

function getMenuColor(menuName) {
    const menuNames = Object.keys(currentMenus);
    const index = menuNames.indexOf(menuName);
    return index >= 0 ? getMenuColorByIndex(index) : MENU_COLORS[MENU_COLORS.length - 1];
}

// グローバル変数
let currentUser = null;
let reservations = [];
let mailTemplates = {};
let currentMailRecipient = '';
let currentCustomerName = '';
let currentMenus = {};
let currentTemplates = {};
let currentDate = new Date();
let currentReservationDetail = null;
let holidays = [];
let notices = [];
let breakMode = { turn: false, custom: '' };
let customSettings = { message: '', news: true }; // カスタムサイネージ設定

// 自動再読み込み機能
let autoReloadInterval = null;
const AUTO_RELOAD_INTERVAL = 60000; // 1分間隔（60秒）

// DOM要素の取得
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userIdInput = document.getElementById('user-id');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM読み込み完了');
    initializeEventListeners();
    checkLoginStatus();
});

// イベントリスナーの設定
function initializeEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    loginBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    logoutBtn.addEventListener('click', handleLogout);
    
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
        }
    });
    
    userIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            passwordInput.focus();
        }
    });
}

// ログイン状態チェック
function checkLoginStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = savedUser;
        showMainScreen();
    }
}

// ログイン処理
async function handleLogin() {
    if (loginBtn.disabled) return;
    
    hideError();
    const userId = userIdInput.value.trim();
    const password = passwordInput.value;

    if (!userId || !password) {
        showError('ユーザーIDとパスワードを入力してください');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'ログイン中...';

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, password: password })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            currentUser = data.user_id;
            localStorage.setItem('currentUser', currentUser);
            showMainScreen();
            hideError();
        } else {
            showError(data.error || 'ログインに失敗しました。IDまたはパスワードが間違っています。');
        }
    } catch (error) {
        console.error('Error during login:', error);
        showError('ネットワークエラーが発生しました。接続を確認してください。');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'ログイン';
    }
}

// エラー表示
function showError(message) {
    if (loginError) {
        loginError.textContent = message;
        loginError.classList.add('show');
        loginError.style.display = 'block';
        
        setTimeout(() => {
            hideError();
        }, 5000);
    } else {
        alert(message);
    }
}

// エラー非表示
function hideError() {
    if (loginError) {
        loginError.classList.remove('show');
        loginError.style.display = 'none';
        loginError.textContent = '';
    }
}

// ログアウト処理（修正版 - 自動再読み込み停止機能追加）
function handleLogout() {
    // 自動再読み込みを停止
    stopAutoReload();
    
    // リアルタイム更新も停止
    if (typeof stopRealtimeUpdates === 'function') {
        stopRealtimeUpdates();
    }
    
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLoginScreen();
}

// メイン画面表示（修正版 - 手動更新ボタンとリアルタイム機能追加）
function showMainScreen() {
    loginScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    
    // データ読み込み開始
    loadInitialData();
    
    // 手動更新ボタンを追加
    addManualRefreshButton();
    
    // リアルタイム更新も開始
    if (typeof startRealtimeUpdates === 'function') {
        startRealtimeUpdates();
    }
}

// ログイン画面表示
function showLoginScreen() {
    mainScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    userIdInput.value = '';
    passwordInput.value = '';
    hideError();
}

// 初期データ読み込み（修正版 - 自動再読み込み機能追加、カスタム設定追加）
async function loadInitialData() {
    try {
        console.log('[Auth] 初期データ読み込み開始');
        
        // 1. まず基本データを並行読み込み
        await Promise.all([
            loadBreakMode(),
            loadPopulation(),
            loadHolidays(),
            loadMenus(),
            loadNotices(),
            loadCustomSettings() // カスタム設定読み込み
        ]);
        
        // 2. メニューデータが読み込まれた後に予約データを読み込み
        await loadReservations();
        
        // 3. 最後にメールテンプレートを読み込み
        await loadMailTemplates();
        
        // 4. シフトデータの確認と読み込み
        await checkAndLoadShiftData();
        
        // 5. 全データ読み込み完了後にカレンダーが表示されている場合は再描画
        const calendarTab = document.getElementById('calendar-tab');
        if (calendarTab && calendarTab.classList.contains('active')) {
            setTimeout(() => {
                if (typeof renderCalendar === 'function') {
                    console.log('[Auth] カレンダー再描画実行');
                    renderCalendar();
                }
                if (typeof renderMenuLegend === 'function') {
                    renderMenuLegend();
                }
            }, 200);
        }
        
        // 6. 自動再読み込み機能を開始
        startAutoReload();
        
        console.log('[Auth] 初期データ読み込み完了');
        
    } catch (error) {
        console.error('[Auth] 初期データ読み込みエラー:', error);
    }
}

// カスタム設定読み込み
async function loadCustomSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/custom`);
        const data = await response.json();
        
        if (data.success) {
            customSettings = {
                message: data.message || '',
                news: data.news !== undefined ? data.news : true
            };
            console.log('[Auth] カスタム設定読み込み完了:', customSettings);
        } else {
            customSettings = { message: '', news: true };
        }
        
        // サイネージUIの更新
        if (typeof updateSignageDisplay === 'function') {
            updateSignageDisplay();
        }
        
    } catch (error) {
        console.error('Error loading custom settings:', error);
        customSettings = { message: '', news: true };
        if (typeof updateSignageDisplay === 'function') {
            updateSignageDisplay();
        }
    }
}

// 自動再読み込み開始
function startAutoReload() {
    // 既存のインターバルがある場合はクリア
    if (autoReloadInterval) {
        clearInterval(autoReloadInterval);
    }
    
    console.log('[Auth] 自動再読み込み開始 (1分間隔)');
    
    autoReloadInterval = setInterval(async () => {
        try {
            console.log('[Auth] 定期的なデータ更新実行');
            
            // 重要なデータのみを再読み込み
            await Promise.all([
                loadReservations(),
                loadBreakMode(),
                loadPopulation(),
                loadCustomSettings() // カスタム設定も更新
            ]);
            
            // UI更新
            updateUIAfterReload();
            
        } catch (error) {
            console.error('[Auth] 自動再読み込みエラー:', error);
        }
    }, AUTO_RELOAD_INTERVAL);
}

// 自動再読み込み停止
function stopAutoReload() {
    if (autoReloadInterval) {
        clearInterval(autoReloadInterval);
        autoReloadInterval = null;
        console.log('[Auth] 自動再読み込み停止');
    }
}

// UI更新処理
function updateUIAfterReload() {
    console.log('[Auth] UI更新開始');
    
    // 予約表示を更新
    if (typeof displayReservations === 'function') {
        displayReservations();
    }
    
    // カレンダーが表示されている場合は更新
    const calendarTab = document.getElementById('calendar-tab');
    if (calendarTab && calendarTab.classList.contains('active')) {
        if (typeof renderCalendar === 'function') {
            renderCalendar();
        }
    }
    
    // サイネージ表示を更新
    if (typeof updateSignageDisplay === 'function') {
        updateSignageDisplay();
    }
}

// 手動更新ボタンを追加（修正版 - 横並び対応）
function addManualRefreshButton() {
    const navbar = document.querySelector('.navbar .nav-buttons');
    if (navbar && !document.getElementById('manual-refresh-btn')) {
        // 新しい更新ボタンコンテナを作成
        const refreshContainer = document.createElement('div');
        refreshContainer.className = 'refresh-buttons-container';
        
        // データ更新ボタン
        const dataRefreshBtn = document.createElement('button');
        dataRefreshBtn.id = 'data-refresh-btn';
        dataRefreshBtn.className = 'btn btn-secondary refresh-btn';
        dataRefreshBtn.innerHTML = '<span class="refresh-icon">🔄</span><span class="refresh-text">データ</span>';
        dataRefreshBtn.title = '予約データとシステム設定を更新します';
        
        // カレンダー更新ボタン
        const calendarRefreshBtn = document.createElement('button');
        calendarRefreshBtn.id = 'calendar-refresh-btn';
        calendarRefreshBtn.className = 'btn btn-secondary refresh-btn';
        calendarRefreshBtn.innerHTML = '<span class="refresh-icon">📅</span><span class="refresh-text">表示</span>';
        calendarRefreshBtn.title = 'カレンダー表示を再描画します';
        
        // データ更新ボタンのイベントリスナー
        dataRefreshBtn.addEventListener('click', async function() {
            this.disabled = true;
            this.innerHTML = '<span class="refresh-icon">⏳</span><span class="refresh-text">更新中</span>';
            
            try {
                await Promise.all([
                    loadReservations(),
                    loadBreakMode(),
                    loadPopulation(),
                    loadMenus(),
                    loadNotices(),
                    loadCustomSettings() // カスタム設定も更新
                ]);
                
                updateUIAfterReload();
                
                // 成功表示
                this.innerHTML = '<span class="refresh-icon">✓</span><span class="refresh-text">完了</span>';
                setTimeout(() => {
                    this.innerHTML = '<span class="refresh-icon">🔄</span><span class="refresh-text">データ</span>';
                    this.disabled = false;
                }, 2000);
                
            } catch (error) {
                console.error('データ更新エラー:', error);
                this.innerHTML = '<span class="refresh-icon">⚠</span><span class="refresh-text">エラー</span>';
                setTimeout(() => {
                    this.innerHTML = '<span class="refresh-icon">🔄</span><span class="refresh-text">データ</span>';
                    this.disabled = false;
                }, 2000);
            }
        });
        
        // カレンダー更新ボタンのイベントリスナー
        calendarRefreshBtn.addEventListener('click', function() {
            this.disabled = true;
            this.innerHTML = '<span class="refresh-icon">⏳</span><span class="refresh-text">更新中</span>';
            
            try {
                // カレンダー表示を更新
                if (typeof renderCalendar === 'function') {
                    renderCalendar();
                }
                if (typeof renderMenuLegend === 'function') {
                    renderMenuLegend();
                }
                
                // 成功表示
                this.innerHTML = '<span class="refresh-icon">✓</span><span class="refresh-text">完了</span>';
                setTimeout(() => {
                    this.innerHTML = '<span class="refresh-icon">📅</span><span class="refresh-text">表示</span>';
                    this.disabled = false;
                }, 1500);
                
            } catch (error) {
                console.error('カレンダー更新エラー:', error);
                this.innerHTML = '<span class="refresh-icon">⚠</span><span class="refresh-text">エラー</span>';
                setTimeout(() => {
                    this.innerHTML = '<span class="refresh-icon">📅</span><span class="refresh-text">表示</span>';
                    this.disabled = false;
                }, 2000);
            }
        });
        
        // ボタンをコンテナに追加
        refreshContainer.appendChild(dataRefreshBtn);
        refreshContainer.appendChild(calendarRefreshBtn);
        
        // ログアウトボタンの前に挿入
        navbar.insertBefore(refreshContainer, navbar.firstChild);
        console.log('[Auth] 手動更新ボタン（横並び）を追加');
    }
}

// ページの可視性変更に対応
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // ページが非表示になったら自動再読み込みを停止
        console.log('[Auth] ページ非表示 - 自動再読み込み停止');
        stopAutoReload();
    } else if (currentUser) {
        // ページが再表示されたら自動再読み込みを再開
        console.log('[Auth] ページ表示 - 自動再読み込み再開');
        startAutoReload();
        
        // 即座にデータを更新
        setTimeout(async () => {
            try {
                await Promise.all([
                    loadReservations(),
                    loadBreakMode(),
                    loadPopulation(),
                    loadCustomSettings() // カスタム設定も更新
                ]);
                updateUIAfterReload();
            } catch (error) {
                console.error('ページ表示時の更新エラー:', error);
            }
        }, 1000);
    }
});

// シフトデータの確認と読み込み
async function checkAndLoadShiftData() {
    try {
        console.log('[Auth] シフトデータ確認開始');
        
        // ローカルストレージからシフトデータを確認
        const savedShiftData = localStorage.getItem('shiftData');
        if (savedShiftData) {
            try {
                const parsedShiftData = JSON.parse(savedShiftData);
                
                // グローバル変数に設定
                if (typeof window !== 'undefined') {
                    window.shiftData = parsedShiftData;
                }
                
                // shift-management.js のグローバル変数にも設定
                if (typeof shiftData !== 'undefined') {
                    shiftData = parsedShiftData;
                }
                
                console.log('[Auth] ローカルストレージからシフトデータを読み込み:', Object.keys(parsedShiftData).length, '日分');
                
                // シフト管理機能が初期化されていない場合は初期化を促す
                if (typeof window.initializeShiftManagement === 'function' && !window.shiftManagementInitialized) {
                    console.log('[Auth] シフト管理機能の初期化を実行');
                    setTimeout(() => {
                        window.initializeShiftManagement();
                    }, 100);
                }
                
            } catch (parseError) {
                console.error('[Auth] シフトデータ解析エラー:', parseError);
                localStorage.removeItem('shiftData');
                localStorage.removeItem('shiftFileName');
            }
        } else {
            console.log('[Auth] ローカルストレージにシフトデータなし');
            
            // 空のシフトデータを設定
            if (typeof window !== 'undefined') {
                window.shiftData = {};
            }
            if (typeof shiftData !== 'undefined') {
                shiftData = {};
            }
        }
        
        // サーバーからシフトデータを取得を試行（失敗してもローカルデータを使用）
        try {
            await loadShiftDataFromServer();
        } catch (serverError) {
            console.warn('[Auth] サーバーからのシフトデータ取得失敗（ローカルデータを使用）:', serverError.message);
        }
        
    } catch (error) {
        console.error('[Auth] シフトデータ確認エラー:', error);
    }
}

// サーバーからシフトデータを読み込み
async function loadShiftDataFromServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/shifts`);
        if (response.ok) {
            const serverShiftData = await response.json();
            
            if (serverShiftData && typeof serverShiftData === 'object') {
                // サーバーデータを統合
                if (typeof window !== 'undefined') {
                    window.shiftData = { ...window.shiftData, ...serverShiftData };
                }
                if (typeof shiftData !== 'undefined') {
                    shiftData = { ...shiftData, ...serverShiftData };
                }
                
                console.log('[Auth] サーバーからシフトデータを取得・統合');
            }
        }
    } catch (error) {
        // サーバーエラーは無視（ローカルデータを使用）
        console.warn('[Auth] サーバーシフトデータ取得エラー:', error.message);
    }
}

// 休憩モード読み込み
async function loadBreakMode() {
    try {
        const response = await fetch(`${API_BASE_URL}/break-mode`);
        const data = await response.json();
        
        if (data.success) {
            breakMode = {
                turn: data.turn,
                custom: data.custom
            };
        } else {
            breakMode = { turn: false, custom: '' };
        }
        
        // サイネージUIの更新
        updateSignageDisplay();
        
    } catch (error) {
        console.error('Error loading break mode:', error);
        breakMode = { turn: false, custom: '' };
        updateSignageDisplay();
    }
}

// サイネージ表示更新（修正版 - 直接イベントリスナー設定）
function updateSignageDisplay() {
    const signageSection = document.querySelector('#signage-management');
    if (!signageSection) {
        console.warn('[Auth] signage-management セクションが見つかりません');
        return;
    }
    
    console.log('[Auth] サイネージ表示更新開始');
    
    if (breakMode.turn) {
        // 休憩モード時の表示
        signageSection.innerHTML = `
            <div class="break-mode-display">
                <div class="break-status">
                    <span style="color: #dc3545; font-size: 1.5em; font-weight: bold;">休憩中</span>
                </div>
                <div class="break-message">
                    <span style="color: #ffffff; font-size: 1.2em;">表示メッセージ：${breakMode.custom}</span>
                </div>
                <div class="break-actions" style="margin-top: 20px;">
                    <button id="resume-business-btn" class="btn btn-success">営業再開</button>
                </div>
            </div>
        `;
        
        // 営業再開ボタンのイベントリスナー追加
        const resumeBtn = document.getElementById('resume-business-btn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', handleResumeBusiness);
            console.log('[Auth] 営業再開ボタンにイベントリスナー設定');
        }
        
    } else {
        // 通常営業時の表示
        signageSection.innerHTML = `
            <div class="population-control">
                <div class="population-display">
                    <span>現在の待ち人数: </span>
                    <span id="current-population">0</span>
                </div>
                <div class="population-buttons">
                    <button id="population-minus" class="btn btn-primary">-</button>
                    <button id="population-plus" class="btn btn-primary">+</button>
                </div>
                <div class="break-control-inline">
                    <button id="start-break-btn" class="btn btn-secondary">休憩開始</button>
                </div>
            </div>
            
            <!-- カスタムメッセージ管理セクション -->
            <div class="custom-message-section">
                <h3>カスタムメッセージ</h3>
                <div class="custom-message-display">
                    <div class="current-message">
                        <span>現在のメッセージ: </span>
                        <span id="current-custom-message">設定されていません</span>
                    </div>
                    <div class="custom-message-actions">
                        <button id="change-custom-message-btn" class="btn btn-primary">メッセージ変更</button>
                    </div>
                </div>
            </div>
            
            <!-- ニュース表示管理セクション -->
            <div class="news-display-section">
                <h3>ニュース表示</h3>
                <div class="news-display-control">
                    <div class="news-status">
                        <span>ニュース表示: </span>
                        <span id="current-news-status">ON</span>
                    </div>
                    <div class="news-display-actions">
                        <button id="toggle-news-display-btn" class="btn btn-secondary">表示切替</button>
                    </div>
                </div>
            </div>
        `;
        
        // 人数変更ボタンのイベントリスナー再設定
        const populationMinusBtn = document.getElementById('population-minus');
        const populationPlusBtn = document.getElementById('population-plus');
        if (populationMinusBtn) {
            populationMinusBtn.addEventListener('click', () => updatePopulation(-1));
            console.log('[Auth] 人数マイナスボタンにイベントリスナー設定');
        }
        if (populationPlusBtn) {
            populationPlusBtn.addEventListener('click', () => updatePopulation(1));
            console.log('[Auth] 人数プラスボタンにイベントリスナー設定');
        }
        
        // 休憩開始ボタンのイベントリスナー追加
        const startBreakBtn = document.getElementById('start-break-btn');
        if (startBreakBtn) {
            startBreakBtn.addEventListener('click', handleStartBreak);
            console.log('[Auth] 休憩開始ボタンにイベントリスナー設定');
        }
        
        // ★重要：カスタムメッセージとニュース表示ボタンのイベントリスナーを直接設定
        const changeCustomMessageBtn = document.getElementById('change-custom-message-btn');
        const toggleNewsDisplayBtn = document.getElementById('toggle-news-display-btn');
        
        if (changeCustomMessageBtn) {
            changeCustomMessageBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('[Auth] カスタムメッセージボタンがクリックされました');
                openCustomMessageModal();
            });
            console.log('[Auth] カスタムメッセージボタンにイベントリスナー設定');
        } else {
            console.error('[Auth] change-custom-message-btn要素が見つかりません');
        }
        
        if (toggleNewsDisplayBtn) {
            toggleNewsDisplayBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('[Auth] ニュース表示切り替えボタンがクリックされました');
                toggleNewsDisplay();
            });
            console.log('[Auth] ニュース表示切り替えボタンにイベントリスナー設定');
        } else {
            console.error('[Auth] toggle-news-display-btn要素が見つかりません');
        }
        
        // UI更新
        updateSignageUIDirectly();
        
        // 人数データを再読み込み
        loadPopulation();
    }
}

// サイネージUIを直接更新
function updateSignageUIDirectly() {
    console.log('[Auth] サイネージUI直接更新:', customSettings);
    
    // カスタムメッセージ表示更新
    const currentCustomMessageSpan = document.getElementById('current-custom-message');
    if (currentCustomMessageSpan) {
        const messageText = customSettings.message || '設定されていません';
        currentCustomMessageSpan.textContent = messageText;
        currentCustomMessageSpan.style.color = customSettings.message ? '#ffffff' : '#888';
        currentCustomMessageSpan.style.fontStyle = customSettings.message ? 'normal' : 'italic';
        console.log('[Auth] カスタムメッセージ表示更新:', messageText);
    } else {
        console.warn('[Auth] current-custom-message要素が見つかりません');
    }
    
    // ニュース表示ステータス更新
    const currentNewsStatusSpan = document.getElementById('current-news-status');
    if (currentNewsStatusSpan) {
        const statusText = customSettings.news ? 'ON' : 'OFF';
        currentNewsStatusSpan.textContent = statusText;
        currentNewsStatusSpan.style.color = customSettings.news ? '#28a745' : '#dc3545';
        currentNewsStatusSpan.style.fontWeight = 'bold';
        console.log('[Auth] ニュース表示ステータス更新:', statusText);
    } else {
        console.warn('[Auth] current-news-status要素が見つかりません');
    }
    
    // ニュース表示ボタンのテキスト更新
    const toggleNewsDisplayBtn = document.getElementById('toggle-news-display-btn');
    if (toggleNewsDisplayBtn) {
        toggleNewsDisplayBtn.textContent = customSettings.news ? 'ニュース非表示' : 'ニュース表示';
        toggleNewsDisplayBtn.className = customSettings.news ? 'btn btn-warning' : 'btn btn-success';
        console.log('[Auth] ニュース表示ボタン更新:', toggleNewsDisplayBtn.textContent);
    } else {
        console.warn('[Auth] toggle-news-display-btn要素が見つかりません');
    }
}

// カスタムメッセージモーダルを開く
function openCustomMessageModal() {
    console.log('[Auth] カスタムメッセージモーダルを開く');
    
    const customMessageModal = document.getElementById('custom-message-modal');
    if (customMessageModal) {
        const customMessageInput = document.getElementById('custom-message-input');
        if (customMessageInput) {
            customMessageInput.value = customSettings.message || '';
            // フォーカスは少し遅延させる
            setTimeout(() => {
                if (customMessageInput) {
                    customMessageInput.focus();
                }
            }, 100);
        }
        
        customMessageModal.classList.add('active');
        console.log('[Auth] カスタムメッセージモーダル表示');
        
        // モーダル内のイベントリスナーを設定
        setupCustomMessageModalEvents();
        
    } else {
        console.error('[Auth] カスタムメッセージモーダルが見つかりません');
        alert('カスタムメッセージモーダルを開けませんでした。');
    }
}

// ニュース表示切り替え
function toggleNewsDisplay() {
    console.log('[Auth] ニュース表示切り替え処理開始');
    
    const newNewsStatus = !customSettings.news;
    console.log('[Auth] 新しいニュース表示状態:', newNewsStatus);
    
    // 確認ダイアログ
    const confirmMessage = `ニュース表示を${newNewsStatus ? 'ON' : 'OFF'}にしますか？`;
    if (!confirm(confirmMessage)) {
        console.log('[Auth] ニュース表示切り替えキャンセル');
        return;
    }
    
    const toggleNewsDisplayBtn = document.getElementById('toggle-news-display-btn');
    
    // ボタン無効化
    if (toggleNewsDisplayBtn) {
        toggleNewsDisplayBtn.disabled = true;
        toggleNewsDisplayBtn.textContent = '更新中...';
    }
    
    handleToggleNewsDisplay(newNewsStatus);
}

// ニュース表示切り替え処理
async function handleToggleNewsDisplay(newNewsStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/custom/news`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ news: newNewsStatus })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[Auth] ニュース表示API応答:', data);
        
        if (data.success) {
            customSettings.news = newNewsStatus;
            updateSignageUIDirectly();
            alert(`ニュース表示を${newNewsStatus ? 'ON' : 'OFF'}にしました。`);
            console.log('[Auth] ニュース表示切り替え成功');
        } else {
            throw new Error(data.error || 'ニュース表示設定の更新に失敗しました');
        }
    } catch (error) {
        console.error('[Auth] ニュース表示更新エラー:', error);
        alert(`ニュース表示設定の更新に失敗しました。\nエラー: ${error.message}`);
    } finally {
        // ボタン再有効化
        const toggleNewsDisplayBtn = document.getElementById('toggle-news-display-btn');
        if (toggleNewsDisplayBtn) {
            toggleNewsDisplayBtn.disabled = false;
            updateSignageUIDirectly(); // ボタンテキストを元に戻す
        }
    }
}

// カスタムメッセージモーダルのイベント設定
function setupCustomMessageModalEvents() {
    console.log('[Auth] カスタムメッセージモーダルイベント設定');
    
    const updateBtn = document.getElementById('update-custom-message-btn');
    const cancelBtn = document.getElementById('cancel-custom-message-btn');
    const templateBtns = document.querySelectorAll('.template-btn');
    
    // 更新ボタン
    if (updateBtn) {
        // 既存のイベントリスナーを削除してから新しいものを追加
        updateBtn.removeEventListener('click', handleUpdateCustomMessage);
        updateBtn.addEventListener('click', handleUpdateCustomMessage);
        console.log('[Auth] 更新ボタンにイベントリスナー設定');
    } else {
        console.warn('[Auth] 更新ボタンが見つかりません');
    }
    
    // キャンセルボタン
    if (cancelBtn) {
        cancelBtn.removeEventListener('click', closeCustomMessageModal);
        cancelBtn.addEventListener('click', closeCustomMessageModal);
        console.log('[Auth] キャンセルボタンにイベントリスナー設定');
    }
    
    // 定型文ボタン
    templateBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const template = this.dataset.template;
            const input = document.getElementById('custom-message-input');
            if (input && template) {
                input.value = template;
                console.log('[Auth] 定型文適用:', template);
            }
        });
    });
    
    console.log('[Auth] 定型文ボタン設定完了:', templateBtns.length, '個');
}

// カスタムメッセージモーダルを閉じる
function closeCustomMessageModal() {
    console.log('[Auth] カスタムメッセージモーダルを閉じる');
    
    const modal = document.getElementById('custom-message-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // フォームをリセット
    const input = document.getElementById('custom-message-input');
    if (input) {
        input.value = '';
    }
}

// カスタムメッセージ更新処理
async function handleUpdateCustomMessage(e) {
    if (e) e.preventDefault();
    
    console.log('[Auth] カスタムメッセージ更新処理開始');
    
    const input = document.getElementById('custom-message-input');
    const newMessage = input ? input.value.trim() : '';
    
    console.log('[Auth] 新しいメッセージ:', newMessage);
    
    const updateBtn = document.getElementById('update-custom-message-btn');
    
    // ボタン無効化
    if (updateBtn) {
        updateBtn.disabled = true;
        updateBtn.textContent = '更新中...';
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/custom/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: newMessage })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[Auth] カスタムメッセージAPI応答:', data);
        
        if (data.success) {
            customSettings.message = newMessage;
            updateSignageUIDirectly();
            closeCustomMessageModal();
            
            const successMessage = newMessage ? 
                `カスタムメッセージを更新しました。\n「${newMessage}」` :
                'カスタムメッセージをクリアしました。';
            
            alert(successMessage);
            console.log('[Auth] カスタムメッセージ更新成功');
        } else {
            throw new Error(data.error || 'カスタムメッセージの更新に失敗しました');
        }
    } catch (error) {
        console.error('[Auth] カスタムメッセージ更新エラー:', error);
        alert(`カスタムメッセージの更新に失敗しました。\nエラー: ${error.message}`);
    } finally {
        // ボタン再有効化
        if (updateBtn) {
            updateBtn.disabled = false;
            updateBtn.textContent = 'メッセージ更新';
        }
    }
}

// 休憩開始処理
function handleStartBreak() {
    showBreakMessageModal();
}

// 休憩メッセージモーダル表示
function showBreakMessageModal() {
    const modalHTML = `
        <div id="break-message-modal" class="modal active">
            <div class="modal-content">
                <h3>休憩メッセージ設定</h3>
                <div class="break-message-form">
                    <label for="break-custom-message">カスタムメッセージを入力してください。</label>
                    <input type="text" id="break-custom-message" placeholder="例：14:00まで休憩中です。">
                    
                    <div class="break-templates" style="margin: 20px 0;">
                        <h4>定型文</h4>
                        <div class="break-template-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button class="btn btn-secondary btn-small break-template-btn" data-template="まで休憩中です。">まで休憩中です。</button>
                            <button class="btn btn-secondary btn-small break-template-btn" data-template="一時的に休憩中です。">一時的に休憩中です。</button>
                            <button class="btn btn-secondary btn-small break-template-btn" data-template="しばらく休憩いたします。">しばらく休憩いたします。</button>
                        </div>
                    </div>
                    
                    <div class="modal-buttons">
                        <button id="update-break-btn" class="btn btn-primary">更新</button>
                        <button id="cancel-break-btn" class="btn btn-secondary">キャンセル</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 既存のモーダルがある場合は削除
    const existingModal = document.getElementById('break-message-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // モーダルを追加
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // イベントリスナー設定
    const customMessageInput = document.getElementById('break-custom-message');
    const updateBreakBtn = document.getElementById('update-break-btn');
    const cancelBreakBtn = document.getElementById('cancel-break-btn');
    const templateBtns = document.querySelectorAll('.break-template-btn');
    
    // 定型文ボタンのイベントリスナー
    templateBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const template = this.dataset.template;
            if (customMessageInput) {
                customMessageInput.value = template;
            }
        });
    });
    
    // 更新ボタンのイベントリスナー
    if (updateBreakBtn) {
        updateBreakBtn.addEventListener('click', function() {
            const customMessage = customMessageInput ? customMessageInput.value.trim() : '';
            if (!customMessage) {
                alert('メッセージを入力してください。');
                return;
            }
            handleUpdateBreakMode(true, customMessage);
        });
    }
    
    // キャンセルボタンのイベントリスナー
    if (cancelBreakBtn) {
        cancelBreakBtn.addEventListener('click', closeBreakMessageModal);
    }
    
    // モーダル外クリックで閉じる
    const modal = document.getElementById('break-message-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeBreakMessageModal();
            }
        });
    }
    
    // 入力フォーカス
    if (customMessageInput) {
        customMessageInput.focus();
    }
}

// 休憩メッセージモーダルを閉じる
function closeBreakMessageModal() {
    const modal = document.getElementById('break-message-modal');
    if (modal) {
        modal.remove();
    }
}

// 休憩モード更新処理
async function handleUpdateBreakMode(turn, custom = '') {
    try {
        const response = await fetch(`${API_BASE_URL}/break-mode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ turn, custom })
        });
        
        const data = await response.json();
        
        if (data.success) {
            breakMode = { turn, custom };
            updateSignageDisplay();
            closeBreakMessageModal();
            
            if (turn) {
                alert(`休憩モードを開始しました。\n表示メッセージ：${custom}`);
            } else {
                alert('営業を再開しました。');
            }
        } else {
            throw new Error(data.error || '休憩モードの更新に失敗しました');
        }
        
    } catch (error) {
        console.error('Error updating break mode:', error);
        alert('休憩モードの更新に失敗しました。\nエラー: ' + error.message);
    }
}

// 営業再開処理
function handleResumeBusiness() {
    if (confirm('営業を再開しますか？')) {
        handleUpdateBreakMode(false, '');
    }
}

// 人数データ読み込み
async function loadPopulation() {
    try {
        const response = await fetch(`${API_BASE_URL}/population`);
        const data = await response.json();
        const currentPopulationSpan = document.getElementById('current-population');
        if (currentPopulationSpan) {
            currentPopulationSpan.textContent = data.now || 0;
        }
    } catch (error) {
        console.error('Error loading population:', error);
    }
}

// 人数更新
async function updatePopulation(change) {
    const currentPopulationSpan = document.getElementById('current-population');
    if (!currentPopulationSpan) return;
    
    const currentCount = parseInt(currentPopulationSpan.textContent);
    const newCount = Math.max(0, currentCount + change);

    try {
        const response = await fetch(`${API_BASE_URL}/population`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ now: newCount })
        });

        if (response.ok) {
            currentPopulationSpan.textContent = newCount;
        }
    } catch (error) {
        console.error('Error updating population:', error);
    }
}

// 予約データ読み込み（修正版 - メニューデータ依存を考慮）
async function loadReservations() {
    try {
        const response = await fetch(`${API_BASE_URL}/reservations`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            reservations = data;
        } else {
            reservations = [];
        }
        
        if (typeof displayReservations === 'function') {
            displayReservations();
        }
        
        // カレンダーが表示されている場合は再描画
        const calendarTab = document.getElementById('calendar-tab');
        if (calendarTab && calendarTab.classList.contains('active') && typeof renderCalendar === 'function') {
            // メニューデータが読み込まれていることを確認してから描画
            if (currentMenus && Object.keys(currentMenus).length > 0) {
                renderCalendar();
            }
        }
    } catch (error) {
        console.error('Error loading reservations:', error);
        reservations = [];
        if (typeof displayReservations === 'function') {
            displayReservations();
        }
    }
}

// メールテンプレート読み込み
async function loadMailTemplates() {
    try {
        const response = await fetch(`${API_BASE_URL}/mail-templates`);
        mailTemplates = await response.json();
        if (typeof displayTemplates === 'function') {
            displayTemplates();
        }
    } catch (error) {
        console.error('Error loading mail templates:', error);
    }
}

// 定休日読み込み
async function loadHolidays() {
    try {
        const response = await fetch(`${API_BASE_URL}/holidays`);
        const holidayData = await response.json();
        holidays = holidayData;
        if (typeof displayHolidays === 'function') {
            displayHolidays(holidayData);
        }
        
        const calendarTab = document.getElementById('calendar-tab');
        if (calendarTab && calendarTab.classList.contains('active') && typeof renderCalendar === 'function') {
            renderCalendar();
        }
    } catch (error) {
        console.error('Error loading holidays:', error);
        holidays = [];
    }
}

// メニュー読み込み（修正版 - 読み込み完了後にカレンダー更新）
async function loadMenus() {
    try {
        const response = await fetch(`${API_BASE_URL}/menus`);
        const menus = await response.json();
        currentMenus = menus;
        
        console.log('メニューデータ読み込み完了:', Object.keys(currentMenus));
        
        if (typeof displayMenus === 'function') {
            displayMenus(menus);
        }
        
        // メニューデータが読み込まれた後、カレンダーが表示されている場合は再描画
        const calendarTab = document.getElementById('calendar-tab');
        if (calendarTab && calendarTab.classList.contains('active')) {
            setTimeout(() => {
                if (typeof renderCalendar === 'function') {
                    renderCalendar();
                }
                if (typeof renderMenuLegend === 'function') {
                    renderMenuLegend();
                }
            }, 50);
        }
    } catch (error) {
        console.error('Error loading menus:', error);
        currentMenus = {};
    }
}

// 重要なお知らせ読み込み
async function loadNotices() {
    try {
        const response = await fetch(`${API_BASE_URL}/notices`);
        const data = await response.json();
        
        if (data.success && Array.isArray(data.notices)) {
            notices = data.notices;
            if (typeof displayNotices === 'function') {
                displayNotices(notices);
            }
        } else {
            notices = [];
        }
    } catch (error) {
        console.error('Error loading notices:', error);
        notices = [];
    }
}

// グローバル関数として公開
window.startAutoReload = startAutoReload;
window.stopAutoReload = stopAutoReload;
window.updateUIAfterReload = updateUIAfterReload;
window.customSettings = customSettings;
window.loadCustomSettings = loadCustomSettings;

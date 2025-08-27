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

// 初期データ読み込み（修正版 - 自動再読み込み機能追加）
async function loadInitialData() {
    try {
        console.log('[Auth] 初期データ読み込み開始');
        
        // 1. まず基本データを並行読み込み
        await Promise.all([
            loadBreakMode(),
            loadPopulation(),
            loadHolidays(),
            loadMenus(),
            loadNotices()
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
                loadPopulation()
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

// 手動更新ボタンを追加
function addManualRefreshButton() {
    const navbar = document.querySelector('.navbar .nav-buttons');
    if (navbar && !document.getElementById('manual-refresh-btn')) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'manual-refresh-btn';
        refreshBtn.className = 'btn btn-secondary';
        refreshBtn.innerHTML = '🔄 更新';
        refreshBtn.style.marginRight = '10px';
        refreshBtn.title = '最新のデータを取得します';
        
        refreshBtn.addEventListener('click', async function() {
            this.disabled = true;
            this.textContent = '更新中...';
            
            try {
                await Promise.all([
                    loadReservations(),
                    loadBreakMode(),
                    loadPopulation(),
                    loadMenus(),
                    loadNotices()
                ]);
                
                updateUIAfterReload();
                
                // 成功表示
                this.textContent = '✓ 完了';
                setTimeout(() => {
                    this.innerHTML = '🔄 更新';
                    this.disabled = false;
                }, 2000);
                
            } catch (error) {
                console.error('手動更新エラー:', error);
                this.textContent = '⚠ エラー';
                setTimeout(() => {
                    this.innerHTML = '🔄 更新';
                    this.disabled = false;
                }, 2000);
            }
        });
        
        navbar.insertBefore(refreshBtn, navbar.firstChild);
        console.log('[Auth] 手動更新ボタンを追加');
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
                    loadPopulation()
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

// サイネージ表示更新
function updateSignageDisplay() {
    const signageSection = document.querySelector('.section h2');
    if (!signageSection || signageSection.textContent !== 'サイネージの更新') return;
    
    const section = signageSection.parentElement;
    
    if (breakMode.turn) {
        // 休憩モード時の表示
        section.innerHTML = `
            <h2>サイネージの更新</h2>
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
        }
        
    } else {
        // 通常営業時の表示
        section.innerHTML = `
            <h2>サイネージの更新</h2>
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
        `;
        
        // 人数変更ボタンのイベントリスナー再設定
        const populationMinusBtn = document.getElementById('population-minus');
        const populationPlusBtn = document.getElementById('population-plus');
        if (populationMinusBtn) populationMinusBtn.addEventListener('click', () => updatePopulation(-1));
        if (populationPlusBtn) populationPlusBtn.addEventListener('click', () => updatePopulation(1));
        
        // 休憩開始ボタンのイベントリスナー追加
        const startBreakBtn = document.getElementById('start-break-btn');
        if (startBreakBtn) {
            startBreakBtn.addEventListener('click', handleStartBreak);
        }
        
        // 人数データを再読み込み
        loadPopulation();
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

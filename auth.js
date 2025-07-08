// APIベースURL
const API_BASE_URL = 'https://reservation-api-36382648212.asia-northeast1.run.app/api';

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
let notices = []; // 重要なお知らせ用グローバル変数を追加

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

// ログアウト処理
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLoginScreen();
}

// メイン画面表示
function showMainScreen() {
    loginScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    loadInitialData();
}

// ログイン画面表示
function showLoginScreen() {
    mainScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    userIdInput.value = '';
    passwordInput.value = '';
    hideError();
}

// 初期データ読み込み
async function loadInitialData() {
    await loadPopulation();
    await loadReservations();
    await loadMailTemplates();
    await loadHolidays();
    await loadMenus();
    await loadNotices(); // 重要なお知らせの読み込みを追加
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

// 予約データ読み込み
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
        
        const calendarTab = document.getElementById('calendar-tab');
        if (calendarTab && calendarTab.classList.contains('active') && typeof renderCalendar === 'function') {
            renderCalendar();
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

// メニュー読み込み
async function loadMenus() {
    try {
        const response = await fetch(`${API_BASE_URL}/menus`);
        const menus = await response.json();
        currentMenus = menus;
        if (typeof displayMenus === 'function') {
            displayMenus(menus);
        }
    } catch (error) {
        console.error('Error loading menus:', error);
    }
}

// 重要なお知らせ読み込み - 新規追加
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

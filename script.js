// APIベースURL
const API_BASE_URL = 'https://reservation-api-36382648212.asia-northeast1.run.app/api';

// グローバル変数
let currentUser = null;
let reservations = [];
let mailTemplates = {};
let currentMailRecipient = '';
let currentMenus = {};
let currentTemplates = {};

// DOM要素の取得
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userIdInput = document.getElementById('user-id');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

// タブ関連
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// 人数関連
const currentPopulationSpan = document.getElementById('current-population');
const populationMinusBtn = document.getElementById('population-minus');
const populationPlusBtn = document.getElementById('population-plus');

// 予約表示エリア
const todayReservationsDiv = document.getElementById('today-reservations');
const reservationHistoryDiv = document.getElementById('reservation-history');

// 検索関連
const searchTextInput = document.getElementById('search-text');
const searchDateFromInput = document.getElementById('search-date-from');
const searchDateToInput = document.getElementById('search-date-to');
const searchBtn = document.getElementById('search-btn');
const clearSearchBtn = document.getElementById('clear-search-btn');

// パスワード変更
const oldPasswordInput = document.getElementById('old-password');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const changePasswordBtn = document.getElementById('change-password-btn');

// 定休日関連
const holidayDateInput = document.getElementById('holiday-date');
const addHolidayBtn = document.getElementById('add-holiday-btn');
const holidaysListDiv = document.getElementById('holidays-list');
const holidayMessage = document.getElementById('holiday-message');

// メニュー関連
const menuNameInput = document.getElementById('menu-name');
const menuTextInput = document.getElementById('menu-text');
const menuWorktimeInput = document.getElementById('menu-worktime');
const menuFareInput = document.getElementById('menu-fare');
const addMenuBtn = document.getElementById('add-menu-btn');
const menusListDiv = document.getElementById('menus-list');

// テンプレート関連
const templateTitleInput = document.getElementById('template-title');
const templateMainInput = document.getElementById('template-main');
const addTemplateBtn = document.getElementById('add-template-btn');
const templatesListDiv = document.getElementById('templates-list');

// モーダル関連
const mailModal = document.getElementById('mail-modal');
const confirmModal = document.getElementById('confirm-modal');
const mailTemplatesListDiv = document.getElementById('mail-templates-list');
const mailSubjectInput = document.getElementById('mail-subject');
const mailBodyInput = document.getElementById('mail-body');
const sendMailBtn = document.getElementById('send-mail-btn');
const cancelMailBtn = document.getElementById('cancel-mail-btn');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmNoBtn = document.getElementById('confirm-no-btn');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM読み込み完了');
    
    // エラー要素の存在確認
    const loginErrorElement = document.getElementById('login-error');
    console.log('ログインエラー要素:', loginErrorElement);
    
    initializeEventListeners();
    checkLoginStatus();
});

// イベントリスナーの設定
function initializeEventListeners() {
    // ログイン関連 - touchstartとclickの両方に対応
    loginBtn.addEventListener('click', handleLogin);
    loginBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    logoutBtn.addEventListener('click', handleLogout);
    
    // Enterキーでログイン
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

    // タブ切り替え
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // 人数変更
    populationMinusBtn.addEventListener('click', () => updatePopulation(-1));
    populationPlusBtn.addEventListener('click', () => updatePopulation(1));

    // パスワード変更
    changePasswordBtn.addEventListener('click', handlePasswordChange);

    // 定休日追加
    addHolidayBtn.addEventListener('click', handleAddHoliday);

    // メニュー追加
    addMenuBtn.addEventListener('click', handleAddMenu);

    // テンプレート追加
    addTemplateBtn.addEventListener('click', handleAddTemplate);

    // モーダル関連
    cancelMailBtn.addEventListener('click', closeMailModal);
    sendMailBtn.addEventListener('click', handleSendMail);
    confirmNoBtn.addEventListener('click', closeConfirmModal);

    // モーダル外クリックで閉じる
    mailModal.addEventListener('click', function(e) {
        if (e.target === mailModal) {
            closeMailModal();
        }
    });

    confirmModal.addEventListener('click', function(e) {
        if (e.target === confirmModal) {
            closeConfirmModal();
        }
    });

    // 検索関連
    searchBtn.addEventListener('click', handleSearch);
    clearSearchBtn.addEventListener('click', handleClearSearch);
    
    // Enterキーで検索
    searchTextInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
}

// ログイン状態チェック
function checkLoginStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = savedUser;
        showMainScreen();
    } else {
        // デバッグ用：エラーメッセージテスト機能を追加
        if (window.location.hash === '#test-error') {
            setTimeout(() => {
                showError('テスト用エラーメッセージ - これが表示されればエラー機能は正常です');
            }, 1000);
        }
    }
}

// ログイン処理
async function handleLogin() {
    // 重複実行を防ぐ
    if (loginBtn.disabled) return;
    
    // まず既存のエラーメッセージを非表示にする
    hideError();
    
    const userId = userIdInput.value.trim();
    const password = passwordInput.value;

    if (!userId || !password) {
        showError('ユーザーIDとパスワードを入力してください');
        return;
    }

    // ボタンを無効化
    loginBtn.disabled = true;
    loginBtn.textContent = 'ログイン中...';

    try {
        console.log('ログイン試行中...', { userId }); // デバッグ用
        
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                password: password
            })
        });

        console.log('レスポンス状態:', response.status); // デバッグ用
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('レスポンスデータ:', data); // デバッグ用

        if (data.success) {
            currentUser = data.user_id;
            localStorage.setItem('currentUser', currentUser);
            showMainScreen();
            hideError();
        } else {
            // エラーメッセージを表示
            const errorMessage = data.error || 'ログインに失敗しました。IDまたはパスワードが間違っています。';
            showError(errorMessage);
        }
    } catch (error) {
        console.error('Error during login:', error);
        showError('ネットワークエラーが発生しました。接続を確認してください。');
    } finally {
        // ボタンを再有効化
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
        
        // 5秒後に自動で非表示にする
        setTimeout(() => {
            hideError();
        }, 5000);
    } else {
        // フォールバック：アラートで表示
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
}

// タブ切り替え
function switchTab(tabName) {
    tabBtns.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(`${tabName}-tab`);

    if (activeTab && activeContent) {
        activeTab.classList.add('active');
        activeContent.classList.add('active');
    }
}

// 人数データ読み込み
async function loadPopulation() {
    try {
        const response = await fetch(`${API_BASE_URL}/population`);
        const data = await response.json();
        currentPopulationSpan.textContent = data.now || 0;
    } catch (error) {
        console.error('Error loading population:', error);
    }
}

// 人数更新
async function updatePopulation(change) {
    const currentCount = parseInt(currentPopulationSpan.textContent);
    const newCount = Math.max(0, currentCount + change);

    try {
        const response = await fetch(`${API_BASE_URL}/population`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ now: newCount })
        });

        if (response.ok) {
            currentPopulationSpan.textContent = newCount;
        }
    } catch (error) {
        console.error('Error updating population:', error);
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
        
        displayReservations();
    } catch (error) {
        console.error('Error loading reservations:', error);
        reservations = [];
        displayReservations();
    }
}

// 予約表示
function displayReservations() {
    const today = new Date().toISOString().split('T')[0];
    
    // 予約一覧（来店前）
    const todayReservations = reservations.filter(r => 
        r.date >= today && r.states === 0
    ).sort((a, b) => {
        if (a.date === b.date) {
            return a.Time.localeCompare(b.Time);
        }
        return a.date.localeCompare(b.date);
    });

    // 予約履歴（全て）- 検索フィルターを適用
    const historyReservations = getFilteredReservations();

    todayReservationsDiv.innerHTML = renderReservationsList(todayReservations, 'today');
    reservationHistoryDiv.innerHTML = renderReservationsList(historyReservations, 'history');
}

// 検索フィルターを適用した予約データを取得
function getFilteredReservations() {
    let filteredReservations = [...reservations];
    
    // テキスト検索
    const searchText = searchTextInput.value.trim().toLowerCase();
    if (searchText) {
        filteredReservations = filteredReservations.filter(r => {
            const fullName = `${r['Name-f'] || ''} ${r['Name-s'] || ''}`.toLowerCase();
            const menu = (r.Menu || '').toLowerCase();
            const email = (r.mail || '').toLowerCase();
            
            return fullName.includes(searchText) ||
                   menu.includes(searchText) ||
                   email.includes(searchText);
        });
    }
    
    // 日付範囲検索
    const dateFrom = searchDateFromInput.value;
    const dateTo = searchDateToInput.value;
    
    if (dateFrom) {
        filteredReservations = filteredReservations.filter(r => r.date >= dateFrom);
    }
    
    if (dateTo) {
        filteredReservations = filteredReservations.filter(r => r.date <= dateTo);
    }
    
    // 日付と時間で降順ソート
    return filteredReservations.sort((a, b) => {
        if (a.date === b.date) {
            return b.Time.localeCompare(a.Time);
        }
        return b.date.localeCompare(a.date);
    });
}

// 検索処理
function handleSearch() {
    displayReservations();
}

// 検索クリア
function handleClearSearch() {
    searchTextInput.value = '';
    searchDateFromInput.value = '';
    searchDateToInput.value = '';
    displayReservations();
}

// 予約リストのHTML生成
function renderReservationsList(reservationsList, type) {
    if (reservationsList.length === 0) {
        return '<p>予約がありません。</p>';
    }

    return reservationsList.map(reservation => {
        const statusText = getStatusText(reservation.states);
        const statusClass = getStatusClass(reservation.states);
        
        let actionsHTML = '';
        if (type === 'today') {
            actionsHTML = `
                <button class="btn btn-success btn-small" onclick="handleVisit('${reservation.id}')">来店</button>
                <button class="btn btn-danger btn-small" onclick="handleCancel('${reservation.id}')">キャンセル</button>
                <button class="btn btn-secondary btn-small" onclick="openMailModal('${reservation.mail}')">メール送信</button>
            `;
        } else {
            actionsHTML = `
                <button class="btn btn-secondary btn-small" onclick="openMailModal('${reservation.mail}')">メール送信</button>
            `;
        }

        return `
            <div class="reservation-item">
                <div class="reservation-header">
                    <span class="reservation-time">${reservation.Time}</span>
                    <span class="reservation-status ${statusClass}">${statusText}</span>
                </div>
                <div class="reservation-info">
                    <div><strong>日付:</strong> ${reservation.date}</div>
                    <div><strong>名前:</strong> ${reservation['Name-f'] || ''} ${reservation['Name-s'] || ''}</div>
                    <div><strong>メニュー:</strong> ${reservation.Menu || ''}</div>
                    <div><strong>作業時間:</strong> ${reservation.WorkTime || ''}分</div>
                    <div><strong>メール:</strong> ${reservation.mail || ''}</div>
                </div>
                <div class="reservation-actions">
                    ${actionsHTML}
                </div>
            </div>
        `;
    }).join('');
}

// ステータステキスト取得
function getStatusText(status) {
    switch (status) {
        case 0: return '来店前';
        case 1: return '来店済み';
        case 2: return 'キャンセル済み';
        default: return '不明';
    }
}

// ステータスクラス取得
function getStatusClass(status) {
    switch (status) {
        case 0: return 'status-pending';
        case 1: return 'status-completed';
        case 2: return 'status-cancelled';
        default: return '';
    }
}

// 来店処理
async function handleVisit(reservationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 1 })
        });

        if (response.ok) {
            await loadReservations();
        }
    } catch (error) {
        console.error('Error updating reservation status:', error);
    }
}

// キャンセル処理
function handleCancel(reservationId) {
    showConfirm('本当にキャンセルしますか？', '', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 2 })
            });

            if (response.ok) {
                await loadReservations();
            }
        } catch (error) {
            console.error('Error cancelling reservation:', error);
        }
    });
}

// メールテンプレート読み込み
async function loadMailTemplates() {
    try {
        const response = await fetch(`${API_BASE_URL}/mail-templates`);
        mailTemplates = await response.json();
        displayTemplates();
    } catch (error) {
        console.error('Error loading mail templates:', error);
    }
}

// テンプレート表示
function displayTemplates() {
    currentTemplates = mailTemplates;
    
    templatesListDiv.innerHTML = Object.keys(mailTemplates).map(templateName => {
        const template = mailTemplates[templateName];
        return `
            <div class="template-item">
                <div class="template-header">
                    <span class="template-title">${templateName}</span>
                </div>
                <p><strong>件名:</strong> ${template.title}</p>
                <p><strong>本文:</strong> <span style="white-space: pre-line;">${template.main}</span></p>
                <div class="template-actions">
                    <button class="btn btn-secondary btn-small template-edit-btn" data-template-name="${templateName}">編集</button>
                    <button class="btn btn-danger btn-small template-delete-btn" data-template-name="${templateName}">削除</button>
                </div>
            </div>
        `;
    }).join('');
    
    attachTemplateEventListeners();
}

// テンプレートのイベントリスナーを設定
function attachTemplateEventListeners() {
    const editButtons = document.querySelectorAll('.template-edit-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const templateName = this.dataset.templateName;
            const template = currentTemplates[templateName];
            if (template) {
                editTemplate(templateName, template.title, template.main);
            }
        });
    });
    
    const deleteButtons = document.querySelectorAll('.template-delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const templateName = this.dataset.templateName;
            handleDeleteTemplate(templateName);
        });
    });
}

// テンプレート追加
async function handleAddTemplate() {
    const title = templateTitleInput.value.trim();
    const main = templateMainInput.value.trim();

    if (!title || !main) {
        alert('件名と本文を入力してください。');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/mail-templates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: title,
                title: title,
                main: main
            })
        });

        if (response.ok) {
            templateTitleInput.value = '';
            templateMainInput.value = '';
            await loadMailTemplates();
        }
    } catch (error) {
        console.error('Error adding template:', error);
    }
}

// テンプレート編集
function editTemplate(name, title, main) {
    templateTitleInput.value = title;
    templateMainInput.value = main;
    
    addTemplateBtn.textContent = '更新';
    addTemplateBtn.onclick = () => handleUpdateTemplate(name);
}

// テンプレート更新
async function handleUpdateTemplate(originalName) {
    const title = templateTitleInput.value.trim();
    const main = templateMainInput.value.trim();

    if (!title || !main) {
        alert('件名と本文を入力してください。');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/mail-templates/${encodeURIComponent(originalName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                main: main
            })
        });

        if (response.ok) {
            resetTemplateForm();
            await loadMailTemplates();
        }
    } catch (error) {
        console.error('Error updating template:', error);
    }
}

// テンプレートフォームリセット
function resetTemplateForm() {
    templateTitleInput.value = '';
    templateMainInput.value = '';
    addTemplateBtn.textContent = '追加';
    addTemplateBtn.onclick = handleAddTemplate;
}

// テンプレート削除
async function handleDeleteTemplate(name) {
    showConfirm('このテンプレートを削除しますか？', '', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/mail-templates/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await loadMailTemplates();
            }
        } catch (error) {
            console.error('Error deleting template:', error);
        }
    });
}

// メールモーダル開く
function openMailModal(email) {
    currentMailRecipient = email;
    mailSubjectInput.value = '';
    mailBodyInput.value = '';
    
    mailTemplatesListDiv.innerHTML = Object.keys(mailTemplates).map(templateName => {
        const template = mailTemplates[templateName];
        const previewText = template.title.length > 50 ? 
            template.title.substring(0, 50) + '...' : template.title;
        
        return `
            <div class="mail-template-item" onclick="selectMailTemplate('${templateName}')">
                <div class="mail-template-name">${templateName}</div>
                <div class="mail-template-preview">${previewText}</div>
            </div>
        `;
    }).join('');

    mailModal.classList.add('active');
}

// メールテンプレート選択
function selectMailTemplate(templateName) {
    const template = mailTemplates[templateName];
    if (template) {
        mailSubjectInput.value = template.title;
        mailBodyInput.value = template.main;
    }
}

// メールモーダル閉じる
function closeMailModal() {
    mailModal.classList.remove('active');
    currentMailRecipient = '';
}

// メール送信
async function handleSendMail() {
    const subject = mailSubjectInput.value.trim();
    const body = mailBodyInput.value.trim();

    if (!subject || !body) {
        alert('件名と本文を入力してください。');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/send-mail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to_email: currentMailRecipient,
                subject: subject,
                body: body
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('メールを送信しました。');
            closeMailModal();
        } else {
            alert('メール送信に失敗しました。');
        }
    } catch (error) {
        console.error('Error sending mail:', error);
        alert('メール送信エラーが発生しました。');
    }
}

// パスワード変更
async function handlePasswordChange() {
    const oldPassword = oldPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!oldPassword || !newPassword || !confirmPassword) {
        alert('すべての項目を入力してください。');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('新しいパスワードが一致しません。');
        return;
    }

    if (newPassword.length < 4) {
        alert('新しいパスワードは4文字以上で設定してください。');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser,
                old_password: oldPassword,
                new_password: newPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('パスワードを変更しました。');
            oldPasswordInput.value = '';
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
        } else {
            let errorMessage = 'パスワード変更に失敗しました。';
            
            if (data.error && data.error.includes('incorrect')) {
                errorMessage = '現在のパスワードが正しくありません。';
            } else if (data.error && data.error.includes('not found')) {
                errorMessage = 'ユーザーが見つかりません。再ログインしてください。';
            } else if (data.error && data.error.includes('required')) {
                errorMessage = '入力項目に不備があります。すべての項目を正しく入力してください。';
            }
            
            alert(errorMessage);
        }
    } catch (error) {
        alert('ネットワークエラーが発生しました。インターネット接続を確認してください。');
    }
}

// 定休日読み込み
async function loadHolidays() {
    try {
        const response = await fetch(`${API_BASE_URL}/holidays`);
        const holidays = await response.json();
        displayHolidays(holidays);
    } catch (error) {
        console.error('Error loading holidays:', error);
    }
}

// 定休日表示
function displayHolidays(holidays) {
    if (holidays.length === 0) {
        holidaysListDiv.innerHTML = '<div class="holidays-empty">定休日が設定されていません</div>';
        return;
    }

    const sortedHolidays = holidays.sort((a, b) => new Date(a) - new Date(b));
    
    holidaysListDiv.innerHTML = sortedHolidays.map(holiday => {
        const date = new Date(holiday);
        const formattedDate = date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
        
        return `
            <div class="holiday-item">
                <span class="holiday-date">${formattedDate}</span>
                <div class="holiday-actions">
                    <button class="btn btn-danger btn-small" onclick="handleDeleteHoliday('${holiday}')">削除</button>
                </div>
            </div>
        `;
    }).join('');
}

// 定休日追加
async function handleAddHoliday() {
    const date = holidayDateInput.value;

    if (!date) {
        showErrorMessage('日付を選択してください');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/holidays`);
        const existingHolidays = await response.json();
        
        if (existingHolidays.includes(date)) {
            showErrorMessage('この日付は既に休業日として設定されています');
            return;
        }
    } catch (error) {
        console.error('Error checking existing holidays:', error);
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showErrorMessage('過去の日付は設定できません');
        return;
    }

    try {
        const addResponse = await fetch(`${API_BASE_URL}/holidays`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ date: date })
        });

        if (addResponse.ok) {
            holidayDateInput.value = '';
            await loadHolidays();
            
            const formattedDate = selectedDate.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            });
            showSuccessMessage(`${formattedDate}を休業日に設定しました`);
        } else {
            throw new Error('追加に失敗しました');
        }
    } catch (error) {
        console.error('Error adding holiday:', error);
        showErrorMessage('休業日の追加に失敗しました');
    }
}

// 定休日削除
async function handleDeleteHoliday(date) {
    const formattedDate = new Date(date).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
    });
    
    showConfirm(
        '休業日の削除', 
        `${formattedDate}を休業日から削除しますか？`, 
        async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/holidays/${encodeURIComponent(date)}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    await loadHolidays();
                    showSuccessMessage('休業日を削除しました');
                } else {
                    throw new Error('削除に失敗しました');
                }
            } catch (error) {
                console.error('Error deleting holiday:', error);
                showErrorMessage('休業日の削除に失敗しました');
            }
        }
    );
}

// 成功メッセージ表示
function showSuccessMessage(message) {
    holidayMessage.textContent = message;
    holidayMessage.className = 'message success';
    setTimeout(() => {
        holidayMessage.className = 'message';
    }, 3000);
}

// エラーメッセージ表示
function showErrorMessage(message) {
    holidayMessage.textContent = message;
    holidayMessage.className = 'message error';
    setTimeout(() => {
        holidayMessage.className = 'message';
    }, 3000);
}

// メニュー読み込み
async function loadMenus() {
    try {
        const response = await fetch(`${API_BASE_URL}/menus`);
        const menus = await response.json();
        displayMenus(menus);
    } catch (error) {
        console.error('Error loading menus:', error);
    }
}

// メニュー表示
function displayMenus(menus) {
    currentMenus = menus;
    
    menusListDiv.innerHTML = Object.keys(menus).map((menuName, index) => {
        const menu = menus[menuName];
        
        return `
            <div class="menu-item">
                <div class="menu-header">
                    <span class="menu-name">${menuName}</span>
                    <div>
                        <span class="menu-worktime">${menu.worktime}分</span>
                        <span class="menu-fare">${menu.fare || 0}円</span>
                    </div>
                </div>
                <p style="white-space: pre-line;">${menu.text}</p>
                <div class="menu-actions">
                    <button class="btn btn-secondary btn-small menu-edit-btn" data-menu-index="${index}" data-menu-name="${menuName}">編集</button>
                    <button class="btn btn-danger btn-small menu-delete-btn" data-menu-name="${menuName}">削除</button>
                </div>
            </div>
        `;
    }).join('');
    
    attachMenuEventListeners();
}

// メニューのイベントリスナーを設定
function attachMenuEventListeners() {
    const editButtons = document.querySelectorAll('.menu-edit-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const menuName = this.dataset.menuName;
            const menu = currentMenus[menuName];
            if (menu) {
                editMenu(menuName, menu.text, menu.worktime, menu.fare || 0);
            }
        });
    });
    
    const deleteButtons = document.querySelectorAll('.menu-delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const menuName = this.dataset.menuName;
            handleDeleteMenu(menuName);
        });
    });
}

// メニュー編集
function editMenu(name, text, worktime, fare) {
    menuNameInput.value = name;
    menuTextInput.value = text;
    menuWorktimeInput.value = worktime;
    menuFareInput.value = fare;
    
    addMenuBtn.textContent = '更新';
    addMenuBtn.onclick = () => handleUpdateMenu(name);
}

// メニュー追加
async function handleAddMenu() {
    const name = menuNameInput.value.trim();
    const text = menuTextInput.value.trim();
    const worktime = parseInt(menuWorktimeInput.value);
    const fare = parseInt(menuFareInput.value);

    if (!name || !text || !worktime || !fare) {
        alert('すべての項目を入力してください。');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/menus`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                text: text,
                worktime: worktime,
                fare: fare
            })
        });

        if (response.ok) {
            resetMenuForm();
            await loadMenus();
        }
    } catch (error) {
        console.error('Error adding menu:', error);
    }
}

// メニュー更新
async function handleUpdateMenu(originalName) {
    const text = menuTextInput.value.trim();
    const worktime = parseInt(menuWorktimeInput.value);
    const fare = parseInt(menuFareInput.value);

    if (!text || !worktime || !fare) {
        alert('説明、作業時間、料金を入力してください。');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/menus/${encodeURIComponent(originalName)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                worktime: worktime,
                fare: fare
            })
        });

        if (response.ok) {
            resetMenuForm();
            await loadMenus();
        }
    } catch (error) {
        console.error('Error updating menu:', error);
    }
}

// メニューフォームリセット
function resetMenuForm() {
    menuNameInput.value = '';
    menuTextInput.value = '';
    menuWorktimeInput.value = '';
    menuFareInput.value = '';
    addMenuBtn.textContent = '追加';
    addMenuBtn.onclick = handleAddMenu;
}

// メニュー削除
async function handleDeleteMenu(name) {
    showConfirm('このメニューを削除しますか？', '', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/menus/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await loadMenus();
            }
        } catch (error) {
            console.error('Error deleting menu:', error);
        }
    });
}

// 確認モーダル表示
function showConfirm(title, message, onConfirm) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmYesBtn.onclick = () => {
        closeConfirmModal();
        onConfirm();
    };
    confirmModal.classList.add('active');
}

// 確認モーダル閉じる
function closeConfirmModal() {
    confirmModal.classList.remove('active');
}

// メニューフォームリセット
function resetMenuForm() {
    menuNameInput.value = '';
    menuTextInput.value = '';
    menuWorktimeInput.value = '';
    menuFareInput.value = '';
    addMenuBtn.textContent = '追加';
    addMenuBtn.onclick = handleAddMenu;
}

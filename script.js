// DOM要素の取得
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userIdInput = document.getElementById('user-id');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

// エラー表示
function showError(message) {
    loginError.textContent = message;
    loginError.classList.add('show');
    
    // 5秒後に自動で非表示
    setTimeout(() => {
        hideError();
    }, 5000);
}

// エラー非表示
function hideError() {
    loginError.classList.remove('show');
    loginError.textContent = '';
}

// ログイン処理
function handleLogin() {
    hideError();
    
    const userId = userIdInput.value.trim();
    const password = passwordInput.value;

    if (!userId || !password) {
        showError('ユーザーIDとパスワードを入力してください');
        return;
    }

    // テスト用認証
    if (userId === 'user1' && password === 'password') {
        loginScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        console.log('ログイン成功');
    } else {
        showError('ログインに失敗しました。user1/password でお試しください。');
    }
}

// ログアウト処理
function handleLogout() {
    mainScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    userIdInput.value = '';
    passwordInput.value = '';
    hideError();
    console.log('ログアウトしました');
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM読み込み完了');
    
    // ログインボタン
    loginBtn.addEventListener('click', handleLogin);
    
    // ログアウトボタン
    logoutBtn.addEventListener('click', handleLogout);
    
    // Enterキーでログイン
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    userIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });
    
    console.log('イベントリスナー設定完了');
});

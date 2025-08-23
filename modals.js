// モーダル関連の要素
const mailTemplatesListDiv = document.getElementById('mail-templates-list');
const mailSubjectInput = document.getElementById('mail-subject');
const mailBodyInput = document.getElementById('mail-body');
const sendMailBtn = document.getElementById('send-mail-btn');
const cancelMailBtn = document.getElementById('cancel-mail-btn');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmNoBtn = document.getElementById('confirm-no-btn');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');

// 設定関連の要素
const oldPasswordInput = document.getElementById('old-password');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const changePasswordBtn = document.getElementById('change-password-btn');

const holidayDateInput = document.getElementById('holiday-date');
const addHolidayBtn = document.getElementById('add-holiday-btn');
const holidaysListDiv = document.getElementById('holidays-list');
const holidayMessage = document.getElementById('holiday-message');

const menuNameInput = document.getElementById('menu-name');
const menuTextInput = document.getElementById('menu-text');
const menuWorktimeInput = document.getElementById('menu-worktime');
const menuFareInput = document.getElementById('menu-fare');
const addMenuBtn = document.getElementById('add-menu-btn');
const menusListDiv = document.getElementById('menus-list');

const templateTitleInput = document.getElementById('template-title');
const templateMainInput = document.getElementById('template-main');
const addTemplateBtn = document.getElementById('add-template-btn');
const templatesListDiv = document.getElementById('templates-list');

// お知らせ管理関連の要素 - 新規追加
const noticeIconInput = document.getElementById('notice-icon');
const noticeTextInput = document.getElementById('notice-text');
const addNoticeBtn = document.getElementById('add-notice-btn');
const noticesListDiv = document.getElementById('notices-list');
const noticeMessage = document.getElementById('notice-message');

// イベントリスナー設定
document.addEventListener('DOMContentLoaded', function() {
    initializeModalFeatures();
});

function initializeModalFeatures() {
    if (cancelMailBtn) cancelMailBtn.addEventListener('click', closeMailModal);
    if (sendMailBtn) sendMailBtn.addEventListener('click', handleSendMail);
    if (confirmNoBtn) confirmNoBtn.addEventListener('click', closeConfirmModal);
    
    if (changePasswordBtn) changePasswordBtn.addEventListener('click', handlePasswordChange);
    if (addHolidayBtn) addHolidayBtn.addEventListener('click', handleAddHoliday);
    if (addMenuBtn) addMenuBtn.addEventListener('click', handleAddMenu);
    if (addTemplateBtn) addTemplateBtn.addEventListener('click', handleAddTemplate);
    if (addNoticeBtn) addNoticeBtn.addEventListener('click', handleAddNotice); // お知らせ追加イベントリスナー
}

// メールモーダル開く
function openMailModal(email, customerName = '') {
    currentMailRecipient = email;
    currentCustomerName = customerName;
    
    if (mailSubjectInput) mailSubjectInput.value = '';
    if (mailBodyInput) mailBodyInput.value = '';
    
    if (email === '同行者') {
        alert('この方は同行者のため、メールを送信できません。');
        return;
    }
    
    if (mailTemplatesListDiv) {
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
    }

    if (mailModal) mailModal.classList.add('active');
}

// メールテンプレート選択
function selectMailTemplate(templateName) {
    const template = mailTemplates[templateName];
    if (template) {
        if (mailSubjectInput) mailSubjectInput.value = template.title;
        if (mailBodyInput) mailBodyInput.value = template.main;
    }
}

// メールモーダル閉じる
function closeMailModal() {
    if (mailModal) mailModal.classList.remove('active');
    currentMailRecipient = '';
    currentCustomerName = '';
}

// メール送信
async function handleSendMail() {
    const subject = mailSubjectInput ? mailSubjectInput.value.trim() : '';
    const body = mailBodyInput ? mailBodyInput.value.trim() : '';

    if (!subject || !body) {
        alert('件名と本文を入力してください。');
        return;
    }

    if (currentMailRecipient === '同行者') {
        alert('この方は同行者のため、メールを送信できません。');
        return;
    }

    if (sendMailBtn) {
        sendMailBtn.disabled = true;
        sendMailBtn.textContent = '送信中...';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/send-mail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to_email: currentMailRecipient,
                subject: subject,
                body: body,
                customer_name: currentCustomerName
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('メールを送信しました。');
            closeMailModal();
        } else {
            alert(`メール送信に失敗しました。\n${data.error || '不明なエラーが発生しました。'}`);
        }
    } catch (error) {
        console.error('Error sending mail:', error);
        alert('メール送信エラーが発生しました。ネットワーク接続を確認してください。');
    } finally {
        if (sendMailBtn) {
            sendMailBtn.disabled = false;
            sendMailBtn.textContent = '送信';
        }
    }
}

// 確認モーダル表示
function showConfirm(title, message, onConfirm) {
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmMessage) confirmMessage.textContent = message;
    if (confirmYesBtn) {
        confirmYesBtn.onclick = () => {
            closeConfirmModal();
            onConfirm();
        };
    }
    if (confirmModal) confirmModal.classList.add('active');
}

// 確認モーダル閉じる
function closeConfirmModal() {
    if (confirmModal) confirmModal.classList.remove('active');
}

// パスワード変更
async function handlePasswordChange() {
    const oldPassword = oldPasswordInput ? oldPasswordInput.value : '';
    const newPassword = newPasswordInput ? newPasswordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser,
                old_password: oldPassword,
                new_password: newPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('パスワードを変更しました。');
            if (oldPasswordInput) oldPasswordInput.value = '';
            if (newPasswordInput) newPasswordInput.value = '';
            if (confirmPasswordInput) confirmPasswordInput.value = '';
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

// お知らせ表示 - 新規追加
function displayNotices(noticesList) {
    if (!noticesListDiv) return;
    
    if (!noticesList || noticesList.length === 0) {
        noticesListDiv.innerHTML = '<div class="notices-empty">重要なお知らせが設定されていません</div>';
        return;
    }

    noticesListDiv.innerHTML = noticesList.map(notice => {
        return `
            <div class="notice-item">
                <div class="notice-header">
                    <div class="notice-title">
                        <span class="notice-icon-display">${notice.icon}</span>
                        重要なお知らせ
                    </div>
                    <div class="notice-actions">
                        <button class="btn btn-secondary btn-small notice-edit-btn" data-notice-id="${notice.id}">編集</button>
                        <button class="btn btn-danger btn-small notice-delete-btn" data-notice-id="${notice.id}">削除</button>
                    </div>
                </div>
                <div class="notice-text-content">${notice.text}</div>
            </div>
        `;
    }).join('');
    
    attachNoticeEventListeners();
}

// お知らせイベントリスナー - 新規追加
function attachNoticeEventListeners() {
    const editButtons = document.querySelectorAll('.notice-edit-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const noticeId = this.dataset.noticeId;
            const notice = notices.find(n => n.id === noticeId);
            if (notice) {
                editNotice(notice.id, notice.icon, notice.text);
            }
        });
    });
    
    const deleteButtons = document.querySelectorAll('.notice-delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const noticeId = this.dataset.noticeId;
            handleDeleteNotice(noticeId);
        });
    });
}

// お知らせ編集 - 新規追加
function editNotice(id, icon, text) {
    if (noticeIconInput) noticeIconInput.value = icon;
    if (noticeTextInput) noticeTextInput.value = text;
    
    if (addNoticeBtn) {
        addNoticeBtn.textContent = '更新';
        addNoticeBtn.onclick = () => handleUpdateNotice(id);
    }
}

// お知らせ追加 - 新規追加
async function handleAddNotice() {
    const icon = noticeIconInput ? noticeIconInput.value.trim() : '';
    const text = noticeTextInput ? noticeTextInput.value.trim() : '';

    if (!icon || !text) {
        showNoticeErrorMessage('アイコンとお知らせ内容を入力してください。');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/notices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ icon, text })
        });

        const data = await response.json();

        if (data.success) {
            resetNoticeForm();
            await loadNotices();
            showNoticeSuccessMessage('重要なお知らせを追加しました。');
        } else {
            showNoticeErrorMessage(data.error || 'お知らせの追加に失敗しました。');
        }
    } catch (error) {
        console.error('Error adding notice:', error);
        showNoticeErrorMessage('お知らせの追加に失敗しました。');
    }
}

// お知らせ更新 - 新規追加
async function handleUpdateNotice(originalId) {
    const text = noticeTextInput ? noticeTextInput.value.trim() : '';

    if (!text) {
        showNoticeErrorMessage('お知らせ内容を入力してください。');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/notices/${encodeURIComponent(originalId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        const data = await response.json();

        if (data.success) {
            resetNoticeForm();
            await loadNotices();
            showNoticeSuccessMessage('重要なお知らせを更新しました。');
        } else {
            showNoticeErrorMessage(data.error || 'お知らせの更新に失敗しました。');
        }
    } catch (error) {
        console.error('Error updating notice:', error);
        showNoticeErrorMessage('お知らせの更新に失敗しました。');
    }
}

// お知らせフォームリセット - 新規追加
function resetNoticeForm() {
    if (noticeIconInput) noticeIconInput.value = '';
    if (noticeTextInput) noticeTextInput.value = '';
    if (addNoticeBtn) {
        addNoticeBtn.textContent = '追加';
        addNoticeBtn.onclick = handleAddNotice;
    }
}

// お知らせ削除 - 新規追加
async function handleDeleteNotice(noticeId) {
    const notice = notices.find(n => n.id === noticeId);
    const displayText = notice ? `「${notice.icon} ${notice.text.substring(0, 30)}...」` : 'このお知らせ';
    
    showConfirm('お知らせ削除', `${displayText}を削除しますか？`, async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/notices/${encodeURIComponent(noticeId)}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                await loadNotices();
                showNoticeSuccessMessage('重要なお知らせを削除しました。');
            } else {
                showNoticeErrorMessage(data.error || 'お知らせの削除に失敗しました。');
            }
        } catch (error) {
            console.error('Error deleting notice:', error);
            showNoticeErrorMessage('お知らせの削除に失敗しました。');
        }
    });
}

// お知らせメッセージ表示関数 - 新規追加
function showNoticeSuccessMessage(message) {
    if (noticeMessage) {
        noticeMessage.textContent = message;
        noticeMessage.className = 'message success';
        setTimeout(() => {
            noticeMessage.className = 'message';
        }, 3000);
    }
}

function showNoticeErrorMessage(message) {
    if (noticeMessage) {
        noticeMessage.textContent = message;
        noticeMessage.className = 'message error';
        setTimeout(() => {
            noticeMessage.className = 'message';
        }, 3000);
    }
}

// 修正版：定休日表示処理
function displayHolidays(holidays) {
    if (!holidaysListDiv) return;
    
    if (holidays.length === 0) {
        holidaysListDiv.innerHTML = '<div class="holidays-empty">定休日が設定されていません</div>';
        return;
    }

    const sortedHolidays = holidays.sort((a, b) => new Date(a) - new Date(b));
    
    holidaysListDiv.innerHTML = sortedHolidays.map(holiday => {
        // 修正：タイムゾーンを考慮した日付表示
        const date = new Date(holiday + 'T00:00:00'); // ローカルタイムゾーンで解釈
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

// 修正版：定休日追加処理
async function handleAddHoliday() {
    const date = holidayDateInput ? holidayDateInput.value : '';

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

    // 修正：タイムゾーンを考慮した日付比較
    const selectedDate = new Date(date + 'T00:00:00'); // ローカルタイムゾーンで解釈
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showErrorMessage('過去の日付は設定できません');
        return;
    }

    try {
        const addResponse = await fetch(`${API_BASE_URL}/holidays`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: date })
        });

        if (addResponse.ok) {
            if (holidayDateInput) holidayDateInput.value = '';
            await loadHolidays();
            
            const formattedDate = selectedDate.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            });
            showSuccessMessage(`${formattedDate}を休業日に設定しました`);
            
            // カレンダーも再描画
            const calendarTab = document.getElementById('calendar-tab');
            if (calendarTab && calendarTab.classList.contains('active')) {
                renderCalendar();
            }
        } else {
            throw new Error('追加に失敗しました');
        }
    } catch (error) {
        console.error('Error adding holiday:', error);
        showErrorMessage('休業日の追加に失敗しました');
    }
}

// 修正版：定休日削除処理
async function handleDeleteHoliday(date) {
    const selectedDate = new Date(date + 'T00:00:00'); // ローカルタイムゾーンで解釈
    const formattedDate = selectedDate.toLocaleDateString('ja-JP', {
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
                    
                    // カレンダーも再描画
                    const calendarTab = document.getElementById('calendar-tab');
                    if (calendarTab && calendarTab.classList.contains('active')) {
                        renderCalendar();
                    }
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

// メニュー表示
function displayMenus(menus) {
    if (!menusListDiv) return;
    
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
                    <button class="btn btn-secondary btn-small menu-edit-btn" data-menu-name="${menuName}">編集</button>
                    <button class="btn btn-danger btn-small menu-delete-btn" data-menu-name="${menuName}">削除</button>
                </div>
            </div>
        `;
    }).join('');
    
    attachMenuEventListeners();
    
    const calendarTab = document.getElementById('calendar-tab');
    if (calendarTab && calendarTab.classList.contains('active') && typeof renderMenuLegend === 'function') {
        renderMenuLegend();
    }
}

// メニューイベントリスナー
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

// ↓ 新しいバージョンに置き換え
function editMenu(name, text, worktime, fare) {
    if (menuNameInput) {
        menuNameInput.value = name;
        menuNameInput.readOnly = false; // この行を追加
    }
    if (menuTextInput) menuTextInput.value = text;
    if (menuWorktimeInput) menuWorktimeInput.value = worktime;
    if (menuFareInput) menuFareInput.value = fare;
    
    if (addMenuBtn) {
        addMenuBtn.textContent = '更新';
        addMenuBtn.onclick = () => handleUpdateMenu(name);
    }
}

// メニュー追加
async function handleAddMenu() {
    const name = menuNameInput ? menuNameInput.value.trim() : '';
    const text = menuTextInput ? menuTextInput.value.trim() : '';
    const worktime = menuWorktimeInput ? parseInt(menuWorktimeInput.value) : 0;
    const fare = menuFareInput ? parseInt(menuFareInput.value) : 0;

    if (!name || !text || !worktime || !fare) {
        alert('すべての項目を入力してください。');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/menus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, text, worktime, fare })
        });

        if (response.ok) {
            resetMenuForm();
            await loadMenus();
            
            const calendarTab = document.getElementById('calendar-tab');
            if (calendarTab && calendarTab.classList.contains('active') && typeof renderMenuLegend === 'function') {
                renderMenuLegend();
            }
        }
    } catch (error) {
        console.error('Error adding menu:', error);
    }
}

// ↓ 新しいバージョンに置き換え
async function handleUpdateMenu(originalName) {
    const newName = menuNameInput ? menuNameInput.value.trim() : '';
    const text = menuTextInput ? menuTextInput.value.trim() : '';
    const worktime = menuWorktimeInput ? parseInt(menuWorktimeInput.value) : 0;
    const fare = menuFareInput ? parseInt(menuFareInput.value) : 0;

    if (!newName || !text || !worktime || !fare) {
        alert('すべての項目を入力してください。');
        return;
    }

    try {
        // メニュー名が変更された場合
        if (newName !== originalName) {
            // 新しい名前で存在チェック
            if (currentMenus[newName]) {
                alert('この名前のメニューは既に存在します。別の名前を入力してください。');
                return;
            }

            // 古いメニューを削除してから新しいメニューを追加
            await deleteMenuFromServer(originalName);
            await addMenuToServer(newName, text, worktime, fare);
        } else {
            // メニュー名が同じ場合は通常の更新
            await updateMenuOnServer(originalName, text, worktime, fare);
        }

        resetMenuForm();
        await loadMenus();
        
        const calendarTab = document.getElementById('calendar-tab');
        if (calendarTab && calendarTab.classList.contains('active') && typeof renderMenuLegend === 'function') {
            renderMenuLegend();
        }

    } catch (error) {
        console.error('Error updating menu:', error);
        alert('メニューの更新に失敗しました。');
    }
}

// メニューをサーバーから削除（内部関数）
async function deleteMenuFromServer(name) {
    const response = await fetch(`${API_BASE_URL}/menus/${encodeURIComponent(name)}`, {
        method: 'DELETE'
    });
    
    if (!response.ok) {
        throw new Error(`メニュー削除に失敗: ${response.status}`);
    }
}

// メニューをサーバーに追加（内部関数）
async function addMenuToServer(name, text, worktime, fare) {
    const response = await fetch(`${API_BASE_URL}/menus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, text, worktime, fare })
    });
    
    if (!response.ok) {
        throw new Error(`メニュー追加に失敗: ${response.status}`);
    }
}

// メニューをサーバーで更新（内部関数）
async function updateMenuOnServer(name, text, worktime, fare) {
    const response = await fetch(`${API_BASE_URL}/menus/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, worktime, fare })
    });
    
    if (!response.ok) {
        throw new Error(`メニュー更新に失敗: ${response.status}`);
    }
}

function resetMenuForm() {
    if (menuNameInput) {
        menuNameInput.value = '';
        menuNameInput.readOnly = false;
    }
    if (menuTextInput) menuTextInput.value = '';
    if (menuWorktimeInput) menuWorktimeInput.value = '';
    if (menuFareInput) menuFareInput.value = '';
    if (addMenuBtn) {
        addMenuBtn.textContent = '追加';
        addMenuBtn.onclick = handleAddMenu;
    }
}
// メニュー削除
async function handleDeleteMenu(name) {
    showConfirm('メニュー削除', 'このメニューを削除しますか？', async () => {
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

// テンプレート表示
function displayTemplates() {
    if (!templatesListDiv) return;
    
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

// テンプレートイベントリスナー
function attachTemplateEventListeners() {
    const editButtons = document.querySelectorAll('.template-edit-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const templateName = this.dataset.templateName;
            const template = mailTemplates[templateName];
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

// テンプレート編集
function editTemplate(name, title, main) {
    if (templateTitleInput) templateTitleInput.value = title;
    if (templateMainInput) templateMainInput.value = main;
    
    if (addTemplateBtn) {
        addTemplateBtn.textContent = '更新';
        addTemplateBtn.onclick = () => handleUpdateTemplate(name);
    }
}

// テンプレート追加
async function handleAddTemplate() {
    const title = templateTitleInput ? templateTitleInput.value.trim() : '';
    const main = templateMainInput ? templateMainInput.value.trim() : '';

    if (!title || !main) {
        alert('件名と本文を入力してください。');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/mail-templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: title, title, main })
        });

        if (response.ok) {
            if (templateTitleInput) templateTitleInput.value = '';
            if (templateMainInput) templateMainInput.value = '';
            await loadMailTemplates();
        }
    } catch (error) {
        console.error('Error adding template:', error);
    }
}

// テンプレート更新
async function handleUpdateTemplate(originalName) {
    const title = templateTitleInput ? templateTitleInput.value.trim() : '';
    const main = templateMainInput ? templateMainInput.value.trim() : '';

    if (!title || !main) {
        alert('件名と本文を入力してください。');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/mail-templates/${encodeURIComponent(originalName)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, main })
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
    if (templateTitleInput) templateTitleInput.value = '';
    if (templateMainInput) templateMainInput.value = '';
    if (addTemplateBtn) {
        addTemplateBtn.textContent = '追加';
        addTemplateBtn.onclick = handleAddTemplate;
    }
}

// テンプレート削除
async function handleDeleteTemplate(name) {
    showConfirm('テンプレート削除', 'このテンプレートを削除しますか？', async () => {
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

// メッセージ表示関数
function showSuccessMessage(message) {
    if (holidayMessage) {
        holidayMessage.textContent = message;
        holidayMessage.className = 'message success';
        setTimeout(() => {
            holidayMessage.className = 'message';
        }, 3000);
    }
}

function showErrorMessage(message) {
    if (holidayMessage) {
        holidayMessage.textContent = message;
        holidayMessage.className = 'message error';
        setTimeout(() => {
            holidayMessage.className = 'message';
        }, 3000);
    }
}

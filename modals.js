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

// 定休日表示
function displayHolidays(holidays) {
    if (!holidaysListDiv) return;
    
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

// メニュー編集
function editMenu(name, text, worktime, fare) {
    if (menuNameInput) menuNameInput.value = name;
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

// メニュー更新
async function handleUpdateMenu(originalName) {
    const text = menuTextInput ? menuTextInput.value.trim() : '';
    const worktime = menuWorktimeInput ? parseInt(menuWorktimeInput.value) : 0;
    const fare = menuFareInput ? parseInt(menuFareInput.value) : 0;

    if (!text || !worktime || !fare) {
        alert('説明、作業時間、料金を入力してください。');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/menus/${encodeURIComponent(originalName)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, worktime, fare })
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
    if (menuNameInput) menuNameInput.value = '';
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

// 予約追加機能のJavaScript（修正版）

// DOM要素（グローバルで取得）
let addReservationModal = null;
let addReservationBtn = null;
let submitAddReservationBtn = null;
let cancelAddReservationBtn = null;
let addReservationDateInput = null;
let addReservationNameInput = null;
let addReservationPhoneInput = null;
let addReservationEmailInput = null;
let addReservationMenuSelect = null;
let addReservationTimeslotsDiv = null;

// 選択された時間を保存する変数
let selectedTimeSlot = null;
let isCustomTime = false;
let forceAddMode = false;

// 時間スロット設定
const timeSlots = {
    weekday: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
    weekend: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
};

// DOM要素を動的に取得する関数
function getAddReservationElements() {
    return {
        modal: document.getElementById('add-reservation-modal'),
        btn: document.getElementById('add-reservation-btn'),
        submitBtn: document.getElementById('submit-add-reservation-btn'),
        cancelBtn: document.getElementById('cancel-add-reservation-btn'),
        dateInput: document.getElementById('add-reservation-date'),
        nameInput: document.getElementById('add-reservation-name'),
        phoneInput: document.getElementById('add-reservation-phone'),
        emailInput: document.getElementById('add-reservation-email'),
        menuSelect: document.getElementById('add-reservation-menu'),
        timeslotsDiv: document.getElementById('add-reservation-timeslots')
    };
}

// 初期化（複数回呼び出し対応）
function initializeAddReservationFeature() {
    console.log('[予約追加] 初期化開始');
    
    // DOM要素を取得
    const elements = getAddReservationElements();
    
    // グローバル変数に設定
    addReservationModal = elements.modal;
    addReservationBtn = elements.btn;
    submitAddReservationBtn = elements.submitBtn;
    cancelAddReservationBtn = elements.cancelBtn;
    addReservationDateInput = elements.dateInput;
    addReservationNameInput = elements.nameInput;
    addReservationPhoneInput = elements.phoneInput;
    addReservationEmailInput = elements.emailInput;
    addReservationMenuSelect = elements.menuSelect;
    addReservationTimeslotsDiv = elements.timeslotsDiv;
    
    console.log('[予約追加] DOM要素取得結果:', {
        modal: !!addReservationModal,
        btn: !!addReservationBtn,
        submitBtn: !!submitAddReservationBtn,
        cancelBtn: !!cancelAddReservationBtn,
        dateInput: !!addReservationDateInput,
        nameInput: !!addReservationNameInput,
        phoneInput: !!addReservationPhoneInput,
        emailInput: !!addReservationEmailInput,
        menuSelect: !!addReservationMenuSelect,
        timeslotsDiv: !!addReservationTimeslotsDiv
    });
    
    // 既存のイベントリスナーを削除してから新しく設定
    if (addReservationBtn) {
        // 既存のイベントリスナーをクローンで削除
        const newBtn = addReservationBtn.cloneNode(true);
        addReservationBtn.parentNode.replaceChild(newBtn, addReservationBtn);
        addReservationBtn = newBtn;
        
        // 新しいイベントリスナーを設定
        addReservationBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[予約追加] 予約追加ボタンがクリックされました');
            openAddReservationModal();
        });
        
        console.log('[予約追加] 予約追加ボタンにイベントリスナー設定完了');
    } else {
        console.error('[予約追加] 予約追加ボタンが見つかりません');
    }
    
    if (cancelAddReservationBtn) {
        cancelAddReservationBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[予約追加] キャンセルボタンがクリックされました');
            closeAddReservationModal();
        });
    }
    
    if (submitAddReservationBtn) {
        submitAddReservationBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[予約追加] 送信ボタンがクリックされました');
            handleAddReservation();
        });
    }
    
    if (addReservationDateInput) {
        addReservationDateInput.addEventListener('change', handleDateChange);
    }
    
    // モーダル外クリックで閉じる
    if (addReservationModal) {
        addReservationModal.addEventListener('click', function(e) {
            if (e.target === addReservationModal) {
                closeAddReservationModal();
            }
        });
    }
    
    console.log('[予約追加] 初期化完了');
}

// DOMContentLoaded での初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('[予約追加] DOMContentLoaded - 初期化実行');
    initializeAddReservationFeature();
});

// タブ切り替え時の初期化（カレンダータブ選択時）
document.addEventListener('click', function(event) {
    if (event.target && event.target.getAttribute('data-tab') === 'calendar') {
        console.log('[予約追加] カレンダータブ選択 - 初期化実行');
        setTimeout(() => {
            initializeAddReservationFeature();
        }, 200);
    }
});

// 予約追加モーダルを開く
function openAddReservationModal() {
    console.log('[予約追加] モーダルを開く');
    
    // DOM要素を再取得（動的生成の場合に対応）
    if (!addReservationModal) {
        const elements = getAddReservationElements();
        addReservationModal = elements.modal;
        addReservationDateInput = elements.dateInput;
        addReservationNameInput = elements.nameInput;
        addReservationPhoneInput = elements.phoneInput;
        addReservationEmailInput = elements.emailInput;
        addReservationMenuSelect = elements.menuSelect;
        addReservationTimeslotsDiv = elements.timeslotsDiv;
    }
    
    if (!addReservationModal) {
        console.error('[予約追加] モーダル要素が見つかりません');
        alert('予約追加画面を開けませんでした。ページを再読み込みしてください。');
        return;
    }
    
    // フォームをリセット
    resetAddReservationForm();
    
    // メニューオプションを設定
    populateMenuOptions();
    
    // 日付制限を撤廃（管理者権限）
    if (addReservationDateInput) {
        addReservationDateInput.removeAttribute('min');
        addReservationDateInput.removeAttribute('max');
        
        const farPast = '1900-01-01';
        const farFuture = '2099-12-31';
        addReservationDateInput.setAttribute('min', farPast);
        addReservationDateInput.setAttribute('max', farFuture);
        
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        addReservationDateInput.value = todayString;
        
        addReservationDateInput.setCustomValidity('');
        
        console.log('[予約追加] 日付制限を撤廃');
    }
    
    // モーダル表示
    addReservationModal.classList.add('active');
    console.log('[予約追加] モーダル表示完了');
}

// 予約追加モーダルを閉じる
function closeAddReservationModal() {
    console.log('[予約追加] モーダルを閉じる');
    
    if (addReservationModal) {
        addReservationModal.classList.remove('active');
    }
    resetAddReservationForm();
}

// フォームをリセット
function resetAddReservationForm() {
    if (addReservationDateInput) addReservationDateInput.value = '';
    if (addReservationNameInput) addReservationNameInput.value = '';
    if (addReservationPhoneInput) addReservationPhoneInput.value = '';
    if (addReservationEmailInput) addReservationEmailInput.value = '';
    if (addReservationMenuSelect) addReservationMenuSelect.value = '';
    if (addReservationTimeslotsDiv) addReservationTimeslotsDiv.innerHTML = '';
    
    selectedTimeSlot = null;
    isCustomTime = false;
    forceAddMode = false;
    
    if (submitAddReservationBtn) {
        submitAddReservationBtn.disabled = false;
        submitAddReservationBtn.textContent = '予約追加';
    }
}

// メニューオプションを設定
function populateMenuOptions() {
    if (!addReservationMenuSelect || !currentMenus) return;
    
    addReservationMenuSelect.innerHTML = '<option value="">メニューを選択してください</option>';
    
    Object.keys(currentMenus).forEach(menuName => {
        const option = document.createElement('option');
        option.value = menuName;
        option.textContent = `${menuName} - ${currentMenus[menuName].worktime}分 - ¥${currentMenus[menuName].fare.toLocaleString()}`;
        addReservationMenuSelect.appendChild(option);
    });
}

// 日付変更時の処理
async function handleDateChange() {
    const selectedDate = addReservationDateInput ? addReservationDateInput.value : '';
    
    if (!selectedDate) {
        if (addReservationTimeslotsDiv) {
            addReservationTimeslotsDiv.innerHTML = '';
        }
        return;
    }
    
    // 休業日チェック
    if (holidays && holidays.includes(selectedDate)) {
        if (addReservationTimeslotsDiv) {
            addReservationTimeslotsDiv.innerHTML = '<div style="color: #dc3545; text-align: center; padding: 20px;">この日は休業日です</div>';
        }
        return;
    }
    
    // 時間スロットを表示
    await displayAvailableTimeSlots(selectedDate);
}

// 利用可能な時間スロットを表示
async function displayAvailableTimeSlots(date) {
    if (!addReservationTimeslotsDiv) return;
    
    addReservationTimeslotsDiv.innerHTML = '<div style="color: #ffffff; text-align: center; padding: 10px;">時間を確認しています...</div>';
    
    try {
        // 既存の予約を取得
        const response = await fetch(`${API_BASE_URL}/reservations`);
        const allReservations = await response.json();
        
        const dayReservations = Array.isArray(allReservations) ? 
            allReservations.filter(r => r.date === date && r.states === 0) : [];
        
        // 平日・土日祝の判定
        const isWeekend = isWeekendOrHoliday(date);
        const availableSlots = isWeekend ? timeSlots.weekend : timeSlots.weekday;
        
        addReservationTimeslotsDiv.innerHTML = '';
        
        // 管理者通知メッセージを追加
        const adminNoticeDiv = document.createElement('div');
        adminNoticeDiv.innerHTML = `
            <div style="background-color: #17a2b8; color: #ffffff; padding: 12px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
                <strong>管理者モード</strong><br>
                <small>予約済みの時間帯でも強制追加が可能です</small>
            </div>
        `;
        addReservationTimeslotsDiv.appendChild(adminNoticeDiv);
        
        // 時間スロットボタンを生成
        availableSlots.forEach(time => {
            const timeSlotBtn = document.createElement('button');
            timeSlotBtn.className = 'time-slot-btn';
            timeSlotBtn.textContent = time;
            timeSlotBtn.type = 'button';
            
            const existingReservation = dayReservations.find(r => r.Time === time);
            const isBooked = !!existingReservation;
            
            if (isBooked) {
                timeSlotBtn.classList.add('admin-override');
                timeSlotBtn.style.backgroundColor = '#ffc107';
                timeSlotBtn.style.borderColor = '#ffc107';
                timeSlotBtn.style.color = '#000000';
                
                const customerName = existingReservation['Name-f'] || '名前なし';
                const isBlockedTime = existingReservation['Name-f'] === '休止時間';
                
                if (isBlockedTime) {
                    timeSlotBtn.textContent = `${time} (休止中)`;
                    timeSlotBtn.title = `休止設定: ${existingReservation['Name-s'] || '理由未設定'}`;
                } else {
                    timeSlotBtn.textContent = `${time} (${customerName})`;
                    timeSlotBtn.title = `既存予約: ${customerName} - ${existingReservation.Menu || 'メニュー不明'}`;
                }
                
                timeSlotBtn.addEventListener('click', () => {
                    const confirmMessage = isBlockedTime ? 
                        `この時間は休止設定されています。\n時間: ${time}\n理由: ${existingReservation['Name-s']}\n\n管理者権限で強制追加しますか？` :
                        `この時間は既に予約があります。\n時間: ${time}\nお客様: ${customerName}\nメニュー: ${existingReservation.Menu || '不明'}\n\n管理者権限で重複追加しますか？`;
                    
                    if (confirm(confirmMessage)) {
                        selectTimeSlot(time, timeSlotBtn, false, true);
                    }
                });
            } else {
                timeSlotBtn.addEventListener('click', () => selectTimeSlot(time, timeSlotBtn, false, false));
            }
            
            addReservationTimeslotsDiv.appendChild(timeSlotBtn);
        });
        
        // カスタム時間ボタンを追加
        const customTimeBtn = document.createElement('button');
        customTimeBtn.className = 'time-slot-btn custom-time-btn';
        customTimeBtn.textContent = 'カスタム時間';
        customTimeBtn.type = 'button';
        customTimeBtn.style.backgroundColor = '#4a4a4a';
        customTimeBtn.style.borderColor = '#555';
        customTimeBtn.style.color = '#ffffff';
        customTimeBtn.style.fontWeight = 'normal';
        
        customTimeBtn.addEventListener('click', () => openCustomTimeModal(dayReservations));
        addReservationTimeslotsDiv.appendChild(customTimeBtn);
        
    } catch (error) {
        console.error('Error loading time slots:', error);
        addReservationTimeslotsDiv.innerHTML = '<div style="color: #dc3545; text-align: center; padding: 20px;">時間スロットの取得に失敗しました</div>';
    }
}

// 日本の祝日を判定
function isWeekendOrHoliday(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
}

// 時間スロットを選択
function selectTimeSlot(time, buttonElement, isCustom = false, forceAdd = false) {
    const allTimeSlotBtns = addReservationTimeslotsDiv ? addReservationTimeslotsDiv.querySelectorAll('.time-slot-btn') : [];
    allTimeSlotBtns.forEach(btn => btn.classList.remove('selected'));
    
    if (buttonElement) {
        buttonElement.classList.add('selected');
    }
    
    selectedTimeSlot = time;
    isCustomTime = isCustom;
    forceAddMode = forceAdd;
    
    console.log(`[予約追加] 時間選択: ${time}, カスタム: ${isCustom}, 強制: ${forceAdd}`);
}

// カスタム時間入力モーダル（簡易版）
function openCustomTimeModal(dayReservations) {
    const customTime = prompt('カスタム時間を入力してください（HH:MM形式）\n例: 14:30');
    
    if (customTime && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(customTime)) {
        // 重複チェック
        const conflictReservation = dayReservations.find(r => r.Time === customTime);
        if (conflictReservation) {
            const customerName = conflictReservation['Name-f'] || '名前なし';
            const confirmMessage = `この時間は既に予約があります。\n${customTime} - ${customerName}\n\n管理者権限で重複追加しますか？`;
            
            if (confirm(confirmMessage)) {
                selectTimeSlot(customTime, null, true, true);
            }
        } else {
            selectTimeSlot(customTime, null, true, false);
        }
    } else if (customTime) {
        alert('正しい時間形式（HH:MM）で入力してください。');
    }
}

// 電話番号のバリデーション
function validatePhoneNumber(phoneNumber) {
    const phoneRegex = /^(0\d{1,4}-?\d{1,4}-?\d{4}|0\d{9,11})$/;
    const cleanPhone = phoneNumber.replace(/-/g, '');
    const cleanPhoneRegex = /^0\d{9,11}$/;
    
    return phoneRegex.test(phoneNumber) || cleanPhoneRegex.test(cleanPhone);
}

// メールアドレスのバリデーション
function validateEmail(email) {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 予約番号生成
function generateReservationNumber() {
    return Math.floor(Math.random() * 90000000) + 10000000;
}

// 予約追加処理（修正版）
async function handleAddReservation() {
    console.log('[予約追加] 予約追加処理開始');
    
    // フォームの値を取得
    const date = addReservationDateInput ? addReservationDateInput.value : '';
    const name = addReservationNameInput ? addReservationNameInput.value.trim() : '';
    const phone = addReservationPhoneInput ? addReservationPhoneInput.value.trim() : '';
    const email = addReservationEmailInput ? addReservationEmailInput.value.trim() : '';
    const menuName = addReservationMenuSelect ? addReservationMenuSelect.value : '';
    
    console.log('[予約追加] フォーム値確認:', {
        date: date,
        name: name,
        phone: phone,
        email: email,
        menuName: menuName,
        selectedTimeSlot: selectedTimeSlot
    });
    
    // バリデーション
    if (!date || !name || !menuName || !selectedTimeSlot) {
        alert('必須項目をすべて入力してください。\n（電話番号・メールアドレスは任意です）');
        return;
    }
    
    // 日付形式チェック
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        alert('日付の形式が正しくありません（YYYY-MM-DD形式で入力してください）');
        return;
    }
    
    // 電話番号とメールアドレスのバリデーション
    if (phone && !validatePhoneNumber(phone)) {
        alert('正しい電話番号を入力してください。\n（例：090-1234-5678 または 09012345678）');
        return;
    }
    
    if (!validateEmail(email)) {
        alert('正しいメールアドレスを入力してください。');
        return;
    }
    
    // 選択されたメニューの詳細を取得
    const selectedMenu = currentMenus[menuName];
    if (!selectedMenu) {
        alert('選択されたメニューが見つかりません。');
        return;
    }
    
    // 送信ボタンを無効化
    if (submitAddReservationBtn) {
        submitAddReservationBtn.disabled = true;
        submitAddReservationBtn.textContent = '予約追加中...';
    }
    
    try {
        const reservationNumber = generateReservationNumber();
        
        // メール欄と電話番号欄の設定
        let mailField = email || '管理者追加';
        let phoneField = phone || '管理者追加';
        
        if (forceAddMode && isCustomTime) {
            if (!email) mailField = '管理者強制追加（カスタム時間）';
            if (!phone) phoneField = '管理者強制追加（カスタム時間・重複）';
        } else if (forceAddMode) {
            if (!email) mailField = '管理者強制追加（重複時間）';
            if (!phone) phoneField = '管理者強制追加（重複時間）';
        } else if (isCustomTime) {
            if (!email) mailField = '管理者追加（カスタム時間）';
            if (!phone) phoneField = '管理者追加（カスタム時間）';
        }
        
        // 予約データを作成
        const reservationData = {
            reservationNumber: reservationNumber,
            Menu: menuName,
            "Name-f": name,
            "Name-s": phoneField,
            Time: selectedTimeSlot,
            WorkTime: selectedMenu.worktime,
            date: date,
            mail: mailField,
            states: 0,
            adminAdded: true,
            forceAdd: forceAddMode,
            customTime: isCustomTime,
            addedAt: new Date().toISOString()
        };
        
        console.log('[予約追加] 予約データ:', reservationData);
        
        // API呼び出し（修正版 - レスポンステキストを先に取得）
        const response = await fetch(`${API_BASE_URL}/reservations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Admin-Override': 'true',
                'X-Force-Add': forceAddMode ? 'true' : 'false',
                'X-Custom-Time': isCustomTime ? 'true' : 'false',
                'X-Admin-User': currentUser || 'admin'
            },
            body: JSON.stringify({
                ...reservationData,
                adminOverride: true,
                forceAdd: forceAddMode,
                customTime: isCustomTime,
                bypassDateRestriction: true,
                bypassTimeRestriction: true
            })
        });
        
        // レスポンステキストを取得
        const responseText = await response.text();
        console.log('[予約追加] レスポンステキスト:', responseText.substring(0, 200));
        
        // HTMLレスポンスかチェック
        if (responseText.startsWith('<!doctype') || responseText.startsWith('<!DOCTYPE') || responseText.includes('<html>')) {
            throw new Error('API_ENDPOINT_NOT_FOUND');
        }
        
        // JSONとして解析
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('[予約追加] JSON解析エラー:', parseError);
            throw new Error('INVALID_JSON_RESPONSE');
        }
        
        if (!response.ok) {
            throw new Error(result.message || result.error || `HTTP error! status: ${response.status}`);
        }
        
        if (result.success) {
            let successMessage = `予約を追加しました。\n予約番号: ${reservationData.reservationNumber}`;
            
            if (forceAddMode && isCustomTime) {
                successMessage = `管理者権限で強制追加しました（カスタム時間・重複）\n予約番号: ${reservationData.reservationNumber}\n時間: ${selectedTimeSlot}`;
            } else if (forceAddMode) {
                successMessage = `管理者権限で強制追加しました（重複時間）\n予約番号: ${reservationData.reservationNumber}\n時間: ${selectedTimeSlot}`;
            } else if (isCustomTime) {
                successMessage = `カスタム時間で予約を追加しました\n予約番号: ${reservationData.reservationNumber}\n時間: ${selectedTimeSlot}`;
            }
            
            alert(successMessage);
            
            // モーダルを閉じる
            closeAddReservationModal();
            
            // 予約データを再読み込み
            if (typeof loadReservations === 'function') {
                await loadReservations();
            }
            
            // カレンダーを再描画
            const calendarTab = document.getElementById('calendar-tab');
            if (calendarTab && calendarTab.classList.contains('active') && typeof renderCalendar === 'function') {
                renderCalendar();
            }
            
            console.log('[予約追加] 予約が正常に追加されました:', reservationData);
            
        } else {
            throw new Error(result.message || '予約の追加に失敗しました');
        }
        
    } catch (error) {
        console.error('[予約追加] 予約追加エラー:', error);
        
        let errorMessage = '予約の追加に失敗しました。';
        
        // エラータイプ別の処理
        if (error.message === 'API_ENDPOINT_NOT_FOUND') {
            errorMessage = 'APIエンドポイントが見つかりません。\n\n考えられる原因:\n• サーバーのURLが間違っている\n• APIサーバーがダウンしている\n• ネットワーク設定の問題\n\nシステム管理者にお問い合わせください。';
        } else if (error.message === 'INVALID_JSON_RESPONSE') {
            errorMessage = 'サーバーから無効な応答が返されました。\nシステム管理者にお問い合わせください。';
        } else if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            errorMessage = 'ネットワークエラーが発生しました。\n\nネットワーク接続を確認するか、\nしばらく時間をおいてから再度お試しください。';
        } else if (error.message.includes('404')) {
            errorMessage = 'APIエンドポイントが見つかりません（404エラー）。\nURL設定を確認してください。';
        } else if (error.message.includes('500')) {
            errorMessage = 'サーバー内部エラーが発生しました（500エラー）。\nしばらく時間をおいてから再度お試しください。';
        } else if (error.message.includes('CORS')) {
            errorMessage = 'CORS（Cross-Origin Resource Sharing）エラーが発生しました。\nサーバー設定を確認してください。';
        } else if (error.message) {
            errorMessage += '\n\n詳細: ' + error.message;
        }
        
        alert(errorMessage);
        
    } finally {
        // 送信ボタンを再有効化
        if (submitAddReservationBtn) {
            submitAddReservationBtn.disabled = false;
            submitAddReservationBtn.textContent = '予約追加';
        }
    }
}

// グローバル関数として公開
window.initializeAddReservationFeature = initializeAddReservationFeature;
window.openAddReservationModal = openAddReservationModal;

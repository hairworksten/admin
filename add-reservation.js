// 予約追加機能のJavaScript（管理者強制追加対応版）

// DOM要素
const addReservationModal = document.getElementById('add-reservation-modal');
const addReservationBtn = document.getElementById('add-reservation-btn');
const submitAddReservationBtn = document.getElementById('submit-add-reservation-btn');
const cancelAddReservationBtn = document.getElementById('cancel-add-reservation-btn');

const addReservationDateInput = document.getElementById('add-reservation-date');
const addReservationNameInput = document.getElementById('add-reservation-name');
const addReservationPhoneInput = document.getElementById('add-reservation-phone');
const addReservationEmailInput = document.getElementById('add-reservation-email');
const addReservationMenuSelect = document.getElementById('add-reservation-menu');
const addReservationTimeslotsDiv = document.getElementById('add-reservation-timeslots');

// 選択された時間を保存する変数
let selectedTimeSlot = null;
let isCustomTime = false; // カスタム時間かどうかのフラグ
let forceAddMode = false; // 強制追加モードかどうかのフラグ

// 時間スロット設定（予約サイトと同じ）
const timeSlots = {
    weekday: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
    weekend: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
};

// 日本の祝日を判定（簡易版）
function isWeekendOrHoliday(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 0=日曜日, 6=土曜日
    
    // 土曜日(6)または日曜日(0)の場合は土日祝扱い
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return true;
    }
    
    // 日本の祝日リストに含まれている場合
    // 注意: ここでは簡易版のため、実際の祝日判定は予約サイトのAPIを使用
    return false;
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeAddReservationFeature();
});

function initializeAddReservationFeature() {
    if (addReservationBtn) {
        addReservationBtn.addEventListener('click', openAddReservationModal);
    }
    
    if (cancelAddReservationBtn) {
        cancelAddReservationBtn.addEventListener('click', closeAddReservationModal);
    }
    
    if (submitAddReservationBtn) {
        submitAddReservationBtn.addEventListener('click', handleAddReservation);
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
}

// 予約追加モーダルを開く
function openAddReservationModal() {
    // フォームをリセット
    resetAddReservationForm();
    
    // メニューオプションを設定
    populateMenuOptions();
    
    // 管理者は日付制限を完全に撤廃
    if (addReservationDateInput) {
        // 属性を完全に削除
        addReservationDateInput.removeAttribute('min');
        addReservationDateInput.removeAttribute('max');
        
        // ブラウザの制限を回避するため、動的に極端な範囲を設定
        const farPast = '1900-01-01';
        const farFuture = '2099-12-31';
        addReservationDateInput.setAttribute('min', farPast);
        addReservationDateInput.setAttribute('max', farFuture);
        
        // 今日の日付をデフォルト値として設定
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        addReservationDateInput.value = todayString;
        
        // カスタム検証を無効化
        addReservationDateInput.setCustomValidity('');
        
        console.log('管理者モード: 日付制限を撤廃し、範囲を1900-2099に設定');
    }
    
    // 管理者権限の表示
    if (addReservationModal) {
        addReservationModal.classList.add('active');
    }
}

// 予約追加モーダルを閉じる
function closeAddReservationModal() {
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
    
    // 既存のオプションをクリア（最初のデフォルトオプション以外）
    addReservationMenuSelect.innerHTML = '<option value="">メニューを選択してください</option>';
    
    // メニューを追加
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
    if (holidays.includes(selectedDate)) {
        if (addReservationTimeslotsDiv) {
            addReservationTimeslotsDiv.innerHTML = '<div style="color: #dc3545; text-align: center; padding: 20px;">この日は休業日です</div>';
        }
        return;
    }
    
    // 時間スロットを表示
    await displayAvailableTimeSlots(selectedDate);
}

// 利用可能な時間スロットを表示（管理者強制追加対応版）
async function displayAvailableTimeSlots(date) {
    if (!addReservationTimeslotsDiv) return;
    
    addReservationTimeslotsDiv.innerHTML = '<div style="color: #ffffff; text-align: center; padding: 10px;">時間を確認しています...</div>';
    
    try {
        // 既存の予約を取得（統一されたAPIエンドポイントを使用）
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
                <strong>👤 管理者モード</strong><br>
                <small>予約済みの時間帯でも強制追加が可能です</small>
            </div>
        `;
        addReservationTimeslotsDiv.appendChild(adminNoticeDiv);
        
        // 既存の時間スロットボタンを生成
        availableSlots.forEach(time => {
            const timeSlotBtn = document.createElement('button');
            timeSlotBtn.className = 'time-slot-btn';
            timeSlotBtn.textContent = time;
            timeSlotBtn.type = 'button';
            
            // 既に予約がある時間をチェック
            const existingReservation = dayReservations.find(r => r.Time === time);
            const isBooked = !!existingReservation;
            
            if (isBooked) {
                // 予約済みでも管理者は選択可能（見た目を変更）
                timeSlotBtn.classList.add('admin-override');
                timeSlotBtn.style.backgroundColor = '#ffc107'; // 警告色
                timeSlotBtn.style.borderColor = '#ffc107';
                timeSlotBtn.style.color = '#000000';
                
                // 既存予約の情報を表示
                const customerName = existingReservation['Name-f'] || '名前なし';
                const isBlockedTime = existingReservation['Name-f'] === '休止時間';
                
                if (isBlockedTime) {
                    timeSlotBtn.textContent = `${time} (休止中)`;
                    timeSlotBtn.title = `休止設定: ${existingReservation['Name-s'] || '理由未設定'}`;
                } else {
                    timeSlotBtn.textContent = `${time} (${customerName})`;
                    timeSlotBtn.title = `既存予約: ${customerName} - ${existingReservation.Menu || 'メニュー不明'}`;
                }
                
                // 管理者権限で選択可能
                timeSlotBtn.addEventListener('click', () => {
                    const confirmMessage = isBlockedTime ? 
                        `この時間は休止設定されています。\n時間: ${time}\n理由: ${existingReservation['Name-s']}\n\n管理者権限で強制追加しますか？` :
                        `この時間は既に予約があります。\n時間: ${time}\nお客様: ${customerName}\nメニュー: ${existingReservation.Menu || '不明'}\n\n管理者権限で重複追加しますか？`;
                    
                    if (confirm(confirmMessage)) {
                        selectTimeSlot(time, timeSlotBtn, false, true); // forceAdd = true
                    }
                });
            } else {
                // 空いている時間（通常通り）
                timeSlotBtn.addEventListener('click', () => selectTimeSlot(time, timeSlotBtn, false, false));
            }
            
            addReservationTimeslotsDiv.appendChild(timeSlotBtn);
        });
        
        // カスタム時間ボタンを追加
        const customTimeBtn = document.createElement('button');
        customTimeBtn.className = 'time-slot-btn custom-time-btn';
        customTimeBtn.textContent = 'カスタム時間';
        customTimeBtn.type = 'button';
        // 他の時刻ボタンと同じスタイルにする
        customTimeBtn.style.backgroundColor = '#4a4a4a';
        customTimeBtn.style.borderColor = '#555';
        customTimeBtn.style.color = '#ffffff';
        customTimeBtn.style.fontWeight = 'normal';
        
        customTimeBtn.addEventListener('click', () => openCustomTimeModal(dayReservations));
        addReservationTimeslotsDiv.appendChild(customTimeBtn);
        
        // 管理者権限の説明を追加
        const adminExplanationDiv = document.createElement('div');
        adminExplanationDiv.innerHTML = `
            <div style="background-color: #343a40; color: #ffffff; padding: 10px; border-radius: 6px; margin-top: 15px; font-size: 13px;">
                <strong>管理者権限について：</strong><br>
                • <span style="color: #ffc107;">黄色のボタン</span>: 予約済み/休止中でも強制追加可能<br>
                • 重複予約や休止時間への追加も可能です<br>
                • お客様への連絡は必ず行ってください
            </div>
        `;
        addReservationTimeslotsDiv.appendChild(adminExplanationDiv);
        
    } catch (error) {
        console.error('Error loading time slots:', error);
        addReservationTimeslotsDiv.innerHTML = '<div style="color: #dc3545; text-align: center; padding: 20px;">時間スロットの取得に失敗しました</div>';
    }
}

// カスタム時間入力モーダルを開く（管理者権限対応版）
function openCustomTimeModal(dayReservations) {
    const modalHTML = `
        <div id="custom-time-modal" class="modal active">
            <div class="modal-content">
                <h3>カスタム時間入力（管理者権限）</h3>
                <div class="custom-time-form">
                    <div class="form-group">
                        <label for="custom-time-input">予約時間を入力してください（HH:MM形式）</label>
                        <input type="time" id="custom-time-input" min="00:00" max="23:59">
                    </div>
                    
                    <div class="custom-time-notes">
                        <h4>⚠️ 管理者権限でのカスタム時間</h4>
                        <ul>
                            <li>営業時間外（8:00〜19:00外）でも設定可能です</li>
                            <li>既存予約と重複していても強制追加できます</li>
                            <li>1分単位で設定可能です</li>
                            <li>お客様への確認を必ず行ってください</li>
                            <li>特別対応として記録されます</li>
                        </ul>
                    </div>
                    
                    <div class="existing-reservations">
                        <h4>📅 この日の既存予約</h4>
                        <div id="existing-reservations-list" class="existing-list">
                            ${dayReservations.length > 0 ? 
                                dayReservations.map(r => {
                                    const customerName = r['Name-f'] || '名前なし';
                                    const menuName = r.Menu || 'メニューなし';
                                    const isBlocked = customerName === '休止時間';
                                    
                                    return `<div class="existing-item ${isBlocked ? 'blocked-time' : ''}">${r.Time} - ${customerName} (${menuName})</div>`;
                                }).join('') :
                                '<div class="existing-item no-reservations">この日は予約がありません</div>'
                            }
                        </div>
                    </div>
                    
                    <div class="modal-buttons">
                        <button id="confirm-custom-time-btn" class="btn btn-success">この時間で設定</button>
                        <button id="cancel-custom-time-btn" class="btn btn-secondary">キャンセル</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 既存のカスタム時間モーダルがある場合は削除
    const existingModal = document.getElementById('custom-time-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // モーダルを追加
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // イベントリスナー設定
    const customTimeInput = document.getElementById('custom-time-input');
    const confirmBtn = document.getElementById('confirm-custom-time-btn');
    const cancelBtn = document.getElementById('cancel-custom-time-btn');
    
    // 現在時刻を初期値として設定
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    customTimeInput.value = timeString;
    
    // 確認ボタンのイベントリスナー
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            const customTime = customTimeInput.value;
            if (validateCustomTimeAdmin(customTime, dayReservations)) {
                selectTimeSlot(customTime, null, true, forceAddMode);
                closeCustomTimeModal();
            }
        });
    }
    
    // キャンセルボタンのイベントリスナー
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeCustomTimeModal);
    }
    
    // モーダル外クリックで閉じる
    const modal = document.getElementById('custom-time-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeCustomTimeModal();
            }
        });
    }
    
    // 入力フォーカス
    if (customTimeInput) {
        customTimeInput.focus();
    }
}

// カスタム時間のバリデーション（管理者版 - 制限を緩和）
function validateCustomTimeAdmin(timeString, dayReservations) {
    if (!timeString) {
        alert('時間を入力してください。');
        return false;
    }
    
    // 時間形式のチェック
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeString)) {
        alert('正しい時間形式（HH:MM）で入力してください。');
        return false;
    }
    
    // 営業時間外の警告（管理者は強制可能）
    const [hours, minutes] = timeString.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const startTime = 8 * 60; // 8:00
    const endTime = 19 * 60;  // 19:00
    
    if (timeInMinutes < startTime || timeInMinutes >= endTime) {
        const confirmMessage = `営業時間外（${timeString}）ですが、管理者権限で設定しますか？\n\n注意：\n• お客様への特別な連絡が必要です\n• 営業時間外対応として記録されます`;
        if (!confirm(confirmMessage)) {
            return false;
        }
        forceAddMode = true;
    }
    
    // 既存予約との重複チェック（管理者は強制可能）
    const conflictReservation = dayReservations.find(r => r.Time === timeString);
    if (conflictReservation) {
        const customerName = conflictReservation['Name-f'] || '名前なし';
        const isBlocked = customerName === '休止時間';
        
        const conflictMessage = isBlocked ?
            `この時間は休止設定されています。\n${timeString} - ${conflictReservation['Name-s'] || '理由なし'}\n\n管理者権限で強制追加しますか？` :
            `この時間は既に予約があります。\n${timeString} - ${customerName} (${conflictReservation.Menu || 'メニューなし'})\n\n管理者権限で重複追加しますか？`;
        
        if (!confirm(conflictMessage)) {
            return false;
        }
        forceAddMode = true;
    }
    
    return true;
}

// カスタム時間モーダルを閉じる
function closeCustomTimeModal() {
    const modal = document.getElementById('custom-time-modal');
    if (modal) {
        modal.remove();
    }
}

// 時間スロットを選択（管理者強制追加対応版）
function selectTimeSlot(time, buttonElement, isCustom = false, forceAdd = false) {
    // 既存の選択を解除
    const allTimeSlotBtns = addReservationTimeslotsDiv.querySelectorAll('.time-slot-btn');
    allTimeSlotBtns.forEach(btn => btn.classList.remove('selected'));
    
    // 新しい選択を設定
    if (buttonElement) {
        buttonElement.classList.add('selected');
    }
    
    selectedTimeSlot = time;
    isCustomTime = isCustom;
    forceAddMode = forceAdd;
    
    // カスタム時間の場合は視覚的な表示を更新
    if (isCustom) {
        // カスタム時間ボタンを選択状態にする
        const customBtn = addReservationTimeslotsDiv.querySelector('.custom-time-btn');
        if (customBtn) {
            customBtn.classList.add('selected');
            customBtn.textContent = `カスタム (${time})`;
            customBtn.style.backgroundColor = '#ff6b35';
            customBtn.style.borderColor = '#ff6b35';
        }
        
        // 確認メッセージを表示（ボタンの下に配置）
        const confirmationDiv = document.createElement('div');
        confirmationDiv.className = 'custom-time-confirmation';
        confirmationDiv.innerHTML = forceAdd ? 
            `⚠️ 強制追加: カスタム時間 ${time} が選択されました` :
            `✅ カスタム時間 ${time} が選択されました`;
        
        // 強制追加の場合は色を変更
        if (forceAdd) {
            confirmationDiv.style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
            confirmationDiv.style.borderColor = '#ffc107';
            confirmationDiv.style.color = '#ffc107';
        }
        
        // 既存の確認メッセージがある場合は削除
        const existingConfirmation = addReservationTimeslotsDiv.querySelector('.custom-time-confirmation');
        if (existingConfirmation) {
            existingConfirmation.remove();
        }
        
        addReservationTimeslotsDiv.appendChild(confirmationDiv);
    } else {
        // 通常の時間スロットの場合は確認メッセージを削除
        const existingConfirmation = addReservationTimeslotsDiv.querySelector('.custom-time-confirmation');
        if (existingConfirmation) {
            existingConfirmation.remove();
        }
        
        // カスタムボタンの表示をリセット
        const customBtn = addReservationTimeslotsDiv.querySelector('.custom-time-btn');
        if (customBtn) {
            customBtn.textContent = 'カスタム時間';
            customBtn.style.backgroundColor = '#4a4a4a';
            customBtn.style.borderColor = '#555';
            customBtn.style.color = '#ffffff';
            customBtn.style.fontWeight = 'normal';
        }
        
        // 強制追加の場合の確認メッセージ
        if (forceAdd) {
            const forceConfirmationDiv = document.createElement('div');
            forceConfirmationDiv.className = 'force-add-confirmation';
            forceConfirmationDiv.innerHTML = `⚠️ 管理者権限で強制追加: ${time}`;
            forceConfirmationDiv.style.cssText = `
                background-color: rgba(255, 193, 7, 0.2);
                border: 2px solid #ffc107;
                border-radius: 8px;
                padding: 12px;
                margin-top: 15px;
                text-align: center;
                color: #ffc107;
                font-weight: bold;
                animation: fadeInScale 0.5s ease-out;
            `;
            
            // 既存の強制追加確認メッセージがある場合は削除
            const existingForceConfirmation = addReservationTimeslotsDiv.querySelector('.force-add-confirmation');
            if (existingForceConfirmation) {
                existingForceConfirmation.remove();
            }
            
            addReservationTimeslotsDiv.appendChild(forceConfirmationDiv);
        }
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
    if (!email) return true; // メールアドレスは任意
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 予約番号生成
function generateReservationNumber() {
    return Math.floor(Math.random() * 90000000) + 10000000;
}

// 予約追加処理（管理者強制追加対応版）
async function handleAddReservation() {
    // ブラウザの標準検証を無効化（管理者権限）
    const form = addReservationModal.querySelector('form');
    if (form) {
        form.noValidate = true;
    }
    
    // フォームの値を取得
    const date = addReservationDateInput ? addReservationDateInput.value : '';
    const name = addReservationNameInput ? addReservationNameInput.value.trim() : '';
    const phone = addReservationPhoneInput ? addReservationPhoneInput.value.trim() : '';
    const email = addReservationEmailInput ? addReservationEmailInput.value.trim() : '';
    const menuName = addReservationMenuSelect ? addReservationMenuSelect.value : '';
    
    console.log('フォーム値確認:', {
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
    
    // 日付形式チェック（管理者権限でも最低限は必要）
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        alert('日付の形式が正しくありません（YYYY-MM-DD形式で入力してください）');
        return;
    }
    
    // 電話番号が入力されている場合のみバリデーション
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
    
    // 過去日・当日のチェック（管理者権限での警告のみ）
    const selectedDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        if (!confirm(`過去の日付（${date}）に予約を追加します。\n管理者権限で実行しますか？`)) {
            return;
        }
        forceAddMode = true;
    } else if (selectedDate.toDateString() === today.toDateString()) {
        if (!confirm(`本日（${date}）に予約を追加します。\n管理者権限で実行しますか？`)) {
            return;
        }
        forceAddMode = true;
    }
    
    // 最終確認（管理者強制追加の場合）
    if (forceAddMode || isCustomTime) {
        let confirmMessage = '';
        
        if (forceAddMode && isCustomTime) {
            confirmMessage = `管理者権限でカスタム時間に強制追加します。\n\n時間: ${selectedTimeSlot}\nお客様: ${name}\nメニュー: ${menuName}\n日付: ${date}\n\n⚠️ 重要事項:\n• 既存予約との重複または営業時間外です\n• お客様への連絡は必須です\n• 特別対応として記録されます\n\n追加しますか？`;
        } else if (forceAddMode) {
            confirmMessage = `管理者権限で強制追加します。\n\n時間: ${selectedTimeSlot}\nお客様: ${name}\nメニュー: ${menuName}\n日付: ${date}\n\n⚠️ この時間は既に予約があるか、過去日・当日です\n• お客様への連絡をお忘れなく\n• 重複予約または特別対応として記録されます\n\n追加しますか？`;
        } else if (isCustomTime) {
            confirmMessage = `カスタム時間で予約を追加しますか？\n\n時間: ${selectedTimeSlot}\nお客様: ${name}\nメニュー: ${menuName}\n日付: ${date}\n\n⚠️ 注意：\n• 通常の時間スロット外です\n• お客様への連絡を忘れずに行ってください`;
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
    }
    
    // 送信ボタンを無効化
    if (submitAddReservationBtn) {
        submitAddReservationBtn.disabled = true;
        submitAddReservationBtn.textContent = '予約追加中...';
    }
    
    try {
        // まず予約番号の重複をチェック
        const reservationNumber = generateReservationNumber();
        
        // メール欄に管理者追加情報を設定
        let mailField = email || '管理者追加';
        if (forceAddMode && isCustomTime) {
            mailField = email || '管理者強制追加（カスタム時間）';
        } else if (forceAddMode) {
            mailField = email || '管理者強制追加（重複時間）';
        } else if (isCustomTime) {
            mailField = email || '管理者追加（カスタム時間）';
        }
        
        // 電話番号欄の設定（管理者追加情報を含む）
        let phoneField = phone;
        if (!phone) {
            if (forceAddMode && isCustomTime) {
                phoneField = '管理者強制追加（カスタム時間・重複）';
            } else if (forceAddMode) {
                phoneField = '管理者強制追加（重複時間）';
            } else if (isCustomTime) {
                phoneField = '管理者追加（カスタム時間）';
            } else {
                phoneField = '管理者追加';
            }
        }
        
        // 予約データを作成（統一されたAPIフォーマット）
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
            // 管理者追加のメタデータを追加
            adminAdded: true,
            forceAdd: forceAddMode,
            customTime: isCustomTime,
            addedAt: new Date().toISOString()
        };
        
        console.log('予約データ:', reservationData);
        console.log('管理者強制追加フラグ:', forceAddMode);
        console.log('カスタム時間フラグ:', isCustomTime);
        console.log('使用するAPIエンドポイント:', API_BASE_URL);
        
        // 管理者権限での追加の場合、専用エンドポイントを試行
        let apiEndpoint = `${API_BASE_URL}/reservations`;
        if (forceAddMode || isCustomTime) {
            // 管理者専用エンドポイントがある場合はそちらを使用
            apiEndpoint = `${API_BASE_URL}/admin/reservations`;
        }
        
        console.log('使用するエンドポイント:', apiEndpoint);
        
        // 統一されたAPIエンドポイントを使用（管理者権限ヘッダー追加）
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Admin-Override': 'true', // 管理者権限フラグ
                'X-Force-Add': forceAddMode ? 'true' : 'false', // 強制追加フラグ
                'X-Custom-Time': isCustomTime ? 'true' : 'false', // カスタム時間フラグ
                'X-Admin-User': currentUser || 'admin' // 管理者ユーザー情報
            },
            body: JSON.stringify({
                ...reservationData,
                // リクエストボディにも管理者情報を追加
                adminOverride: true,
                forceAdd: forceAddMode,
                customTime: isCustomTime,
                bypassDateRestriction: true, // 日付制限を回避
                bypassTimeRestriction: true  // 時間制限を回避
            })
        });
        
        console.log('Response status:', response.status);
        
        // レスポンスの内容を確認
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        // HTMLが返された場合の処理
        if (responseText.startsWith('<!doctype') || responseText.startsWith('<!DOCTYPE') || responseText.includes('<html>')) {
            console.error('HTMLレスポンスが返されました:', responseText.substring(0, 200));
            throw new Error('APIエンドポイントが見つからないか、CORS設定に問題があります。');
        }
        
        // JSONとして解析を試行
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON解析エラー:', parseError);
            throw new Error('サーバーから無効なJSON応答が返されました。');
        }
        
        if (!response.ok) {
            // 管理者専用エンドポイントで失敗した場合、通常エンドポイントで再試行
            if (apiEndpoint.includes('/admin/') && response.status === 404) {
                console.log('管理者専用エンドポイントが見つからないため、通常エンドポイントで再試行');
                
                const fallbackResponse = await fetch(`${API_BASE_URL}/reservations`, {
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
                
                const fallbackText = await fallbackResponse.text();
                
                if (fallbackResponse.ok) {
                    // フォールバック成功
                    console.log('フォールバック成功');
                    try {
                        result = JSON.parse(fallbackText);
                    } catch (parseError) {
                        throw new Error('サーバーから無効なJSON応答が返されました。');
                    }
                } else {
                    // フォールバックも失敗
                    try {
                        const fallbackResult = JSON.parse(fallbackText);
                        throw new Error(fallbackResult.message || fallbackResult.error || `HTTP error! status: ${fallbackResponse.status}`);
                    } catch (parseError) {
                        throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
                    }
                }
            } else {
                throw new Error(result.message || result.error || `HTTP error! status: ${response.status}`);
            }
        }
        
        // 成功判定
        if (!result.success && result.success !== undefined) {
            throw new Error(result.message || '予約の追加に失敗しました');
        }
        
        // 成功時のメッセージ生成
        let successMessage = `予約を追加しました。\n予約番号: ${reservationData.reservationNumber}`;
        
        if (forceAddMode && isCustomTime) {
            successMessage = `⚠️ 管理者権限で強制追加しました（カスタム時間・重複）\n予約番号: ${reservationData.reservationNumber}\n時間: ${selectedTimeSlot}\n\n重要: お客様への特別な連絡が必要です！`;
        } else if (forceAddMode) {
            successMessage = `⚠️ 管理者権限で強制追加しました（重複時間）\n予約番号: ${reservationData.reservationNumber}\n時間: ${selectedTimeSlot}\n\n注意: 既存予約との重複があります！`;
        } else if (isCustomTime) {
            successMessage = `✅ カスタム時間で予約を追加しました\n予約番号: ${reservationData.reservationNumber}\n時間: ${selectedTimeSlot}\n\n⚠️ お客様への連絡をお忘れなく！`;
        }
        
        alert(successMessage);
        
        // モーダルを閉じる
        closeAddReservationModal();
        
        // 予約データを再読み込み
        await loadReservations();
        
        // カレンダーを再描画
        const calendarTab = document.getElementById('calendar-tab');
        if (calendarTab && calendarTab.classList.contains('active')) {
            if (typeof renderCalendar === 'function') {
                renderCalendar();
            }
        }
        
        console.log('予約が正常に追加されました:', reservationData);
        
    } catch (error) {
        console.error('予約追加エラー:', error);
        
        // HTMLレスポンスが返された場合の特別処理
        if (error.message.includes('Unexpected token') || 
            error.message.includes('<!doctype') || 
            error.message.includes('HTMLレスポンス') ||
            error.message.includes('APIエンドポイント')) {
            
            // デモ用のローカル処理を実行
            console.log('APIが利用できないため、ローカルデモモードで実行します');
            
            let demoMessage = 'APIサーバーに接続できませんが、デモ用にローカルで予約を追加しますか？\n（実際のデータベースには保存されません）';
            
            if (forceAddMode && isCustomTime) {
                demoMessage = `APIサーバーに接続できませんが、デモ用に管理者強制追加（カスタム時間・重複: ${selectedTimeSlot}）でローカル予約を追加しますか？\n（実際のデータベースには保存されません）`;
            } else if (forceAddMode) {
                demoMessage = `APIサーバーに接続できませんが、デモ用に管理者強制追加（重複時間: ${selectedTimeSlot}）でローカル予約を追加しますか？\n（実際のデータベースには保存されません）`;
            } else if (isCustomTime) {
                demoMessage = `APIサーバーに接続できませんが、デモ用にカスタム時間（${selectedTimeSlot}）でローカル予約を追加しますか？\n（実際のデータベースには保存されません）`;
            }
            
            if (confirm(demoMessage)) {
                try {
                    // ローカルの予約配列に追加
                    const localReservationData = {
                        id: Date.now(), // 仮のID
                        reservationNumber: generateReservationNumber(),
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
                        customTime: isCustomTime
                    };
                    
                    // グローバルのreservations配列に追加
                    if (typeof reservations !== 'undefined' && Array.isArray(reservations)) {
                        reservations.push(localReservationData);
                    }
                    
                    let demoSuccessMessage = `デモ用予約を追加しました。\n予約番号: ${localReservationData.reservationNumber}\n\n※これはデモ用です。実際のデータベースには保存されていません。`;
                    
                    if (forceAddMode && isCustomTime) {
                        demoSuccessMessage = `デモ用管理者強制追加（カスタム時間・重複）を追加しました。\n予約番号: ${localReservationData.reservationNumber}\n時間: ${selectedTimeSlot}\n\n※これはデモ用です。`;
                    } else if (forceAddMode) {
                        demoSuccessMessage = `デモ用管理者強制追加（重複時間）を追加しました。\n予約番号: ${localReservationData.reservationNumber}\n時間: ${selectedTimeSlot}\n\n※これはデモ用です。`;
                    } else if (isCustomTime) {
                        demoSuccessMessage = `デモ用カスタム時間予約を追加しました。\n予約番号: ${localReservationData.reservationNumber}\n時間: ${selectedTimeSlot}\n\n※これはデモ用です。`;
                    }
                    
                    alert(demoSuccessMessage);
                    
                    // モーダルを閉じる
                    closeAddReservationModal();
                    
                    // 画面を更新
                    if (typeof displayReservations === 'function') {
                        displayReservations();
                    }
                    
                    const calendarTab = document.getElementById('calendar-tab');
                    if (calendarTab && calendarTab.classList.contains('active')) {
                        if (typeof renderCalendar === 'function') {
                            renderCalendar();
                        }
                    }
                    
                    return; // 成功として終了
                    
                } catch (localError) {
                    console.error('ローカル処理エラー:', localError);
                }
            }
        }
        
        // エラーメッセージの表示
        let errorMessage = '予約の追加に失敗しました。';
        
        if (forceAddMode) {
            errorMessage = '管理者強制追加に失敗しました。';
        } else if (isCustomTime) {
            errorMessage = 'カスタム時間での予約追加に失敗しました。';
        }
        
        if (error.message.includes('Unexpected token') || error.message.includes('<!doctype')) {
            errorMessage = 'APIサーバーに接続できません。\n\n考えられる原因：\n• APIエンドポイントが正しくない\n• CORS設定の問題\n• サーバーがダウンしている\n\nシステム管理者にお問い合わせください。';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
            errorMessage = 'ネットワークエラーが発生しました。\nインターネット接続を確認してください。';
        } else if (error.message.includes('404')) {
            errorMessage = 'APIエンドポイントが見つかりません。\nURL設定を確認してください。';
        } else if (error.message.includes('500')) {
            errorMessage = 'サーバーエラーが発生しました。\nしばらく時間をおいてから再度お試しください。';
        } else if (error.message.includes('already exists') || error.message.includes('重複')) {
            errorMessage = 'この時間は既に予約が入っています。\n管理者権限でも重複エラーが発生しました。';
        } else if (error.message.includes('１日後から可能') || error.message.includes('日後から') || error.message.includes('明日から')) {
            errorMessage = `サーバー側の日付制限が有効になっています。\n\n対処方法:\n• サーバー管理者に管理者権限の設定を依頼\n• APIの日付制限設定を確認\n• 管理者専用エンドポイントの有効化を確認\n\n詳細: ${error.message}`;
        } else if (error.message.includes('時間外') || error.message.includes('営業時間')) {
            errorMessage = `営業時間の制限が有効になっています。\n\n管理者権限での時間外予約には以下が必要:\n• サーバー側での管理者権限設定\n• 時間制限の回避設定\n\n詳細: ${error.message}`;
        } else if (error.message) {
            errorMessage += '\n\n詳細: ' + error.message;
        }
        
        alert(errorMessage);
        
        // デバッグ情報をコンソールに出力
        console.error('Error Details:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            isCustomTime: isCustomTime,
            forceAddMode: forceAddMode,
            selectedTime: selectedTimeSlot,
            apiEndpoint: API_BASE_URL,
            reservationData: {
                date: date,
                name: name,
                phone: phone,
                email: email,
                menu: menuName,
                time: selectedTimeSlot
            }
        });
        
    } finally {
        // 送信ボタンを再有効化
        if (submitAddReservationBtn) {
            submitAddReservationBtn.disabled = false;
            submitAddReservationBtn.textContent = '予約追加';
        }
    }
}

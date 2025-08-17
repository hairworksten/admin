// 予約追加機能のJavaScript（カスタム時間入力対応版）

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
    
    // 今日の日付を最小値として設定
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // 明日から選択可能
    const tomorrowString = tomorrow.toISOString().split('T')[0];
    
    if (addReservationDateInput) {
        addReservationDateInput.min = tomorrowString;
        addReservationDateInput.value = '';
    }
    
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

// 利用可能な時間スロットを表示（カスタム時間対応版）
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
        
        // 既存の時間スロットボタンを生成
        availableSlots.forEach(time => {
            const timeSlotBtn = document.createElement('button');
            timeSlotBtn.className = 'time-slot-btn';
            timeSlotBtn.textContent = time;
            timeSlotBtn.type = 'button';
            
            // 既に予約がある時間は無効化
            const isBooked = dayReservations.some(r => r.Time === time);
            
            if (isBooked) {
                timeSlotBtn.classList.add('disabled');
                timeSlotBtn.disabled = true;
                timeSlotBtn.textContent += ' (予約済み)';
            } else {
                timeSlotBtn.addEventListener('click', () => selectTimeSlot(time, timeSlotBtn, false));
            }
            
            addReservationTimeslotsDiv.appendChild(timeSlotBtn);
        });
        
        // カスタム時間ボタンを追加
        const customTimeBtn = document.createElement('button');
        customTimeBtn.className = 'time-slot-btn custom-time-btn';
        customTimeBtn.textContent = '⏰ カスタム';
        customTimeBtn.type = 'button';
        customTimeBtn.style.backgroundColor = '#28a745';
        customTimeBtn.style.borderColor = '#28a745';
        customTimeBtn.style.color = '#ffffff';
        customTimeBtn.style.fontWeight = 'bold';
        
        customTimeBtn.addEventListener('click', () => openCustomTimeModal(dayReservations));
        addReservationTimeslotsDiv.appendChild(customTimeBtn);
        
    } catch (error) {
        console.error('Error loading time slots:', error);
        addReservationTimeslotsDiv.innerHTML = '<div style="color: #dc3545; text-align: center; padding: 20px;">時間スロットの取得に失敗しました</div>';
    }
}

// カスタム時間入力モーダルを開く
function openCustomTimeModal(dayReservations) {
    const modalHTML = `
        <div id="custom-time-modal" class="modal active">
            <div class="modal-content">
                <h3>カスタム時間入力</h3>
                <div class="custom-time-form">
                    <div class="form-group">
                        <label for="custom-time-input">予約時間を入力してください（HH:MM形式）</label>
                        <input type="time" id="custom-time-input" min="08:00" max="19:00">
                    </div>
                    
                    <div class="custom-time-notes">
                        <h4>⚠️ カスタム時間の注意事項</h4>
                        <ul>
                            <li>営業時間内（8:00〜19:00）で設定してください</li>
                            <li>既存の予約と重複しないように確認してください</li>
                            <li>1分単位で設定可能です</li>
                            <li>お客様への確認を忘れずに行ってください</li>
                        </ul>
                    </div>
                    
                    <div class="existing-reservations">
                        <h4>📅 この日の既存予約</h4>
                        <div id="existing-reservations-list" class="existing-list">
                            ${dayReservations.length > 0 ? 
                                dayReservations.map(r => 
                                    `<div class="existing-item">${r.Time} - ${r['Name-f'] || '名前なし'} (${r.Menu || 'メニューなし'})</div>`
                                ).join('') :
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
    
    // 現在時刻を初期値として設定（営業時間内の場合）
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (currentHour >= 8 && currentHour < 19) {
        const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        customTimeInput.value = timeString;
    } else {
        customTimeInput.value = '10:00'; // デフォルト値
    }
    
    // 確認ボタンのイベントリスナー
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            const customTime = customTimeInput.value;
            if (validateCustomTime(customTime, dayReservations)) {
                selectTimeSlot(customTime, null, true);
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

// カスタム時間のバリデーション
function validateCustomTime(timeString, dayReservations) {
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
    
    // 営業時間のチェック
    const [hours, minutes] = timeString.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const startTime = 8 * 60; // 8:00
    const endTime = 19 * 60;  // 19:00
    
    if (timeInMinutes < startTime || timeInMinutes >= endTime) {
        alert('営業時間（8:00〜19:00）内で設定してください。');
        return false;
    }
    
    // 既存予約との重複チェック
    const isConflict = dayReservations.some(r => r.Time === timeString);
    if (isConflict) {
        const conflictReservation = dayReservations.find(r => r.Time === timeString);
        alert(`この時間は既に予約があります。\n${timeString} - ${conflictReservation['Name-f'] || '名前なし'} (${conflictReservation.Menu || 'メニューなし'})`);
        return false;
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

// 時間スロットを選択（カスタム時間対応版）
function selectTimeSlot(time, buttonElement, isCustom = false) {
    // 既存の選択を解除
    const allTimeSlotBtns = addReservationTimeslotsDiv.querySelectorAll('.time-slot-btn');
    allTimeSlotBtns.forEach(btn => btn.classList.remove('selected'));
    
    // 新しい選択を設定
    if (buttonElement) {
        buttonElement.classList.add('selected');
    }
    
    selectedTimeSlot = time;
    isCustomTime = isCustom;
    
    // カスタム時間の場合は視覚的な表示を更新
    if (isCustom) {
        // カスタム時間ボタンを選択状態にする
        const customBtn = addReservationTimeslotsDiv.querySelector('.custom-time-btn');
        if (customBtn) {
            customBtn.classList.add('selected');
            customBtn.textContent = `⏰ カスタム (${time})`;
            customBtn.style.backgroundColor = '#ff6b35';
            customBtn.style.borderColor = '#ff6b35';
        }
        
        // 確認メッセージを表示
        const confirmationDiv = document.createElement('div');
        confirmationDiv.className = 'custom-time-confirmation';
        confirmationDiv.style.cssText = `
            background-color: rgba(40, 167, 69, 0.2);
            border: 2px solid #28a745;
            border-radius: 8px;
            padding: 10px;
            margin-top: 10px;
            text-align: center;
            color: #28a745;
            font-weight: bold;
        `;
        confirmationDiv.innerHTML = `✅ カスタム時間 ${time} が選択されました`;
        
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
            customBtn.textContent = '⏰ カスタム';
            customBtn.style.backgroundColor = '#28a745';
            customBtn.style.borderColor = '#28a745';
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

// 予約追加処理（カスタム時間対応版）
async function handleAddReservation() {
    // フォームの値を取得
    const date = addReservationDateInput ? addReservationDateInput.value : '';
    const name = addReservationNameInput ? addReservationNameInput.value.trim() : '';
    const phone = addReservationPhoneInput ? addReservationPhoneInput.value.trim() : '';
    const email = addReservationEmailInput ? addReservationEmailInput.value.trim() : '';
    const menuName = addReservationMenuSelect ? addReservationMenuSelect.value : '';
    
    // バリデーション
    if (!date || !name || !menuName || !selectedTimeSlot) {
        alert('必須項目をすべて入力してください。\n（電話番号・メールアドレスは任意です）');
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
    
    // カスタム時間の場合の追加確認
    if (isCustomTime) {
        const confirmMessage = `カスタム時間 ${selectedTimeSlot} で予約を追加しますか？\n\n⚠️ 注意：\n• 通常の時間スロット外です\n• お客様への連絡を忘れずに行ってください\n• 必要に応じて確認メールを送信してください`;
        
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
        // 予約サイトと同じAPIベースURLを使用
        const RESERVATION_API_BASE_URL = 'https://hair-works-api-36382648212.asia-northeast1.run.app/api';
        
        // まず予約番号の重複をチェック
        const reservationNumber = generateReservationNumber();
        
        // 予約データを作成（予約サイトと完全に同じ形式）
        const reservationData = {
            reservationNumber: reservationNumber,
            Menu: menuName,
            "Name-f": name,
            "Name-s": phone || (isCustomTime ? '管理者追加（カスタム時間）' : '管理者追加（電話番号なし）'),
            Time: selectedTimeSlot,
            WorkTime: selectedMenu.worktime,
            date: date,
            mail: email || (isCustomTime ? 'カスタム時間予約' : '管理者追加'),
            states: 0
        };
        
        console.log('予約データ:', reservationData);
        console.log('カスタム時間フラグ:', isCustomTime);
        
        // 予約サイトと同じバッチAPIを使用
        const response = await fetch(`${RESERVATION_API_BASE_URL}/reservations/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                reservations: [reservationData]
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
            throw new Error(result.message || result.error || `HTTP error! status: ${response.status}`);
        }
        
        // 成功判定
        if (!result.success) {
            throw new Error(result.message || '予約の追加に失敗しました');
        }
        
        // 成功時の処理
        const successMessage = isCustomTime ? 
            `カスタム時間での予約を追加しました。\n予約番号: ${reservationData.reservationNumber}\n時間: ${selectedTimeSlot}\n\n⚠️ お客様への連絡をお忘れなく！` :
            `予約を追加しました。\n予約番号: ${reservationData.reservationNumber}`;
        
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
            
            const demoMessage = isCustomTime ?
                `APIサーバーに接続できませんが、デモ用にカスタム時間（${selectedTimeSlot}）でローカル予約を追加しますか？\n（実際のデータベースには保存されません）` :
                `APIサーバーに接続できませんが、デモ用にローカルで予約を追加しますか？\n（実際のデータベースには保存されません）`;
            
            if (confirm(demoMessage)) {
                try {
                    // ローカルの予約配列に追加
                    const localReservationData = {
                        id: Date.now(), // 仮のID
                        reservationNumber: generateReservationNumber(),
                        Menu: menuName,
                        "Name-f": name,
                        "Name-s": phone || (isCustomTime ? '管理者追加（カスタム時間）' : '管理者追加（電話番号なし）'),
                        Time: selectedTimeSlot,
                        WorkTime: selectedMenu.worktime,
                        date: date,
                        mail: email || (isCustomTime ? 'カスタム時間予約' : '管理者追加'),
                        states: 0
                    };
                    
                    // グローバルのreservations配列に追加
                    if (typeof reservations !== 'undefined' && Array.isArray(reservations)) {
                        reservations.push(localReservationData);
                    }
                    
                    const demoSuccessMessage = isCustomTime ?
                        `デモ用カスタム時間予約を追加しました。\n予約番号: ${localReservationData.reservationNumber}\n時間: ${selectedTimeSlot}\n\n※これはデモ用です。実際のデータベースには保存されていません。` :
                        `デモ用予約を追加しました。\n予約番号: ${localReservationData.reservationNumber}\n\n※これはデモ用です。実際のデータベースには保存されていません。`;
                    
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
        let errorMessage = isCustomTime ? 
            'カスタム時間での予約追加に失敗しました。' :
            '予約の追加に失敗しました。';
        
        if (error.message.includes('Unexpected token') || error.message.includes('<!doctype')) {
            errorMessage = 'APIサーバーに接続できません。\n\n考えられる原因：\n• APIエンドポイントが正しくない\n• CORS設定の問題\n• サーバーがダウンしている\n\nシステム管理者にお問い合わせください。';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
            errorMessage = 'ネットワークエラーが発生しました。\nインターネット接続を確認してください。';
        } else if (error.message.includes('404')) {
            errorMessage = 'APIエンドポイントが見つかりません。\nURL設定を確認してください。';
        } else if (error.message.includes('500')) {
            errorMessage = 'サーバーエラーが発生しました。\nしばらく時間をおいてから再度お試しください。';
        } else if (error.message.includes('already exists') || error.message.includes('重複')) {
            errorMessage = 'この時間は既に予約が入っています。\n別の時間を選択してください。';
        } else if (error.message.includes('holiday') || error.message.includes('休業日')) {
            errorMessage = 'この日は休業日のため予約できません。';
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
            selectedTime: selectedTimeSlot,
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

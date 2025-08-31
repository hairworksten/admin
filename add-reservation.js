// 予約追加機能のJavaScript（修正版 - UI改善・重複処理防止）

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

// 重複処理防止フラグ
let isProcessingReservation = false;

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
        // 既存のイベントリスナーをクリア
        const newSubmitBtn = submitAddReservationBtn.cloneNode(true);
        submitAddReservationBtn.parentNode.replaceChild(newSubmitBtn, submitAddReservationBtn);
        submitAddReservationBtn = newSubmitBtn;
        
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

// 予約追加モーダルを開く（修正版 - メニュー読み込み強化）
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
    
    // メニューデータが利用可能かチェック
    console.log('[予約追加] モーダル表示前のメニューデータ確認:', {
        currentMenusExists: !!currentMenus,
        currentMenusType: typeof currentMenus,
        currentMenusKeys: currentMenus ? Object.keys(currentMenus) : 'なし'
    });
    
    // メニューデータが不足している場合は先に読み込み
    if (!currentMenus || typeof currentMenus !== 'object' || Object.keys(currentMenus).length === 0) {
        console.warn('[予約追加] メニューデータが不足しています。読み込みを実行...');
        
        // メニュー読み込み中メッセージを表示
        if (addReservationMenuSelect) {
            addReservationMenuSelect.innerHTML = '<option value="">メニューを読み込み中...</option>';
            addReservationMenuSelect.disabled = true;
        }
        
        // メニューデータを読み込み
        if (typeof loadMenus === 'function') {
            loadMenus().then(() => {
                console.log('[予約追加] メニューデータ読み込み完了');
                // メニューオプションを設定
                if (addReservationMenuSelect) {
                    addReservationMenuSelect.disabled = false;
                }
                populateMenuOptions();
            }).catch(error => {
                console.error('[予約追加] メニューデータ読み込みエラー:', error);
                if (addReservationMenuSelect) {
                    addReservationMenuSelect.disabled = false;
                }
                // フォールバックでデフォルトオプション設定
                populateMenuOptions();
            });
        } else {
            console.warn('[予約追加] loadMenus関数が見つかりません');
            if (addReservationMenuSelect) {
                addReservationMenuSelect.disabled = false;
            }
            populateMenuOptions();
        }
    } else {
        // メニューデータが利用可能な場合は通常設定
        populateMenuOptions();
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
    isProcessingReservation = false; // 処理フラグもリセット
    
    if (submitAddReservationBtn) {
        submitAddReservationBtn.disabled = false;
        submitAddReservationBtn.textContent = '予約追加';
        submitAddReservationBtn.style.backgroundColor = '#28a745';
    }
}

// メニューオプションを設定（修正版 - デバッグ強化）
function populateMenuOptions() {
    console.log('[予約追加] メニューオプション設定開始');
    
    if (!addReservationMenuSelect) {
        console.error('[予約追加] メニューセレクト要素が見つかりません');
        return;
    }
    
    // currentMenusの存在確認とデバッグ
    console.log('[予約追加] currentMenus確認:', {
        exists: !!currentMenus,
        type: typeof currentMenus,
        keys: currentMenus ? Object.keys(currentMenus) : 'なし',
        content: currentMenus
    });
    
    // 初期化
    addReservationMenuSelect.innerHTML = '<option value="">メニューを選択してください</option>';
    
    // currentMenusが存在しない場合の対処
    if (!currentMenus || typeof currentMenus !== 'object') {
        console.warn('[予約追加] currentMenusが無効です。再読み込みを試行します...');
        
        // メニューデータを再読み込み
        if (typeof loadMenus === 'function') {
            loadMenus().then(() => {
                console.log('[予約追加] メニューデータ再読み込み完了。再度オプション設定を試行...');
                setTimeout(() => {
                    populateMenuOptions();
                }, 500);
            }).catch(error => {
                console.error('[予約追加] メニューデータ再読み込みエラー:', error);
                // フォールバック: デフォルトメニューを表示
                addFallbackMenuOptions();
            });
        } else {
            console.warn('[予約追加] loadMenus関数が見つかりません');
            addFallbackMenuOptions();
        }
        return;
    }
    
    const menuKeys = Object.keys(currentMenus);
    console.log('[予約追加] 利用可能なメニュー:', menuKeys);
    
    if (menuKeys.length === 0) {
        console.warn('[予約追加] メニューが登録されていません');
        addReservationMenuSelect.innerHTML = '<option value="">メニューが登録されていません</option>';
        return;
    }
    
    // メニューオプションを追加
    menuKeys.forEach(menuName => {
        try {
            const menu = currentMenus[menuName];
            if (!menu || typeof menu !== 'object') {
                console.warn(`[予約追加] 無効なメニューデータ: ${menuName}`, menu);
                return;
            }
            
            const option = document.createElement('option');
            option.value = menuName;
            
            const worktime = menu.worktime || '不明';
            const fare = menu.fare || 0;
            const fareText = typeof fare === 'number' ? fare.toLocaleString() : fare;
            
            option.textContent = `${menuName} - ${worktime}分 - ¥${fareText}`;
            addReservationMenuSelect.appendChild(option);
            
            console.log(`[予約追加] メニューオプション追加: ${menuName}`);
        } catch (error) {
            console.error(`[予約追加] メニューオプション追加エラー: ${menuName}`, error);
        }
    });
    
    console.log(`[予約追加] メニューオプション設定完了: ${menuKeys.length}個`);
}

// フォールバック用のデフォルトメニュー表示
function addFallbackMenuOptions() {
    console.log('[予約追加] フォールバックメニューオプションを設定');
    
    if (!addReservationMenuSelect) return;
    
    // デフォルトメニューを追加（実際のデータがない場合の応急処置）
    const fallbackMenus = [
        { name: 'カット', worktime: '30', fare: '3000' },
        { name: 'カット＋シャンプー', worktime: '45', fare: '4000' },
        { name: 'パーマ', worktime: '90', fare: '8000' }
    ];
    
    addReservationMenuSelect.innerHTML = '<option value="">メニューを選択してください（フォールバック）</option>';
    
    fallbackMenus.forEach(menu => {
        const option = document.createElement('option');
        option.value = menu.name;
        option.textContent = `${menu.name} - ${menu.worktime}分 - ¥${menu.fare}`;
        addReservationMenuSelect.appendChild(option);
    });
    
    console.log('[予約追加] フォールバックメニュー設定完了');
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
        
        // 管理者通知メッセージを追加（改善版）
        const adminNoticeDiv = document.createElement('div');
        adminNoticeDiv.innerHTML = `
            <div style="background-color: #17a2b8; color: #ffffff; padding: 10px 15px; border-radius: 6px; margin-bottom: 15px; text-align: center; font-size: 14px;">
                <strong>🛡️ 管理者モード</strong><br>
                <small>予約済み時間も強制追加可能</small>
            </div>
        `;
        addReservationTimeslotsDiv.appendChild(adminNoticeDiv);
        
        // 時間スロット用コンテナ
        const timeSlotsContainer = document.createElement('div');
        timeSlotsContainer.className = 'time-slots-grid';
        timeSlotsContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
            gap: 8px;
            margin-bottom: 15px;
        `;
        
        // 時間スロットボタンを生成（改善版）
        availableSlots.forEach(time => {
            const timeSlotBtn = document.createElement('button');
            timeSlotBtn.className = 'time-slot-btn admin-time-slot';
            timeSlotBtn.textContent = time;
            timeSlotBtn.type = 'button';
            
            // 基本スタイル（小さくてスマート）
            timeSlotBtn.style.cssText = `
                background-color: #4a4a4a;
                color: #ffffff;
                border: 2px solid #555;
                border-radius: 6px;
                padding: 8px 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 13px;
                font-weight: 500;
                text-align: center;
                min-height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
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
                    timeSlotBtn.innerHTML = `${time}<br><small>(休止)</small>`;
                    timeSlotBtn.title = `休止設定: ${existingReservation['Name-s'] || '理由未設定'}`;
                } else {
                    timeSlotBtn.innerHTML = `${time}<br><small>(${customerName.substring(0, 4)})</small>`;
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
                
                // ホバー効果
                timeSlotBtn.addEventListener('mouseenter', function() {
                    if (!this.classList.contains('selected')) {
                        this.style.backgroundColor = '#525252';
                        this.style.borderColor = '#28a745';
                        this.style.transform = 'translateY(-1px)';
                    }
                });
                
                timeSlotBtn.addEventListener('mouseleave', function() {
                    if (!this.classList.contains('selected')) {
                        this.style.backgroundColor = '#4a4a4a';
                        this.style.borderColor = '#555';
                        this.style.transform = 'translateY(0)';
                    }
                });
            }
            
            timeSlotsContainer.appendChild(timeSlotBtn);
        });
        
        addReservationTimeslotsDiv.appendChild(timeSlotsContainer);
        
        // カスタム時間ボタンを追加（改善版）
        const customTimeBtn = document.createElement('button');
        customTimeBtn.className = 'time-slot-btn custom-time-btn';
        customTimeBtn.innerHTML = `
            <span style="font-size: 14px;">⏰</span><br>
            <small>カスタム時間</small>
        `;
        customTimeBtn.type = 'button';
        customTimeBtn.style.cssText = `
            background: linear-gradient(135deg, #6c5ce7, #a29bfe);
            border: 2px solid #6c5ce7;
            color: #ffffff;
            border-radius: 8px;
            padding: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 600;
            text-align: center;
            min-height: 50px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-top: 10px;
            width: 100%;
            box-shadow: 0 2px 4px rgba(108, 92, 231, 0.3);
        `;
        
        customTimeBtn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(108, 92, 231, 0.4)';
        });
        
        customTimeBtn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 4px rgba(108, 92, 231, 0.3)';
        });
        
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
    allTimeSlotBtns.forEach(btn => {
        btn.classList.remove('selected');
        if (!btn.classList.contains('admin-override')) {
            btn.style.backgroundColor = '#4a4a4a';
            btn.style.borderColor = '#555';
            btn.style.color = '#ffffff';
            btn.style.transform = 'translateY(0)';
        }
    });
    
    if (buttonElement) {
        buttonElement.classList.add('selected');
        if (!forceAdd) {
            buttonElement.style.backgroundColor = '#28a745';
            buttonElement.style.borderColor = '#28a745';
            buttonElement.style.color = '#ffffff';
            buttonElement.style.transform = 'translateY(-2px)';
            buttonElement.style.boxShadow = '0 4px 8px rgba(40, 167, 69, 0.3)';
        }
    }
    
    selectedTimeSlot = time;
    isCustomTime = isCustom;
    forceAddMode = forceAdd;
    
    console.log(`[予約追加] 時間選択: ${time}, カスタム: ${isCustom}, 強制: ${forceAdd}`);
}

// カスタム時間入力モーダル（改善版）
function openCustomTimeModal(dayReservations) {
    // シンプルで使いやすい時間入力
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.style.cssText = `
        padding: 12px;
        border: 2px solid #6c5ce7;
        border-radius: 8px;
        background-color: #ffffff;
        color: #333;
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        width: 150px;
        margin: 10px;
        box-shadow: 0 2px 4px rgba(108, 92, 231, 0.2);
    `;
    
    // 現在時刻を初期値として設定
    const now = new Date();
    const currentTime = now.toTimeString().substr(0, 5);
    timeInput.value = currentTime;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: #3a3a3a;
        padding: 30px;
        border-radius: 12px;
        text-align: center;
        border: 2px solid #6c5ce7;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        max-width: 400px;
        width: 90%;
    `;
    
    modalContent.innerHTML = `
        <h3 style="color: #6c5ce7; margin-bottom: 20px; font-size: 1.5em;">
            ⏰ カスタム時間設定
        </h3>
        <p style="color: #ffffff; margin-bottom: 20px; line-height: 1.5;">
            任意の時間を設定できます<br>
            <small style="color: #ccc;">※既存予約がある場合は強制追加されます</small>
        </p>
    `;
    
    modalContent.appendChild(timeInput);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 15px;
        justify-content: center;
        margin-top: 25px;
    `;
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '設定';
    confirmBtn.style.cssText = `
        background: linear-gradient(135deg, #6c5ce7, #a29bfe);
        color: #ffffff;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
    `;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.style.cssText = `
        background-color: #6c757d;
        color: #ffffff;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        transition: all 0.3s ease;
    `;
    
    // ホバー効果
    confirmBtn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 16px rgba(108, 92, 231, 0.4)';
    });
    
    confirmBtn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 12px rgba(108, 92, 231, 0.3)';
    });
    
    confirmBtn.addEventListener('click', function() {
        const customTime = timeInput.value;
        if (customTime) {
            // 重複チェック
            const conflictReservation = dayReservations.find(r => r.Time === customTime);
            if (conflictReservation) {
                const customerName = conflictReservation['Name-f'] || '名前なし';
                const confirmMessage = `⚠️ この時間は既に予約があります。\n\n${customTime} - ${customerName}\n\n管理者権限で重複追加しますか？`;
                
                if (confirm(confirmMessage)) {
                    selectTimeSlot(customTime, null, true, true);
                }
            } else {
                selectTimeSlot(customTime, null, true, false);
            }
        }
        document.body.removeChild(modal);
    });
    
    cancelBtn.addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Enterキーで確定
    timeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            confirmBtn.click();
        }
    });
    
    // Escapeキーでキャンセル
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape' && document.body.contains(modal)) {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', escapeHandler);
        }
    });
    
    buttonContainer.appendChild(confirmBtn);
    buttonContainer.appendChild(cancelBtn);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // 入力フィールドにフォーカス
    setTimeout(() => timeInput.focus(), 100);
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

// 予約追加処理（重複処理防止版）
async function handleAddReservation() {
    console.log('[予約追加] 予約追加処理開始');
    
    // 重複処理防止
    if (isProcessingReservation) {
        console.log('[予約追加] 処理中のため重複実行を防止');
        return;
    }
    
    isProcessingReservation = true;
    
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
        isProcessingReservation = false;
        return;
    }
    
    // 日付形式チェック
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        alert('日付の形式が正しくありません（YYYY-MM-DD形式で入力してください）');
        isProcessingReservation = false;
        return;
    }
    
    // 電話番号とメールアドレスのバリデーション
    if (phone && !validatePhoneNumber(phone)) {
        alert('正しい電話番号を入力してください。\n（例：090-1234-5678 または 09012345678）');
        isProcessingReservation = false;
        return;
    }
    
    if (!validateEmail(email)) {
        alert('正しいメールアドレスを入力してください。');
        isProcessingReservation = false;
        return;
    }
    
    // 選択されたメニューの詳細を取得（修正版 - フォールバック対応）
    let selectedMenu = null;
    
    // currentMenusから取得を試行
    if (currentMenus && typeof currentMenus === 'object') {
        selectedMenu = currentMenus[menuName];
    }
    
    // フォールバック用のメニューデータ
    if (!selectedMenu) {
        console.warn('[予約追加] currentMenusからメニューが見つかりません。フォールバックデータを使用');
        
        // デフォルトメニューデータ（実際の運用では事前に定義しておく）
        const fallbackMenus = {
            'カット': { worktime: 30, fare: 3000 },
            'カット＋シャンプー': { worktime: 45, fare: 4000 },
            'パーマ': { worktime: 90, fare: 8000 },
            'カラー': { worktime: 120, fare: 10000 }
        };
        
        selectedMenu = fallbackMenus[menuName];
        
        if (!selectedMenu) {
            // それでも見つからない場合はデフォルト値
            selectedMenu = {
                worktime: 60,
                fare: 5000
            };
            console.warn(`[予約追加] メニュー「${menuName}」が見つかりません。デフォルト値を使用します`);
        }
    }
    
    console.log('[予約追加] 使用するメニューデータ:', { menuName, selectedMenu });
    
    // 送信ボタンを無効化（視覚的フィードバック改善）
    if (submitAddReservationBtn) {
        submitAddReservationBtn.disabled = true;
        submitAddReservationBtn.textContent = '📝 予約追加中...';
        submitAddReservationBtn.style.backgroundColor = '#6c757d';
        submitAddReservationBtn.style.cursor = 'not-allowed';
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
            // 成功メッセージを準備
            let successMessage = '';
            let successIcon = '';
            
            if (forceAddMode && isCustomTime) {
                successIcon = '🛡️⏰';
                successMessage = `管理者権限で強制追加しました\n（カスタム時間・重複対応）\n\n✅ 予約番号: ${reservationNumber}\n⏰ 時間: ${selectedTimeSlot}\n👤 お客様: ${name}`;
            } else if (forceAddMode) {
                successIcon = '🛡️';
                successMessage = `管理者権限で強制追加しました\n（重複時間対応）\n\n✅ 予約番号: ${reservationNumber}\n⏰ 時間: ${selectedTimeSlot}\n👤 お客様: ${name}`;
            } else if (isCustomTime) {
                successIcon = '⏰';
                successMessage = `カスタム時間で予約を追加しました\n\n✅ 予約番号: ${reservationNumber}\n⏰ 時間: ${selectedTimeSlot}\n👤 お客様: ${name}`;
            } else {
                successIcon = '✅';
                successMessage = `予約を追加しました\n\n✅ 予約番号: ${reservationNumber}\n⏰ 時間: ${selectedTimeSlot}\n👤 お客様: ${name}`;
            }
            
            // 成功時のボタン表示
            if (submitAddReservationBtn) {
                submitAddReservationBtn.textContent = `${successIcon} 追加完了！`;
                submitAddReservationBtn.style.backgroundColor = '#28a745';
                submitAddReservationBtn.style.color = '#ffffff';
            }
            
            // 成功メッセージを表示（1回のみ）
            setTimeout(() => {
                alert(successMessage);
                
                // モーダルを閉じる
                closeAddReservationModal();
                
                // 後続処理は非同期で実行（UIブロックを防ぐ）
                setTimeout(async () => {
                    try {
                        // 予約データを再読み込み
                        if (typeof loadReservations === 'function') {
                            await loadReservations();
                        }
                        
                        // カレンダーを再描画
                        const calendarTab = document.getElementById('calendar-tab');
                        if (calendarTab && calendarTab.classList.contains('active') && typeof renderCalendar === 'function') {
                            renderCalendar();
                        }
                    } catch (updateError) {
                        console.error('[予約追加] 画面更新エラー:', updateError);
                    }
                }, 500);
                
            }, 1000);
            
            console.log('[予約追加] 予約が正常に追加されました:', reservationData);
            
        } else {
            throw new Error(result.message || '予約の追加に失敗しました');
        }
        
    } catch (error) {
        console.error('[予約追加] 予約追加エラー:', error);
        
        let errorMessage = '予約の追加に失敗しました。';
        
        // エラータイプ別の処理
        if (error.message === 'API_ENDPOINT_NOT_FOUND') {
            errorMessage = `🔌 APIサーバーに接続できません\n\n考えられる原因:\n• サーバーのURLが間違っている\n• APIサーバーがダウンしている\n• ネットワーク設定の問題\n\n📞 システム管理者にお問い合わせください。`;
        } else if (error.message === 'INVALID_JSON_RESPONSE') {
            errorMessage = '🔧 サーバーから無効な応答が返されました。\n📞 システム管理者にお問い合わせください。';
        } else if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            errorMessage = `🌐 ネットワークエラーが発生しました\n\n📡 ネットワーク接続を確認するか、\n⏰ しばらく時間をおいてから再度お試しください。`;
        } else if (error.message.includes('404')) {
            errorMessage = '🔍 APIエンドポイントが見つかりません（404エラー）。\n📞 URL設定を確認してください。';
        } else if (error.message.includes('500')) {
            errorMessage = '⚠️ サーバー内部エラーが発生しました（500エラー）。\n⏰ しばらく時間をおいてから再度お試しください。';
        } else if (error.message.includes('CORS')) {
            errorMessage = '🔐 CORS（Cross-Origin Resource Sharing）エラーが発生しました。\n📞 サーバー設定を確認してください。';
        } else if (error.message) {
            errorMessage += '\n\n詳細: ' + error.message;
        }
        
        alert(errorMessage);
        
    } finally {
        // 送信ボタンを再有効化
        if (submitAddReservationBtn) {
            submitAddReservationBtn.disabled = false;
            submitAddReservationBtn.textContent = '📝 予約追加';
            submitAddReservationBtn.style.backgroundColor = '#28a745';
            submitAddReservationBtn.style.cursor = 'pointer';
        }
        
        // 処理完了フラグをリセット
        isProcessingReservation = false;
    }
}

// グローバル関数として公開
window.initializeAddReservationFeature = initializeAddReservationFeature;
window.openAddReservationModal = openAddReservationModal;

// 予約追加機能のJavaScript

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
                timeSlotBtn.addEventListener('click', () => selectTimeSlot(time, timeSlotBtn));
            }
            
            addReservationTimeslotsDiv.appendChild(timeSlotBtn);
        });
        
    } catch (error) {
        console.error('Error loading time slots:', error);
        addReservationTimeslotsDiv.innerHTML = '<div style="color: #dc3545; text-align: center; padding: 20px;">時間スロットの取得に失敗しました</div>';
    }
}

// 時間スロットを選択
function selectTimeSlot(time, buttonElement) {
    // 既存の選択を解除
    const allTimeSlotBtns = addReservationTimeslotsDiv.querySelectorAll('.time-slot-btn');
    allTimeSlotBtns.forEach(btn => btn.classList.remove('selected'));
    
    // 新しい選択を設定
    buttonElement.classList.add('selected');
    selectedTimeSlot = time;
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

// 予約追加処理
async function handleAddReservation() {
    // フォームの値を取得
    const date = addReservationDateInput ? addReservationDateInput.value : '';
    const name = addReservationNameInput ? addReservationNameInput.value.trim() : '';
    const phone = addReservationPhoneInput ? addReservationPhoneInput.value.trim() : '';
    const email = addReservationEmailInput ? addReservationEmailInput.value.trim() : '';
    const menuName = addReservationMenuSelect ? addReservationMenuSelect.value : '';
    
    // バリデーション
    if (!date || !name || !phone || !menuName || !selectedTimeSlot) {
        alert('必須項目をすべて入力してください。\n（メールアドレスは任意です）');
        return;
    }
    
    if (!validatePhoneNumber(phone)) {
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
        // 管理画面のAPIベースURLを使用
        const ADMIN_API_BASE_URL = 'https://reservation-api-36382648212.asia-northeast1.run.app/api';
        
        // 予約データを作成（予約サイトと同じ形式）
        const reservationData = {
            reservationNumber: generateReservationNumber(),
            Menu: menuName,
            "Name-f": name,
            "Name-s": phone,
            Time: selectedTimeSlot,
            WorkTime: selectedMenu.worktime,
            date: date,
            mail: email || '管理者追加',
            states: 0
        };
        
        console.log('予約データ:', reservationData);
        
        let response;
        let apiUrl;
        
        // 複数のAPIエンドポイントを試行
        const apiEndpoints = [
            `${ADMIN_API_BASE_URL}/reservations`,
            `${ADMIN_API_BASE_URL}/reservations/batch`,
            `https://hair-works-api-36382648212.asia-northeast1.run.app/api/reservations/batch`
        ];
        
        for (let i = 0; i < apiEndpoints.length; i++) {
            apiUrl = apiEndpoints[i];
            console.log(`API試行 ${i + 1}:`, apiUrl);
            
            try {
                if (apiUrl.includes('/batch')) {
                    // batch用の形式
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            reservations: [reservationData]
                        })
                    });
                } else {
                    // 単体用の形式
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(reservationData)
                    });
                }
                
                if (response.ok) {
                    console.log(`API成功: ${apiUrl}`);
                    break;
                }
                
            } catch (fetchError) {
                console.error(`API ${i + 1} エラー:`, fetchError);
                if (i === apiEndpoints.length - 1) {
                    throw fetchError;
                }
                continue;
            }
        }
        
        console.log('リクエスト送信:', `${ADMIN_API_BASE_URL}/reservations`);
        
        if (!response.ok) {
            // レスポンスがHTMLの場合とJSONの場合の両方に対応
            let errorMessage;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
            } else {
                // HTMLレスポンスの場合
                const htmlText = await response.text();
                console.error('HTML Error Response:', htmlText);
                errorMessage = `APIエラー (${response.status}): サーバーからHTMLレスポンスが返されました。APIエンドポイントを確認してください。`;
            }
            throw new Error(errorMessage);
        }
        
        // レスポンスの形式を確認
        const contentType = response.headers.get('content-type');
        let result;
        
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            // JSONでない場合はエラーとして扱う
            const responseText = await response.text();
            console.error('Non-JSON Response:', responseText);
            throw new Error('APIから予期しないレスポンス形式が返されました');
        }
        
        console.log('API Response:', result);
        
        // 成功判定を柔軟に行う
        const isSuccess = result.success === true || 
                         result.status === 'success' || 
                         (response.status >= 200 && response.status < 300);
        
        if (!isSuccess) {
            throw new Error(result.message || result.error || '予約の追加に失敗しました');
        }
        
        // 成功時の処理
        alert(`予約を追加しました。\n予約番号: ${reservationData.reservationNumber}`);
        
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
        
        let errorMessage = '予約の追加に失敗しました。';
        
        if (error.message.includes('Unexpected token')) {
            errorMessage = 'APIサーバーからの応答形式が正しくありません。\n管理者にお問い合わせください。';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
            errorMessage = 'ネットワークエラーが発生しました。\nインターネット接続を確認してください。';
        } else if (error.message.includes('404')) {
            errorMessage = 'APIエンドポイントが見つかりません。\nシステム管理者にお問い合わせください。';
        } else if (error.message.includes('500')) {
            errorMessage = 'サーバーエラーが発生しました。\nしばらく時間をおいてから再度お試しください。';
        } else if (error.message.includes('already exists') || error.message.includes('重複')) {
            errorMessage = 'この時間は既に予約が入っています。\n別の時間を選択してください。';
        } else if (error.message.includes('holiday') || error.message.includes('休業日')) {
            errorMessage = 'この日は休業日のため予約できません。';
        } else if (error.message) {
            errorMessage += '\n詳細: ' + error.message;
        }
        
        alert(errorMessage);
        
        // デバッグ情報をコンソールに出力
        console.error('Error Details:', {
            message: error.message,
            stack: error.stack,
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

// カレンダー関連の要素
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthYear = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const menuLegend = document.getElementById('menu-legend');

// 予約詳細モーダル関連
const detailId = document.getElementById('detail-id');
const detailDate = document.getElementById('detail-date');
const detailTime = document.getElementById('detail-time');
const detailName = document.getElementById('detail-name');
const detailPhone = document.getElementById('detail-phone');
const detailMenu = document.getElementById('detail-menu');
const detailEmail = document.getElementById('detail-email');
const detailCancelBtn = document.getElementById('detail-cancel-btn');
const detailMailBtn = document.getElementById('detail-mail-btn');
const detailCloseBtn = document.getElementById('detail-close-btn');

// データ読み込み状態を追跡
let dataLoadStatus = {
    reservations: false,
    menus: false,
    holidays: false
};

// イベントリスナー設定
document.addEventListener('DOMContentLoaded', function() {
    initializeCalendarFeatures();
});

function initializeCalendarFeatures() {
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', goToPrevMonth);
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', goToNextMonth);
    if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeReservationDetailModal);
    if (detailCancelBtn) detailCancelBtn.addEventListener('click', handleDetailCancel);
    if (detailMailBtn) detailMailBtn.addEventListener('click', handleDetailMail);
}

// カレンダー表示前の必要データ確認と読み込み
async function ensureCalendarData() {
    console.log('[カレンダー] データ確認開始');
    
    try {
        // 予約データの確認・読み込み
        if (!reservations || !Array.isArray(reservations) || reservations.length === 0) {
            console.log('[カレンダー] 予約データ読み込み');
            await loadReservationsForCalendar();
        } else {
            console.log('[カレンダー] 既存予約データを使用:', reservations.length, '件');
            dataLoadStatus.reservations = true;
        }
        
        // メニューデータの確認・読み込み
        if (!currentMenus || typeof currentMenus !== 'object' || Object.keys(currentMenus).length === 0) {
            console.log('[カレンダー] メニューデータ読み込み');
            await loadMenusForCalendar();
        } else {
            console.log('[カレンダー] 既存メニューデータを使用:', Object.keys(currentMenus).length, '個');
            dataLoadStatus.menus = true;
        }
        
        // 休業日データの確認・読み込み
        if (!holidays || !Array.isArray(holidays)) {
            console.log('[カレンダー] 休業日データ読み込み');
            await loadHolidaysForCalendar();
        } else {
            console.log('[カレンダー] 既存休業日データを使用:', holidays.length, '件');
            dataLoadStatus.holidays = true;
        }
        
        console.log('[カレンダー] データ読み込み完了:', dataLoadStatus);
        return true;
        
    } catch (error) {
        console.error('[カレンダー] データ読み込みエラー:', error);
        return false;
    }
}

// カレンダー専用の予約データ読み込み
async function loadReservationsForCalendar() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${API_BASE_URL}/reservations`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
            reservations = data;
            dataLoadStatus.reservations = true;
            console.log(`[カレンダー] 予約データ読み込み成功: ${data.length}件`);
        } else {
            console.warn('[カレンダー] 予約データが配列ではありません');
            reservations = [];
            dataLoadStatus.reservations = false;
        }
        
    } catch (error) {
        console.error('[カレンダー] 予約データ読み込みエラー:', error);
        reservations = reservations || [];
        dataLoadStatus.reservations = false;
    }
}

// カレンダー専用のメニューデータ読み込み
async function loadMenusForCalendar() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_BASE_URL}/menus`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const menus = await response.json();
            currentMenus = menus || {};
            dataLoadStatus.menus = true;
            console.log(`[カレンダー] メニューデータ読み込み成功: ${Object.keys(currentMenus).length}個`);
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('[カレンダー] メニューデータ読み込みエラー:', error);
        currentMenus = currentMenus || {};
        dataLoadStatus.menus = false;
    }
}

// カレンダー専用の休業日データ読み込み
async function loadHolidaysForCalendar() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_BASE_URL}/holidays`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const holidayData = await response.json();
            holidays = holidayData || [];
            dataLoadStatus.holidays = true;
            console.log(`[カレンダー] 休業日データ読み込み成功: ${holidays.length}件`);
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('[カレンダー] 休業日データ読み込みエラー:', error);
        holidays = holidays || [];
        dataLoadStatus.holidays = false;
    }
}

// 新しい関数：タイムゾーンを考慮した日付文字列変換
function formatDateToLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// メニューカラー取得の安全版
function getMenuColorSafe(menuName) {
    if (currentMenus && typeof currentMenus === 'object' && Object.keys(currentMenus).length > 0) {
        return getMenuColor(menuName);
    }
    return '#ff6b35'; // デフォルトカラー
}

// シフトデータ取得関数の修正版
function getShiftForDateFixed(dateString) {
    try {
        console.log(`[カレンダー] シフト取得: ${dateString}`);
        
        // 1. window.getShiftForDate が定義されている場合
        if (typeof window.getShiftForDate === 'function') {
            const result1 = window.getShiftForDate(dateString);
            if (result1 && result1.length > 0) {
                return result1;
            }
        }
        
        // 2. window.shiftData から取得
        if (window.shiftData && window.shiftData[dateString]) {
            const result2 = window.shiftData[dateString];
            if (result2 && result2.length > 0) {
                return result2;
            }
        }
        
        // 3. グローバルのshiftDataから取得
        if (typeof shiftData !== 'undefined' && shiftData && shiftData[dateString]) {
            const result3 = shiftData[dateString];
            if (result3 && result3.length > 0) {
                return result3;
            }
        }
        
        // 4. ローカルストレージから取得
        try {
            const savedShiftData = localStorage.getItem('shiftData');
            if (savedShiftData) {
                const parsedShiftData = JSON.parse(savedShiftData);
                if (parsedShiftData && parsedShiftData[dateString]) {
                    return parsedShiftData[dateString];
                }
            }
        } catch (storageError) {
            console.warn('[カレンダー] ローカルストレージ読み込みエラー:', storageError);
        }
        
        return [];
        
    } catch (error) {
        console.error('[カレンダー] シフトデータ取得エラー:', error);
        return [];
    }
}

// カレンダー描画（完全修正版）
async function renderCalendar() {
    if (!calendarGrid) {
        console.error('[カレンダー] calendarGrid要素が見つかりません');
        return;
    }
    
    console.log('[カレンダー] renderCalendar() 開始');
    
    // 必要なデータが揃っているか確認・読み込み
    const dataReady = await ensureCalendarData();
    if (!dataReady) {
        console.warn('[カレンダー] 必要なデータの読み込みに失敗しました');
    }
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', 
                       '7月', '8月', '9月', '10月', '11月', '12月'];
    if (currentMonthYear) {
        currentMonthYear.textContent = `${year}年 ${monthNames[month]}`;
    }
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    
    const dayOfWeek = firstDay.getDay();
    const startDateOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - startDateOffset);
    
    calendarGrid.innerHTML = '';
    
    // 曜日ヘッダー
    const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
    weekdays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // データの状態をログ出力
    console.log('[カレンダー] 描画時のデータ状態:', {
        reservationsCount: reservations ? reservations.length : 0,
        menusCount: currentMenus ? Object.keys(currentMenus).length : 0,
        holidaysCount: holidays ? holidays.length : 0,
        hasShiftData: !!(window.shiftData && Object.keys(window.shiftData).length > 0)
    });
    
    // カレンダー日付生成
    const currentDateObj = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        const dateString = formatDateToLocal(currentDateObj);
        const dayNumber = currentDateObj.getDate();
        
        if (currentDateObj.getMonth() !== month) {
            dayElement.classList.add('other-month');
        }
        
        // 休業日チェック
        if (holidays && holidays.includes(dateString)) {
            dayElement.classList.add('holiday');
        }
        
        // 日付ヘッダー部分
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        
        // 日付番号表示
        const dayNumberElement = document.createElement('div');
        dayNumberElement.className = 'day-number';
        dayNumberElement.textContent = dayNumber;
        
        // 休業日ラベル
        if (holidays && holidays.includes(dateString)) {
            const holidayLabel = document.createElement('div');
            holidayLabel.className = 'holiday-label';
            holidayLabel.textContent = '休業日';
            dayNumberElement.appendChild(holidayLabel);
        }
        
        dayHeader.appendChild(dayNumberElement);
        
        // シフト情報表示（休業日以外）
        if (!holidays || !holidays.includes(dateString)) {
            const shiftInfoElement = document.createElement('div');
            shiftInfoElement.className = 'day-shift-info';
            
            const shiftEmployees = getShiftForDateFixed(dateString);
            
            if (shiftEmployees && shiftEmployees.length > 0) {
                shiftEmployees.forEach(employee => {
                    const employeeElement = document.createElement('div');
                    employeeElement.className = 'shift-employee';
                    
                    const employeeName = employee.name || employee;
                    employeeElement.textContent = employeeName;
                    employeeElement.title = `担当: ${employeeName}`;
                    
                    shiftInfoElement.appendChild(employeeElement);
                });
            }
            
            dayHeader.appendChild(shiftInfoElement);
        }
        
        dayElement.appendChild(dayHeader);
        
        // 予約リスト表示
        const reservationsContainer = document.createElement('div');
        reservationsContainer.className = 'day-reservations';
        
        if (!holidays || !holidays.includes(dateString)) {
            // 予約データが存在することを確認
            if (reservations && Array.isArray(reservations) && reservations.length > 0) {
                const dayReservations = reservations.filter(r => 
                    r.date === dateString && r.states === 0
                ).sort((a, b) => a.Time.localeCompare(b.Time));
                
                console.log(`[カレンダー] ${dateString}の予約: ${dayReservations.length}件`);
                
                // 通常予約と休止時間を分離
                const normalReservations = dayReservations.filter(r => r['Name-f'] !== '休止時間');
                const blockedTimeSlots = dayReservations.filter(r => r['Name-f'] === '休止時間');
                
                // 休止時間を先に表示
                blockedTimeSlots.forEach(blockReservation => {
                    const blockElement = document.createElement('div');
                    blockElement.className = 'reservation-item-calendar blocked-time';
                    blockElement.textContent = `${blockReservation.Time} 休止`;
                    blockElement.style.backgroundColor = '#6c757d';
                    blockElement.style.color = '#ffffff';
                    blockElement.style.cursor = 'pointer';
                    blockElement.title = `休止理由: ${blockReservation['Name-s'] || '設定済み'}`;
                    
                    blockElement.addEventListener('click', () => {
                        showBlockedTimeDetail(blockReservation);
                    });
                    
                    reservationsContainer.appendChild(blockElement);
                });
                
                // 通常予約を表示
                normalReservations.forEach(reservation => {
                    const reservationElement = document.createElement('button');
                    reservationElement.className = 'reservation-item-calendar';
                    
                    const customerName = reservation['Name-f'] || '';
                    reservationElement.textContent = `${reservation.Time} ${customerName}`;
                    
                    // メニューカラー取得
                    const menuColor = getMenuColorSafe(reservation.Menu);
                    reservationElement.style.backgroundColor = menuColor;
                    reservationElement.style.color = '#ffffff';
                    
                    reservationElement.addEventListener('click', () => {
                        showReservationDetail(reservation);
                    });
                    
                    reservationsContainer.appendChild(reservationElement);
                });
            } else {
                console.log(`[カレンダー] ${dateString}: 予約データなし`);
            }
        }
        
        dayElement.appendChild(reservationsContainer);
        calendarGrid.appendChild(dayElement);
        
        currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    console.log('[カレンダー] カレンダー描画完了');
    
    // メニュー凡例も更新
    renderMenuLegend();
}

// メニュー凡例描画（修正版）
function renderMenuLegend() {
    if (!menuLegend) return;
    
    menuLegend.innerHTML = '<h4>メニュー凡例</h4>';
    
    const legendGrid = document.createElement('div');
    legendGrid.className = 'legend-grid';
    
    if (currentMenus && typeof currentMenus === 'object') {
        const menuNames = Object.keys(currentMenus);
        
        if (menuNames.length > 0) {
            menuNames.forEach((menuName, index) => {
                const color = getMenuColorByIndex(index);
                
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';
                
                const colorBox = document.createElement('div');
                colorBox.className = 'legend-color';
                colorBox.style.backgroundColor = color;
                
                const menuNameSpan = document.createElement('span');
                menuNameSpan.textContent = menuName;
                
                legendItem.appendChild(colorBox);
                legendItem.appendChild(menuNameSpan);
                legendGrid.appendChild(legendItem);
            });
        } else {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'legend-empty';
            emptyMessage.textContent = 'メニューが登録されていません';
            legendGrid.appendChild(emptyMessage);
        }
    } else {
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'legend-empty';
        loadingMessage.textContent = 'メニューを読み込み中...';
        legendGrid.appendChild(loadingMessage);
    }
    
    menuLegend.appendChild(legendGrid);
}

// 前月に移動
function goToPrevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

// 次月に移動
function goToNextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

// 予約詳細表示
function showReservationDetail(reservation) {
    currentReservationDetail = reservation;
    
    const customerName = reservation['Name-f'] || '';
    const phoneNumber = reservation['Name-s'] || '';
    const email = reservation.mail || '';
    
    if (detailId) detailId.textContent = reservation.id;
    if (detailDate) detailDate.textContent = reservation.date;
    if (detailTime) detailTime.textContent = reservation.Time;
    if (detailName) detailName.textContent = customerName;
    if (detailPhone) detailPhone.textContent = phoneNumber;
    if (detailMenu) detailMenu.textContent = reservation.Menu || '';
    if (detailEmail) detailEmail.textContent = email;
    
    // 同行者や管理者追加の場合はメールボタンを無効化
    if (detailMailBtn) {
        if (email === '同行者' || email === '管理者追加') {
            detailMailBtn.disabled = true;
            detailMailBtn.textContent = email === '同行者' ? 'メール送信（同行者）' : 'メール送信（管理者追加）';
            detailMailBtn.style.opacity = '0.5';
            detailMailBtn.style.cursor = 'not-allowed';
        } else {
            detailMailBtn.disabled = false;
            detailMailBtn.textContent = 'メール送信';
            detailMailBtn.style.opacity = '1';
            detailMailBtn.style.cursor = 'pointer';
        }
    }
    
    if (reservationDetailModal) {
        reservationDetailModal.classList.add('active');
    }
}

// 休止時間詳細表示
function showBlockedTimeDetail(blockReservation) {
    const reason = blockReservation['Name-s'] || '理由未設定';
    const message = `予約休止時間帯\n\n日付: ${blockReservation.date}\n時間: ${blockReservation.Time}\n理由: ${reason}`;
    
    if (confirm(message + '\n\nこの休止設定を解除しますか？')) {
        handleRemoveBlockedTime(blockReservation);
    }
}

// 休止時間解除処理
async function handleRemoveBlockedTime(blockReservation) {
    try {
        const response = await fetch(`${API_BASE_URL}/reservations/${blockReservation.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 2 })
        });

        if (response.ok) {
            await loadReservationsForCalendar();
            renderCalendar();
            alert('休止設定を解除しました。');
        } else {
            const errorData = await response.text();
            alert(`休止設定の解除に失敗しました。\nステータス: ${response.status}\nエラー: ${errorData}`);
        }
    } catch (error) {
        console.error('休止設定解除エラー:', error);
        alert(`休止設定の解除に失敗しました。\nエラー: ${error.message}`);
    }
}

// 予約詳細モーダルを閉じる
function closeReservationDetailModal() {
    if (reservationDetailModal) {
        reservationDetailModal.classList.remove('active');
    }
    currentReservationDetail = null;
}

// 詳細画面からキャンセル
function handleDetailCancel() {
    if (!currentReservationDetail) return;
    
    const reservationToCancel = { ...currentReservationDetail };
    closeReservationDetailModal();
    
    if (typeof showConfirm === 'function') {
        showConfirm('予約キャンセル', '本当にこの予約をキャンセルしますか？', async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/reservations/${reservationToCancel.id}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 2 })
                });

                if (response.ok) {
                    await loadReservationsForCalendar();
                    renderCalendar();
                    alert('予約をキャンセルしました。');
                } else {
                    const errorData = await response.text();
                    alert(`予約のキャンセルに失敗しました。\nステータス: ${response.status}\nエラー: ${errorData}`);
                }
            } catch (error) {
                console.error('キャンセル処理エラー:', error);
                alert(`予約のキャンセルに失敗しました。\nエラー: ${error.message}`);
            }
        });
    }
}

// 詳細画面からメール送信
function handleDetailMail() {
    if (!currentReservationDetail) return;
    
    const customerName = currentReservationDetail['Name-f'] || '';
    const email = currentReservationDetail.mail || '';
    
    closeReservationDetailModal();
    
    if (email === '同行者') {
        alert('この方は同行者のため、メールを送信できません。');
        return;
    }
    
    if (email === '管理者追加') {
        alert('この予約は管理者が追加したもので、メールアドレスが設定されていません。');
        return;
    }
    
    currentMailRecipient = email;
    currentCustomerName = customerName;
    
    const mailSubjectInput = document.getElementById('mail-subject');
    const mailBodyInput = document.getElementById('mail-body');
    const mailTemplatesListDiv = document.getElementById('mail-templates-list');
    
    if (mailSubjectInput) mailSubjectInput.value = '';
    if (mailBodyInput) mailBodyInput.value = '';
    
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

    if (mailModal) {
        mailModal.classList.add('active');
    }
}

// カレンダータブが選択された時の処理
document.addEventListener('click', function(event) {
    if (event.target && event.target.getAttribute('data-tab') === 'calendar') {
        console.log('[カレンダー] カレンダータブが選択されました');
        setTimeout(() => {
            renderCalendar();
        }, 200);
    }
});

// グローバル関数として公開
window.renderCalendar = renderCalendar;
window.ensureCalendarData = ensureCalendarData;

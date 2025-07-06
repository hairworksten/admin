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
const detailMenu = document.getElementById('detail-menu');
const detailEmail = document.getElementById('detail-email');
const detailCancelBtn = document.getElementById('detail-cancel-btn');
const detailMailBtn = document.getElementById('detail-mail-btn');
const detailCloseBtn = document.getElementById('detail-close-btn');

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

// 新しい関数：タイムゾーンを考慮した日付文字列変換
function formatDateToLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// カレンダー描画（修正版）
function renderCalendar() {
    if (!calendarGrid) return;
    
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
    
    // カレンダー日付生成
    const currentDateObj = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // 修正：タイムゾーンを考慮した日付文字列生成
        const dateString = formatDateToLocal(currentDateObj);
        const dayNumber = currentDateObj.getDate();
        
        if (currentDateObj.getMonth() !== month) {
            dayElement.classList.add('other-month');
        }
        
        // 休業日チェック（修正済み）
        if (holidays.includes(dateString)) {
            dayElement.classList.add('holiday');
        }
        
        // 日付番号表示
        const dayNumberElement = document.createElement('div');
        dayNumberElement.className = 'day-number';
        dayNumberElement.textContent = dayNumber;
        
        // 休業日ラベル
        if (holidays.includes(dateString)) {
            const holidayLabel = document.createElement('div');
            holidayLabel.className = 'holiday-label';
            holidayLabel.textContent = '休業日';
            dayNumberElement.appendChild(holidayLabel);
        }
        
        dayElement.appendChild(dayNumberElement);
        
        // 予約リスト表示
        const reservationsContainer = document.createElement('div');
        reservationsContainer.className = 'day-reservations';
        
        if (!holidays.includes(dateString)) {
            const dayReservations = reservations.filter(r => 
                r.date === dateString && r.states === 0
            ).sort((a, b) => a.Time.localeCompare(b.Time));
            
            dayReservations.forEach(reservation => {
                const reservationElement = document.createElement('button');
                reservationElement.className = 'reservation-item-calendar';
                
                const customerName = `${reservation['Name-f'] || ''} ${reservation['Name-s'] || ''}`.trim();
                reservationElement.textContent = `${reservation.Time} ${customerName}`;
                
                const menuColor = getMenuColor(reservation.Menu);
                reservationElement.style.backgroundColor = menuColor;
                reservationElement.style.color = '#ffffff';
                
                reservationElement.addEventListener('click', () => {
                    showReservationDetail(reservation);
                });
                
                reservationsContainer.appendChild(reservationElement);
            });
        }
        
        dayElement.appendChild(reservationsContainer);
        calendarGrid.appendChild(dayElement);
        
        currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
}

// メニュー凡例描画
function renderMenuLegend() {
    if (!menuLegend) return;
    
    menuLegend.innerHTML = '<h4>メニュー凡例</h4>';
    
    const legendGrid = document.createElement('div');
    legendGrid.className = 'legend-grid';
    
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
    
    const customerName = `${reservation['Name-f'] || ''} ${reservation['Name-s'] || ''}`.trim();
    
    if (detailId) detailId.textContent = reservation.id;
    if (detailDate) detailDate.textContent = reservation.date;
    if (detailTime) detailTime.textContent = reservation.Time;
    if (detailName) detailName.textContent = customerName;
    if (detailMenu) detailMenu.textContent = reservation.Menu || '';
    if (detailEmail) detailEmail.textContent = reservation.mail || '';
    
    if (reservationDetailModal) {
        reservationDetailModal.classList.add('active');
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
                    await loadReservations();
                    
                    const calendarTab = document.getElementById('calendar-tab');
                    if (calendarTab && calendarTab.classList.contains('active')) {
                        renderCalendar();
                    }
                    
                    alert('予約をキャンセルしました。');
                } else {
                    const errorData = await response.text();
                    alert(`予約のキャンセルに失敗しました。\nステータス: ${response.status}\nエラー: ${errorData}`);
                }
            } catch (error) {
                console.error('キャンセル処理例外:', error);
                
                if (error.message.includes('fetch')) {
                    alert('ローカル開発環境のため、APIに接続できません。\n実際の本番環境では正常に動作します。');
                    
                    const reservationIndex = reservations.findIndex(r => r.id === reservationToCancel.id);
                    if (reservationIndex >= 0) {
                        reservations[reservationIndex].states = 2;
                        if (typeof displayReservations === 'function') {
                            displayReservations();
                        }
                        
                        const calendarTab = document.getElementById('calendar-tab');
                        if (calendarTab && calendarTab.classList.contains('active')) {
                            renderCalendar();
                        }
                        
                        alert('デモ用：予約をキャンセルしました（ローカルのみ）');
                    }
                } else {
                    alert(`予約のキャンセルに失敗しました。\nエラー: ${error.message}`);
                }
            }
        });
    }
}

// 詳細画面からメール送信
function handleDetailMail() {
    if (!currentReservationDetail) return;
    
    const customerName = `${currentReservationDetail['Name-f'] || ''} ${currentReservationDetail['Name-s'] || ''}`.trim();
    const email = currentReservationDetail.mail || '';
    
    closeReservationDetailModal();
    
    if (email === '同行者') {
        alert('この方は同行者のため、メールを送信できません。');
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

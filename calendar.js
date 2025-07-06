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

// 新しい関数：タイムゾーンを考慮した日付文字列変換
function formatDateToLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 修正版：定休日追加処理のタイムゾーン問題も解決
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

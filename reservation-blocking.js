// 予約受付管理機能（休止時間設定）

// DOM要素
const blockReservationModal = document.getElementById('block-reservation-modal');
const addBlockBtn = document.getElementById('add-block-btn');
const submitBlockBtn = document.getElementById('submit-block-btn');
const cancelBlockBtn = document.getElementById('cancel-block-btn');

const blockDateInput = document.getElementById('block-reservation-date');
const blockTimeslotsDiv = document.getElementById('block-reservation-timeslots');
const blockReasonInput = document.getElementById('block-reason');

// 選択された時間を保存する変数
let selectedBlockTimeSlots = [];

// 時間スロット設定（既存のものと同じ）
const blockTimeSlots = {
    weekday: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
    weekend: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
};

// 平日・土日祝の判定（既存関数と同じ）
function isWeekendOrHolidayForBlock(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeReservationBlocking();
});

function initializeReservationBlocking() {
    if (addBlockBtn) {
        addBlockBtn.addEventListener('click', openBlockReservationModal);
    }
    
    if (cancelBlockBtn) {
        cancelBlockBtn.addEventListener('click', closeBlockReservationModal);
    }
    
    if (submitBlockBtn) {
        submitBlockBtn.addEventListener('click', handleAddBlockReservation);
    }
    
    if (blockDateInput) {
        blockDateInput.addEventListener('change', handleBlockDateChange);
    }
    
    // モーダル外クリックで閉じる
    if (blockReservationModal) {
        blockReservationModal.addEventListener('click', function(e) {
            if (e.target === blockReservationModal) {
                closeBlockReservationModal();
            }
        });
    }
}

// 予約休止モーダルを開く
function openBlockReservationModal() {
    // フォームをリセット
    resetBlockReservationForm();
    
    // 今日の日付を最小値として設定
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    if (blockDateInput) {
        blockDateInput.min = todayString;
        blockDateInput.value = '';
    }
    
    if (blockReservationModal) {
        blockReservationModal.classList.add('active');
    }
}

// 予約休止モーダルを閉じる
function closeBlockReservationModal() {
    if (blockReservationModal) {
        blockReservationModal.classList.remove('active');
    }
    resetBlockReservationForm();
}

// フォームをリセット
function resetBlockReservationForm() {
    if (blockDateInput) blockDateInput.value = '';
    if (blockReasonInput) blockReasonInput.value = '';
    if (blockTimeslotsDiv) blockTimeslotsDiv.innerHTML = '';
    
    selectedBlockTimeSlots = [];
    
    if (submitBlockBtn) {
        submitBlockBtn.disabled = false;
        submitBlockBtn.textContent = '休止時間を設定';
    }
}

// 日付変更時の処理
async function handleBlockDateChange() {
    const selectedDate = blockDateInput ? blockDateInput.value : '';
    
    if (!selectedDate) {
        if (blockTimeslotsDiv) {
            blockTimeslotsDiv.innerHTML = '';
        }
        return;
    }
    
    // 休業日チェック
    if (holidays.includes(selectedDate)) {
        if (blockTimeslotsDiv) {
            blockTimeslotsDiv.innerHTML = '<div style="color: #dc3545; text-align: center; padding: 20px;">この日は休業日です</div>';
        }
        return;
    }
    
    // 時間スロットを表示
    await displayAvailableBlockTimeSlots(selectedDate);
}

// 利用可能な時間スロットを表示（複数選択対応）
async function displayAvailableBlockTimeSlots(date) {
    if (!blockTimeslotsDiv) return;
    
    blockTimeslotsDiv.innerHTML = '<div style="color: #ffffff; text-align: center; padding: 10px;">時間を確認しています...</div>';
    
    try {
        // 既存の予約を取得
        const response = await fetch(`${API_BASE_URL}/reservations`);
        const allReservations = await response.json();
        
        const dayReservations = Array.isArray(allReservations) ? 
            allReservations.filter(r => r.date === date && r.states === 0) : [];
        
        // 平日・土日祝の判定
        const isWeekend = isWeekendOrHolidayForBlock(date);
        const availableSlots = isWeekend ? blockTimeSlots.weekend : blockTimeSlots.weekday;
        
        blockTimeslotsDiv.innerHTML = `
            <div style="margin-bottom: 15px; color: #ffffff; font-size: 14px;">
                <strong>複数の時間帯を選択できます</strong><br>
                <small>既に予約がある時間帯や休止設定済みの時間帯は選択できません</small>
            </div>
        `;
        
        const timeSlotsContainer = document.createElement('div');
        timeSlotsContainer.className = 'time-slots-grid';
        
        // 時間スロットボタンを生成
        availableSlots.forEach(time => {
            const existingReservation = dayReservations.find(r => r.Time === time);
            const isBlocked = existingReservation && existingReservation['Name-f'] === '休止時間';
            const isBooked = existingReservation && existingReservation['Name-f'] !== '休止時間';
            
            const timeSlotBtn = document.createElement('button');
            timeSlotBtn.className = 'time-slot-btn block-time-slot';
            timeSlotBtn.textContent = time;
            timeSlotBtn.type = 'button';
            
            if (isBooked) {
                timeSlotBtn.classList.add('disabled');
                timeSlotBtn.disabled = true;
                timeSlotBtn.textContent += ' (予約済み)';
                timeSlotBtn.style.backgroundColor = '#dc3545';
                timeSlotBtn.style.borderColor = '#dc3545';
            } else if (isBlocked) {
                timeSlotBtn.classList.add('disabled');
                timeSlotBtn.disabled = true;
                timeSlotBtn.textContent += ' (休止中)';
                timeSlotBtn.style.backgroundColor = '#6c757d';
                timeSlotBtn.style.borderColor = '#6c757d';
            } else {
                timeSlotBtn.addEventListener('click', () => toggleBlockTimeSlot(time, timeSlotBtn));
            }
            
            timeSlotsContainer.appendChild(timeSlotBtn);
        });
        
        blockTimeslotsDiv.appendChild(timeSlotsContainer);
        
        // 選択状態のリセット
        selectedBlockTimeSlots = [];
        
    } catch (error) {
        console.error('Error loading time slots:', error);
        blockTimeslotsDiv.innerHTML = '<div style="color: #dc3545; text-align: center; padding: 20px;">時間スロットの取得に失敗しました</div>';
    }
}

// 時間スロットの選択/選択解除を切り替え
function toggleBlockTimeSlot(time, buttonElement) {
    const index = selectedBlockTimeSlots.indexOf(time);
    
    if (index === -1) {
        // 選択
        selectedBlockTimeSlots.push(time);
        buttonElement.classList.add('selected');
        buttonElement.style.backgroundColor = '#ffc107';
        buttonElement.style.borderColor = '#ffc107';
        buttonElement.style.color = '#000000';
    } else {
        // 選択解除
        selectedBlockTimeSlots.splice(index, 1);
        buttonElement.classList.remove('selected');
        buttonElement.style.backgroundColor = '#4a4a4a';
        buttonElement.style.borderColor = '#555';
        buttonElement.style.color = '#ffffff';
    }
    
    // 選択状況を表示
    updateSelectedBlockTimeSlots();
}

// 選択された時間スロットの表示を更新
function updateSelectedBlockTimeSlots() {
    // 選択時間の表示エリアを探すか作成
    let selectedDisplay = document.querySelector('.selected-block-times');
    
    if (!selectedDisplay) {
        selectedDisplay = document.createElement('div');
        selectedDisplay.className = 'selected-block-times';
        selectedDisplay.style.cssText = `
            margin-top: 15px;
            padding: 12px;
            background-color: #4a4a4a;
            border: 2px solid #ffc107;
            border-radius: 8px;
            min-height: 50px;
        `;
        blockTimeslotsDiv.appendChild(selectedDisplay);
    }
    
    if (selectedBlockTimeSlots.length === 0) {
        selectedDisplay.innerHTML = `
            <div style="color: #888; text-align: center; font-style: italic;">
                時間帯を選択してください
            </div>
        `;
    } else {
        const sortedTimes = [...selectedBlockTimeSlots].sort();
        selectedDisplay.innerHTML = `
            <div style="color: #ffc107; font-weight: bold; margin-bottom: 8px;">
                選択された時間帯 (${selectedBlockTimeSlots.length}件)
            </div>
            <div style="color: #ffffff; display: flex; flex-wrap: wrap; gap: 8px;">
                ${sortedTimes.map(time => `
                    <span style="background-color: #ffc107; color: #000; padding: 4px 8px; border-radius: 4px; font-size: 14px;">
                        ${time}
                    </span>
                `).join('')}
            </div>
        `;
    }
}

// 予約番号生成（既存関数と同じ）
function generateBlockReservationNumber() {
    return Math.floor(Math.random() * 90000000) + 10000000;
}

// 休止時間設定処理
async function handleAddBlockReservation() {
    const date = blockDateInput ? blockDateInput.value : '';
    const reason = blockReasonInput ? blockReasonInput.value.trim() : '';
    
    // バリデーション
    if (!date) {
        alert('日付を選択してください。');
        return;
    }
    
    if (selectedBlockTimeSlots.length === 0) {
        alert('休止する時間帯を選択してください。');
        return;
    }
    
    if (!reason) {
        alert('休止理由を入力してください。');
        return;
    }
    
    // 確認ダイアログ
    const confirmMessage = `以下の時間帯を予約休止に設定しますか？

日付: ${date}
時間: ${selectedBlockTimeSlots.sort().join(', ')}
理由: ${reason}

設定後、これらの時間帯は予約できなくなります。`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // 送信ボタンを無効化
    if (submitBlockBtn) {
        submitBlockBtn.disabled = true;
        submitBlockBtn.textContent = '設定中...';
    }
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        // 各時間帯に対して休止予約を作成
        for (const time of selectedBlockTimeSlots) {
            try {
                const reservationNumber = generateBlockReservationNumber();
                
                const blockReservationData = {
                    reservationNumber: reservationNumber,
                    Menu: '予約休止',
                    "Name-f": '休止時間',
                    "Name-s": reason, // 理由を電話番号欄に保存
                    Time: time,
                    WorkTime: 0,
                    date: date,
                    mail: `管理者設定（${reason}）`,
                    states: 0
                };
                
                console.log('休止予約データ:', blockReservationData);
                
                const response = await fetch(`${API_BASE_URL}/reservations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(blockReservationData)
                });
                
                const responseText = await response.text();
                
                // HTMLが返された場合の処理
                if (responseText.startsWith('<!doctype') || responseText.startsWith('<!DOCTYPE') || responseText.includes('<html>')) {
                    throw new Error('APIエンドポイントが見つかりません。');
                }
                
                // JSONとして解析
                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (parseError) {
                    throw new Error('サーバーから無効なJSON応答が返されました。');
                }
                
                if (!response.ok) {
                    throw new Error(result.message || result.error || `HTTP error! status: ${response.status}`);
                }
                
                // 成功判定
                if (!result.success && result.success !== undefined) {
                    throw new Error(result.message || '休止時間の設定に失敗しました');
                }
                
                successCount++;
                console.log(`休止時間設定成功: ${time}`);
                
            } catch (timeError) {
                console.error(`時間${time}の休止設定エラー:`, timeError);
                errorCount++;
            }
        }
        
        if (successCount > 0) {
            // 成功時の処理
            const successMessage = `${successCount}件の時間帯を予約休止に設定しました。`;
            if (errorCount > 0) {
                alert(`${successMessage}\n\n${errorCount}件の設定に失敗しました。詳細はコンソールをご確認ください。`);
            } else {
                alert(successMessage);
            }
            
            // モーダルを閉じる
            closeBlockReservationModal();
            
            // 予約データを再読み込み
            await loadReservations();
            
            // カレンダーを再描画
            const calendarTab = document.getElementById('calendar-tab');
            if (calendarTab && calendarTab.classList.contains('active')) {
                if (typeof renderCalendar === 'function') {
                    renderCalendar();
                }
            }
            
        } else {
            throw new Error('すべての時間帯の設定に失敗しました。');
        }
        
    } catch (error) {
        console.error('休止時間設定エラー:', error);
        
        // HTMLレスポンスが返された場合の特別処理
        if (error.message.includes('Unexpected token') || 
            error.message.includes('<!doctype') || 
            error.message.includes('HTMLレスポンス') ||
            error.message.includes('APIエンドポイント')) {
            
            // デモ用のローカル処理
            console.log('APIが利用できないため、ローカルデモモードで実行します');
            
            if (confirm(`APIサーバーに接続できませんが、デモ用にローカルで休止時間を設定しますか？\n（実際のデータベースには保存されません）`)) {
                try {
                    // ローカルの予約配列に追加
                    selectedBlockTimeSlots.forEach(time => {
                        const localBlockReservationData = {
                            id: Date.now() + Math.random(), // 仮のID
                            reservationNumber: generateBlockReservationNumber(),
                            Menu: '予約休止',
                            "Name-f": '休止時間',
                            "Name-s": reason,
                            Time: time,
                            WorkTime: 0,
                            date: date,
                            mail: `管理者設定（${reason}）`,
                            states: 0
                        };
                        
                        if (typeof reservations !== 'undefined' && Array.isArray(reservations)) {
                            reservations.push(localBlockReservationData);
                        }
                    });
                    
                    alert(`デモ用休止時間を設定しました。\n${selectedBlockTimeSlots.length}件の時間帯\n\n※これはデモ用です。実際のデータベースには保存されていません。`);
                    
                    // モーダルを閉じる
                    closeBlockReservationModal();
                    
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
                    
                    return;
                    
                } catch (localError) {
                    console.error('ローカル処理エラー:', localError);
                }
            }
        }
        
        // エラーメッセージの表示
        let errorMessage = '休止時間の設定に失敗しました。';
        
        if (error.message.includes('Unexpected token') || error.message.includes('<!doctype')) {
            errorMessage = 'APIサーバーに接続できません。\n\n考えられる原因：\n• APIエンドポイントが正しくない\n• CORS設定の問題\n• サーバーがダウンしている\n\nシステム管理者にお問い合わせください。';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
            errorMessage = 'ネットワークエラーが発生しました。\nインターネット接続を確認してください。';
        } else if (error.message.includes('404')) {
            errorMessage = 'APIエンドポイントが見つかりません。\nURL設定を確認してください。';
        } else if (error.message.includes('500')) {
            errorMessage = 'サーバーエラーが発生しました。\nしばらく時間をおいてから再度お試しください。';
        } else if (error.message) {
            errorMessage += '\n\n詳細: ' + error.message;
        }
        
        alert(errorMessage);
        
    } finally {
        // 送信ボタンを再有効化
        if (submitBlockBtn) {
            submitBlockBtn.disabled = false;
            submitBlockBtn.textContent = '休止時間を設定';
        }
    }
}

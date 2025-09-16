// タブ関連の要素
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// 予約表示エリア
const todayReservationsDiv = document.getElementById('today-reservations');
const reservationHistoryDiv = document.getElementById('reservation-history');

// 検索関連
const searchTextInput = document.getElementById('search-text');
const searchDateFromInput = document.getElementById('search-date-from');
const searchDateToInput = document.getElementById('search-date-to');
const searchBtn = document.getElementById('search-btn');
const clearSearchBtn = document.getElementById('clear-search-btn');

// モーダル関連
const mailModal = document.getElementById('mail-modal');
const confirmModal = document.getElementById('confirm-modal');
const reservationDetailModal = document.getElementById('reservation-detail-modal');

// DOM読み込み後に実行
document.addEventListener('DOMContentLoaded', function() {
    initializeMainFeatures();
});

function initializeMainFeatures() {
    // タブ切り替え
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // 検索関連
    if (searchBtn) searchBtn.addEventListener('click', handleSearch);
    if (clearSearchBtn) clearSearchBtn.addEventListener('click', handleClearSearch);
    
    if (searchTextInput) {
        searchTextInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // モーダル外クリックで閉じる
    if (mailModal) {
        mailModal.addEventListener('click', function(e) {
            if (e.target === mailModal && typeof closeMailModal === 'function') {
                closeMailModal();
            }
        });
    }

    if (confirmModal) {
        confirmModal.addEventListener('click', function(e) {
            if (e.target === confirmModal && typeof closeConfirmModal === 'function') {
                closeConfirmModal();
            }
        });
    }

    if (reservationDetailModal) {
        reservationDetailModal.addEventListener('click', function(e) {
            if (e.target === reservationDetailModal && typeof closeReservationDetailModal === 'function') {
                closeReservationDetailModal();
            }
        });
    }
}

// タブ切り替え（修正版 - カレンダーデータ読み込み強化）
function switchTab(tabName) {
    console.log(`[Main Features] タブ切り替え: ${tabName}`);
    
    tabBtns.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(`${tabName}-tab`);

    if (activeTab && activeContent) {
        activeTab.classList.add('active');
        activeContent.classList.add('active');
        
        if (tabName === 'calendar') {
            console.log('[Main Features] カレンダータブが選択されました');
            
            // カレンダー用データ読み込みと描画
            setTimeout(async () => {
                // 必要なデータが揃っているかチェック
                console.log('[Main Features] カレンダーデータチェック開始');
                
                // データが不足している場合は読み込み
                let needsDataUpdate = false;
                
                if (!reservations || !Array.isArray(reservations)) {
                    console.log('[Main Features] 予約データが不足 - 読み込みが必要');
                    needsDataUpdate = true;
                }
                
                if (!currentMenus || typeof currentMenus !== 'object' || Object.keys(currentMenus).length === 0) {
                    console.log('[Main Features] メニューデータが不足 - 読み込みが必要');
                    needsDataUpdate = true;
                }
                
                if (!holidays || !Array.isArray(holidays)) {
                    console.log('[Main Features] 休業日データが不足 - 読み込みが必要');
                    needsDataUpdate = true;
                }
                
                // データ読み込みが必要な場合
                if (needsDataUpdate) {
                    console.log('[Main Features] 不足データの読み込み開始');
                    
                    try {
                        // 並行してデータを読み込み
                        const loadPromises = [];
                        
                        if (!reservations || !Array.isArray(reservations)) {
                            loadPromises.push(
                                loadReservationsQuick().catch(err => {
                                    console.warn('[Main Features] 予約読み込みエラー:', err);
                                    return [];
                                })
                            );
                        }
                        
                        if (!currentMenus || Object.keys(currentMenus).length === 0) {
                            loadPromises.push(
                                loadMenusQuick().catch(err => {
                                    console.warn('[Main Features] メニュー読み込みエラー:', err);
                                    return {};
                                })
                            );
                        }
                        
                        if (!holidays || !Array.isArray(holidays)) {
                            loadPromises.push(
                                loadHolidaysQuick().catch(err => {
                                    console.warn('[Main Features] 休業日読み込みエラー:', err);
                                    return [];
                                })
                            );
                        }
                        
                        await Promise.allSettled(loadPromises);
                        console.log('[Main Features] データ読み込み完了');
                        
                    } catch (error) {
                        console.error('[Main Features] データ読み込みエラー:', error);
                    }
                }
                
                // カレンダー描画
                if (typeof renderCalendar === 'function') {
                    console.log('[Main Features] カレンダー描画実行');
                    renderCalendar();
                } else {
                    console.error('[Main Features] renderCalendar関数が見つかりません');
                }
                
                // メニュー凡例描画
                if (typeof renderMenuLegend === 'function') {
                    renderMenuLegend();
                }
                
            }, 300); // 300ms待機してデータの準備時間を確保
        }
        
        if (tabName === 'settings') {
            console.log('[Main Features] 設定タブが選択されました');
            
            // シフト管理機能の初期化確認
            setTimeout(() => {
                if (typeof window.initializeShiftManagement === 'function' && !window.shiftManagementInitialized) {
                    console.log('[Main Features] シフト管理機能の遅延初期化実行');
                    window.initializeShiftManagement();
                }
            }, 100);
        }
        
        if (tabName === 'home') {
            console.log('[Main Features] ホームタブが選択されました');
            // ホーム画面の予約表示を更新
            setTimeout(() => {
                displayReservations();
            }, 100);
        }
    }
}

// クイック予約データ読み込み（カレンダー用）
async function loadReservationsQuick() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${API_BASE_URL}/reservations`, {
            signal: controller.signal,
            headers: { 
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
            reservations = data;
            console.log(`[Main Features] クイック予約読み込み成功: ${data.length}件`);
            return data;
        } else {
            reservations = [];
            return [];
        }
        
    } catch (error) {
        console.error('[Main Features] クイック予約読み込みエラー:', error);
        reservations = reservations || [];
        return reservations;
    }
}

// クイックメニューデータ読み込み（カレンダー用）
async function loadMenusQuick() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_BASE_URL}/menus`, {
            signal: controller.signal,
            headers: { 
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const menus = await response.json();
            currentMenus = menus || {};
            console.log(`[Main Features] クイックメニュー読み込み成功: ${Object.keys(currentMenus).length}個`);
            return currentMenus;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('[Main Features] クイックメニュー読み込みエラー:', error);
        currentMenus = currentMenus || {};
        return currentMenus;
    }
}

// クイック休業日データ読み込み（カレンダー用）
async function loadHolidaysQuick() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_BASE_URL}/holidays`, {
            signal: controller.signal,
            headers: { 
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            holidays = Array.isArray(data) ? data : [];
            console.log(`[Main Features] クイック休業日読み込み成功: ${holidays.length}件`);
            return holidays;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('[Main Features] クイック休業日読み込みエラー:', error);
        holidays = holidays || [];
        return holidays;
    }
}

// 予約表示（修正版 - デバッグ強化）
function displayReservations() {
    console.log('[Main Features] 予約表示開始');
    console.log('[Main Features] データ状態:', {
        reservationsCount: reservations ? reservations.length : 0,
        reservationsType: Array.isArray(reservations) ? 'array' : typeof reservations,
        breakModeEnabled: breakMode && breakMode.turn
    });
    
    // 休憩モード時は今日の予約表示を修正
    if (breakMode && breakMode.turn) {
        if (todayReservationsDiv) {
            todayReservationsDiv.innerHTML = `
                <div style="text-align: center; padding: 20px; background-color: rgba(220, 53, 69, 0.2); border: 2px solid #dc3545; border-radius: 10px; margin: 20px 0;">
                    <h3 style="color: #dc3545; margin-bottom: 10px;">現在休憩中です</h3>
                    <p style="color: #ffffff; font-size: 1.1em;">${breakMode.custom || ''}</p>
                </div>
            `;
        }
    } else {
        // 通常営業時の予約表示（休止時間除外版）
        const today = new Date().toISOString().split('T')[0];
        
        // reservations配列が存在することを確認し、休止時間を除外
        if (reservations && Array.isArray(reservations) && reservations.length > 0) {
            const todayReservations = reservations.filter(r => 
                r.date >= today && 
                r.states === 0 && 
                r['Name-f'] !== '休止時間' // 休止時間を除外
            ).sort((a, b) => {
                if (a.date === b.date) {
                    return a.Time.localeCompare(b.Time);
                }
                return a.date.localeCompare(b.date);
            });
            
            console.log(`[Main Features] 今日以降の予約: ${todayReservations.length}件（休止時間除外済み）`);
            
            if (todayReservationsDiv) {
                todayReservationsDiv.innerHTML = renderReservationsList(todayReservations, 'today');
            }
        } else {
            console.log('[Main Features] 予約データがないか空です');
            if (todayReservationsDiv) {
                todayReservationsDiv.innerHTML = '<p>予約データを読み込み中...</p>';
            }
        }
    }

    // 履歴は休止時間を除外
    const historyReservations = getFilteredReservations();
    console.log(`[Main Features] 履歴予約: ${historyReservations.length}件`);
    
    if (reservationHistoryDiv) {
        reservationHistoryDiv.innerHTML = renderReservationsList(historyReservations, 'history');
    }
    
    console.log('[Main Features] 予約表示完了');
}

// 検索フィルター適用（休止時間除外版）
function getFilteredReservations() {
    // reservations配列が存在することを確認
    if (!reservations || !Array.isArray(reservations)) {
        console.log('[Main Features] reservationsが無効です');
        return [];
    }
    
    // 休止時間を除外してフィルタリング（最初に除外）
    let filteredReservations = reservations.filter(r => r['Name-f'] !== '休止時間');
    
    const searchText = searchTextInput ? searchTextInput.value.trim().toLowerCase() : '';
    if (searchText) {
        filteredReservations = filteredReservations.filter(r => {
            const customerName = (r['Name-f'] || '').toLowerCase();
            const phoneNumber = (r['Name-s'] || '').toLowerCase();
            const menu = (r.Menu || '').toLowerCase();
            const email = (r.mail || '').toLowerCase();
            
            return customerName.includes(searchText) ||
                   phoneNumber.includes(searchText) ||
                   menu.includes(searchText) ||
                   email.includes(searchText);
        });
    }
    
    const dateFrom = searchDateFromInput ? searchDateFromInput.value : '';
    const dateTo = searchDateToInput ? searchDateToInput.value : '';
    
    if (dateFrom) {
        filteredReservations = filteredReservations.filter(r => r.date >= dateFrom);
    }
    
    if (dateTo) {
        filteredReservations = filteredReservations.filter(r => r.date <= dateTo);
    }
    
    return filteredReservations.sort((a, b) => {
        if (a.date === b.date) {
            return b.Time.localeCompare(a.Time);
        }
        return b.date.localeCompare(a.date);
    });
}

// 検索処理
function handleSearch() {
    console.log('[Main Features] 検索実行');
    displayReservations();
}

// 検索クリア
function handleClearSearch() {
    console.log('[Main Features] 検索クリア');
    if (searchTextInput) searchTextInput.value = '';
    if (searchDateFromInput) searchDateFromInput.value = '';
    if (searchDateToInput) searchDateToInput.value = '';
    displayReservations();
}

// 予約リストHTML生成（修正版 - デバッグ強化）
function renderReservationsList(reservationsList, type) {
    console.log(`[Main Features] 予約リスト描画: ${type}, 件数: ${reservationsList ? reservationsList.length : 0}`);
    
    if (!reservationsList || reservationsList.length === 0) {
        const message = type === 'today' ? '本日以降の予約がありません。' : '予約がありません。';
        return `<p style="text-align: center; color: #888; padding: 20px;">${message}</p>`;
    }

    return reservationsList.map(reservation => {
        const statusText = getStatusText(reservation.states);
        const statusClass = getStatusClass(reservation.states);
        const customerName = reservation['Name-f'] || '';
        const phoneNumber = reservation['Name-s'] || '';
        const email = reservation.mail || '';
        
        let actionsHTML = '';
        if (type === 'today' && (!breakMode || !breakMode.turn)) {
            // 通常営業時のみアクションボタンを表示
            // 同行者の場合はメール送信ボタンを無効化
            const mailButtonDisabled = email === '同行者' ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
            const mailButtonText = email === '同行者' ? 'メール送信（同行者）' : 'メール送信';
            
            actionsHTML = `
                <button class="btn btn-success btn-small" onclick="handleVisit('${reservation.id}')">来店</button>
                <button class="btn btn-danger btn-small" onclick="handleCancel('${reservation.id}')">キャンセル</button>
                <button class="btn btn-secondary btn-small" onclick="openMailModal('${email}', '${customerName}')" ${mailButtonDisabled}>${mailButtonText}</button>
            `;
        } else if (type === 'history') {
            // 履歴でも同行者の場合はメール送信ボタンを無効化
            const mailButtonDisabled = email === '同行者' ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
            const mailButtonText = email === '同行者' ? 'メール送信（同行者）' : 'メール送信';
            
            actionsHTML = `
                <button class="btn btn-secondary btn-small" onclick="openMailModal('${email}', '${customerName}')" ${mailButtonDisabled}>${mailButtonText}</button>
            `;
        }

        return `
            <div class="reservation-item">
                <div class="reservation-header">
                    <span class="reservation-time">${reservation.Time}</span>
                    <span class="reservation-status ${statusClass}">${statusText}</span>
                </div>
                <div class="reservation-info">
                    <div><strong>日付:</strong> ${reservation.date}</div>
                    <div><strong>お名前:</strong> ${customerName}</div>
                    <div><strong>電話番号:</strong> ${phoneNumber}</div>
                    <div><strong>メニュー:</strong> ${reservation.Menu || ''}</div>
                    <div><strong>作業時間:</strong> ${reservation.WorkTime || ''}分</div>
                    <div><strong>メール:</strong> ${email}</div>
                </div>
                <div class="reservation-actions">
                    ${actionsHTML}
                </div>
            </div>
        `;
    }).join('');
}

// ステータステキスト取得
function getStatusText(status) {
    switch (status) {
        case 0: return '来店前';
        case 1: return '来店済み';
        case 2: return 'キャンセル済み';
        default: return '不明';
    }
}

// ステータスクラス取得
function getStatusClass(status) {
    switch (status) {
        case 0: return 'status-pending';
        case 1: return 'status-completed';
        case 2: return 'status-cancelled';
        default: return '';
    }
}

// 来店処理（休憩モード時は無効化）
async function handleVisit(reservationId) {
    if (breakMode && breakMode.turn) {
        alert('休憩中のため、来店処理はできません。');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 1 })
        });

        if (response.ok) {
            // 予約データを再読み込み
            if (typeof loadReservations === 'function') {
                await loadReservations();
            } else {
                await loadReservationsQuick();
            }
            
            // 表示を更新
            displayReservations();
            
            // カレンダーが表示されている場合は更新
            const calendarTab = document.getElementById('calendar-tab');
            if (calendarTab && calendarTab.classList.contains('active') && typeof renderCalendar === 'function') {
                renderCalendar();
            }
            
            console.log('[Main Features] 来店処理完了');
        } else {
            const errorText = await response.text();
            console.error('[Main Features] 来店処理エラー:', errorText);
            alert('来店処理に失敗しました。');
        }
    } catch (error) {
        console.error('Error updating reservation status:', error);
        alert('来店処理中にエラーが発生しました。');
    }
}

// キャンセル処理（休憩モード時は無効化）
function handleCancel(reservationId) {
    if (breakMode && breakMode.turn) {
        alert('休憩中のため、キャンセル処理はできません。');
        return;
    }
    
    if (typeof showConfirm === 'function') {
        showConfirm('予約キャンセル', '本当にキャンセルしますか？', async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/reservations/${reservationId}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 2 })
                });

                if (response.ok) {
                    // 予約データを再読み込み
                    if (typeof loadReservations === 'function') {
                        await loadReservations();
                    } else {
                        await loadReservationsQuick();
                    }
                    
                    // 表示を更新
                    displayReservations();
                    
                    // カレンダーが表示されている場合は更新
                    const calendarTab = document.getElementById('calendar-tab');
                    if (calendarTab && calendarTab.classList.contains('active') && typeof renderCalendar === 'function') {
                        renderCalendar();
                    }
                    
                    console.log('[Main Features] キャンセル処理完了');
                } else {
                    const errorText = await response.text();
                    console.error('[Main Features] キャンセル処理エラー:', errorText);
                    alert('キャンセル処理に失敗しました。');
                }
            } catch (error) {
                console.error('Error cancelling reservation:', error);
                alert('キャンセル処理中にエラーが発生しました。');
            }
        });
    } else {
        // フォールバック：直接確認ダイアログ
        if (confirm('本当にこの予約をキャンセルしますか？')) {
            // キャンセル処理を実行
            handleCancel(reservationId);
        }
    }
}

// グローバル関数として公開
window.displayReservations = displayReservations;
window.loadReservationsQuick = loadReservationsQuick;
window.loadMenusQuick = loadMenusQuick;
window.loadHolidaysQuick = loadHolidaysQuick;

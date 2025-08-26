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

// タブ切り替え（修正版 - データ読み込み状態を考慮、シフト表示確認を追加）
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
            
            // カレンダータブが選択された場合の処理を改善
            // 必要なデータが揃うまで少し待ってからレンダリング
            setTimeout(() => {
                // シフトデータの存在確認
                let hasShiftData = false;
                try {
                    hasShiftData = (window.shiftData && Object.keys(window.shiftData).length > 0) ||
                                  (typeof shiftData !== 'undefined' && shiftData && Object.keys(shiftData).length > 0) ||
                                  (localStorage.getItem('shiftData') !== null);
                    
                    console.log(`[Main Features] シフトデータ存在確認: ${hasShiftData}`);
                    
                    if (hasShiftData) {
                        // シフトデータが存在する場合、詳細をログ出力
                        if (window.shiftData) {
                            console.log('[Main Features] window.shiftData:', Object.keys(window.shiftData).slice(0, 3));
                        }
                        if (typeof shiftData !== 'undefined' && shiftData) {
                            console.log('[Main Features] グローバルshiftData:', Object.keys(shiftData).slice(0, 3));
                        }
                        
                        const lsData = localStorage.getItem('shiftData');
                        if (lsData) {
                            try {
                                const parsed = JSON.parse(lsData);
                                console.log('[Main Features] localStorage shiftData:', Object.keys(parsed).slice(0, 3));
                            } catch (e) {
                                console.warn('[Main Features] localStorage shiftData parse error:', e);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[Main Features] シフトデータ確認エラー:', e);
                }
                
                if (typeof renderCalendar === 'function') {
                    console.log('[Main Features] カレンダー描画実行');
                    renderCalendar();
                } else {
                    console.error('[Main Features] renderCalendar関数が見つかりません');
                }
                
                if (typeof renderMenuLegend === 'function') {
                    renderMenuLegend();
                }
            }, 200); // 200ms待機してデータの読み込みを待つ
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
    }
}

// 予約表示（休憩モード対応版、休止時間除外版）
function displayReservations() {
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
        const todayReservations = (reservations && Array.isArray(reservations)) ? 
            reservations.filter(r => 
                r.date >= today && 
                r.states === 0 && 
                r['Name-f'] !== '休止時間' // 休止時間を除外
            ).sort((a, b) => {
                if (a.date === b.date) {
                    return a.Time.localeCompare(b.Time);
                }
                return a.date.localeCompare(b.date);
            }) : [];

        if (todayReservationsDiv) {
            todayReservationsDiv.innerHTML = renderReservationsList(todayReservations, 'today');
        }
    }

    // 履歴は休止時間を除外
    const historyReservations = getFilteredReservations();
    if (reservationHistoryDiv) {
        reservationHistoryDiv.innerHTML = renderReservationsList(historyReservations, 'history');
    }
}

// 検索フィルター適用（休止時間除外版）
function getFilteredReservations() {
    // reservations配列が存在することを確認
    if (!reservations || !Array.isArray(reservations)) {
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
    displayReservations();
}

// 検索クリア
function handleClearSearch() {
    if (searchTextInput) searchTextInput.value = '';
    if (searchDateFromInput) searchDateFromInput.value = '';
    if (searchDateToInput) searchDateToInput.value = '';
    displayReservations();
}

// 予約リストHTML生成（電話番号対応版）
function renderReservationsList(reservationsList, type) {
    if (!reservationsList || reservationsList.length === 0) {
        return '<p>予約がありません。</p>';
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
            await loadReservations();
        }
    } catch (error) {
        console.error('Error updating reservation status:', error);
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
                    await loadReservations();
                }
            } catch (error) {
                console.error('Error cancelling reservation:', error);
            }
        });
    }
}

// タブ関連の要素
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// 人数関連
const currentPopulationSpan = document.getElementById('current-population');
const populationMinusBtn = document.getElementById('population-minus');
const populationPlusBtn = document.getElementById('population-plus');

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

    // 人数変更
    if (populationMinusBtn) populationMinusBtn.addEventListener('click', () => updatePopulation(-1));
    if (populationPlusBtn) populationPlusBtn.addEventListener('click', () => updatePopulation(1));

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

// タブ切り替え
function switchTab(tabName) {
    tabBtns.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(`${tabName}-tab`);

    if (activeTab && activeContent) {
        activeTab.classList.add('active');
        activeContent.classList.add('active');
        
        if (tabName === 'calendar') {
            if (typeof renderCalendar === 'function') renderCalendar();
            if (typeof renderMenuLegend === 'function') renderMenuLegend();
        }
    }
}

// 人数更新
async function updatePopulation(change) {
    const currentCount = parseInt(currentPopulationSpan.textContent);
    const newCount = Math.max(0, currentCount + change);

    try {
        const response = await fetch(`${API_BASE_URL}/population`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ now: newCount })
        });

        if (response.ok) {
            currentPopulationSpan.textContent = newCount;
        }
    } catch (error) {
        console.error('Error updating population:', error);
    }
}

// 予約表示
function displayReservations() {
    const today = new Date().toISOString().split('T')[0];
    
    const todayReservations = reservations.filter(r => 
        r.date >= today && r.states === 0
    ).sort((a, b) => {
        if (a.date === b.date) {
            return a.Time.localeCompare(b.Time);
        }
        return a.date.localeCompare(b.date);
    });

    const historyReservations = getFilteredReservations();

    if (todayReservationsDiv) {
        todayReservationsDiv.innerHTML = renderReservationsList(todayReservations, 'today');
    }
    if (reservationHistoryDiv) {
        reservationHistoryDiv.innerHTML = renderReservationsList(historyReservations, 'history');
    }
}

// 検索フィルター適用
function getFilteredReservations() {
    let filteredReservations = [...reservations];
    
    const searchText = searchTextInput ? searchTextInput.value.trim().toLowerCase() : '';
    if (searchText) {
        filteredReservations = filteredReservations.filter(r => {
            const fullName = `${r['Name-f'] || ''} ${r['Name-s'] || ''}`.toLowerCase();
            const menu = (r.Menu || '').toLowerCase();
            const email = (r.mail || '').toLowerCase();
            
            return fullName.includes(searchText) ||
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

// 予約リストHTML生成
function renderReservationsList(reservationsList, type) {
    if (reservationsList.length === 0) {
        return '<p>予約がありません。</p>';
    }

    return reservationsList.map(reservation => {
        const statusText = getStatusText(reservation.states);
        const statusClass = getStatusClass(reservation.states);
        const customerName = `${reservation['Name-f'] || ''} ${reservation['Name-s'] || ''}`;
        
        let actionsHTML = '';
        if (type === 'today') {
            actionsHTML = `
                <button class="btn btn-success btn-small" onclick="handleVisit('${reservation.id}')">来店</button>
                <button class="btn btn-danger btn-small" onclick="handleCancel('${reservation.id}')">キャンセル</button>
                <button class="btn btn-secondary btn-small" onclick="openMailModal('${reservation.mail}', '${customerName}')">メール送信</button>
            `;
        } else {
            actionsHTML = `
                <button class="btn btn-secondary btn-small" onclick="openMailModal('${reservation.mail}', '${customerName}')">メール送信</button>
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
                    <div><strong>名前:</strong> ${customerName}</div>
                    <div><strong>メニュー:</strong> ${reservation.Menu || ''}</div>
                    <div><strong>作業時間:</strong> ${reservation.WorkTime || ''}分</div>
                    <div><strong>メール:</strong> ${reservation.mail || ''}</div>
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

// 来店処理
async function handleVisit(reservationId) {
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

// キャンセル処理
function handleCancel(reservationId) {
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

// 初期化時にローカルストレージとデータベースからデータを読み込み
async function loadShiftDataFromStorage() {
    try {
        // まずデータベースから読み込みを試行
        const dbLoaded = await loadShiftDataFromDatabase();
        
        if (dbLoaded) {
            console.log('データベースからシフトデータを読み込みました');
            return;
        }
        
        // データベースにデータがない場合はローカルストレージから読み込み
        const savedShiftData = localStorage.getItem('shiftData');
        if (savedShiftData) {
            shiftData = JSON.parse(savedShiftData);
            shiftFileUploaded = Object.keys(shiftData).length > 0;
            console.log('ローカルストレージからシフトデータを読み込みました:', shiftData);
        }
    } catch (error) {
        console.error('シフトデータの読み込みエラー:', error);
        localStorage.removeItem('shiftData');
        localStorage.removeItem('shiftFileName');
    }
}

// DOMContentLoaded時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // シフトデータを読み込み（非同期）
    loadShiftDataFromStorage().then(() => {
        // シフト管理機能を初期化
        setTimeout(() => {
            initializeShiftManagement();
        }, 500);
    });
});

// グローバル関数として公開
window.getShiftForDate = getShiftForDate;
window.initializeShiftManagement = initializeShiftManagement;// シフト表管理機能

// グローバル変数
let shiftData = {};
let shiftFileUploaded = false;

// DOM要素
let shiftFileInput = null;
let shiftUploadBtn = null;
let shiftStatusDiv = null;

// シフト管理機能の初期化
function initializeShiftManagement() {
    createShiftUploadInterface();
    
    // カレンダータブが表示されたときにシフト情報も表示
    const calendarTab = document.getElementById('calendar-tab');
    if (calendarTab) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (calendarTab.classList.contains('active')) {
                        setTimeout(() => {
                            if (typeof renderCalendar === 'function') {
                                renderCalendar();
                            }
                        }, 100);
                    }
                }
            });
        });
        observer.observe(calendarTab, { attributes: true });
    }
}

// シフトアップロード用のUIを作成
function createShiftUploadInterface() {
    const calendarSection = document.querySelector('#calendar-tab .section');
    if (!calendarSection) return;

    // 既存のシフト管理UIがある場合は削除
    const existingShiftUI = document.getElementById('shift-management-ui');
    if (existingShiftUI) {
        existingShiftUI.remove();
    }

    // シフト管理UIを作成
    const shiftUI = document.createElement('div');
    shiftUI.id = 'shift-management-ui';
    shiftUI.className = 'shift-management-section';
    shiftUI.innerHTML = `
        <div class="shift-upload-container">
            <h3>📋 シフト表管理</h3>
            <div class="shift-upload-form">
                <input type="file" id="shift-file-input" accept=".xlsx,.xls" style="display: none;">
                <button id="shift-upload-btn" class="btn btn-secondary">
                    📤 Excelシフト表をアップロード
                </button>
                <button id="shift-clear-btn" class="btn btn-danger" style="display: none;">
                    🗑️ シフト表をクリア
                </button>
            </div>
            <div id="shift-status" class="shift-status"></div>
            <div id="shift-preview" class="shift-preview" style="display: none;"></div>
        </div>
    `;

    // カレンダーコントロールの前に挿入
    const calendarControls = calendarSection.querySelector('.calendar-controls');
    if (calendarControls) {
        calendarSection.insertBefore(shiftUI, calendarControls);
    } else {
        calendarSection.insertBefore(shiftUI, calendarSection.firstChild);
    }

    // 要素を取得
    shiftFileInput = document.getElementById('shift-file-input');
    shiftUploadBtn = document.getElementById('shift-upload-btn');
    const shiftClearBtn = document.getElementById('shift-clear-btn');
    shiftStatusDiv = document.getElementById('shift-status');

    // イベントリスナー設定
    if (shiftUploadBtn) {
        shiftUploadBtn.addEventListener('click', () => {
            if (shiftFileInput) {
                shiftFileInput.click();
            }
        });
    }

    if (shiftFileInput) {
        shiftFileInput.addEventListener('change', handleShiftFileUpload);
    }

    if (shiftClearBtn) {
        shiftClearBtn.addEventListener('click', clearShiftData);
    }

    // 既存のシフトデータがある場合は状態を更新
    updateShiftStatus();
}

// シフトファイルアップロード処理
async function handleShiftFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showShiftError('Excelファイル（.xlsx, .xls）を選択してください。');
        return;
    }

    showShiftStatus('シフト表を読み込んでいます...', 'loading');

    try {
        // ファイルを読み込み
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
            cellStyles: true,
            cellFormulas: true,
            cellDates: true,
            cellNF: true,
            sheetStubs: true
        });

        // シフトデータを解析
        const parsedShiftData = parseShiftExcel(workbook);
        
        if (Object.keys(parsedShiftData).length === 0) {
            throw new Error('有効なシフトデータが見つかりませんでした。');
        }

        // グローバル変数に保存
        shiftData = parsedShiftData;
        shiftFileUploaded = true;

        // データベースに保存
        await saveShiftDataToDatabase(shiftData);

        // ローカルストレージに保存
        localStorage.setItem('shiftData', JSON.stringify(shiftData));
        localStorage.setItem('shiftFileName', file.name);

        showShiftSuccess(`シフト表「${file.name}」を読み込み、データベースに保存しました。`);
        showShiftPreview();
        
        // カレンダーを再描画
        if (typeof renderCalendar === 'function') {
            renderCalendar();
        }

    } catch (error) {
        console.error('シフトファイル読み込みエラー:', error);
        showShiftError(`シフト表の読み込みに失敗しました: ${error.message}`);
        clearShiftData();
    }
}

// Excelシフト表を解析（月別シート対応版）
function parseShiftExcel(workbook) {
    const parsedData = {};
    
    console.log('利用可能なシート:', workbook.SheetNames);
    
    // 各シートを処理
    workbook.SheetNames.forEach(sheetName => {
        try {
            console.log(`シート「${sheetName}」を処理中...`);
            
            const worksheet = workbook.Sheets[sheetName];
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            
            // A1セルから年月情報を取得
            let yearMonth = null;
            const a1Cell = worksheet['A1'];
            if (a1Cell && a1Cell.v) {
                const yearMonthMatch = String(a1Cell.v).match(/(\d{4})年(\d{1,2})月/);
                if (yearMonthMatch) {
                    const year = yearMonthMatch[1];
                    const month = String(parseInt(yearMonthMatch[2])).padStart(2, '0');
                    yearMonth = `${year}-${month}`;
                    console.log(`年月情報: ${yearMonth}`);
                }
            }
            
            if (!yearMonth) {
                console.warn(`シート「${sheetName}」: A1セルに年月情報が見つかりません`);
                return;
            }
            
            // B3行から日付を読み取り
            const dateRow = 3; // B3, C3, D3... (1-indexed)
            const dates = [];
            
            for (let col = 1; col < range.e.c + 1; col++) { // B列(1)から開始
                const cellAddress = XLSX.utils.encode_cell({ r: dateRow - 1, c: col }); // 0-indexed
                const cell = worksheet[cellAddress];
                
                if (cell && cell.v) {
                    const day = parseInt(cell.v);
                    if (!isNaN(day) && day >= 1 && day <= 31) {
                        const dayStr = String(day).padStart(2, '0');
                        const fullDate = `${yearMonth}-${dayStr}`;
                        dates.push({ col, day, fullDate });
                    }
                }
            }
            
            console.log(`シート「${sheetName}」の日付:`, dates.map(d => d.fullDate));
            
            // A5行から従業員名を読み取り
            let employees = [];
            let currentRow = 5; // A5から開始 (1-indexed)
            
            while (currentRow <= range.e.r + 1) {
                const cellAddress = XLSX.utils.encode_cell({ r: currentRow - 1, c: 0 }); // A列(0)
                const cell = worksheet[cellAddress];
                
                if (cell && cell.v) {
                    const cellValue = String(cell.v).trim();
                    // 「スケジュールなど」が見つかったら終了
                    if (cellValue.includes('スケジュール') || cellValue.includes('予定')) {
                        console.log(`従業員リスト終了マーカー発見: ${cellValue}`);
                        break;
                    }
                    
                    // 空でない値は従業員名として扱う
                    if (cellValue && cellValue.length > 0) {
                        employees.push({ name: cellValue, row: currentRow });
                    }
                }
                
                currentRow++;
            }
            
            console.log(`シート「${sheetName}」の従業員:`, employees.map(e => e.name));
            
            // 各日付と従業員の組み合わせでYマークをチェック
            dates.forEach(({ col, fullDate }) => {
                employees.forEach(({ name, row }) => {
                    const cellAddress = XLSX.utils.encode_cell({ r: row - 1, c: col }); // 0-indexed
                    const cell = worksheet[cellAddress];
                    
                    if (cell && cell.v && String(cell.v).trim().toUpperCase() === 'Y') {
                        if (!parsedData[fullDate]) {
                            parsedData[fullDate] = [];
                        }
                        
                        parsedData[fullDate].push({
                            name: name,
                            shift: 'Y' // シンプルにYマークを記録
                        });
                        
                        console.log(`シフト発見: ${fullDate} - ${name}`);
                    }
                });
            });
            
        } catch (sheetError) {
            console.error(`シート「${sheetName}」の処理エラー:`, sheetError);
        }
    });
    
    console.log('全シート解析完了:', parsedData);
    
    if (Object.keys(parsedData).length === 0) {
        throw new Error('有効なシフトデータが見つかりませんでした。A1セルに「YYYY年M月」形式、B3行に日付、A5行から従業員名、該当セルに「Y」マークがあることを確認してください。');
    }
    
    return parsedData;
}

// データベース連携機能
async function saveShiftDataToDatabase(shiftData) {
    try {
        // 日付別シフトデータを月別に整理
        const monthlyShifts = organizeShiftsByMonth(shiftData);
        
        console.log('月別シフトデータ:', monthlyShifts);
        
        // データベースに保存
        const response = await fetch(`${API_BASE_URL}/shifts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                shifts: monthlyShifts
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('シフトデータをデータベースに保存しました:', result);
            return true;
        } else {
            throw new Error(result.error || 'データベース保存に失敗しました');
        }
        
    } catch (error) {
        console.error('データベース保存エラー:', error);
        
        // APIエラーの場合は警告を表示するが、ローカル処理は続行
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
            console.warn('APIサーバーに接続できませんが、ローカルデータは保存されました');
            showShiftSuccess('シフトデータを読み込みました（ローカル保存のみ）');
            return false;
        } else {
            throw error; // その他のエラーは再スロー
        }
    }
}

async function loadShiftDataFromDatabase() {
    try {
        const response = await fetch(`${API_BASE_URL}/shifts`);
        const result = await response.json();
        
        if (result.success && result.shifts) {
            // 月別データを日別データに変換
            const dailyShifts = convertMonthlyToDaily(result.shifts);
            
            if (Object.keys(dailyShifts).length > 0) {
                shiftData = dailyShifts;
                shiftFileUploaded = true;
                
                console.log('データベースからシフトデータを読み込みました:', shiftData);
                
                // ローカルストレージにも保存
                localStorage.setItem('shiftData', JSON.stringify(shiftData));
                
                return true;
            }
        }
        
        return false;
        
    } catch (error) {
        console.error('データベース読み込みエラー:', error);
        return false;
    }
}

// 日付別シフトデータを月別に整理（データベース保存用）
function organizeShiftsByMonth(dailyShiftData) {
    const monthlyShifts = {};
    
    Object.keys(dailyShiftData).forEach(dateString => {
        const employees = dailyShiftData[dateString];
        
        // 日付から年月を抽出（YYYY-MM-DD → YYYY-MM）
        const yearMonth = dateString.substring(0, 7);
        
        // 日を抽出（YYYY-MM-DD → DD）
        const day = dateString.substring(8, 10);
        
        if (!monthlyShifts[yearMonth]) {
            monthlyShifts[yearMonth] = {};
        }
        
        // その日の従業員名を結合（複数人いる場合は最初の人のみ、または全員）
        if (employees && employees.length > 0) {
            // 複数の従業員がいる場合は名前を結合
            const employeeNames = employees.map(emp => emp.name).join('、');
            monthlyShifts[yearMonth][day] = employeeNames;
        }
    });
    
    return monthlyShifts;
}

// 月別データを日別データに変換（データベース読み込み用）
function convertMonthlyToDaily(monthlyData) {
    const dailyShifts = {};
    
    Object.keys(monthlyData).forEach(yearMonth => {
        const monthData = monthlyData[yearMonth];
        
        Object.keys(monthData).forEach(day => {
            const employeeNames = monthData[day];
            const fullDate = `${yearMonth}-${String(day).padStart(2, '0')}`;
            
            if (employeeNames) {
                // 複数の従業員名が「、」で区切られている場合は分割
                const names = employeeNames.split('、').map(name => name.trim());
                
                dailyShifts[fullDate] = names.map(name => ({
                    name: name,
                    shift: 'Y'
                }));
            }
        });
    });
    
    return dailyShifts;
}

async function clearShiftDataFromDatabase() {
    try {
        const response = await fetch(`${API_BASE_URL}/shifts/clear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('データベースのシフトデータをクリアしました:', result);
            return true;
        } else {
            throw new Error(result.error || 'データベースクリアに失敗しました');
        }
        
    } catch (error) {
        console.error('データベースクリアエラー:', error);
        
        // APIエラーの場合は警告を表示
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
            console.warn('APIサーバーに接続できませんが、ローカルデータはクリアされました');
            return false;
        } else {
            throw error;
        }
    }
}

// シフトデータをクリア
function clearShiftData() {
    if (confirm('シフト表データをクリアしますか？データベースからも削除されます。')) {
        // データベースからクリア
        clearShiftDataFromDatabase().then(() => {
            // ローカルデータもクリア
            shiftData = {};
            shiftFileUploaded = false;
            
            // ローカルストレージからも削除
            localStorage.removeItem('shiftData');
            localStorage.removeItem('shiftFileName');
            
            // UI更新
            updateShiftStatus();
            hideShiftPreview();
            
            // ファイル入力をリセット
            if (shiftFileInput) {
                shiftFileInput.value = '';
            }
            
            // カレンダーを再描画
            if (typeof renderCalendar === 'function') {
                renderCalendar();
            }
            
            showShiftSuccess('シフト表データをクリアしました。');
        }).catch(error => {
            console.error('データベースクリア中にエラーが発生しましたが、ローカルデータはクリアされました:', error);
            
            // ローカルデータはクリア
            shiftData = {};
            shiftFileUploaded = false;
            localStorage.removeItem('shiftData');
            localStorage.removeItem('shiftFileName');
            
            updateShiftStatus();
            hideShiftPreview();
            
            if (shiftFileInput) {
                shiftFileInput.value = '';
            }
            
            if (typeof renderCalendar === 'function') {
                renderCalendar();
            }
            
            showShiftSuccess('ローカルシフト表データをクリアしました。');
        });
    }
}

// シフト状態を更新
function updateShiftStatus() {
    const shiftClearBtn = document.getElementById('shift-clear-btn');
    
    if (shiftFileUploaded && Object.keys(shiftData).length > 0) {
        const fileName = localStorage.getItem('shiftFileName') || 'unknown.xlsx';
        showShiftSuccess(`シフト表「${fileName}」が読み込まれています。`);
        
        if (shiftClearBtn) {
            shiftClearBtn.style.display = 'inline-block';
        }
    } else {
        showShiftStatus('シフト表がアップロードされていません。', 'info');
        
        if (shiftClearBtn) {
            shiftClearBtn.style.display = 'none';
        }
    }
}

// シフトプレビューを表示
function showShiftPreview() {
    const previewDiv = document.getElementById('shift-preview');
    if (!previewDiv) return;

    const dateKeys = Object.keys(shiftData).sort();
    if (dateKeys.length === 0) {
        hideShiftPreview();
        return;
    }

    // 最初の数日分のプレビューを生成
    const previewDates = dateKeys.slice(0, 7);
    
    const previewHTML = previewDates.map(date => {
        const employees = shiftData[date] || [];
        const employeeList = employees.map(emp => `${emp.name}(${emp.shift})`).join(', ');
        
        return `
            <div class="shift-preview-item">
                <strong>${formatDateForDisplay(date)}:</strong> ${employeeList || '未設定'}
            </div>
        `;
    }).join('');

    previewDiv.innerHTML = `
        <h4>シフトプレビュー（最初の7日分）</h4>
        ${previewHTML}
        ${dateKeys.length > 7 ? `<div class="shift-preview-more">...他 ${dateKeys.length - 7} 日分</div>` : ''}
    `;
    
    previewDiv.style.display = 'block';
}

// シフトプレビューを非表示
function hideShiftPreview() {
    const previewDiv = document.getElementById('shift-preview');
    if (previewDiv) {
        previewDiv.style.display = 'none';
    }
}

// 日付を表示用にフォーマット
function formatDateForDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    
    return `${month}/${day}(${weekday})`;
}

// 特定の日のシフト情報を取得
function getShiftForDate(dateString) {
    return shiftData[dateString] || [];
}

// シフトメッセージ表示関数
function showShiftStatus(message, type) {
    if (!shiftStatusDiv) return;
    
    shiftStatusDiv.className = `shift-status ${type}`;
    shiftStatusDiv.textContent = message;
    shiftStatusDiv.style.display = 'block';
}

function showShiftSuccess(message) {
    showShiftStatus(message, 'success');
}

function showShiftError(message) {
    showShiftStatus(message, 'error');
}

// 初期化時にローカルストレージからデータを読み込み
function loadShiftDataFromStorage() {
    try {
        const savedShiftData = localStorage.getItem('shiftData');
        if (savedShiftData) {
            shiftData = JSON.parse(savedShiftData);
            shiftFileUploaded = Object.keys(shiftData).length > 0;
            console.log('ローカルストレージからシフトデータを読み込みました:', shiftData);
        }
    } catch (error) {
        console.error('シフトデータの読み込みエラー:', error);
        localStorage.removeItem('shiftData');
        localStorage.removeItem('shiftFileName');
    }
}

// DOMContentLoaded時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // ローカルストレージからデータを読み込み
    loadShiftDataFromStorage();
    
    // シフト管理機能を初期化
    setTimeout(() => {
        initializeShiftManagement();
    }, 500);
});

// グローバル関数として公開
window.getShiftForDate = getShiftForDate;
window.initializeShiftManagement = initializeShiftManagement;

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

// タブ切り替え時にもシフト管理UIを確認
document.addEventListener('click', function(e) {
    if (e.target && e.target.getAttribute('data-tab') === 'calendar') {
        setTimeout(() => {
            if (!document.getElementById('shift-management-ui')) {
                console.log('カレンダータブ選択時にシフト管理UIを作成');
                createShiftUploadInterface();
                updateShiftStatus();
            }
        }, 200);
    }
});

// グローバル関数として公開
window.getShiftForDate = getShiftForDate;
window.initializeShiftManagement = initializeShiftManagement;
window.createShiftUploadInterface = createShiftUploadInterface;// シフト表管理機能

// グローバル変数
let shiftData = {};
let shiftFileUploaded = false;

// DOM要素
let shiftFileInput = null;
let shiftUploadBtn = null;
let shiftStatusDiv = null;

// シフト管理機能の初期化
function initializeShiftManagement() {
    // 設定タブが存在するかチェック
    const settingsTab = document.getElementById('settings-tab');
    if (!settingsTab) {
        console.warn('設定タブが見つかりません');
        return;
    }
    
    // シフト管理UIを設定タブに設定（HTMLに直接記載されているため、イベントリスナーのみ設定）
    setupShiftEventListeners();
    
    // 設定タブが表示されたときにシフト状態を更新
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (settingsTab.classList.contains('active')) {
                    setTimeout(() => {
                        setupShiftEventListeners();
                        updateShiftStatus();
                    }, 100);
                }
            }
        });
    });
    observer.observe(settingsTab, { attributes: true });
}

// シフト管理のイベントリスナーを設定
function setupShiftEventListeners() {
    // 要素を取得
    shiftFileInput = document.getElementById('shift-file-input');
    shiftUploadBtn = document.getElementById('shift-upload-btn');
    const shiftClearBtn = document.getElementById('shift-clear-btn');
    shiftStatusDiv = document.getElementById('shift-status');

    // 既存のイベントリスナーを削除（重複防止）
    if (shiftUploadBtn) {
        shiftUploadBtn.replaceWith(shiftUploadBtn.cloneNode(true));
        shiftUploadBtn = document.getElementById('shift-upload-btn');
    }
    
    if (shiftFileInput) {
        shiftFileInput.replaceWith(shiftFileInput.cloneNode(true));
        shiftFileInput = document.getElementById('shift-file-input');
    }

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
        shiftClearBtn.replaceWith(shiftClearBtn.cloneNode(true));
        const newShiftClearBtn = document.getElementById('shift-clear-btn');
        if (newShiftClearBtn) {
            newShiftClearBtn.addEventListener('click', clearShiftData);
        }
    }

    console.log('シフト管理イベントリスナーを設定しました');
}

// シフトアップロード用のUIを作成
function createShiftUploadInterface() {
    // カレンダータブ内のsectionを探す
    const calendarSection = document.querySelector('#calendar-tab .section');
    if (!calendarSection) {
        console.warn('カレンダーセクションが見つかりません');
        return;
    }

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
            <div class="shift-format-info" style="margin-top: 15px; padding: 10px; background-color: #4a4a4a; border-radius: 6px; border: 1px solid #555;">
                <h4 style="color: #17a2b8; margin-bottom: 8px; font-size: 14px;">📝 Excelファイル形式</h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #ccc;">
                    <li>A1セル: 「YYYY年M月」形式（例：2025年7月）</li>
                    <li>B3行から: 日付（1,2,3...31）</li>
                    <li>A5行から: 従業員名</li>
                    <li>該当セルに「Y」で出勤マーク</li>
                </ul>
            </div>
        </div>
    `;

    // h2タグの後、calendar-controlsの前に挿入
    const h2Element = calendarSection.querySelector('h2');
    const calendarControls = calendarSection.querySelector('.calendar-controls');
    
    if (h2Element && calendarControls) {
        calendarSection.insertBefore(shiftUI, calendarControls);
    } else if (h2Element) {
        // calendar-controlsが見つからない場合はh2の後に挿入
        h2Element.parentNode.insertBefore(shiftUI, h2Element.nextSibling);
    } else {
        // どちらも見つからない場合は最初に挿入
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
    
    console.log('シフト管理UIを作成しました');
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
        
        // SheetJSが利用可能かチェック
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX ライブラリが読み込まれていません。ページをリロードしてください。');
        }
        
        const workbook = XLSX.read(arrayBuffer, {
            cellStyles: true,
            cellFormulas: true,
            cellDates: true,
            cellNF: true,
            sheetStubs: true
        });

        console.log('Excelファイル読み込み成功. シート数:', workbook.SheetNames.length);
        console.log('シート名:', workbook.SheetNames);

        // シフトデータを解析
        const parsedShiftData = parseShiftExcel(workbook);
        
        if (Object.keys(parsedShiftData).length === 0) {
            throw new Error('有効なシフトデータが見つかりませんでした。ファイル形式を確認してください。');
        }

        // グローバル変数に保存
        if (typeof window !== 'undefined') {
            window.shiftData = parsedShiftData;
        }
        
        // ローカル変数にも保存
        if (typeof shiftData !== 'undefined') {
            shiftData = parsedShiftData;
        }
        
        shiftFileUploaded = true;

        // データベースに保存（エラーが発生しても続行）
        try {
            await saveShiftDataToDatabase(parsedShiftData);
        } catch (dbError) {
            console.warn('データベース保存に失敗しましたが、ローカルデータは利用可能です:', dbError);
        }

        // ローカルストレージに保存
        localStorage.setItem('shiftData', JSON.stringify(parsedShiftData));
        localStorage.setItem('shiftFileName', file.name);

        showShiftSuccess(`シフト表「${file.name}」を読み込みました。`);
        showShiftPreview();
        
        // カレンダーを再描画
        if (typeof renderCalendar === 'function') {
            setTimeout(() => {
                renderCalendar();
            }, 100);
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
    
    if (workbook.SheetNames.length === 0) {
        throw new Error('Excelファイルにシートが見つかりません。');
    }
    
    // 各シートを処理
    workbook.SheetNames.forEach(sheetName => {
        try {
            console.log(`シート「${sheetName}」を処理中...`);
            
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet || !worksheet['!ref']) {
                console.warn(`シート「${sheetName}」が空または無効です`);
                return;
            }
            
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            console.log(`シート「${sheetName}」の範囲:`, range);
            
            // A1セルから年月情報を取得（複数形式対応）
            let yearMonth = null;
            const a1Cell = worksheet['A1'];
            if (a1Cell && (a1Cell.v !== null && a1Cell.v !== undefined)) {
                console.log('A1セルの値:', a1Cell.v, 'タイプ:', typeof a1Cell.v);
                
                // 数値（Excelの日付）の場合
                if (typeof a1Cell.v === 'number') {
                    try {
                        // ExcelのシリアルナンバーをJavaScriptの日付に変換
                        const excelDate = XLSX.SSF.parse_date_code(a1Cell.v);
                        if (excelDate) {
                            const year = excelDate.y;
                            const month = String(excelDate.m).padStart(2, '0');
                            yearMonth = `${year}-${month}`;
                            console.log(`A1セル（数値）から年月情報: ${yearMonth}`);
                        }
                    } catch (dateParseError) {
                        console.warn('A1セルの日付解析エラー:', dateParseError);
                    }
                }
                
                // 文字列の場合
                if (!yearMonth && typeof a1Cell.v === 'string') {
                    const yearMonthMatch = String(a1Cell.v).match(/(\d{4})年(\d{1,2})月/);
                    if (yearMonthMatch) {
                        const year = yearMonthMatch[1];
                        const month = String(parseInt(yearMonthMatch[2])).padStart(2, '0');
                        yearMonth = `${year}-${month}`;
                        console.log(`A1セル（文字列）から年月情報: ${yearMonth}`);
                    }
                }
                
                // 日付形式（YYYY/M/D など）の場合
                if (!yearMonth) {
                    const dateMatch = String(a1Cell.v).match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})?/);
                    if (dateMatch) {
                        const year = dateMatch[1];
                        const month = String(parseInt(dateMatch[2])).padStart(2, '0');
                        yearMonth = `${year}-${month}`;
                        console.log(`A1セル（日付形式）から年月情報: ${yearMonth}`);
                    }
                }
                
                // セルが日付型として認識されている場合
                if (!yearMonth && a1Cell.t === 'd') {
                    try {
                        const dateObj = new Date(a1Cell.v);
                        if (!isNaN(dateObj.getTime())) {
                            const year = dateObj.getFullYear();
                            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                            yearMonth = `${year}-${month}`;
                            console.log(`A1セル（日付型）から年月情報: ${yearMonth}`);
                        }
                    } catch (dateError) {
                        console.warn('A1セルの日付変換エラー:', dateError);
                    }
                }
                
                console.log(`最終的な年月情報: ${yearMonth}`);
            } else {
                console.warn(`シート「${sheetName}」: A1セルが空または無効です`);
            }
            
            if (!yearMonth) {
                console.warn(`シート「${sheetName}」をスキップします（年月情報なし）`);
                return;
            }
            
            // B3行から日付を読み取り（複数形式対応）
            const dateRow = 2; // B3行 (0-indexed で2)
            const dates = [];
            
            for (let col = 1; col < range.e.c + 1; col++) { // B列(1)から開始
                const cellAddress = XLSX.utils.encode_cell({ r: dateRow, c: col });
                const cell = worksheet[cellAddress];
                
                if (cell && (cell.v !== null && cell.v !== undefined)) {
                    let day = null;
                    
                    console.log(`${cellAddress}:`, cell.v, 'タイプ:', typeof cell.v);
                    
                    // 数値の場合（日付として）
                    if (typeof cell.v === 'number') {
                        // シンプルな数値（1-31）の場合
                        if (cell.v >= 1 && cell.v <= 31 && Number.isInteger(cell.v)) {
                            day = cell.v;
                        }
                        // Excelのシリアルナンバーの場合
                        else if (cell.v > 40000) { // Excel日付の範囲
                            try {
                                const excelDate = XLSX.SSF.parse_date_code(cell.v);
                                if (excelDate) {
                                    day = excelDate.d;
                                }
                            } catch (dateParseError) {
                                console.warn(`${cellAddress}の日付解析エラー:`, dateParseError);
                            }
                        }
                    }
                    
                    // 文字列の場合
                    if (day === null && typeof cell.v === 'string') {
                        const dayMatch = String(cell.v).match(/^(\d{1,2})/);
                        if (dayMatch) {
                            const parsedDay = parseInt(dayMatch[1]);
                            if (parsedDay >= 1 && parsedDay <= 31) {
                                day = parsedDay;
                            }
                        }
                    }
                    
                    // 有効な日付が見つかった場合
                    if (day !== null && day >= 1 && day <= 31) {
                        const dayStr = String(day).padStart(2, '0');
                        const fullDate = `${yearMonth}-${dayStr}`;
                        dates.push({ col, day, fullDate });
                        console.log(`日付発見: ${cellAddress} = ${cell.v} → ${day} → ${fullDate}`);
                    } else {
                        console.log(`${cellAddress}: 有効な日付ではありません (${cell.v})`);
                    }
                } else {
                    // セルが空の場合は日付列の終了とみなす
                    console.log(`${cellAddress}: 空のセル - 日付列終了`);
                    break;
                }
            }
            
            console.log(`シート「${sheetName}」の日付:`, dates.map(d => d.fullDate));
            
            if (dates.length === 0) {
                console.warn(`シート「${sheetName}」に有効な日付が見つかりません`);
                return;
            }
            
            // A5行から従業員名を読み取り（row=4, 0-indexed）
            let employees = [];
            let currentRow = 4; // A5行 (0-indexed で4)
            
            while (currentRow <= range.e.r) {
                const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: 0 }); // A列(0)
                const cell = worksheet[cellAddress];
                
                if (cell && cell.v !== null && cell.v !== undefined) {
                    const cellValue = String(cell.v).trim();
                    console.log(`${cellAddress}: "${cellValue}"`);
                    
                    // 「スケジュールなど」が見つかったら終了
                    if (cellValue.includes('スケジュール') || cellValue.includes('予定')) {
                        console.log(`従業員リスト終了マーカー発見: ${cellValue}`);
                        break;
                    }
                    
                    // 空でない値は従業員名として扱う
                    if (cellValue && cellValue.length > 0) {
                        employees.push({ name: cellValue, row: currentRow + 1 }); // 1-indexed
                        console.log(`従業員追加: ${cellValue} (行${currentRow + 1})`);
                    }
                }
                
                currentRow++;
            }
            
            console.log(`シート「${sheetName}」の従業員:`, employees.map(e => e.name));
            
            if (employees.length === 0) {
                console.warn(`シート「${sheetName}」に従業員が見つかりません`);
                return;
            }
            
            // 各日付と従業員の組み合わせでYマークをチェック
            dates.forEach(({ col, fullDate }) => {
                employees.forEach(({ name, row }) => {
                    const cellAddress = XLSX.utils.encode_cell({ r: row - 1, c: col }); // 0-indexed
                    const cell = worksheet[cellAddress];
                    
                    if (cell && cell.v !== null && cell.v !== undefined) {
                        const cellValue = String(cell.v).trim().toUpperCase();
                        if (cellValue === 'Y') {
                            if (!parsedData[fullDate]) {
                                parsedData[fullDate] = [];
                            }
                            
                            parsedData[fullDate].push({
                                name: name,
                                shift: 'Y'
                            });
                            
                            console.log(`シフト発見: ${fullDate} - ${name} (${cellAddress})`);
                        }
                    }
                });
            });
            
        } catch (sheetError) {
            console.error(`シート「${sheetName}」の処理エラー:`, sheetError);
        }
    });
    
    console.log('全シート解析完了:', parsedData);
    
    if (Object.keys(parsedData).length === 0) {
        throw new Error('有効なシフトデータが見つかりませんでした。\n\n確認事項:\n• A1セルに「YYYY年M月」形式で年月を入力\n• B3行に日付（1,2,3...）を入力\n• A5行から従業員名を入力\n• 該当セルに「Y」マークを入力');
    }
    
    return parsedData;
}ない値は従業員名として扱う
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
        
        // API_BASE_URLが定義されているかチェック
        if (typeof API_BASE_URL === 'undefined') {
            console.warn('API_BASE_URL が定義されていません');
            return false;
        }
        
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
        if (error.message.includes('fetch') || 
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            typeof API_BASE_URL === 'undefined') {
            console.warn('APIサーバーに接続できませんが、ローカルデータは保存されました');
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

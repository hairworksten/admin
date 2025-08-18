// シフト表管理機能 - 修正版（paste.txtの動作コードを参考）

// グローバル変数
let shiftData = {};
let shiftFileUploaded = false;

// DOM要素
let shiftFileInput = null;
let shiftUploadBtn = null;
let shiftStatusDiv = null;

// デバッグ用ログ関数
function debugLog(message) {
    console.log(`[シフト管理] ${message}`);
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    debugLog('DOMContentLoaded - 初期化開始');
    initializeShiftManagement();
});

function initializeShiftManagement() {
    debugLog('initializeShiftManagement() 開始');
    
    // DOM要素を取得
    shiftFileInput = document.getElementById('shift-file-input');
    shiftUploadBtn = document.getElementById('shift-upload-btn');
    const shiftClearBtn = document.getElementById('shift-clear-btn');
    shiftStatusDiv = document.getElementById('shift-status');
    
    debugLog(`DOM要素取得: 
        fileInput: ${shiftFileInput ? 'OK' : 'NG'}
        uploadBtn: ${shiftUploadBtn ? 'OK' : 'NG'}
        clearBtn: ${shiftClearBtn ? 'OK' : 'NG'}
        statusDiv: ${shiftStatusDiv ? 'OK' : 'NG'}`);
    
    // イベントリスナー設定
    if (shiftUploadBtn) {
        // 既存のイベントリスナーを削除してから新しいものを追加
        shiftUploadBtn.replaceWith(shiftUploadBtn.cloneNode(true));
        shiftUploadBtn = document.getElementById('shift-upload-btn');
        
        shiftUploadBtn.addEventListener('click', function() {
            debugLog('アップロードボタンがクリックされました');
            if (shiftFileInput) {
                debugLog('ファイル入力ダイアログを開きます');
                shiftFileInput.click();
            } else {
                debugLog('エラー: ファイル入力要素が見つかりません');
            }
        });
        debugLog('アップロードボタンのイベントリスナーを設定');
    } else {
        debugLog('エラー: アップロードボタンが見つかりません');
    }
    
    if (shiftFileInput) {
        // 既存のイベントリスナーを削除してから新しいものを追加
        shiftFileInput.replaceWith(shiftFileInput.cloneNode(true));
        shiftFileInput = document.getElementById('shift-file-input');
        
        shiftFileInput.addEventListener('change', function(event) {
            debugLog('ファイルが選択されました');
            handleShiftFileUpload(event);
        });
        debugLog('ファイル入力のイベントリスナーを設定');
    } else {
        debugLog('エラー: ファイル入力要素が見つかりません');
    }
    
    if (shiftClearBtn) {
        // 既存のイベントリスナーを削除してから新しいものを追加
        shiftClearBtn.replaceWith(shiftClearBtn.cloneNode(true));
        const newShiftClearBtn = document.getElementById('shift-clear-btn');
        
        if (newShiftClearBtn) {
            newShiftClearBtn.addEventListener('click', function() {
                debugLog('クリアボタンがクリックされました');
                clearShiftData();
            });
            debugLog('クリアボタンのイベントリスナーを設定');
        }
    } else {
        debugLog('エラー: クリアボタンが見つかりません');
    }
    
    // ローカルストレージからデータを読み込み
    loadShiftDataFromStorage();
    
    // 初期状態を設定
    updateShiftStatus();
    debugLog('初期化完了');
}

// シフトファイルアップロード処理
async function handleShiftFileUpload(event) {
    debugLog('handleShiftFileUpload() 開始');
    
    const file = event.target.files[0];
    if (!file) {
        debugLog('ファイルが選択されていません');
        return;
    }
    
    debugLog(`選択されたファイル: ${file.name} (${file.size} bytes)`);
    
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        debugLog('ファイル形式エラー');
        showShiftError('Excelファイル（.xlsx, .xls）を選択してください。');
        return;
    }
    
    showShiftStatus('シフト表を読み込んでいます...', 'loading');
    debugLog('ファイル読み込み開始');
    
    try {
        // ファイルを読み込み
        const arrayBuffer = await file.arrayBuffer();
        debugLog(`ファイル読み込み完了: ${arrayBuffer.byteLength} bytes`);
        
        // SheetJSが利用可能かチェック
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX ライブラリが読み込まれていません。ページをリロードしてください。');
        }
        debugLog('XLSX ライブラリ確認: OK');
        
        const workbook = XLSX.read(arrayBuffer, {
            cellStyles: true,
            cellFormulas: true,
            cellDates: true,
            cellNF: true,
            sheetStubs: true
        });
        
        debugLog(`Excelファイル読み込み成功. シート数: ${workbook.SheetNames.length}`);
        debugLog(`シート名: ${workbook.SheetNames.join(', ')}`);
        
        // シフトデータを解析
        const parsedShiftData = parseShiftExcel(workbook);
        debugLog(`解析完了: ${Object.keys(parsedShiftData).length} 日分のデータ`);
        
        if (Object.keys(parsedShiftData).length === 0) {
            throw new Error('有効なシフトデータが見つかりませんでした。ファイル形式を確認してください。');
        }
        
        // データを保存
        shiftData = parsedShiftData;
        shiftFileUploaded = true;
        
        // グローバルに公開（カレンダーからアクセス可能にする）
        if (typeof window !== 'undefined') {
            window.shiftData = parsedShiftData;
        }
        
        debugLog('データをローカルに保存');
        localStorage.setItem('shiftData', JSON.stringify(parsedShiftData));
        localStorage.setItem('shiftFileName', file.name);
        
        // データベースに保存を試行
        try {
            await saveShiftDataToDatabase(parsedShiftData);
            debugLog('データベース保存完了');
        } catch (dbError) {
            debugLog(`データベース保存エラー（ローカルデータは保存済み）: ${dbError.message}`);
        }
        
        showShiftSuccess(`シフト表「${file.name}」を読み込みました。`);
        showShiftPreview();
        
        // カレンダーを再描画
        const calendarTab = document.getElementById('calendar-tab');
        if (calendarTab && calendarTab.classList.contains('active')) {
            if (typeof renderCalendar === 'function') {
                renderCalendar();
            }
        }
        
    } catch (error) {
        debugLog(`エラー: ${error.message}`);
        console.error('シフトファイル読み込みエラー:', error);
        showShiftError(`シフト表の読み込みに失敗しました: ${error.message}`);
        clearShiftData();
    }
}

// Excelシフト表を解析（paste.txtから移植）
function parseShiftExcel(workbook) {
    debugLog('parseShiftExcel() 開始');
    const parsedData = {};
    
    if (workbook.SheetNames.length === 0) {
        throw new Error('Excelファイルにシートが見つかりません。');
    }
    
    // 各シートを処理
    workbook.SheetNames.forEach(sheetName => {
        try {
            debugLog(`シート「${sheetName}」を処理中...`);
            
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet || !worksheet['!ref']) {
                debugLog(`シート「${sheetName}」が空または無効です`);
                return;
            }
            
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            debugLog(`シート「${sheetName}」の範囲: ${worksheet['!ref']}`);
            
            // A1セルから年月情報を取得（paste.txtの実装を使用）
            let yearMonth = null;
            const a1Cell = worksheet['A1'];
            if (a1Cell && (a1Cell.v !== null && a1Cell.v !== undefined)) {
                debugLog(`A1セルの値: ${a1Cell.v} (タイプ: ${typeof a1Cell.v})`);
                
                // Dateオブジェクトの場合
                if (a1Cell.v instanceof Date) {
                    const year = a1Cell.v.getFullYear();
                    const month = String(a1Cell.v.getMonth() + 1).padStart(2, '0');
                    yearMonth = `${year}-${month}`;
                    debugLog(`A1セル（Dateオブジェクト）から年月情報: ${yearMonth}`);
                }
                
                // 文字列の場合（例：2025年7月）
                if (!yearMonth && typeof a1Cell.v === 'string') {
                    const yearMonthMatch = String(a1Cell.v).match(/(\d{4})年(\d{1,2})月/);
                    if (yearMonthMatch) {
                        const year = yearMonthMatch[1];
                        const month = String(parseInt(yearMonthMatch[2])).padStart(2, '0');
                        yearMonth = `${year}-${month}`;
                        debugLog(`A1セル（文字列）から年月情報: ${yearMonth}`);
                    }
                    
                    // 日付形式文字列の場合
                    if (!yearMonth) {
                        const dateMatch = String(a1Cell.v).match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})?/);
                        if (dateMatch) {
                            const year = dateMatch[1];
                            const month = String(parseInt(dateMatch[2])).padStart(2, '0');
                            yearMonth = `${year}-${month}`;
                            debugLog(`A1セル（日付形式文字列）から年月情報: ${yearMonth}`);
                        }
                    }
                }
                
                // 数値の場合（Excelのシリアルナンバー）
                if (!yearMonth && typeof a1Cell.v === 'number') {
                    try {
                        const excelDate = XLSX.SSF.parse_date_code(a1Cell.v);
                        if (excelDate) {
                            const year = excelDate.y;
                            const month = String(excelDate.m).padStart(2, '0');
                            yearMonth = `${year}-${month}`;
                            debugLog(`A1セル（数値）から年月情報: ${yearMonth}`);
                        }
                    } catch (dateParseError) {
                        debugLog(`A1セルの日付解析エラー: ${dateParseError.message}`);
                    }
                }
            } else {
                debugLog(`シート「${sheetName}」: A1セルが空または無効です`);
            }
            
            if (!yearMonth) {
                debugLog(`シート「${sheetName}」をスキップします（年月情報なし）`);
                return;
            }
            
            // B3行から日付を読み取り（数式対応版）
            const dateRow = 2; // B3行 (0-indexed で2)
            const dates = [];
            
            for (let col = 1; col < range.e.c + 1; col++) { // B列(1)から開始
                const cellAddress = XLSX.utils.encode_cell({ r: dateRow, c: col });
                const cell = worksheet[cellAddress];
                
                if (cell) {
                    let day = null;
                    let cellValue = null;
                    
                    // 数式の場合は評価結果(.v)を使用、通常の値の場合もそのまま使用
                    if (cell.v !== null && cell.v !== undefined) {
                        cellValue = cell.v;
                    }
                    
                    debugLog(`${cellAddress}: 値=${cellValue} (型=${typeof cellValue}), 数式=${cell.f || 'なし'}`);
                    
                    // 値がない場合は終了
                    if (cellValue === null || cellValue === undefined || cellValue === '') {
                        debugLog(`${cellAddress}: 空のセル - 日付列終了`);
                        break;
                    }
                    
                    // Dateオブジェクトから日付を抽出
                    if (day === null && cellValue instanceof Date) {
                        day = cellValue.getDate();
                        debugLog(`${cellAddress}: Dateオブジェクトから日付抽出 ${cellValue} → ${day}`);
                    }
                    
                    // 文字列の場合
                    if (day === null && typeof cellValue === 'string') {
                        const dayMatch = String(cellValue).match(/^(\d{1,2})/);
                        if (dayMatch) {
                            const parsedDay = parseInt(dayMatch[1]);
                            if (parsedDay >= 1 && parsedDay <= 31) {
                                day = parsedDay;
                                debugLog(`${cellAddress}: 文字列日付 "${cellValue}" → ${day}`);
                            }
                        }
                    }
                    
                    // 数値の場合
                    if (day === null && typeof cellValue === 'number') {
                        if (cellValue >= 1 && cellValue <= 31 && Number.isInteger(cellValue)) {
                            day = cellValue;
                            debugLog(`${cellAddress}: 数値日付 ${cellValue} → ${day}`);
                        } else if (cellValue > 40000) { // Excelの日付シリアル値
                            try {
                                const excelDate = XLSX.SSF.parse_date_code(cellValue);
                                if (excelDate) {
                                    day = excelDate.d;
                                    debugLog(`${cellAddress}: Excelシリアル値 ${cellValue} → ${day}`);
                                }
                            } catch (dateParseError) {
                                debugLog(`${cellAddress}: 日付解析エラー ${dateParseError.message}`);
                            }
                        }
                    }
                    
                    // 有効な日付が見つかった場合
                    if (day !== null && day >= 1 && day <= 31) {
                        const dayStr = String(day).padStart(2, '0');
                        const fullDate = `${yearMonth}-${dayStr}`;
                        dates.push({ col, day, fullDate });
                        debugLog(`✓ 日付確定: ${cellAddress} = ${cellValue} → ${day} → ${fullDate}`);
                    } else {
                        debugLog(`${cellAddress}: 有効な日付ではありません (${cellValue})`);
                        // 連続する無効な値が3つ以上続いたら終了
                        if (col > 3) {
                            let consecutiveEmpty = 0;
                            for (let checkCol = col; checkCol >= col - 2; checkCol--) {
                                const checkAddress = XLSX.utils.encode_cell({ r: dateRow, c: checkCol });
                                const checkCell = worksheet[checkAddress];
                                if (!checkCell || checkCell.v === null || checkCell.v === undefined || checkCell.v === '') {
                                    consecutiveEmpty++;
                                }
                            }
                            if (consecutiveEmpty >= 3) {
                                debugLog(`連続する空セルを検出 - 日付列終了`);
                                break;
                            }
                        }
                    }
                } else {
                    debugLog(`${cellAddress}: セルが存在しません - 日付列終了`);
                    break;
                }
            }
            
            debugLog(`シート「${sheetName}」の日付: ${dates.length}個`);
            
            if (dates.length === 0) {
                debugLog(`シート「${sheetName}」に有効な日付が見つかりません`);
                return;
            }
            
            // A5行から従業員名を読み取り
            let employees = [];
            let currentRow = 4; // A5行 (0-indexed で4)
            
            while (currentRow <= range.e.r) {
                const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
                const cell = worksheet[cellAddress];
                
                if (cell && cell.v !== null && cell.v !== undefined) {
                    const cellValue = String(cell.v).trim();
                    
                    // 「スケジュール」などが見つかったら終了
                    if (cellValue.includes('スケジュール') || cellValue.includes('予定')) {
                        debugLog(`従業員リスト終了マーカー発見: ${cellValue}`);
                        break;
                    }
                    
                    if (cellValue && cellValue.length > 0) {
                        employees.push({ name: cellValue, row: currentRow + 1 });
                        debugLog(`従業員追加: ${cellValue} (行${currentRow + 1})`);
                    }
                }
                
                currentRow++;
            }
            
            debugLog(`シート「${sheetName}」の従業員: ${employees.length}人`);
            
            if (employees.length === 0) {
                debugLog(`シート「${sheetName}」に従業員が見つかりません`);
                return;
            }
            
            // 各日付と従業員の組み合わせでYマークをチェック（数式対応版）
            dates.forEach(({ col, fullDate }) => {
                employees.forEach(({ name, row }) => {
                    const cellAddress = XLSX.utils.encode_cell({ r: row - 1, c: col });
                    const cell = worksheet[cellAddress];
                    
                    if (cell) {
                        let cellValue = null;
                        
                        // 数式の場合は評価結果(.v)を使用
                        if (cell.v !== null && cell.v !== undefined) {
                            cellValue = cell.v;
                        }
                        
                        // セルに値がある場合のみチェック
                        if (cellValue !== null && cellValue !== undefined) {
                            const normalizedValue = String(cellValue).trim().toUpperCase();
                            
                            if (normalizedValue === 'Y') {
                                if (!parsedData[fullDate]) {
                                    parsedData[fullDate] = [];
                                }
                                
                                parsedData[fullDate].push({
                                    name: name,
                                    shift: 'Y'
                                });
                                
                                debugLog(`✓ シフト発見: ${fullDate} - ${name} (${cellAddress}) 値=${cellValue} 数式=${cell.f || 'なし'}`);
                            } else if (normalizedValue !== '') {
                                // Y以外の値がある場合はデバッグログに記録
                                debugLog(`${cellAddress}: Y以外の値 "${normalizedValue}" (${name}, ${fullDate})`);
                            }
                        }
                    }
                });
            });
            
        } catch (sheetError) {
            debugLog(`シート「${sheetName}」の処理エラー: ${sheetError.message}`);
        }
    });
    
    debugLog(`全シート解析完了: ${Object.keys(parsedData).length}日分のデータ`);
    
    if (Object.keys(parsedData).length === 0) {
        throw new Error('有効なシフトデータが見つかりませんでした。\n\n確認事項:\n• A1セルに「YYYY年M月」形式で年月を入力\n• B3行に日付（1,2,3...）を入力\n• A5行から従業員名を入力\n• 該当セルに「Y」マークを入力');
    }
    
    return parsedData;
}

// データベース保存機能
async function saveShiftDataToDatabase(shiftData) {
    try {
        // API_BASE_URLが定義されていない場合はスキップ
        if (typeof API_BASE_URL === 'undefined') {
            debugLog('API_BASE_URL が定義されていません - データベース保存をスキップ');
            return false;
        }
        
        // 日付別シフトデータを月別に整理
        const monthlyShifts = organizeShiftsByMonth(shiftData);
        
        debugLog('月別シフトデータをデータベースに保存中...');
        
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
            debugLog('シフトデータをデータベースに保存しました');
            return true;
        } else {
            throw new Error(result.error || 'データベース保存に失敗しました');
        }
        
    } catch (error) {
        debugLog(`データベース保存エラー: ${error.message}`);
        
        // ネットワークエラーの場合は警告のみ（ローカル処理は続行）
        if (error.message.includes('fetch') || 
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')) {
            debugLog('APIサーバーに接続できませんが、ローカルデータは保存されました');
            return false;
        }
        
        throw error;
    }
}

// 日付別シフトデータを月別に整理
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
        
        // その日の従業員名を結合
        if (employees && employees.length > 0) {
            const employeeNames = employees.map(emp => emp.name).join('、');
            monthlyShifts[yearMonth][day] = employeeNames;
        }
    });
    
    return monthlyShifts;
}

// ローカルストレージからデータを読み込み
function loadShiftDataFromStorage() {
    try {
        const savedShiftData = localStorage.getItem('shiftData');
        if (savedShiftData) {
            shiftData = JSON.parse(savedShiftData);
            shiftFileUploaded = Object.keys(shiftData).length > 0;
            
            // グローバルに公開
            if (typeof window !== 'undefined') {
                window.shiftData = shiftData;
            }
            
            debugLog('ローカルストレージからシフトデータを読み込みました');
        }
    } catch (error) {
        debugLog(`シフトデータの読み込みエラー: ${error.message}`);
        localStorage.removeItem('shiftData');
        localStorage.removeItem('shiftFileName');
    }
}

// シフトデータをクリア
function clearShiftData() {
    if (confirm('シフト表データをクリアしますか？')) {
        debugLog('シフトデータをクリア');
        
        shiftData = {};
        shiftFileUploaded = false;
        
        // グローバルデータもクリア
        if (typeof window !== 'undefined') {
            window.shiftData = {};
        }
        
        localStorage.removeItem('shiftData');
        localStorage.removeItem('shiftFileName');
        
        updateShiftStatus();
        hideShiftPreview();
        
        if (shiftFileInput) {
            shiftFileInput.value = '';
        }
        
        // カレンダーを再描画
        if (typeof renderCalendar === 'function') {
            renderCalendar();
        }
        
        showShiftSuccess('シフト表データをクリアしました。');
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
        ${dateKeys.length > 7 ? `<div style="color: #888; text-align: center; padding: 8px;">...他 ${dateKeys.length - 7} 日分</div>` : ''}
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

// 特定の日のシフト情報を取得（カレンダーから呼び出される）
function getShiftForDate(dateString) {
    return shiftData[dateString] || [];
}

// シフトメッセージ表示関数
function showShiftStatus(message, type) {
    if (!shiftStatusDiv) return;
    
    shiftStatusDiv.className = `shift-status ${type}`;
    shiftStatusDiv.textContent = message;
    shiftStatusDiv.style.display = 'block';
    
    debugLog(`ステータス表示: [${type}] ${message}`);
}

function showShiftSuccess(message) {
    showShiftStatus(message, 'success');
}

function showShiftError(message) {
    showShiftStatus(message, 'error');
}

// グローバル関数として公開
window.getShiftForDate = getShiftForDate;
window.initializeShiftManagement = initializeShiftManagement;

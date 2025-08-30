// 予約追加処理（ネットワークエラー対策版）
async function handleAddReservation() {
    // ブラウザの標準検証を無効化（管理者権限）
    const form = addReservationModal.querySelector('form');
    if (form) {
        form.noValidate = true;
    }
    
    // フォームの値を取得
    const date = addReservationDateInput ? addReservationDateInput.value : '';
    const name = addReservationNameInput ? addReservationNameInput.value.trim() : '';
    const phone = addReservationPhoneInput ? addReservationPhoneInput.value.trim() : '';
    const email = addReservationEmailInput ? addReservationEmailInput.value.trim() : '';
    const menuName = addReservationMenuSelect ? addReservationMenuSelect.value : '';
    
    console.log('フォーム値確認:', {
        date: date,
        name: name,
        phone: phone,
        email: email,
        menuName: menuName,
        selectedTimeSlot: selectedTimeSlot
    });
    
    // バリデーション
    if (!date || !name || !menuName || !selectedTimeSlot) {
        alert('必須項目をすべて入力してください。\n（電話番号・メールアドレスは任意です）');
        return;
    }
    
    // 日付形式チェック
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
        alert('日付の形式が正しくありません（YYYY-MM-DD形式で入力してください）');
        return;
    }
    
    // 電話番号とメールアドレスのバリデーション
    if (phone && !validatePhoneNumber(phone)) {
        alert('正しい電話番号を入力してください。\n（例：090-1234-5678 または 09012345678）');
        return;
    }
    
    if (!validateEmail(email)) {
        alert('正しいメールアドレスを入力してください。');
        return;
    }
    
    // 選択されたメニューの詳細を取得
    const selectedMenu = currentMenus[menuName];
    if (!selectedMenu) {
        alert('選択されたメニューが見つかりません。');
        return;
    }
    
    // 送信ボタンを無効化
    if (submitAddReservationBtn) {
        submitAddReservationBtn.disabled = true;
        submitAddReservationBtn.textContent = '予約追加中...';
    }
    
    try {
        const reservationNumber = generateReservationNumber();
        
        // メール欄と電話番号欄の設定
        let mailField = email || '管理者追加';
        let phoneField = phone || '管理者追加';
        
        if (forceAddMode && isCustomTime) {
            if (!email) mailField = '管理者強制追加（カスタム時間）';
            if (!phone) phoneField = '管理者強制追加（カスタム時間・重複）';
        } else if (forceAddMode) {
            if (!email) mailField = '管理者強制追加（重複時間）';
            if (!phone) phoneField = '管理者強制追加（重複時間）';
        } else if (isCustomTime) {
            if (!email) mailField = '管理者追加（カスタム時間）';
            if (!phone) phoneField = '管理者追加（カスタム時間）';
        }
        
        // 予約データを作成
        const reservationData = {
            reservationNumber: reservationNumber,
            Menu: menuName,
            "Name-f": name,
            "Name-s": phoneField,
            Time: selectedTimeSlot,
            WorkTime: selectedMenu.worktime,
            date: date,
            mail: mailField,
            states: 0,
            adminAdded: true,
            forceAdd: forceAddMode,
            customTime: isCustomTime,
            addedAt: new Date().toISOString()
        };
        
        console.log('予約データ:', reservationData);
        
        // リクエスト設定
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Admin-Override': 'true',
                'X-Force-Add': forceAddMode ? 'true' : 'false',
                'X-Custom-Time': isCustomTime ? 'true' : 'false',
                'X-Admin-User': currentUser || 'admin'
            },
            body: JSON.stringify({
                ...reservationData,
                adminOverride: true,
                forceAdd: forceAddMode,
                customTime: isCustomTime,
                bypassDateRestriction: true,
                bypassTimeRestriction: true
            })
        };
        
        let response = null;
        let apiEndpoint = `${API_BASE_URL}/reservations`;
        
        // ネットワークエラー対策: リトライ機能付きでAPIを呼び出し
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                console.log(`API呼び出し試行 ${retryCount + 1}/${maxRetries}: ${apiEndpoint}`);
                
                // タイムアウト付きfetch（30秒）
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                
                response = await fetch(apiEndpoint, {
                    ...requestOptions,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                // レスポンスを受信できた場合は成功
                console.log(`API応答受信 (試行${retryCount + 1}):`, response.status);
                break;
                
            } catch (fetchError) {
                retryCount++;
                console.error(`API呼び出し失敗 (試行${retryCount}):`, fetchError.message);
                
                if (retryCount >= maxRetries) {
                    // 最大試行回数に達した場合
                    throw new Error(`API接続に失敗しました（${maxRetries}回試行）: ${fetchError.message}`);
                }
                
                // 管理者専用エンドポイントで失敗した場合、通常エンドポイントを試行
                if (apiEndpoint.includes('/admin/')) {
                    apiEndpoint = `${API_BASE_URL}/reservations`;
                    console.log(`管理者エンドポイント失敗 - 通常エンドポイントで再試行: ${apiEndpoint}`);
                } else {
                    // 短い待機後に再試行
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                }
            }
        }
        
        if (!response) {
            throw new Error('APIサーバーに接続できませんでした');
        }
        
        // レスポンス処理
        const responseText = await response.text();
        console.log('Response text length:', responseText.length);
        
        // HTMLが返された場合の処理
        if (responseText.startsWith('<!doctype') || responseText.startsWith('<!DOCTYPE') || responseText.includes('<html>')) {
            console.error('HTMLレスポンスが返されました:', responseText.substring(0, 200));
            throw new Error('APIエンドポイントが見つからないか、CORS設定に問題があります。');
        }
        
        // JSONとして解析
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON解析エラー:', parseError);
            throw new Error('サーバーから無効なJSON応答が返されました。');
        }
        
        console.log('API応答内容:', result);
        
        if (!response.ok) {
            throw new Error(result.message || result.error || `HTTP error! status: ${response.status}`);
        }
        
        // 成功判定
        if (!result.success && result.success !== undefined) {
            throw new Error(result.message || '予約の追加に失敗しました');
        }
        
        // 成功時のメッセージ生成
        let successMessage = `予約を追加しました。\n予約番号: ${reservationData.reservationNumber}`;
        
        if (forceAddMode && isCustomTime) {
            successMessage = `⚠️ 管理者権限で強制追加しました（カスタム時間・重複）\n予約番号: ${reservationData.reservationNumber}\n時間: ${selectedTimeSlot}\n\n重要: お客様への特別な連絡が必要です！`;
        } else if (forceAddMode) {
            successMessage = `⚠️ 管理者権限で強制追加しました（重複時間）\n予約番号: ${reservationData.reservationNumber}\n時間: ${selectedTimeSlot}\n\n注意: 既存予約との重複があります！`;
        } else if (isCustomTime) {
            successMessage = `✅ カスタム時間で予約を追加しました\n予約番号: ${reservationData.reservationNumber}\n時間: ${selectedTimeSlot}\n\n⚠️ お客様への連絡をお忘れなく！`;
        }
        
        alert(successMessage);
        
        // モーダルを閉じる
        closeAddReservationModal();
        
        // 予約データを再読み込み
        await loadReservations();
        
        // カレンダーを再描画
        const calendarTab = document.getElementById('calendar-tab');
        if (calendarTab && calendarTab.classList.contains('active')) {
            if (typeof renderCalendar === 'function') {
                renderCalendar();
            }
        }
        
        console.log('予約が正常に追加されました:', reservationData);
        
    } catch (error) {
        console.error('予約追加エラー:', error);
        
        // エラーの種類に応じた詳細な処理
        let errorMessage = '予約の追加に失敗しました。';
        
        if (forceAddMode) {
            errorMessage = '管理者強制追加に失敗しました。';
        } else if (isCustomTime) {
            errorMessage = 'カスタム時間での予約追加に失敗しました。';
        }
        
        // ネットワークエラーの詳細判定
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'ネットワークエラーが発生しました。\n\n考えられる原因：\n• インターネット接続の問題\n• APIサーバーが一時的にダウン\n• CORS設定の問題\n• ブラウザのセキュリティ制限\n\n対処法：\n1. インターネット接続を確認\n2. 少し時間をおいて再試行\n3. ブラウザを再読み込み\n4. 他のブラウザで試行';
        } else if (error.message.includes('timeout') || error.message.includes('aborted')) {
            errorMessage = 'リクエストがタイムアウトしました。\n\nサーバーの応答が遅い可能性があります。\n少し時間をおいてから再度お試しください。';
        } else if (error.message.includes('API接続に失敗')) {
            errorMessage = `${error.message}\n\n以下を確認してください：\n• APIサーバーが稼働中か\n• インターネット接続が安定しているか\n• ブラウザのセキュリティ設定`;
        } else if (error.message.includes('HTMLレスポンス') || error.message.includes('APIエンドポイント')) {
            // HTMLが返された場合のデモ処理を提供
            const shouldTryDemo = confirm(`APIサーバーに接続できませんが、デモ用にローカル予約を追加しますか？\n\n⚠️ 注意：実際のデータベースには保存されません\n\n追加内容：\n• 名前: ${name}\n• 時間: ${selectedTimeSlot}\n• メニュー: ${menuName}`);
            
            if (shouldTryDemo) {
                try {
                    // ローカルの予約配列に追加
                    const localReservationData = {
                        id: Date.now(),
                        reservationNumber: generateReservationNumber(),
                        Menu: menuName,
                        "Name-f": name,
                        "Name-s": phoneField,
                        Time: selectedTimeSlot,
                        WorkTime: selectedMenu.worktime,
                        date: date,
                        mail: mailField,
                        states: 0,
                        adminAdded: true,
                        forceAdd: forceAddMode,
                        customTime: isCustomTime
                    };
                    
                    // グローバル予約配列に追加
                    if (typeof reservations !== 'undefined' && Array.isArray(reservations)) {
                        reservations.push(localReservationData);
                    }
                    
                    let demoSuccessMessage = `デモ用予約を追加しました。\n予約番号: ${localReservationData.reservationNumber}\n\n※これはデモ用です。実際のデータベースには保存されていません。`;
                    
                    if (forceAddMode && isCustomTime) {
                        demoSuccessMessage = `デモ用管理者強制追加（カスタム時間・重複）\n予約番号: ${localReservationData.reservationNumber}\n時間: ${selectedTimeSlot}\n\n※デモ用のため実際のDBには保存されません`;
                    } else if (forceAddMode) {
                        demoSuccessMessage = `デモ用管理者強制追加（重複時間）\n予約番号: ${localReservationData.reservationNumber}\n時間: ${selectedTimeSlot}\n\n※デモ用のため実際のDBには保存されません`;
                    }
                    
                    alert(demoSuccessMessage);
                    
                    // モーダルを閉じる
                    closeAddReservationModal();
                    
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
                    
                    return; // 成功として終了
                    
                } catch (localError) {
                    console.error('ローカル処理エラー:', localError);
                }
            }
            
            errorMessage = 'APIサーバーに接続できません。\n\n管理者にお問い合わせいただくか、\nしばらく時間をおいてから再度お試しください。';
        } else if (error.message) {
            errorMessage += '\n\n詳細: ' + error.message;
        }
        
        alert(errorMessage);
        
        // デバッグ情報をコンソールに出力
        console.error('Error Details:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            isCustomTime: isCustomTime,
            forceAddMode: forceAddMode,
            selectedTime: selectedTimeSlot,
            apiEndpoint: API_BASE_URL,
            reservationData: {
                date: date,
                name: name,
                phone: phone,
                email: email,
                menu: menuName,
                time: selectedTimeSlot
            }
        });
        
    } finally {
        // 送信ボタンを再有効化
        if (submitAddReservationBtn) {
            submitAddReservationBtn.disabled = false;
            submitAddReservationBtn.textContent = '予約追加';
        }
    }
}

# Design

模型：src/check-in.mjs 匯出 createCheckIn(sendRequest)，提供 activate 與唯讀 state getter。

Project Binding：.governance/binding.json 記錄 API、觀察位置及 Promise fixture。此模型不需要 route、DOM locator、HTTP transport 或服務啟動器，不宣稱具備產品端的 adapter。

Runner：.governance/runner.json 將 B01／B02 指向 checks/check-in.mjs，以 GOV_CHECK_ID 選擇獨立情境。檢查讀取真實模組，使用 assert 對照觀察值，失敗時輸出 FAIL 與實際值。原始檢查程式也是宣告輸入。

版本：修改 src 後 candidateDigest 改變，舊 Run 轉 STALE；每次 verify 建立新 Run。沒有不可變 snapshot 或執行隔離。

權限：所有檔案由同一使用者掌握；policy、binding 只作版本與接法紀錄，其任意 JSON 內容不另做語意驗證。不能宣稱可信核准、受保護驗收或 Task 完成。

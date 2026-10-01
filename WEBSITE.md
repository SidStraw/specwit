# GOV 框架官網

依據既有 v0.2 討論稿建立的介紹網站。框架本身仍為提案；網站內的實驗為瀏覽器端簡化模型，沒有連接真實 Agent、專案或驗證器。

2026-09-30：規格已更新至 v0.3，見 [方向總覽](README.md) 與 [產品規格](docs/specification.md)。本網站既有視覺內容與模擬仍呈現 v0.2 的驗證概念，尚未加入 OpenCode、結構化 reviewer、Task／Run 或明確完成後清理的互動情境；不應據此判斷治理功能已實作。

## 預覽與建置

使用 Node.js 22 以上版本，無需安裝相依套件。

```sh
npm run dev     # http://127.0.0.1:4173
npm test        # 模擬模型的行為與接受政策測試
npm run build  # 產出 dist/，包括規格文件
npm run preview # 預覽 dist/（請先停止相同埠的 dev server）
```

可用 `PORT=4174 npm run dev` 指定其他埠。`dist/` 可交由靜態網站服務託管；目前尚未部署。預覽伺服器只監聽本機，不用於正式環境。

## 內容與維護

- `website/index.html`：首頁、理念、架構圖、流程、情境操作與文件入口。
- `website/styles.css`：響應式版面、視覺圖解與減少動態效果設定。
- `website/app.js`：架構節點、流程階段、模擬介面與行動導覽。
- `website/simulation.js`：設定、pending、版本證據三類模型，及觀察器中斷分支。
- `docs/`：規格的原始來源，建置時複製到網站。

圖解由 HTML/CSS 組成，可直接編輯。字型透過 Google Fonts 載入，無網路時使用系統字型。沒有分析追蹤、登入或瀏覽器資料儲存。

模擬的重要界線：單一 probe 通過不能證明沒有 hardcode；同頁 pending 保護不能證明後端 exactly-once；任務期間的歷史 PASS 與 STALE 分開，STALE 會阻擋接受，這不表示完成後永久保存；觀察器中斷回報 INCONCLUSIVE。ELIGIBLE 只表示簡化情境滿足條件，不會進行任何交付或任務完成操作。

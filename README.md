# Pixel Art Quiz Game (像素風闖關問答)

這是一個使用 **Vue 3 + Vite** 開發的像素風格問答遊戲，後端採用 **Google Apps Script (GAS)** 結合 **Google Sheets** 作為資料庫與 API 服務。

## 🎮 功能特色

*   **Pixel Art 風格**：復古街機視覺設計。
*   **動態關主**：每一題皆有隨機生成的像素風格關主頭像 (DiceBear API)。
*   **即時計分**：作答結果即時上傳至 Google Sheets 記錄。
*   **排行榜機制**：系統自動記錄玩家的最高分、通關次數與首次通關成績。

---

## 🚀 安裝說明 (Installation)

請確保您的電腦已安裝 [Node.js](https://nodejs.org/)。

1.  **進入專案目錄**
    ```bash
    cd pixel-quiz
    ```

2.  **安裝依賴套件**
    ```bash
    npm install
    ```

3.  **啟動開發伺服器**
    ```bash
    npm run dev
    ```

---

## 📊 Google Sheets 設定 (Database Setup)

請建立一個新的 Google Sheet，並依照以下說明建立兩個工作表 (Tabs)。

### 1. 工作表名稱：`題目`
此工作表用於存放題庫。請依照順序建立以下欄位標題 (Row 1)：

| Column A | Column B | Column C | Column D | Column E | Column F | Column G |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **題號** | **題目** | **A** | **B** | **C** | **D** | **解答** |

*   **解答**欄位請填寫選項代號 (例如：A, B, C, D)。
*   您可以自行新增多筆題目，系統將會隨機從中抽取。

### 2. 工作表名稱：`回答`
此工作表用於記錄玩家成績。請依照順序建立以下欄位標題 (Row 1)：

| Column A | Column B | Column C | Column D | Column E | Column F | Column G |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ID** | **闖關次數** | **總分** | **最高分** | **第一次通關分數** | **花了幾次通關** | **最近遊玩時間** |

> **注意**：無需手動輸入資料，系統會在玩家遊玩時自動填入。

---

## 🤖 AI 題庫擴充設定 (AI Setup)

本專案目前改用 **Groq AI (Llama 3)** 來自動生成新題目 (速度更快且目前免費)。當玩家答錯時，AI 能根據錯誤的題目生成相似的練習題並存入題庫。

1.  取得您的 **Groq API Key** (請至 [Groq Console](https://console.groq.com/keys) 申請)。
2.  回到您的 **Apps Script** 專案頁面。
3.  點擊左側選單的 **專案設定 (Project Settings)** (齒輪圖示)。
4.  捲動至最下方的 **指令碼屬性 (Script Properties)**。
5.  點擊 **新增指令碼屬性 (Add script property)**：
    *   **屬性 (Property)**: `GROQ_API_KEY`
    *   **值 (Value)**: `貼上您的 Groq API Key`
6.  點擊 **儲存 (Save script properties)**。

> **提示**：代碼更新後，請記得 **重新部署 (Manage Deployments -> Edit -> New Version)** 才能讓新程式碼生效。

---

## ⚙️ Google Apps Script 設定 (Backend Setup)

1.  在您的 Google Sheet 中，點選上方選單的 **擴充功能 (Extensions)** > **Apps Script**。
2.  將專案中的 `GAS_Code.gs` 檔案內容完整複製，並覆蓋 Apps Script 編輯器中的內容。
3.  點擊右上角的 **部署 (Deploy)** > **新增部署 (New deployment)**。
4.  點選左側齒輪圖示，選擇 **網頁應用程式 (Web app)**。
5.  設定如下：
    *   **說明**：Pixel Quiz API
    *   **執行身分 (Execute as)**：**我 (Me)**
    *   **誰可以存取 (Who has access)**：**任何人 (Anyone)** *(這很重要，否則前端無法存取)*
6.  點擊 **部署**，並授權存取您的 Google Sheet。
7.  複製產生的 **網頁應用程式網址 (Web app URL)**。

---

## 🔧 環境變數設定 (Environment Config)

1.  在專案根目錄建立一個 `.env` 檔案 (參考 `.env.example` 或直接建立)。
2.  填入以下設定：

```ini
#Google Apps Script 部署後的網址
GOOGLE_APP_SCRIPT_URL=https://script.google.com/macros/s/xxxxxxxxx/exec

# 通過門檻 (答對百分比，例如 60 分及格)
PASS_THRESHOLD=60

# 每次遊戲隨機抽取的題目數量
QUESTION_COUNT=10
```

---

## 🕹️ 開始遊玩

完成上述設定後，執行 `npm run dev` 並開啟瀏覽器 (預設為 `http://localhost:5173`) 即可開始遊戲！

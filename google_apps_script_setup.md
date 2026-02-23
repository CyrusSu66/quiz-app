# Google Sheets 整合教學

為了讓測驗應用程式能將成績寫入你的 Google 試算表，我們需要建立一個 Google Apps Script。請按照以下步驟操作：

### 1. 建立 Google 試算表
1. 打開 Google 雲端硬碟，建立一個新的 **Google 試算表**。
2. 在工作表的第一列（A1 到 D1）依序輸入標題欄位：
   * A1: `時間`
   * B1: `分數`
   * C1: `滿分`
   * D1: `細節`

### 2. 加入 Apps Script
1. 在試算表上方選單點選 **擴充功能 (Extensions)** > **Apps Script**。
2. 將編輯器內原本的程式碼清空，並貼上以下程式碼：

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    const timestamp = new Date();
    const score = data.score;
    const total = data.total;
    const details = JSON.stringify(data.answers || {});
    
    sheet.appendRow([timestamp, score, total, details]);
    
    return ContentService.createTextOutput(JSON.stringify({"result": "success"}))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"result": "error", "message": error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 這個是處理預檢請求 (CORS) 用的
function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(headers);
}
```

### 3. 部署 Web App
1. 點擊編輯器右上角的 **部署 (Deploy)** > **新增部署作業 (New deployment)**。
2. 點擊齒輪圖示，選擇 **網頁應用程式 (Web app)**。
3. **說明**：隨便填寫（例如：Quiz API）。
4. **執行身分**：選擇「我 (Me)」。
5. **誰可以存取**：選擇 **所有人 (Anyone)**（這很重要，這樣 React App 才能傳送資料）。
6. 點擊「部署」。**(第一次可能需要授權你的 Google 帳號，請允許存取)**
7. 部署完成後，你會得到一個 **網頁應用程式網址 (Web app URL)**。

### 4. 更新 React App
將這串網址複製下來，然後回到你的 React 專案 `src/App.tsx` 中，找到 `submitResult` 函式，將網址貼到裡面即可完成串接！

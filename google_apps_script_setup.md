# Google Sheets 終極單一架構教學 (題庫與成績單)

為了讓測驗應用程式能「自動讀取題庫」並「將成績寫入」你的 Google 試算表，我們只需建立一個共用的試算表與 Google Apps Script (GAS)。
請按照以下步驟操作：

### 1. 建立終極試算表
1. 打開 Google 雲端硬碟，建立一個新的 **Google 試算表**。
2. 在下方的工作表分頁標籤，將預設的「工作表1」重新命名為：`題庫`
3. 點擊「+」新增第二個工作表，並將它命名為：`成績單`

#### 設定「題庫」分頁
請在 `題庫` 分頁的第一列 (A1~F1) 填寫以下標題：
* A1: `題目`
* B1: `選項A`
* C1: `選項B`
* D1: `選項C`
* E1: `選項D`
* F1: `正確答案(0代表A, 1代表B, 2代表C, 3代表D)`

接著從第二列開始，依序填入你的題目內容。

#### 設定「成績單」分頁
請在 `成績單` 分頁的第一列 (A1~F1) 填寫以下標題：
* A1: `學號`
* B1: `姓名`
* C1: `開始時間`
* D1: `結束時間`
* E1: `選擇答案`
* F1: `測驗分數`

### 2. 加入 Apps Script (魔法機器人)
1. 在試算表上方選單點選 **擴充功能 (Extensions)** > **Apps Script**。
2. 將編輯器內原本的程式碼清空 (`function myFunction() {}`)，並完整貼上以下程式碼：

```javascript
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("題庫");
  if (!sheet) return responseError("找不到『題庫』分頁");
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 3) return responseError("題庫資料格式不正確");

  var startTimeStr = String(data[0][1]);
  var endTimeStr = String(data[1][1]);
  
  var payload = {
    timeConfig: {
      startTime: startTimeStr,
      endTime: endTimeStr
    },
    questions: []
  };
  
  // 假設第三列是標題，從第四列開始讀取 (i=3)
  for (var i = 3; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue; // 略過空白列
    
    payload.questions.push({
      id: i - 2,
      question: String(row[0]),
      options: [String(row[1]), String(row[2]), String(row[3]), String(row[4])],
      answerIndex: Number(row[5])
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("成績單");
    if (!sheet) return responseError("找不到『成績單』分頁");
    
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      data.studentId,
      data.studentName,
      data.startTime,
      data.endTime,
      data.answersStr,
      data.score
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({"result": "success"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(err) {
    return responseError(err.toString());
  }
}

function responseError(msg) {
  return ContentService.createTextOutput(JSON.stringify({"result": "error", "message": msg}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 3. 部署 Web App 並取得連結
1. 點擊編輯器右上角的 **部署 (Deploy)** > **新增部署作業 (New deployment)**。
2. 點擊齒輪圖示，選擇 **網頁應用程式 (Web app)**。
3. **說明**：隨便填寫（例如：Quiz V2）。
4. **執行身分**：選擇「我 (Me)」。
5. **誰可以存取**：選擇 **所有人 (Anyone)**。（這非常重要，否則學生網頁會被擋住）
6. 點擊「部署」。**(第一次部署需要授權你的 Google 帳號，請點擊「進階」並允許存取)**
7. 部署完成後，你會得到一個 **網頁應用程式網址 (Web app URL)**。請將它複製下來！

### 4. 產生給學生的專屬考試連結
一旦你複製了這個網址（例如 `https://script.google.com/macros/s/AKfyc.../exec`），
你只需要把它放在我們網頁的網址後面，像這樣：

`https://CyrusSu66.github.io/quiz-app/?api=貼上你的GAS網址`

**這就是完全專屬於這個測驗的連結！** 直接把這整串網址傳送給學生（或放到班級群組）。
學生點開後，網頁就會自動去抓取「題庫」，並且在考完後自動把成績送到「成績單」，大功告成！

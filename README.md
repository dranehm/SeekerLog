# SeekerLog - Google Sheets Database Setup

Welcome to the serverless version of SeekerLog! By using Google Sheets as our backend database combined with LocalStorage, you never have to pay for a backend server or manage SQL databases. 

Follow these precise steps to connect your User Interface to your Google Sheet.

## Phase 1: Database (Sheet) Setup
1. Go to your Google Account and create a brand new, empty **Google Sheet**.
2. Look at the tabs at the very bottom left. Rename the default `Sheet1` to exactly: **`jobs`** *(all lowercase)*.
3. In Row 1 (the very top row), type in the following exact column headers from A to F:
   - **A1:** `id`
   - **B1:** `company`
   - **C1:** `position`
   - **D1:** `status`
   - **E1:** `dateApplied`
   - **F1:** `notes`
4. Freeze the top row so you don't accidentally overwrite it (`View` -> `Freeze` -> `1 Row`).

## Phase 2: Connecting the Backend API (Apps Script)
1. At the top of your Google Sheet, click on **Extensions** -> **Apps Script**.
2. You will see an editor with `function myFunction() { ... }`. Delete absolutely everything.
3. Copy the entire code block below and paste it directly into the Google Apps Script editor.

<details>
<summary>Click to View Code</summary>

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    
    if (action === "create") {
      var newRow = [
        data.id, data.company, data.position, data.status,
        data.dateApplied, data.notes, new Date().toISOString()
      ];
      sheet.appendRow(newRow);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === "update") {
      var idToUpdate = data.id;
      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (values[i][0] == idToUpdate) {
          sheet.getRange(i + 1, 2).setValue(data.company);
          sheet.getRange(i + 1, 3).setValue(data.position);
          sheet.getRange(i + 1, 4).setValue(data.status);
          sheet.getRange(i + 1, 5).setValue(data.dateApplied);
          sheet.getRange(i + 1, 6).setValue(data.notes);
          return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    else if (action === "delete") {
      var idToDelete = data.id;
      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (values[i][0] == idToDelete) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Not found" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var dataRange = sheet.getDataRange();
  
  if (sheet.getLastRow() === 0) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var values = dataRange.getValues();
  var result = [];
  
  // Start from row index 1 to skip headers
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row[0] === "") continue;
    result.push({
      id: row[0], company: row[1], position: row[2], status: row[3],
      dateApplied: row[4], notes: row[5], timestamp: row[6]
    });
  }
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: result })).setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}
```
</details>

4. Click the **Save** icon (the floppy disk).

## Phase 3: Launching it to the Web
1. In the top right corner of the Apps Script window, click the blue **Deploy** button, then click **New deployment**.
2. Click the tiny gear icon ⚙️ next to "Select type" and choose **Web app**.
3. Fill out the configuration exactly as follows:
   - **Description:** `JobTracker API v1`
   - **Execute as:** `Me` (your email address)
   - **Who has access:** `Anyone` (This is critical or your app will fail CORS blocks).
4. Click **Deploy**.
5. *Authorization Check*: Google will pop up a frightening warning saying the app isn't verified. Click **Advanced**, scroll down, and click **Go to Untitled project (unsafe)**. Allow it permission to read/write to your spreadsheets.
6. A final popup will appear giving you a massive string of text labeled **Web app URL**. Copy this URL safely.

## Phase 4: Syncing the App
1. Open up the JobTracker Web UI in your browser.
2. Click the **Gear icon** in the top right corner (Settings).
3. Paste your copied Google Apps Script Web App URL into the box.
4. Hit Save!
5. Now, click the **Sync Data** button next to your Add Record button. The App will securely push your records up into your Google Sheet!

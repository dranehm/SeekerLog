// Google Apps Script Backend for SeekerLog

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["id", "company", "position", "status", "dateApplied", "notes", "timestamp"]);
  }
  
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
          return ContentService.createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    else if (action === "delete") {
      var idToDelete = data.id;
      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (values[i][0] == idToDelete) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var dataRange = sheet.getDataRange();
  
  if (sheet.getLastRow() === 0) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var values = dataRange.getValues();
  var result = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row[0] === "") continue;
    result.push({
      id: row[0], company: row[1], position: row[2], status: row[3],
      dateApplied: row[4], notes: row[5], timestamp: row[6]
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}

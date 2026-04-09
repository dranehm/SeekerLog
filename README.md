# JobTrackerApp - Google Sheets Database Setup

Welcome to the serverless version of JobTrackerApp! By using Google Sheets as our backend database combined with LocalStorage, you never have to pay for a backend server or manage SQL databases. 

Follow these precise steps to connect your User Interface to your Google Sheet.

## Phase 1: Database (Sheet) Setup
1. Go to your Google Account and create a brand new, empty **Google Sheet**.
2. Look at the tabs at the very bottom left. Rename the default `Sheet1` to exactly: **`jobs`** *(all lowercase)*.
*(Note: You do not need to type in the table headers. Our intelligent Apps Script will inject them automatically on the first sync!)*

## Phase 2: Connecting the Backend API (Apps Script)
1. At the top of your Google Sheet, click on **Extensions** -> **Apps Script**.
2. You will see an editor with `function myFunction() { ... }`. Delete absolutely everything.
3. Open the file `google-apps-script.js` located in this folder on your computer.
4. Copy the entire contents of `google-apps-script.js` and paste it into the Google Apps Script editor.
5. Click the **Save** icon (the floppy disk).

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
1. Open up the JobTrackerApp Web UI in your browser (`index.html`).
2. Click the **Gear icon** in the top right corner (Settings).
3. Paste your copied Google Apps Script Web App URL into the box.
4. Hit Save!
5. Now, click the **Sync Data** button next to your Add Record button. The App will securely push your records up, and the table headers will physically appear in your blank spreadsheet!

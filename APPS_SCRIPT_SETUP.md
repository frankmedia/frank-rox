# 📝 Google Apps Script Setup for History Logging

This allows your app to write workout history to Google Sheets without OAuth!

## Step 1: Create Apps Script

1. **Open your Master Sheet:**
   - https://docs.google.com/spreadsheets/d/19ywi1KUMttnYOtic649TG1ZObtnTXprKe6qe5UBJat8/

2. **Open Script Editor:**
   - Click **Extensions** → **Apps Script**

3. **Replace the default code with this:**

```javascript
// Frank Rock - Workout History Logger API with Personal Best Tracking
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.username || !data.exerciseName) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: "Missing username or exerciseName" })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get user's sheet ID from master sheet
    const masterSheet = SpreadsheetApp.getActiveSpreadsheet();
    const loginsSheet = masterSheet.getSheetByName("logins");
    
    if (!loginsSheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: "logins tab not found" })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Find user's workout sheet URL
    const loginsData = loginsSheet.getDataRange().getValues();
    let userSheetUrl = null;
    
    for (let i = 1; i < loginsData.length; i++) {
      const username = loginsData[i][0];
      if (username && username.toLowerCase() === data.username.toLowerCase()) {
        userSheetUrl = loginsData[i][2]; // Column C - Sheet URL
        break;
      }
    }
    
    if (!userSheetUrl) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: "User not found in master sheet" })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Extract sheet ID from URL
    const sheetIdMatch = userSheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: "Invalid sheet URL" })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    const userSheetId = sheetIdMatch[1];
    
    // Open user's workout sheet
    const userSpreadsheet = SpreadsheetApp.openById(userSheetId);
    
    // 🏆 CHECK & UPDATE PERSONAL BEST IN PLAN TAB
    let isPB = false;
    let oldPB = null;
    const planSheet = userSpreadsheet.getSheetByName("Plan");
    
    if (planSheet && data.weight) {
      const planData = planSheet.getDataRange().getValues();
      
      // Find the exercise row in Plan tab
      for (let i = 1; i < planData.length; i++) {
        const exerciseName = planData[i][1]; // Column B - Exercise name
        
        if (exerciseName && exerciseName.trim().toLowerCase() === data.exerciseName.trim().toLowerCase()) {
          const currentPB = planData[i][6]; // Column G - Personal Best
          const currentPBValue = currentPB ? parseFloat(currentPB.toString().replace(/[^0-9.]/g, '')) : 0;
          const newWeight = parseFloat(data.weight);
          
          // Check if this is a new PB
          if (newWeight > currentPBValue) {
            isPB = true;
            oldPB = currentPBValue > 0 ? currentPBValue : null;
            
            // Update PB in Plan tab
            planSheet.getRange(i + 1, 7).setValue(newWeight + " kg"); // Column G
            Logger.log(`🏆 New PB! ${data.exerciseName}: ${oldPB} → ${newWeight} kg`);
          }
          break;
        }
      }
    }
    
    // CREATE/APPEND TO HISTORY TAB
    let historySheet = userSpreadsheet.getSheetByName("History");
    
    // Create History tab if it doesn't exist
    if (!historySheet) {
      historySheet = userSpreadsheet.insertSheet("History");
      historySheet.appendRow([
        "Exercise",
        "Date",
        "Weight (kg)",
        "Sets",
        "Reps",
        "RPE",
        "Is PB",
        "Duration (min)",
        "Distance (km)",
        "Notes"
      ]);
      // Format header row
      const headerRange = historySheet.getRange(1, 1, 1, 10);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#FFD700"); // Yellow
    }
    
    // Prepare row data
    const timestamp = new Date().toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    
    const row = [
      data.exerciseName,
      timestamp,
      data.weight || "",
      data.sets || "",
      data.reps || "",
      data.rpe || "",
      isPB ? "🏆 YES" : "",
      data.duration || "",
      data.distance || "",
      data.notes || ""
    ];
    
    // Append to History sheet
    historySheet.appendRow(row);
    
    // Highlight PB rows
    if (isPB) {
      const lastRow = historySheet.getLastRow();
      historySheet.getRange(lastRow, 1, 1, 10).setBackground("#FFF9E6"); // Light yellow
    }
    
    return ContentService.createTextOutput(
      JSON.stringify({ 
        success: true, 
        message: isPB ? `🏆 New Personal Best! ${oldPB ? oldPB + ' → ' : ''}${data.weight} kg` : "Workout logged successfully",
        timestamp: timestamp,
        isPB: isPB,
        oldPB: oldPB,
        newPB: isPB ? data.weight : null
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ 
        success: false, 
        error: error.toString() 
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function
function testLog() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        username: "frank",
        exerciseName: "Goblet Squat",
        weight: 18, // Try a higher weight to test PB logic
        sets: 5,
        reps: 12,
        rpe: 7,
        notes: "Test workout - feeling strong!"
      })
    }
  };
  
  const result = doPost(testData);
  Logger.log(result.getContent());
}
```

## Step 2: Deploy as Web App

1. **Click the Deploy button** (top right)
2. **Select "New deployment"**
3. **Settings:**
   - Type: **Web app**
   - Description: **Frank Rock History Logger**
   - Execute as: **Me** (your account)
   - Who has access: **Anyone** (no Google sign-in required)
4. **Click "Deploy"**
5. **Authorize** the script (review permissions and allow)
6. **Copy the Web App URL** - it will look like:
   ```
   https://script.google.com/macros/s/AKfycbz.../exec
   ```

## Step 3: Add URL to Your App

1. **Copy the Web App URL** you got from Step 2

2. **Add it to your `.env` file:**
   ```bash
   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```

3. **Your complete `.env` should look like:**
   ```bash
   VITE_GOOGLE_SHEETS_API_KEY=AIzaSyBDHQQIMjCQ9-RjpPQ4_uQ7S5vpfBRH24I
   VITE_MASTER_SHEET_ID=19ywi1KUMttnYOtic649TG1ZObtnTXprKe6qe5UBJat8
   VITE_USER_NAME=frank
   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```

4. **Restart your dev server** (Ctrl+C, then `npm run dev`)

✅ **Done!** The app will now log workouts and track PBs automatically!

## Step 4: Test It

Once integrated, when you "Mark as Done" on an exercise, it will automatically:
1. Send data to the Apps Script
2. Apps Script finds your workout sheet
3. **Checks if you beat your Personal Best** 🏆
4. **Updates the PB in Plan tab** if you did
5. Writes to the History tab with PB flag
6. Returns success (with PB notification if applicable) ✅

### What Gets Tracked:

**For Weights Exercises:**
- Weight lifted (kg)
- Sets completed
- Reps completed
- RPE (Rate of Perceived Exertion 1-10)
- **Automatic PB detection** - compares to Plan tab Column G
- **Automatic PB update** - updates Plan tab if you beat it
- PB flag in History (🏆 YES)

**For Cardio Exercises:**
- Duration (minutes)
- Distance (km)
- RPE
- Notes

**For Bodyweight Exercises:**
- Sets
- Reps
- RPE
- Notes

## Security Notes

- The script runs under YOUR Google account
- It can only write to sheets you have access to
- Users must be in the logins/master sheet
- No sensitive credentials exposed to users
- Rate limit: ~20 writes per minute (plenty for workouts)

## Troubleshooting

If it doesn't work:
1. Check Apps Script **Execution log** (View → Executions)
2. Make sure the script is deployed as "Anyone" can access
3. Verify the master sheet has correct user data in logins tab
4. Check that History tab headers match expected format


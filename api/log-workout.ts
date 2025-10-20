import type { VercelRequest, VercelResponse } from '@vercel/node';

// Master sheet lookup
const MASTER_SHEET_ID = process.env.VITE_MASTER_SHEET_ID || '19ywi1KUMttnYOtic649TG1ZObtnTXprKe6qe5UBJat8';
const API_KEY = process.env.VITE_GOOGLE_SHEETS_API_KEY;

interface WorkoutData {
  username: string;
  exerciseName: string;
  weight?: number;
  sets?: number;
  reps?: number;
  rpe?: number;
  duration?: number;
  distance?: number;
  notes?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!API_KEY) {
    return res.status(500).json({ success: false, error: 'API key not configured' });
  }

  try {
    const data: WorkoutData = req.body;

    if (!data.username || !data.exerciseName) {
      return res.status(400).json({ success: false, error: 'Missing username or exerciseName' });
    }

    // Get user's sheet URL from master sheet
    const masterResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${MASTER_SHEET_ID}/values/A:C?key=${API_KEY}`
    );

    if (!masterResponse.ok) {
      throw new Error(`Failed to fetch master sheet: ${masterResponse.status}`);
    }

    const masterData = await masterResponse.json();
    const rows = masterData.values || [];

    // Find user
    let userSheetUrl = null;
    for (let i = 1; i < rows.length; i++) {
      const username = rows[i][0];
      if (username && username.toLowerCase() === data.username.toLowerCase()) {
        userSheetUrl = rows[i][2]; // Column C
        break;
      }
    }

    if (!userSheetUrl) {
      return res.status(404).json({ success: false, error: 'User not found in master sheet' });
    }

    // Extract sheet ID
    const sheetIdMatch = userSheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      return res.status(400).json({ success: false, error: 'Invalid sheet URL' });
    }

    const userSheetId = sheetIdMatch[1];

    // Get Plan tab to check for PB
    const planResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${userSheetId}/values/Plan!A:K?key=${API_KEY}`
    );

    let isPB = false;
    let oldPB: number | null = null;

    if (planResponse.ok && data.weight) {
      const planData = await planResponse.json();
      const planRows = planData.values || [];

      // Find exercise and check PB
      for (let i = 1; i < planRows.length; i++) {
        const exerciseName = planRows[i][1];
        if (exerciseName && exerciseName.trim().toLowerCase() === data.exerciseName.trim().toLowerCase()) {
          const currentPB = planRows[i][6]; // Column G
          const currentPBValue = currentPB ? parseFloat(currentPB.toString().replace(/[^0-9.]/g, '')) : 0;
          const newWeight = parseFloat(data.weight.toString());

          if (newWeight > currentPBValue) {
            isPB = true;
            oldPB = currentPBValue > 0 ? currentPBValue : null;

            // Update PB in Plan tab
            await fetch(
              `https://sheets.googleapis.com/v4/spreadsheets/${userSheetId}/values/Plan!G${i + 1}?valueInputOption=RAW&key=${API_KEY}`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ values: [[`${newWeight} kg`]] }),
              }
            );
          }
          break;
        }
      }
    }

    // Append to History tab
    const timestamp = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const historyRow = [
      data.exerciseName,
      timestamp,
      data.weight || '',
      data.sets || '',
      data.reps || '',
      data.rpe || '',
      isPB ? '🏆 YES' : '',
      data.duration || '',
      data.distance || '',
      data.notes || '',
    ];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${userSheetId}/values/History!A:J:append?valueInputOption=RAW&key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [historyRow] }),
      }
    );

    return res.status(200).json({
      success: true,
      message: isPB ? `🏆 New Personal Best! ${oldPB ? oldPB + ' → ' : ''}${data.weight} kg` : 'Workout logged successfully',
      isPB,
      oldPB,
      newPB: isPB ? data.weight : null,
    });
  } catch (error: any) {
    console.error('Error logging workout:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}


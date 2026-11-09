import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 550,
    frame: true,
    transparent: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    }
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// Ultimate App Launcher: Registry & Protocol-Based Execution
// Ultimate Universal App Launcher using Windows Start Menu Index
const launchAppByName = (rawAppName) => {
  const appName = rawAppName.trim().toLowerCase();
  const safeAppName = appName.replace(/"/g, '`"');

  // PowerShell command to query Windows Start Apps index and launch via AppsFolder
  const psCommand = `powershell -NoProfile -Command "$app = Get-StartApps | Where-Object { $_.Name -like '*${safeAppName}*' } | Select-Object -First 1; if ($app) { Start-Process ('shell:AppsFolder\\' + $app.AppID) } else { Start-Process '${safeAppName}' }"`;

  exec(psCommand, (error) => {
    if (error) {
      console.log("App launch error:", error);
    }
  });

  return `Opening ${rawAppName}!`;
};

// Handle Text Prompts & App Commands
ipcMain.handle('ask-companion', async (event, rawPrompt) => {
  const prompt = rawPrompt.toLowerCase().trim();

  if (prompt.startsWith('open ') || prompt.startsWith('launch ')) {
    const targetApp = prompt.replace('open ', '').replace('launch ', '').trim();
    return launchAppByName(targetApp);
  }

  // Cloud AI Routing with Low-Latency Gemini Flash-Lite
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "Error: GEMINI_API_KEY missing.";

  const models = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const startTime = performance.now();

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `You are a helpful, concise desktop companion for a developer named Abhinav. Respond briefly: ${rawPrompt}` }] }]
          })
        }
      );

      const data = await response.json();
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`[API Performance] Model '${model}' responded in ${duration} seconds.`);

      if (!data.error) {
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
      }
    } catch (err) {
      console.log(`Model ${model} failed, trying next...`);
    }
  }

  return "API Error: All models are currently experiencing high demand. Please try again in a moment.";
});

// Handle Audio Voice Recordings from Mic
ipcMain.handle('process-audio', async (event, base64AudioData) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "Error: GEMINI_API_KEY missing.";

    const base64Data = base64AudioData.split(';base64,').pop();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "You are a helpful desktop companion for Abhinav. Listen to this user audio prompt. If the user wants to open an application (e.g., 'open zoom', 'open whatsapp', 'open code'), output ONLY the app name or command like 'open zoom'. Otherwise, answer the question or fulfill the request directly and concisely."
                },
                {
                  inline_data: {
                    mime_type: "audio/webm",
                    data: base64Data
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not understand audio.";
    const lowerReply = reply.toLowerCase().trim();

    if (lowerReply.startsWith('open ') || lowerReply.startsWith('launch ') || lowerReply.length < 25) {
      const targetApp = lowerReply.replace('open ', '').replace('launch ', '').trim();
      if (!targetApp.includes(' ')) {
        return launchAppByName(targetApp);
      }
    }

    return reply;
  } catch (error) {
    return `Audio Error: ${error.message}`;
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
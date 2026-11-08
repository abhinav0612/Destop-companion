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
ipcMain.handle('ask-companion', async (event, rawPrompt) => {
  const prompt = rawPrompt.toLowerCase().trim();

  // 1. Local App Launchers (Instant, 0ms network latency)
  if (prompt.startsWith('open ') || prompt.startsWith('launch ')) {
    let appName = prompt.replace('open ', '').replace('launch ', '').trim();
    
    if (appName.includes('whatsapp')) {
      exec('start whatsapp:');
      return "Opening WhatsApp!";
    }
    if (appName.includes('chrome') || appName.includes('google chrome')) {
      exec('start chrome');
      return "Opening Google Chrome!";
    }
    if (appName.includes('code') || appName.includes('vs code') || appName.includes('vscode')) {
      exec('code');
      return "Launching VS Code!";
    }
    if (appName.includes('explorer') || appName.includes('file manager') || appName.includes('files')) {
      exec('start explorer');
      return "Opening File Explorer!";
    }
    if (appName.includes('notepad')) {
      exec('start notepad');
      return "Opening Notepad!";
    }
    if (appName.includes('spotify')) {
      exec('start spotify:');
      return "Opening Spotify!";
    }

    exec(`start "" "${appName}"`, (error) => {
      if (error) {
        exec(`powershell -Command "Start-Process (Get-StartApps | Where-Object {$_.Name -like '*${appName}*'} | Select-Object -First 1).AppID"`);
      }
    });

    return `Opening ${appName}!`;
  }

  // 2. Cloud AI Routing with Low-Latency Gemini Flash-Lite
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "Error: GEMINI_API_KEY missing.";

  // Prioritize gemini-3.1-flash-lite for speed, with standard flash as fallback
  const models = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const startTime = performance.now(); // Start timer

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
      const endTime = performance.now(); // End timer
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

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
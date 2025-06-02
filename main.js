const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const AudioProcessor = require("./src/audio/audioProcessor");

// 保持对窗口对象的全局引用，如果不这样做，当 JavaScript 对象被垃圾回收时，窗口会被自动关闭
let mainWindow;

/**
 * 创建主窗口
 */
function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "src/renderer/preload.js"),
    },
    icon: path.join(__dirname, "assets/icon.png"), // 应用图标
    title: "打卡剪辑助手",
    show: false, // 先不显示，等加载完成后再显示
  });

  // 加载应用的 index.html
  mainWindow.loadFile("src/renderer/index.html");

  // 窗口加载完成后显示
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // 当窗口被关闭时，取消引用 window 对象
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // 开发模式下打开开发者工具
  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }
}

// Electron 会在初始化后并准备创建浏览器窗口时，调用这个函数
app.whenReady().then(createWindow);

// 当全部窗口关闭时退出
app.on("window-all-closed", () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，否则绝大部分应用及其菜单栏会保持激活
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // 在 macOS 上，当点击 dock 图标并且该应用没有打开的窗口时，绝大部分应用会重新创建一个窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC 通信处理

/**
 * 处理文件选择对话框
 */
ipcMain.handle("select-audio-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "选择音频文件",
    filters: [
      {
        name: "音频文件",
        extensions: ["mp3", "wav", "flac", "m4a", "aac", "ogg"],
      },
      { name: "所有文件", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const stats = fs.statSync(filePath);

    return {
      success: true,
      filePath: filePath,
      fileName: path.basename(filePath),
      fileSize: stats.size,
    };
  }

  return { success: false };
});

/**
 * 处理音频处理请求
 */
ipcMain.handle("process-audio", async (event, options) => {
  try {
    const audioProcessor = new AudioProcessor();

    // 监听处理进度
    audioProcessor.on("progress", (progress) => {
      event.sender.send("processing-progress", progress);
    });

    const result = await audioProcessor.processAudio(options);
    return { success: true, outputPath: result };
  } catch (error) {
    console.error("音频处理错误:", error);
    return { success: false, error: error.message };
  }
});

/**
 * 处理输出文件保存对话框
 */
ipcMain.handle("save-output-file", async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "保存处理后的音频文件",
    defaultPath: defaultName,
    filters: [
      { name: "MP3 文件", extensions: ["mp3"] },
      { name: "WAV 文件", extensions: ["wav"] },
      { name: "所有文件", extensions: ["*"] },
    ],
  });

  if (!result.canceled) {
    return { success: true, filePath: result.filePath };
  }

  return { success: false };
});

/**
 * 获取音频文件信息
 */
ipcMain.handle("get-audio-info", async (event, filePath) => {
  try {
    const audioProcessor = new AudioProcessor();
    const info = await audioProcessor.getAudioInfo(filePath);
    return { success: true, info };
  } catch (error) {
    console.error("获取音频信息错误:", error);
    return { success: false, error: error.message };
  }
});

/**
 * 打开输出文件夹
 */
ipcMain.handle("open-output-folder", async (event, filePath) => {
  try {
    const { shell } = require("electron");
    await shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    console.error("打开文件夹错误:", error);
    return { success: false, error: error.message };
  }
});

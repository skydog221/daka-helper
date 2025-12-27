const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");

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

  // 加载统一的 UI 入口
  mainWindow.loadFile("src/ui/index.html");

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
 * 打开输出文件夹
 */
ipcMain.handle("open-output-folder", async (event, filePath) => {
  try {
    await shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    console.error("打开文件夹错误:", error);
    return { success: false, error: error.message };
  }
});

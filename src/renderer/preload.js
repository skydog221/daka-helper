const { contextBridge, ipcRenderer } = require("electron");

/**
 * 预加载脚本 - 为渲染进程提供安全的 API 接口
 * 通过 contextBridge 暴露主进程功能给渲染进程
 */

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * 选择音频文件
   * @returns {Promise<Object>} 文件选择结果
   */
  selectAudioFile: () => ipcRenderer.invoke("select-audio-file"),

  /**
   * 获取音频文件信息
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 音频信息
   */
  getAudioInfo: (filePath) => ipcRenderer.invoke("get-audio-info", filePath),

  /**
   * 处理音频文件
   * @param {Object} options - 处理选项
   * @returns {Promise<Object>} 处理结果
   */
  processAudio: (options) => ipcRenderer.invoke("process-audio", options),

  /**
   * 保存输出文件
   * @param {string} defaultName - 默认文件名
   * @returns {Promise<Object>} 保存结果
   */
  saveOutputFile: (defaultName) =>
    ipcRenderer.invoke("save-output-file", defaultName),

  /**
   * 打开输出文件夹
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 操作结果
   */
  openOutputFolder: (filePath) =>
    ipcRenderer.invoke("open-output-folder", filePath),

  /**
   * 监听处理进度
   * @param {Function} callback - 进度回调函数
   */
  onProcessingProgress: (callback) => {
    ipcRenderer.on("processing-progress", (event, progress) => {
      callback(progress);
    });
  },

  /**
   * 移除进度监听器
   */
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners("processing-progress");
  },
});

// 暴露工具函数
contextBridge.exposeInMainWorld("utils", {
  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化的文件大小
   */
  formatFileSize: (bytes) => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  /**
   * 格式化时间显示
   * @param {number} seconds - 秒数
   * @returns {string} 格式化的时间字符串
   */
  formatTime: (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
  },

  /**
   * 解析时间字符串为秒数
   * @param {string} timeString - 时间字符串 (HH:MM:SS 或 MM:SS)
   * @returns {number} 秒数
   */
  parseTime: (timeString) => {
    const parts = timeString.split(":").map((part) => parseInt(part, 10));

    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      // SS
      return parts[0];
    }

    return 0;
  },

  /**
   * 验证时间格式
   * @param {string} timeString - 时间字符串
   * @returns {boolean} 是否有效
   */
  isValidTimeFormat: (timeString) => {
    const timeRegex = /^(\d{1,2}:)?(\d{1,2}):(\d{1,2})$/;
    return timeRegex.test(timeString);
  },
});

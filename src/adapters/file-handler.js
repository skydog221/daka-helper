/**
 * 文件处理适配器
 * 统一 Electron 和 Web 环境的文件读写接口
 * Electron: 使用 fs 模块
 * Web: 使用 FileReader API 和浏览器下载
 */

import { PlatformDetector } from './platform-detector.js';

export class FileHandler {
  constructor() {
    this.platform = PlatformDetector.getPlatform();
  }
  
  /**
   * 读取音频文件
   * @param {File} file - 文件对象
   * @returns {Promise<ArrayBuffer>} 文件数据
   */
  async readAudioFile(file) {
    if (this.platform === 'web') {
      return this._readFileWeb(file);
    } else {
      // Electron 渲染进程也使用 FileReader
      return this._readFileWeb(file);
    }
  }
  
  /**
   * 保存音频文件
   * @param {ArrayBuffer|Blob} data - 文件数据
   * @param {string} filename - 文件名
   * @param {string} mimeType - MIME 类型
   * @returns {Promise<boolean>} 是否成功
   */
  async saveAudioFile(data, filename, mimeType = 'audio/wav') {
    if (this.platform === 'web') {
      return this._saveFileWeb(data, filename, mimeType);
    } else {
      // Electron 环境可以使用 IPC 调用主进程保存
      // 目前也使用浏览器下载方式
      return this._saveFileWeb(data, filename, mimeType);
    }
  }
  
  /**
   * 选择文件
   * @param {Object} options - 选项
   * @returns {Promise<File|null>} 选择的文件
   */
  async selectFile(options = {}) {
    const {
      accept = 'audio/*',
      multiple = false
    } = options;
    
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = multiple;
      
      input.onchange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          resolve(multiple ? Array.from(files) : files[0]);
        } else {
          resolve(null);
        }
      };
      
      input.oncancel = () => {
        resolve(null);
      };
      
      input.click();
    });
  }
  
  /**
   * 获取文件信息
   * @param {File} file - 文件对象
   * @returns {Object} 文件信息
   */
  getFileInfo(file) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      lastModifiedDate: new Date(file.lastModified)
    };
  }
  
  /**
   * 验证文件类型
   * @param {File} file - 文件对象
   * @param {Array<string>} allowedTypes - 允许的类型
   * @returns {boolean} 是否有效
   */
  validateFileType(file, allowedTypes = ['audio/']) {
    if (!file || !file.type) return false;
    
    return allowedTypes.some(type => {
      if (type.endsWith('/')) {
        // 类别匹配 (如 'audio/')
        return file.type.startsWith(type);
      } else {
        // 精确匹配 (如 'audio/mp3')
        return file.type === type;
      }
    });
  }
  
  /**
   * 验证文件大小
   * @param {File} file - 文件对象
   * @param {number} maxSizeMB - 最大大小（MB）
   * @returns {boolean} 是否有效
   */
  validateFileSize(file, maxSizeMB = 100) {
    if (!file) return false;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }
  
  // ========== Web 环境实现 ==========
  
  /**
   * Web 环境读取文件
   * @private
   */
  _readFileWeb(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      
      reader.onerror = (e) => {
        reject(new Error(`文件读取失败: ${e.target.error}`));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }
  
  /**
   * Web 环境保存文件
   * @private
   */
  _saveFileWeb(data, filename, mimeType) {
    try {
      // 确保数据是 Blob 格式
      let blob;
      if (data instanceof Blob) {
        blob = data;
      } else if (data instanceof ArrayBuffer) {
        blob = new Blob([data], { type: mimeType });
      } else {
        throw new Error('不支持的数据类型');
      }
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      // 触发下载
      document.body.appendChild(a);
      a.click();
      
      // 清理
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      return Promise.resolve(true);
    } catch (error) {
      console.error('保存文件失败:', error);
      return Promise.resolve(false);
    }
  }
  
  // ========== Electron 环境实现（预留） ==========
  
  /**
   * Electron 环境读取文件
   * @private
   */
  async _readFileElectron(filePath) {
    // 通过 IPC 调用主进程读取文件
    // 需要在 preload.js 中暴露相应接口
    if (window.electron && window.electron.readFile) {
      return await window.electron.readFile(filePath);
    }
    throw new Error('Electron 文件读取接口未实现');
  }
  
  /**
   * Electron 环境保存文件
   * @private
   */
  async _saveFileElectron(data, filePath) {
    // 通过 IPC 调用主进程保存文件
    // 需要在 preload.js 中暴露相应接口
    if (window.electron && window.electron.saveFile) {
      return await window.electron.saveFile(filePath, data);
    }
    throw new Error('Electron 文件保存接口未实现');
  }
}

/**
 * 单例模式：创建全局文件处理实例
 */
let fileHandlerInstance = null;

export function getFileHandler() {
  if (!fileHandlerInstance) {
    fileHandlerInstance = new FileHandler();
  }
  return fileHandlerInstance;
}

export default FileHandler;
/**
 * 配置存储适配器
 * 统一 Electron 和 Web 环境的配置存储接口
 * Electron: 使用 electron-store (如果需要)
 * Web: 使用 localStorage
 */

import { PlatformDetector } from './platform-detector.js';

export class ConfigStorage {
  constructor() {
    this.platform = PlatformDetector.getPlatform();
    this.storageKey = 'daka-helper-config';
  }
  
  /**
   * 获取配置项
   * @param {string} key - 配置键名
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置值
   */
  get(key, defaultValue = null) {
    try {
      if (this.platform === 'web') {
        return this._getFromLocalStorage(key, defaultValue);
      } else {
        // Electron 环境也使用 localStorage (渲染进程)
        return this._getFromLocalStorage(key, defaultValue);
      }
    } catch (error) {
      console.error(`获取配置失败 [${key}]:`, error);
      return defaultValue;
    }
  }
  
  /**
   * 设置配置项
   * @param {string} key - 配置键名
   * @param {*} value - 配置值
   * @returns {boolean} 是否成功
   */
  set(key, value) {
    try {
      if (this.platform === 'web') {
        return this._setToLocalStorage(key, value);
      } else {
        // Electron 环境也使用 localStorage (渲染进程)
        return this._setToLocalStorage(key, value);
      }
    } catch (error) {
      console.error(`设置配置失败 [${key}]:`, error);
      return false;
    }
  }
  
  /**
   * 删除配置项
   * @param {string} key - 配置键名
   * @returns {boolean} 是否成功
   */
  remove(key) {
    try {
      if (this.platform === 'web') {
        return this._removeFromLocalStorage(key);
      } else {
        return this._removeFromLocalStorage(key);
      }
    } catch (error) {
      console.error(`删除配置失败 [${key}]:`, error);
      return false;
    }
  }
  
  /**
   * 清空所有配置
   * @returns {boolean} 是否成功
   */
  clear() {
    try {
      if (this.platform === 'web') {
        return this._clearLocalStorage();
      } else {
        return this._clearLocalStorage();
      }
    } catch (error) {
      console.error('清空配置失败:', error);
      return false;
    }
  }
  
  /**
   * 获取所有配置
   * @returns {Object} 所有配置
   */
  getAll() {
    try {
      if (this.platform === 'web') {
        return this._getAllFromLocalStorage();
      } else {
        return this._getAllFromLocalStorage();
      }
    } catch (error) {
      console.error('获取所有配置失败:', error);
      return {};
    }
  }
  
  /**
   * 批量设置配置
   * @param {Object} config - 配置对象
   * @returns {boolean} 是否成功
   */
  setAll(config) {
    try {
      if (this.platform === 'web') {
        return this._setAllToLocalStorage(config);
      } else {
        return this._setAllToLocalStorage(config);
      }
    } catch (error) {
      console.error('批量设置配置失败:', error);
      return false;
    }
  }
  
  // ========== localStorage 实现 ==========
  
  /**
   * 从 localStorage 获取配置
   * @private
   */
  _getFromLocalStorage(key, defaultValue) {
    const allConfig = this._getAllFromLocalStorage();
    return allConfig.hasOwnProperty(key) ? allConfig[key] : defaultValue;
  }
  
  /**
   * 设置到 localStorage
   * @private
   */
  _setToLocalStorage(key, value) {
    const allConfig = this._getAllFromLocalStorage();
    allConfig[key] = value;
    localStorage.setItem(this.storageKey, JSON.stringify(allConfig));
    return true;
  }
  
  /**
   * 从 localStorage 删除配置
   * @private
   */
  _removeFromLocalStorage(key) {
    const allConfig = this._getAllFromLocalStorage();
    delete allConfig[key];
    localStorage.setItem(this.storageKey, JSON.stringify(allConfig));
    return true;
  }
  
  /**
   * 清空 localStorage
   * @private
   */
  _clearLocalStorage() {
    localStorage.removeItem(this.storageKey);
    return true;
  }
  
  /**
   * 从 localStorage 获取所有配置
   * @private
   */
  _getAllFromLocalStorage() {
    const data = localStorage.getItem(this.storageKey);
    if (!data) return {};
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('解析配置数据失败:', error);
      return {};
    }
  }
  
  /**
   * 批量设置到 localStorage
   * @private
   */
  _setAllToLocalStorage(config) {
    localStorage.setItem(this.storageKey, JSON.stringify(config));
    return true;
  }
}

/**
 * 单例模式：创建全局配置存储实例
 */
let configStorageInstance = null;

export function getConfigStorage() {
  if (!configStorageInstance) {
    configStorageInstance = new ConfigStorage();
  }
  return configStorageInstance;
}

export default ConfigStorage;
/**
 * 平台检测模块
 * 用于检测当前运行环境（Electron 或 Web 浏览器）
 */

export class PlatformDetector {
  /**
   * 检测是否在 Electron 环境中运行
   * @returns {boolean} 是否为 Electron 环境
   */
  static isElectron() {
    // 方法1: 检查 window.process.type
    if (typeof window !== 'undefined' && 
        window.process && 
        window.process.type === 'renderer') {
      return true;
    }
    
    // 方法2: 检查 navigator.userAgent
    if (typeof navigator !== 'undefined' && 
        navigator.userAgent.toLowerCase().includes('electron')) {
      return true;
    }
    
    // 方法3: 检查 window.electron (如果通过 preload 暴露)
    if (typeof window !== 'undefined' && window.electron) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 检测是否在 Web 浏览器环境中运行
   * @returns {boolean} 是否为 Web 环境
   */
  static isWeb() {
    return !this.isElectron();
  }
  
  /**
   * 获取平台名称
   * @returns {string} 'electron' 或 'web'
   */
  static getPlatform() {
    return this.isElectron() ? 'electron' : 'web';
  }
  
  /**
   * 获取平台信息
   * @returns {Object} 平台详细信息
   */
  static getPlatformInfo() {
    const isElectron = this.isElectron();
    
    return {
      platform: isElectron ? 'electron' : 'web',
      isElectron,
      isWeb: !isElectron,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      nodeVersion: isElectron && window.process ? window.process.versions.node : null,
      chromeVersion: isElectron && window.process ? window.process.versions.chrome : null,
      electronVersion: isElectron && window.process ? window.process.versions.electron : null,
      features: {
        fs: this.hasFeature('fs'),
        localStorage: this.hasFeature('localStorage'),
        audioContext: this.hasFeature('audioContext'),
        fileAPI: this.hasFeature('fileAPI'),
        download: this.hasFeature('download')
      }
    };
  }
  
  /**
   * 检查是否支持特定功能
   * @param {string} feature - 功能名称
   * @returns {boolean} 是否支持
   */
  static hasFeature(feature) {
    switch (feature) {
      case 'fs':
        return this.isElectron(); // 只有 Electron 支持文件系统
      case 'localStorage':
        return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
      case 'audioContext':
        return typeof window !== 'undefined' && 
               (typeof window.AudioContext !== 'undefined' || 
                typeof window.webkitAudioContext !== 'undefined');
      case 'fileAPI':
        return typeof window !== 'undefined' && 
               typeof window.File !== 'undefined' && 
               typeof window.FileReader !== 'undefined';
      case 'download':
        return typeof window !== 'undefined' && 
               typeof document !== 'undefined' && 
               typeof document.createElement === 'function';
      default:
        return false;
    }
  }
}

export default PlatformDetector;
/**
 * 统一音频编码器接口
 * 提供 WAV 编码支持
 */
import { WavEncoder } from './wav-encoder.js';

export class AudioEncoder {
  /**
   * 支持的输出格式
   */
  static OUTPUT_FORMATS = {
    WAV: 'wav'
  };
  
  /**
   * 格式配置信息
   */
  static FORMAT_CONFIG = {
    wav: {
      name: 'WAV',
      description: 'WAV 无损音频',
      extension: '.wav',
      mimeType: 'audio/wav',
      quality: '无损',
      speed: '极快（<100ms）',
      sizeMultiplier: 10.8, // 每秒约 10.8MB（44.1kHz 立体声）
      recommended: true,
      encoder: WavEncoder
    }
  };
  
  /**
   * 编码音频
   * @param {AudioBuffer} audioBuffer - 音频缓冲区
   * @param {string} format - 输出格式（'wav' 或 'mp3'）
   * @param {object} options - 编码选项
   * @returns {Promise<Blob>} 编码后的音频 Blob
   */
  static async encode(audioBuffer, format = 'wav', options = {}) {
    // 验证格式
    if (!this.isValidFormat(format)) {
      throw new Error(`不支持的格式: ${format}。支持的格式: ${this.getAvailableFormats().join(', ')}`);
    }
    
    // 获取对应的编码器
    const config = this.FORMAT_CONFIG[format.toLowerCase()];
    const encoder = config.encoder;
    
    // 执行编码
    try {
      return await encoder.encode(audioBuffer, options);
    } catch (error) {
      throw new Error(`${format.toUpperCase()} 编码失败: ${error.message}`);
    }
  }
  
  /**
   * 验证格式是否有效
   * @param {string} format - 格式名称
   * @returns {boolean} 是否有效
   */
  static isValidFormat(format) {
    if (!format) return false;
    return format.toLowerCase() in this.FORMAT_CONFIG;
  }
  
  /**
   * 获取所有可用格式
   * @returns {string[]} 格式列表
   */
  static getAvailableFormats() {
    return Object.keys(this.FORMAT_CONFIG);
  }
  
  /**
   * 获取格式信息
   * @param {string} format - 格式名称
   * @returns {object|null} 格式配置信息
   */
  static getFormatInfo(format) {
    if (!format) return null;
    return this.FORMAT_CONFIG[format.toLowerCase()] || null;
  }
  
  /**
   * 预估编码后的文件大小
   * @param {number} duration - 音频时长（秒）
   * @param {string} format - 输出格式
   * @returns {object} 大小信息 { bytes, mb, formatted }
   */
  static estimateFileSize(duration, format = 'wav') {
    const config = this.getFormatInfo(format);
    if (!config) {
      throw new Error(`未知格式: ${format}`);
    }
    
    const bytes = Math.ceil(duration * config.sizeMultiplier * 1024 * 1024);
    const mb = bytes / 1024 / 1024;
    
    let formatted;
    if (mb >= 1) {
      formatted = `${mb.toFixed(2)} MB`;
    } else {
      const kb = bytes / 1024;
      formatted = `${kb.toFixed(2)} KB`;
    }
    
    return { bytes, mb, formatted };
  }
  
  /**
   * 预估编码时间
   * @param {number} duration - 音频时长（秒）
   * @param {string} format - 输出格式
   * @returns {object} 时间信息 { milliseconds, seconds, formatted }
   */
  static estimateEncodeTime(duration, format = 'wav') {
    const config = this.getFormatInfo(format);
    if (!config) {
      throw new Error(`未知格式: ${format}`);
    }
    
    // WAV 编码极快，基本恒定时间
    const milliseconds = parseFloat(WavEncoder.estimateEncodeTime(duration));
    const seconds = milliseconds / 1000;
    
    let formatted;
    if (seconds < 1) {
      formatted = `${Math.round(milliseconds)} 毫秒`;
    } else if (seconds < 60) {
      formatted = `${seconds.toFixed(1)} 秒`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      formatted = `${minutes} 分 ${remainingSeconds} 秒`;
    }
    
    return { milliseconds, seconds, formatted };
  }
  
  /**
   * 获取格式推荐（基于音频时长）
   * @param {number} duration - 音频时长（秒）
   * @returns {object} 推荐信息 { format, reason }
   */
  static getFormatRecommendation(duration) {
    const wavSize = this.estimateFileSize(duration, 'wav');
    return {
      format: 'wav',
      reason: `WAV 格式编码速度极快（<100ms），文件大小约 ${wavSize.formatted}`
    };
  }
  
  /**
   * 比较不同格式的输出
   * @param {number} duration - 音频时长（秒）
   * @returns {object} 比较结果
   */
  static compareFormats(duration) {
    const formats = this.getAvailableFormats();
    const comparison = {};
    
    for (const format of formats) {
      const config = this.getFormatInfo(format);
      const size = this.estimateFileSize(duration, format);
      const time = this.estimateEncodeTime(duration, format);
      
      comparison[format] = {
        name: config.name,
        description: config.description,
        quality: config.quality,
        speed: config.speed,
        estimatedSize: size.formatted,
        estimatedTime: time.formatted,
        sizeBytes: size.bytes,
        timeMs: time.milliseconds,
        recommended: config.recommended
      };
    }
    
    return comparison;
  }
  
  /**
   * 获取格式的文件扩展名
   * @param {string} format - 格式名称
   * @returns {string} 文件扩展名（包含点号）
   */
  static getFileExtension(format) {
    const config = this.getFormatInfo(format);
    return config ? config.extension : '.bin';
  }
  
  /**
   * 获取格式的 MIME 类型
   * @param {string} format - 格式名称
   * @returns {string} MIME 类型
   */
  static getMimeType(format) {
    const config = this.getFormatInfo(format);
    return config ? config.mimeType : 'application/octet-stream';
  }
  
  /**
   * 创建下载 Blob
   * @param {AudioBuffer} audioBuffer - 音频缓冲区
   * @param {string} format - 输出格式
   * @param {string} filename - 文件名（不含扩展名）
   * @param {object} options - 编码选项
   * @returns {Promise<object>} { blob, filename, mimeType }
   */
  static async createDownloadBlob(audioBuffer, format, filename, options = {}) {
    const blob = await this.encode(audioBuffer, format, options);
    const extension = this.getFileExtension(format);
    const mimeType = this.getMimeType(format);
    const fullFilename = filename.endsWith(extension) ? filename : filename + extension;
    
    return {
      blob,
      filename: fullFilename,
      mimeType
    };
  }
  
  /**
   * 验证编码配置
   * @param {object} config - 编码配置
   * @returns {object} 验证结果 { valid, errors }
   */
  static validateConfig(config) {
    const errors = [];
    
    if (!config) {
      errors.push('配置对象不能为空');
      return { valid: false, errors };
    }
    
    // 验证格式
    if (!config.format) {
      errors.push('必须指定输出格式');
    } else if (!this.isValidFormat(config.format)) {
      errors.push(`不支持的格式: ${config.format}`);
    }
    
    // 验证音频缓冲区
    if (!config.audioBuffer) {
      errors.push('必须提供音频缓冲区');
    } else if (!(config.audioBuffer instanceof AudioBuffer)) {
      errors.push('audioBuffer 必须是 AudioBuffer 实例');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
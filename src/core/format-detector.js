/**
 * 音频格式检测工具
 * 负责识别和验证音频文件格式
 */
export class FormatDetector {
  /**
   * 支持的音频格式配置
   */
  static SUPPORTED_FORMATS = {
    'mp3': {
      extensions: ['.mp3'],
      mimeTypes: ['audio/mpeg', 'audio/mp3'],
      description: 'MP3 音频'
    },
    'wav': {
      extensions: ['.wav'],
      mimeTypes: ['audio/wav', 'audio/x-wav', 'audio/wave'],
      description: 'WAV 音频'
    },
    'flac': {
      extensions: ['.flac'],
      mimeTypes: ['audio/flac', 'audio/x-flac'],
      description: 'FLAC 无损音频'
    },
    'm4a': {
      extensions: ['.m4a', '.mp4', '.aac'],
      mimeTypes: ['audio/mp4', 'audio/x-m4a', 'audio/aac'],
      description: 'M4A/AAC 音频'
    },
    'ogg': {
      extensions: ['.ogg', '.oga'],
      mimeTypes: ['audio/ogg', 'audio/vorbis'],
      description: 'OGG Vorbis 音频'
    },
    'webm': {
      extensions: ['.webm'],
      mimeTypes: ['audio/webm'],
      description: 'WebM 音频'
    }
  };
  
  /**
   * 根据文件检测格式
   * @param {File} file - 文件对象
   * @returns {object} 检测结果 { format, confidence, details }
   */
  static detectFromFile(file) {
    if (!file) {
      return {
        format: null,
        confidence: 0,
        details: '文件对象为空'
      };
    }
    
    const results = [];
    
    // 1. 从文件扩展名检测
    const extResult = this.detectFromExtension(file.name);
    if (extResult.format) {
      results.push({ ...extResult, source: 'extension' });
    }
    
    // 2. 从 MIME 类型检测
    const mimeResult = this.detectFromMimeType(file.type);
    if (mimeResult.format) {
      results.push({ ...mimeResult, source: 'mime' });
    }
    
    // 综合判断
    if (results.length === 0) {
      return {
        format: null,
        confidence: 0,
        details: '无法识别的音频格式'
      };
    }
    
    // 如果两种方法检测结果一致，置信度更高
    if (results.length === 2 && results[0].format === results[1].format) {
      return {
        format: results[0].format,
        confidence: 100,
        details: `通过文件扩展名和 MIME 类型确认为 ${results[0].format.toUpperCase()}`
      };
    }
    
    // 优先使用 MIME 类型的结果（更可靠）
    const mimeDetected = results.find(r => r.source === 'mime');
    if (mimeDetected) {
      return {
        format: mimeDetected.format,
        confidence: 85,
        details: `通过 MIME 类型检测为 ${mimeDetected.format.toUpperCase()}`
      };
    }
    
    // 使用扩展名结果
    return {
      format: results[0].format,
      confidence: 70,
      details: `通过文件扩展名检测为 ${results[0].format.toUpperCase()}`
    };
  }
  
  /**
   * 从文件扩展名检测格式
   * @param {string} filename - 文件名
   * @returns {object} 检测结果 { format, confidence }
   */
  static detectFromExtension(filename) {
    if (!filename || typeof filename !== 'string') {
      return { format: null, confidence: 0 };
    }
    
    const lowerName = filename.toLowerCase();
    
    for (const [format, config] of Object.entries(this.SUPPORTED_FORMATS)) {
      if (config.extensions.some(ext => lowerName.endsWith(ext))) {
        return {
          format,
          confidence: 70
        };
      }
    }
    
    return { format: null, confidence: 0 };
  }
  
  /**
   * 从 MIME 类型检测格式
   * @param {string} mimeType - MIME 类型
   * @returns {object} 检测结果 { format, confidence }
   */
  static detectFromMimeType(mimeType) {
    if (!mimeType || typeof mimeType !== 'string') {
      return { format: null, confidence: 0 };
    }
    
    const lowerMime = mimeType.toLowerCase();
    
    for (const [format, config] of Object.entries(this.SUPPORTED_FORMATS)) {
      if (config.mimeTypes.some(mime => lowerMime.includes(mime))) {
        return {
          format,
          confidence: 85
        };
      }
    }
    
    return { format: null, confidence: 0 };
  }
  
  /**
   * 验证格式是否支持
   * @param {string} format - 格式名称
   * @returns {boolean} 是否支持
   */
  static isSupported(format) {
    if (!format) return false;
    return format.toLowerCase() in this.SUPPORTED_FORMATS;
  }
  
  /**
   * 获取格式信息
   * @param {string} format - 格式名称
   * @returns {object|null} 格式配置信息
   */
  static getFormatInfo(format) {
    if (!format) return null;
    return this.SUPPORTED_FORMATS[format.toLowerCase()] || null;
  }
  
  /**
   * 获取所有支持的格式列表
   * @returns {string[]} 格式列表
   */
  static getSupportedFormats() {
    return Object.keys(this.SUPPORTED_FORMATS);
  }
  
  /**
   * 获取所有支持的扩展名
   * @returns {string[]} 扩展名列表
   */
  static getSupportedExtensions() {
    const extensions = [];
    for (const config of Object.values(this.SUPPORTED_FORMATS)) {
      extensions.push(...config.extensions);
    }
    return extensions;
  }
  
  /**
   * 获取所有支持的 MIME 类型
   * @returns {string[]} MIME 类型列表
   */
  static getSupportedMimeTypes() {
    const mimeTypes = [];
    for (const config of Object.values(this.SUPPORTED_FORMATS)) {
      mimeTypes.push(...config.mimeTypes);
    }
    return mimeTypes;
  }
  
  /**
   * 生成文件选择器的 accept 属性值
   * @returns {string} accept 属性值
   */
  static getFileInputAccept() {
    const extensions = this.getSupportedExtensions();
    const mimeTypes = this.getSupportedMimeTypes();
    return [...mimeTypes, ...extensions].join(',');
  }
  
  /**
   * 获取格式的友好描述
   * @param {string} format - 格式名称
   * @returns {string} 格式描述
   */
  static getFormatDescription(format) {
    const info = this.getFormatInfo(format);
    return info ? info.description : '未知格式';
  }
  
  /**
   * 检测浏览器是否支持特定格式的解码
   * @param {string} format - 格式名称
   * @returns {boolean} 是否支持
   */
  static isBrowserSupported(format) {
    const info = this.getFormatInfo(format);
    if (!info) return false;
    
    // 创建临时 audio 元素测试
    const audio = document.createElement('audio');
    
    // 测试 MIME 类型支持
    for (const mimeType of info.mimeTypes) {
      const canPlay = audio.canPlayType(mimeType);
      if (canPlay === 'probably' || canPlay === 'maybe') {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 获取所有浏览器支持的格式
   * @returns {string[]} 支持的格式列表
   */
  static getBrowserSupportedFormats() {
    return this.getSupportedFormats().filter(format => 
      this.isBrowserSupported(format)
    );
  }
  
  /**
   * 验证文件是否为有效的音频文件
   * @param {File} file - 文件对象
   * @returns {object} 验证结果 { valid, format, message }
   */
  static validateAudioFile(file) {
    if (!file) {
      return {
        valid: false,
        format: null,
        message: '未选择文件'
      };
    }
    
    // 检测格式
    const detection = this.detectFromFile(file);
    
    if (!detection.format) {
      return {
        valid: false,
        format: null,
        message: `不支持的文件格式。支持的格式：${this.getSupportedFormats().join(', ').toUpperCase()}`
      };
    }
    
    // 检查文件大小（限制 100MB）
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        format: detection.format,
        message: `文件过大（${(file.size / 1024 / 1024).toFixed(2)}MB），最大支持 100MB`
      };
    }
    
    return {
      valid: true,
      format: detection.format,
      message: `检测到 ${detection.format.toUpperCase()} 格式（置信度：${detection.confidence}%）`
    };
  }
}
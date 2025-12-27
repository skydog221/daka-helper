import { TIME_LIMITS, EXTEND_CONFIG, FILE_SIZE_LIMITS, UI_TEXT } from './constants.js';
import { TimeCalculator } from './time-calculator.js';

/**
 * 输入验证工具类
 */
export class Validator {
  /**
   * 验证文件选择
   * @param {File|object} file - 文件对象
   * @returns {{valid: boolean, error: string|null}} 验证结果
   */
  static validateFile(file) {
    if (!file) {
      return {
        valid: false,
        error: UI_TEXT.ERROR_NO_FILE
      };
    }
    
    // 验证文件大小
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > FILE_SIZE_LIMITS.MAX_INPUT_SIZE) {
      return {
        valid: false,
        error: `${UI_TEXT.ERROR_FILE_TOO_LARGE}（最大 ${FILE_SIZE_LIMITS.MAX_INPUT_SIZE}MB）`
      };
    }
    
    return { valid: true, error: null };
  }
  
  /**
   * 验证音频缓冲区
   * @param {AudioBuffer} buffer - 音频缓冲区
   * @returns {{valid: boolean, error: string|null}} 验证结果
   */
  static validateAudioBuffer(buffer) {
    if (!buffer) {
      return {
        valid: false,
        error: UI_TEXT.ERROR_DECODE_FAILED
      };
    }
    
    if (buffer.duration <= 0) {
      return {
        valid: false,
        error: '音频时长无效'
      };
    }
    
    return { valid: true, error: null };
  }
  
  /**
   * 验证目标时长（分钟和秒）
   * @param {number} minutes - 分钟数
   * @param {number} seconds - 秒数
   * @returns {{valid: boolean, message: string, duration: number}} 验证结果
   */
  static validateTargetDuration(minutes, seconds) {
    // 验证输入类型
    if (typeof minutes !== 'number' || typeof seconds !== 'number') {
      return {
        valid: false,
        message: UI_TEXT.ERROR_INVALID_DURATION || '时长输入无效',
        duration: 0
      };
    }
    
    // 验证范围
    if (minutes < 0 || seconds < 0) {
      return {
        valid: false,
        message: UI_TEXT.ERROR_INVALID_DURATION || '时长不能为负数',
        duration: 0
      };
    }
    
    if (seconds > 59) {
      return {
        valid: false,
        message: '秒数不能超过 59',
        duration: 0
      };
    }
    
    // 计算总时长并验证
    const totalDuration = TimeCalculator.minutesToSeconds(minutes, seconds);
    const durationValidation = TimeCalculator.validateDuration(totalDuration);
    
    if (!durationValidation.valid) {
      return {
        valid: false,
        message: durationValidation.message || durationValidation.error || '时长验证失败',
        duration: totalDuration
      };
    }
    
    return {
      valid: true,
      message: '验证通过',
      duration: totalDuration
    };
  }
  
  /**
   * 验证延长设置
   * @param {boolean} enabled - 是否启用延长
   * @param {number} seconds - 延长秒数
   * @returns {{valid: boolean, message: string}} 验证结果
   */
  static validateExtend(enabled, seconds) {
    if (!enabled) {
      return { valid: true, message: '验证通过' };
    }
    
    if (typeof seconds !== 'number' || isNaN(seconds)) {
      return {
        valid: false,
        message: '延长秒数必须是数字'
      };
    }
    
    const secondsValidation = TimeCalculator.validateExtendSeconds(seconds);
    if (!secondsValidation.valid) {
      return {
        valid: false,
        message: secondsValidation.message || secondsValidation.error || '延长秒数验证失败'
      };
    }
    
    return { valid: true, message: '验证通过' };
  }
  
  /**
   * 验证输出格式
   * @param {string} format - 输出格式
   * @returns {{valid: boolean, error: string|null}} 验证结果
   */
  static validateOutputFormat(format) {
    const validFormats = ['wav', 'mp3'];
    
    if (!format || !validFormats.includes(format.toLowerCase())) {
      return {
        valid: false,
        error: `不支持的输出格式: ${format}。支持的格式: ${validFormats.join(', ')}`
      };
    }
    
    return { valid: true, error: null };
  }
  
  /**
   * 验证处理配置（综合验证）
   * @param {object} config - 处理配置
   * @param {File} config.file - 文件对象
   * @param {AudioBuffer} config.audioBuffer - 音频缓冲区
   * @param {number} config.targetMinutes - 目标分钟数
   * @param {number} config.targetSeconds - 目标秒数
   * @param {boolean} config.extendEnabled - 是否启用延长
   * @param {number} config.extendSeconds - 延长秒数
   * @param {string} config.outputFormat - 输出格式
   * @returns {{valid: boolean, error: string|null, data: object}} 验证结果
   */
  static validateProcessConfig(config) {
    const {
      file,
      audioBuffer,
      targetMinutes,
      targetSeconds,
      extendEnabled,
      extendSeconds,
      outputFormat
    } = config;
    
    // 验证文件
    const fileValidation = this.validateFile(file);
    if (!fileValidation.valid) {
      return { valid: false, error: fileValidation.error, data: null };
    }
    
    // 验证音频缓冲区
    const bufferValidation = this.validateAudioBuffer(audioBuffer);
    if (!bufferValidation.valid) {
      return { valid: false, error: bufferValidation.error, data: null };
    }
    
    // 验证目标时长
    const durationValidation = this.validateTargetDuration(targetMinutes, targetSeconds);
    if (!durationValidation.valid) {
      return { valid: false, error: durationValidation.error, data: null };
    }
    
    // 验证延长设置
    const extendValidation = this.validateExtend(extendEnabled, extendSeconds);
    if (!extendValidation.valid) {
      return { valid: false, error: extendValidation.error, data: null };
    }
    
    // 验证输出格式
    const formatValidation = this.validateOutputFormat(outputFormat);
    if (!formatValidation.valid) {
      return { valid: false, error: formatValidation.error, data: null };
    }
    
    // 计算最终时长
    const baseDuration = durationValidation.duration;
    const finalDuration = extendEnabled
      ? TimeCalculator.calculateExtendedDuration(baseDuration, extendSeconds)
      : baseDuration;
    
    // 返回验证通过的数据
    return {
      valid: true,
      error: null,
      data: {
        baseDuration,
        finalDuration,
        extendExtra: finalDuration - baseDuration,
        outputFormat: outputFormat.toLowerCase()
      }
    };
  }
  
  /**
   * 验证输出文件大小警告
   * @param {number} duration - 音频时长（秒）
   * @param {string} format - 输出格式
   * @returns {{shouldWarn: boolean, message: string|null, estimatedSize: number}} 警告信息
   */
  static validateOutputSize(duration, format) {
    let estimatedSize; // MB
    
    if (format === 'wav') {
      // WAV: 44100 Hz * 16 bit * 2 channels = 10.5 MB/min
      estimatedSize = (duration / 60) * 10.5;
    } else if (format === 'mp3') {
      // MP3 192kbps: ~1.4 MB/min
      estimatedSize = (duration / 60) * 1.4;
    } else {
      estimatedSize = 0;
    }
    
    const shouldWarn = estimatedSize > FILE_SIZE_LIMITS.WARN_OUTPUT_SIZE;
    const message = shouldWarn
      ? `预计输出文件约 ${estimatedSize.toFixed(1)} MB，文件较大，处理可能需要较长时间`
      : null;
    
    return {
      shouldWarn,
      message,
      estimatedSize: parseFloat(estimatedSize.toFixed(2))
    };
  }
}
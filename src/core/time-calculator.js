import { TIME_LIMITS, EXTEND_CONFIG } from './constants.js';

/**
 * 时间计算工具类
 */
export class TimeCalculator {
  /**
   * 将分钟和秒转换为总秒数
   * @param {number} minutes - 分钟数
   * @param {number} seconds - 秒数
   * @returns {number} 总秒数
   */
  static minutesToSeconds(minutes, seconds = 0) {
    const totalSeconds = (minutes * 60) + seconds;
    return Math.max(TIME_LIMITS.MIN_DURATION, totalSeconds);
  }
  
  /**
   * 将总秒数转换为分钟和秒
   * @param {number} totalSeconds - 总秒数
   * @returns {{minutes: number, seconds: number}} 分钟和秒的对象
   */
  static secondsToMinutes(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return { minutes, seconds };
  }
  
  /**
   * 计算延长后的时长（随机延长）
   * @param {number} baseDuration - 基础时长（秒）
   * @param {number} maxExtendSeconds - 最大延长秒数（默认30秒）
   * @returns {number} 延长后的时长（秒）
   */
  static calculateExtendedDuration(baseDuration, maxExtendSeconds = EXTEND_CONFIG.DEFAULT_SECONDS) {
    if (maxExtendSeconds <= 0) {
      return baseDuration;
    }
    
    // 限制延长秒数范围
    const maxSeconds = Math.min(
      Math.max(maxExtendSeconds, EXTEND_CONFIG.MIN_SECONDS),
      EXTEND_CONFIG.MAX_SECONDS
    );
    
    // 在 0 到 maxSeconds 之间随机取整数值
    const randomExtend = Math.floor(Math.random() * (maxSeconds + 1));
    
    return baseDuration + randomExtend;
  }
  
  /**
   * 格式化时长为可读字符串（如 "5:30"）
   * @param {number} totalSeconds - 总秒数
   * @returns {string} 格式化的时间字符串
   */
  static formatDuration(totalSeconds) {
    const { minutes, seconds } = this.secondsToMinutes(totalSeconds);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  /**
   * 格式化时长为详细字符串（如 "5分30秒"）
   * @param {number} totalSeconds - 总秒数
   * @returns {string} 详细的时间字符串
   */
  static formatDurationVerbose(totalSeconds) {
    const { minutes, seconds } = this.secondsToMinutes(totalSeconds);
    
    if (minutes === 0) {
      return `${seconds}秒`;
    }
    
    if (seconds === 0) {
      return `${minutes}分钟`;
    }
    
    return `${minutes}分${seconds}秒`;
  }
  
  /**
   * 验证时长是否在有效范围内
   * @param {number} duration - 时长（秒）
   * @returns {{valid: boolean, error: string|null}} 验证结果
   */
  static validateDuration(duration) {
    if (!duration || duration < TIME_LIMITS.MIN_DURATION) {
      return {
        valid: false,
        error: `时长不能小于 ${TIME_LIMITS.MIN_DURATION} 秒`
      };
    }
    
    if (duration > TIME_LIMITS.MAX_DURATION) {
      const maxFormatted = this.formatDurationVerbose(TIME_LIMITS.MAX_DURATION);
      return {
        valid: false,
        error: `时长不能超过 ${maxFormatted}`
      };
    }
    
    return { valid: true, error: null };
  }
  
  /**
   * 验证延长秒数是否有效
   * @param {number} seconds - 延长秒数
   * @returns {{valid: boolean, error: string|null}} 验证结果
   */
  static validateExtendSeconds(seconds) {
    if (seconds < EXTEND_CONFIG.MIN_SECONDS || seconds > EXTEND_CONFIG.MAX_SECONDS) {
      return {
        valid: false,
        error: `延长秒数必须在 ${EXTEND_CONFIG.MIN_SECONDS}-${EXTEND_CONFIG.MAX_SECONDS} 之间`
      };
    }
    
    return { valid: true, error: null };
  }
  
  /**
   * 计算重复次数（音频需要重复多少次才能达到目标时长）
   * @param {number} sourceDuration - 源音频时长（秒）
   * @param {number} targetDuration - 目标时长（秒）
   * @returns {number} 重复次数（向上取整）
   */
  static calculateRepeatCount(sourceDuration, targetDuration) {
    if (sourceDuration <= 0) {
      throw new Error('源音频时长必须大于 0');
    }
    
    return Math.ceil(targetDuration / sourceDuration);
  }
  
  /**
   * 计算实际输出时长（考虑重复次数和裁剪）
   * @param {number} sourceDuration - 源音频时长（秒）
   * @param {number} targetDuration - 目标时长（秒）
   * @returns {{
   *   repeatCount: number,
   *   totalDuration: number,
   *   needTrim: boolean,
   *   trimDuration: number
   * }} 计算结果
   */
  static calculateOutputDuration(sourceDuration, targetDuration) {
    const repeatCount = this.calculateRepeatCount(sourceDuration, targetDuration);
    const totalDuration = repeatCount * sourceDuration;
    const needTrim = totalDuration > targetDuration;
    const trimDuration = needTrim ? totalDuration - targetDuration : 0;
    
    return {
      repeatCount,
      totalDuration,
      needTrim,
      trimDuration
    };
  }
  
  /**
   * 估算处理时间（秒）
   * @param {number} duration - 音频时长（秒）
   * @param {string} format - 输出格式（'wav' 或 'mp3'）
   * @returns {number} 估算的处理时间（秒）
   */
  static estimateProcessingTime(duration, format = 'wav') {
    if (format === 'wav') {
      // WAV 格式：几乎瞬间完成
      return 0.1;
    } else {
      // MP3 格式：192kbps 约 28x 实时速度
      return Math.ceil(duration / 28);
    }
  }
}
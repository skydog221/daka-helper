/**
 * 全局常量定义
 */

// 支持的音频格式
export const AUDIO_FORMATS = {
  WAV: 'wav',
  MP3: 'mp3',     // 仅支持输入，不支持输出
  FLAC: 'flac',
  M4A: 'm4a',
  OGG: 'ogg'
};

// 输出格式配置
export const OUTPUT_FORMATS = {
  [AUDIO_FORMATS.WAV]: {
    name: 'WAV',
    label: 'WAV（无损，瞬间完成）',
    mime: 'audio/wav',
    extension: '.wav',
    bitDepth: 16,
    recommended: true, // 默认推荐
    description: '无损格式，文件较大，编码速度极快（<100ms）'
  }
};

// 输入格式支持（浏览器原生解码）
export const INPUT_FORMATS = {
  [AUDIO_FORMATS.MP3]: {
    mime: 'audio/mpeg',
    extensions: ['.mp3'],
    browserSupport: ['Chrome', 'Firefox', 'Safari', 'Edge']
  },
  [AUDIO_FORMATS.WAV]: {
    mime: 'audio/wav',
    extensions: ['.wav'],
    browserSupport: ['Chrome', 'Firefox', 'Safari', 'Edge']
  },
  [AUDIO_FORMATS.FLAC]: {
    mime: 'audio/flac',
    extensions: ['.flac'],
    browserSupport: ['Chrome', 'Firefox', 'Edge']
  },
  [AUDIO_FORMATS.M4A]: {
    mime: 'audio/mp4',
    extensions: ['.m4a', '.mp4'],
    browserSupport: ['Chrome', 'Safari', 'Edge'] // Firefox 支持有限
  },
  [AUDIO_FORMATS.OGG]: {
    mime: 'audio/ogg',
    extensions: ['.ogg', '.oga'],
    browserSupport: ['Chrome', 'Firefox', 'Edge']
  }
};

// 采样率配置
export const SAMPLE_RATES = {
  CD_QUALITY: 44100,    // CD 音质
  DVD_QUALITY: 48000,   // DVD 音质
  HD_QUALITY: 96000     // 高清音质
};

// 比特率配置（已废弃，MP3 输出格式已移除）
// export const BIT_RATES = {
//   LOW: 128,       // 低质量
//   STANDARD: 192,  // 标准质量（默认）
//   HIGH: 256,      // 高质量
//   EXTREME: 320    // 极限质量
// };

// 时间限制
export const TIME_LIMITS = {
  MIN_DURATION: 1,        // 最小时长（秒）
  MAX_DURATION: 18000,    // 最大时长（秒，5小时）
  MAX_MINUTES: 300,       // 最大分钟数（5小时）
  MAX_SECONDS: 59         // 最大秒数
};

// 延长配置
export const EXTEND_CONFIG = {
  MIN_SECONDS: 0,        // 最小延长秒数
  MAX_SECONDS: 300,      // 最大延长秒数（5分钟）
  DEFAULT_SECONDS: 30    // 默认延长秒数
};

// 文件大小限制（MB）
export const FILE_SIZE_LIMITS = {
  MAX_INPUT_SIZE: 500,  // 最大输入文件（500MB）
  WARN_OUTPUT_SIZE: 100 // 输出文件警告阈值（100MB）
};

// UI 文本
export const UI_TEXT = {
  APP_NAME: '打卡音频生成器',
  VERSION: '2.0.0',
  DESCRIPTION: '统一架构版本 - 支持 WAV 输出',
  
  // 按钮文本
  BUTTON_SELECT_FILE: '选择音频文件',
  BUTTON_PROCESS: '开始处理',
  BUTTON_DOWNLOAD: '下载音频',
  BUTTON_RESET: '重置',
  
  // 提示信息
  HINT_SELECT_FILE: '支持 MP3, WAV, FLAC, M4A, OGG 格式',
  HINT_DURATION: '输入目标时长（分钟和秒）',
  HINT_EXTEND: '延长时长可避免被识别为机器打卡',
  HINT_FORMAT: 'WAV 格式速度极快（瞬间完成）',
  
  // 错误信息
  ERROR_NO_FILE: '请先选择音频文件',
  ERROR_INVALID_DURATION: '请输入有效的时长',
  ERROR_DURATION_TOO_SHORT: '时长不能小于 1 秒',
  ERROR_DURATION_TOO_LONG: '时长不能超过 5 小时',
  ERROR_FILE_TOO_LARGE: '文件大小超过限制',
  ERROR_DECODE_FAILED: '音频解码失败',
  ERROR_ENCODE_FAILED: '音频编码失败',
  ERROR_BROWSER_NOT_SUPPORTED: '您的浏览器不支持此音频格式',
  
  // 成功信息
  SUCCESS_PROCESSED: '处理完成！',
  SUCCESS_DOWNLOADED: '文件已下载',
  
  // 处理状态
  STATUS_LOADING: '加载中...',
  STATUS_DECODING: '解码音频...',
  STATUS_PROCESSING: '处理音频...',
  STATUS_ENCODING: '编码音频...',
  STATUS_COMPLETE: '完成'
};

// 性能指标
export const PERFORMANCE = {
  WAV_ENCODE_TIME: 100,     // WAV 编码时间（ms）
  MAX_PROCESSING_TIME: 300  // 最大处理时间（秒）
};

// 调试模式
export const DEBUG = {
  ENABLED: false,           // 是否启用调试模式
  LOG_PERFORMANCE: false,   // 是否记录性能数据
  LOG_AUDIO_INFO: false     // 是否记录音频信息
};
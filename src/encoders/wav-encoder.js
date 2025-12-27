/**
 * WAV 编码器（纯 JavaScript 实现）
 * 特点：瞬间完成编码（<100ms），文件大但兼容性 100%
 */
export class WavEncoder {
  /**
   * 将 AudioBuffer 编码为 WAV 格式
   * @param {AudioBuffer} audioBuffer - 音频缓冲区
   * @returns {Blob} WAV 格式的音频数据
   */
  static encode(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length * numberOfChannels * 2; // 16-bit = 2 bytes per sample
    
    // 创建 WAV 文件：44 字节头部 + PCM 数据
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    
    // RIFF 头部（12 字节）
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true); // 文件大小 - 8
    this.writeString(view, 8, 'WAVE');
    
    // fmt 子块（24 字节）
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);              // fmt 块大小
    view.setUint16(20, 1, true);               // 音频格式 (1 = PCM)
    view.setUint16(22, numberOfChannels, true); // 声道数
    view.setUint32(24, sampleRate, true);      // 采样率
    view.setUint32(28, sampleRate * numberOfChannels * 2, true); // 字节率
    view.setUint16(32, numberOfChannels * 2, true); // 块对齐
    view.setUint16(34, 16, true);              // 位深度 (16-bit)
    
    // data 子块头部（8 字节）
    this.writeString(view, 36, 'data');
    view.setUint32(40, length, true);          // PCM 数据大小
    
    // 写入 PCM 音频数据
    this.floatTo16BitPCM(view, 44, audioBuffer);
    
    return new Blob([buffer], { type: 'audio/wav' });
  }
  
  /**
   * 将字符串写入 DataView
   * @private
   */
  static writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  
  /**
   * 将 Float32Array 音频数据转换为 16-bit PCM 格式
   * @private
   */
  static floatTo16BitPCM(output, offset, audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    
    // 获取所有声道数据
    const channels = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }
    
    // 交错写入多声道数据
    let index = offset;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        // Float32 范围 [-1.0, 1.0] 转换为 Int16 范围 [-32768, 32767]
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        output.setInt16(index, int16, true); // little-endian
        index += 2;
      }
    }
  }
  
  /**
   * 获取 WAV 文件的预估大小（MB）
   * @param {number} duration - 音频时长（秒）
   * @param {number} channels - 声道数
   * @param {number} sampleRate - 采样率
   * @returns {number} 文件大小（MB）
   */
  static estimateSize(duration, channels = 2, sampleRate = 44100) {
    const dataSize = duration * channels * sampleRate * 2; // 16-bit = 2 bytes
    const totalSize = dataSize + 44; // 加上文件头
    return (totalSize / 1024 / 1024).toFixed(2);
  }
  
  /**
   * 预估 WAV 编码时间（毫秒）
   * WAV 编码非常快，基本是固定开销
   * @param {number} duration - 音频时长（秒）
   * @returns {number} 预估编码时间（毫秒）
   */
  static estimateEncodeTime(duration) {
    // WAV 编码速度极快，主要是内存复制开销
    // 基础开销 50ms + 每秒音频约 10ms
    const baseOverhead = 50;
    const perSecond = 10;
    return baseOverhead + (duration * perSecond);
  }
}
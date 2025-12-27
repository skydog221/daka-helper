/**
 * 音频重复处理核心算法
 * 负责将源音频重复到指定时长
 */
export class AudioRepeater {
  /**
   * 重复音频缓冲区到指定时长
   * @param {AudioBuffer} sourceBuffer - 源音频缓冲区
   * @param {number} targetDuration - 目标时长（秒）
   * @param {AudioContext} audioContext - 音频上下文
   * @param {Function} progressCallback - 进度回调函数 (progress: 0-100)
   * @returns {Promise<AudioBuffer>} 处理后的音频缓冲区
   */
  static async repeatAudio(sourceBuffer, targetDuration, audioContext, progressCallback = null) {
    if (!sourceBuffer || !audioContext) {
      throw new Error('缺少必要的参数: sourceBuffer 和 audioContext');
    }
    
    if (targetDuration <= 0) {
      throw new Error('目标时长必须大于 0');
    }
    
    const sampleRate = sourceBuffer.sampleRate;
    const channels = sourceBuffer.numberOfChannels;
    const totalSamples = Math.floor(targetDuration * sampleRate);
    
    // 创建新的音频缓冲区
    const newBuffer = audioContext.createBuffer(
      channels,
      totalSamples,
      sampleRate
    );
    
    // 复制音频数据到各个声道
    for (let channel = 0; channel < channels; channel++) {
      const sourceData = sourceBuffer.getChannelData(channel);
      const targetData = newBuffer.getChannelData(channel);
      const sourceLength = sourceData.length;
      
      let offset = 0;
      
      while (offset < totalSamples) {
        const remaining = totalSamples - offset;
        const copyLength = Math.min(remaining, sourceLength);
        
        // 复制数据
        targetData.set(sourceData.subarray(0, copyLength), offset);
        offset += copyLength;
        
        // 报告进度（每复制一次源音频更新一次）
        if (progressCallback) {
          const progress = Math.floor((offset / totalSamples) * 100);
          progressCallback(progress);
        }
        
        // 让出控制权，避免阻塞 UI（每 5 秒让出一次）
        if (offset % (sampleRate * 5) === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }
    
    // 确保最终进度为 100%
    if (progressCallback) {
      progressCallback(100);
    }
    
    return newBuffer;
  }
  
  /**
   * 计算需要重复的次数
   * @param {number} sourceDuration - 源音频时长（秒）
   * @param {number} targetDuration - 目标时长（秒）
   * @returns {number} 重复次数
   */
  static calculateRepeatCount(sourceDuration, targetDuration) {
    if (sourceDuration <= 0) {
      throw new Error('源音频时长必须大于 0');
    }
    
    return Math.ceil(targetDuration / sourceDuration);
  }
  
  /**
   * 预估处理时间（毫秒）
   * @param {number} targetDuration - 目标时长（秒）
   * @param {number} channels - 声道数
   * @returns {number} 预估处理时间（毫秒）
   */
  static estimateProcessingTime(targetDuration, channels = 2) {
    // 基于实测：处理速度约为 0.1ms/秒/声道
    const baseTime = targetDuration * channels * 0.1;
    
    // 添加 20% 的缓冲时间
    return Math.ceil(baseTime * 1.2);
  }
  
  /**
   * 验证音频缓冲区是否有效
   * @param {AudioBuffer} buffer - 音频缓冲区
   * @returns {boolean} 是否有效
   */
  static isValidAudioBuffer(buffer) {
    if (!buffer) return false;
    if (!(buffer instanceof AudioBuffer)) return false;
    if (buffer.duration <= 0) return false;
    if (buffer.numberOfChannels <= 0) return false;
    if (buffer.length <= 0) return false;
    
    return true;
  }
  
  /**
   * 获取音频缓冲区信息
   * @param {AudioBuffer} buffer - 音频缓冲区
   * @returns {object} 音频信息
   */
  static getBufferInfo(buffer) {
    if (!this.isValidAudioBuffer(buffer)) {
      throw new Error('无效的音频缓冲区');
    }
    
    return {
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      length: buffer.length,
      sizeInBytes: buffer.length * buffer.numberOfChannels * 4, // Float32 = 4 bytes
      sizeInMB: (buffer.length * buffer.numberOfChannels * 4 / 1024 / 1024).toFixed(2)
    };
  }
  
  /**
   * 裁剪音频缓冲区到指定时长
   * @param {AudioBuffer} sourceBuffer - 源音频缓冲区
   * @param {number} duration - 目标时长（秒）
   * @param {AudioContext} audioContext - 音频上下文
   * @returns {AudioBuffer} 裁剪后的音频缓冲区
   */
  static trimAudio(sourceBuffer, duration, audioContext) {
    if (!this.isValidAudioBuffer(sourceBuffer)) {
      throw new Error('无效的音频缓冲区');
    }
    
    if (duration >= sourceBuffer.duration) {
      return sourceBuffer; // 不需要裁剪
    }
    
    const sampleRate = sourceBuffer.sampleRate;
    const channels = sourceBuffer.numberOfChannels;
    const targetSamples = Math.floor(duration * sampleRate);
    
    // 创建新的音频缓冲区
    const newBuffer = audioContext.createBuffer(
      channels,
      targetSamples,
      sampleRate
    );
    
    // 复制数据
    for (let channel = 0; channel < channels; channel++) {
      const sourceData = sourceBuffer.getChannelData(channel);
      const targetData = newBuffer.getChannelData(channel);
      targetData.set(sourceData.subarray(0, targetSamples));
    }
    
    return newBuffer;
  }
  
  /**
   * 连接多个音频缓冲区
   * @param {AudioBuffer[]} buffers - 音频缓冲区数组
   * @param {AudioContext} audioContext - 音频上下文
   * @returns {AudioBuffer} 连接后的音频缓冲区
   */
  static concatenateAudioBuffers(buffers, audioContext) {
    if (!buffers || buffers.length === 0) {
      throw new Error('缓冲区数组不能为空');
    }
    
    if (buffers.length === 1) {
      return buffers[0];
    }
    
    // 验证所有缓冲区具有相同的采样率和声道数
    const firstBuffer = buffers[0];
    const sampleRate = firstBuffer.sampleRate;
    const channels = firstBuffer.numberOfChannels;
    
    for (const buffer of buffers) {
      if (buffer.sampleRate !== sampleRate) {
        throw new Error('所有音频缓冲区必须具有相同的采样率');
      }
      if (buffer.numberOfChannels !== channels) {
        throw new Error('所有音频缓冲区必须具有相同的声道数');
      }
    }
    
    // 计算总长度
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
    
    // 创建新的音频缓冲区
    const newBuffer = audioContext.createBuffer(
      channels,
      totalLength,
      sampleRate
    );
    
    // 复制数据
    for (let channel = 0; channel < channels; channel++) {
      const targetData = newBuffer.getChannelData(channel);
      let offset = 0;
      
      for (const buffer of buffers) {
        const sourceData = buffer.getChannelData(channel);
        targetData.set(sourceData, offset);
        offset += buffer.length;
      }
    }
    
    return newBuffer;
  }
}
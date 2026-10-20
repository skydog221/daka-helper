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
   * @param {object} options - 输出参数（sampleRate/targetSampleRate、channels）
   * @returns {Promise<AudioBuffer>} 处理后的音频缓冲区
   */
  static async repeatAudio(
    sourceBuffer,
    targetDuration,
    audioContext,
    progressCallback = null,
    options = {}
  ) {
    if (!sourceBuffer || !audioContext) {
      throw new Error('缺少必要的参数: sourceBuffer 和 audioContext');
    }

    if (targetDuration <= 0) {
      throw new Error('目标时长必须大于 0');
    }

    // 直接在目标采样率生成重复结果，避免先创建高采样率中间 AudioBuffer。
    const requestedSampleRate = options.sampleRate || options.targetSampleRate || sourceBuffer.sampleRate;
    const outputSampleRate = Math.min(
      sourceBuffer.sampleRate,
      Math.max(16000, requestedSampleRate)
    );
    const outputChannels = options.channels === 1
      ? 1
      : Math.min(options.channels || sourceBuffer.numberOfChannels, sourceBuffer.numberOfChannels);
    const sourceChannels = Array.from(
      { length: sourceBuffer.numberOfChannels },
      (_, channel) => sourceBuffer.getChannelData(channel)
    );
    const sourceLength = sourceBuffer.length;
    const sourceDuration = sourceBuffer.duration;
    const totalSamples = Math.max(1, Math.floor(targetDuration * outputSampleRate));
    const sourceSamplesAtOutputRate = Math.max(1, Math.floor(sourceDuration * outputSampleRate));
    const loopSamples = Math.min(sourceSamplesAtOutputRate, totalSamples);
    const newBuffer = audioContext.createBuffer(outputChannels, totalSamples, outputSampleRate);
    const outputData = Array.from(
      { length: outputChannels },
      (_, channel) => newBuffer.getChannelData(channel)
    );
    const sourceLoopData = Array.from(
      { length: outputChannels },
      () => new Float32Array(loopSamples)
    );
    const sourceChunkSize = Math.max(1, Math.floor(outputSampleRate));
    let lastProgress = -1;

    // 只对一个源音频循环做一次重采样和混音，后续重复使用 TypedArray 原生复制。
    for (let start = 0; start < loopSamples; start += sourceChunkSize) {
      const end = Math.min(loopSamples, start + sourceChunkSize);
      for (let i = start; i < end; i += 1) {
        const sourceFrameAtOutputRate = i % sourceSamplesAtOutputRate;
        const sourceIndex = Math.min(
          sourceLength - 1,
          Math.floor(sourceFrameAtOutputRate * sourceBuffer.sampleRate / outputSampleRate)
        );

        if (outputChannels === 1) {
          let mixed = 0;
          for (const channelData of sourceChannels) {
            mixed += channelData[sourceIndex] || 0;
          }
          sourceLoopData[0][i] = mixed / sourceChannels.length;
        } else {
          for (let channel = 0; channel < outputChannels; channel += 1) {
            sourceLoopData[channel][i] = sourceChannels[channel][sourceIndex] || 0;
          }
        }
      }

      if (progressCallback) {
        const progress = Math.floor((end / loopSamples) * 20);
        if (progress !== lastProgress) {
          progressCallback(progress);
          lastProgress = progress;
        }
      }

      // 每秒源音频让出一次控制权，避免重采样阶段阻塞界面。
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // 先写入一个源循环，再按倍增方式复制，避免逐周期调用 TypedArray.set。
    for (let channel = 0; channel < outputChannels; channel += 1) {
      outputData[channel].set(sourceLoopData[channel]);
    }

    let filledSamples = loopSamples;
    while (filledSamples < totalSamples) {
      const copyLength = Math.min(filledSamples, totalSamples - filledSamples);
      for (let channel = 0; channel < outputChannels; channel += 1) {
        outputData[channel].copyWithin(filledSamples, 0, copyLength);
      }
      filledSamples += copyLength;

      if (progressCallback) {
        const progress = 20 + Math.floor((filledSamples / totalSamples) * 80);
        if (progress !== lastProgress) {
          progressCallback(progress);
          lastProgress = progress;
        }
      }

      // 每次倍增复制后让出控制权，长音频仍保持可交互。
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    if (progressCallback && lastProgress !== 100) {
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


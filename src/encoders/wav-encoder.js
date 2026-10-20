/**
 * WAV 编码器（纯 JavaScript 实现）
 * 特点：瞬间完成编码（<100ms），语音优先、体积小且兼容性好
 */
export class WavEncoder {
  /**
   * 将 AudioBuffer 编码为 WAV 格式
   * @param {AudioBuffer} audioBuffer - 音频缓冲区
   * @param {object} options - 编码选项
   * @param {number} options.targetSampleRate - 目标采样率
   * @param {number} options.channels - 目标声道数（1 或 2）
   * @param {number} options.bitDepth - 位深度（8 或 16）
   * @returns {Blob} WAV 格式的音频数据
   */
  static encode(audioBuffer, options = {}) {
    const { targetSampleRate = 16000, channels = 1, bitDepth = 16 } = options;

    const sourceSampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const outputSampleRate = Math.min(targetSampleRate, sourceSampleRate);
    const outputChannels = channels === 1 ? 1 : Math.min(2, numberOfChannels);
    const outputBitDepth = bitDepth === 8 ? 8 : 16;
    const bytesPerSample = outputBitDepth / 8;
    const sampleRateRatio = sourceSampleRate / outputSampleRate;
    const outputLength = Math.floor(audioBuffer.length / sampleRateRatio);
    const dataSize = outputLength * outputChannels * bytesPerSample;

    // 创建 WAV 文件：44 字节头部 + PCM 数据
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF 头部（12 字节）
    this.writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true); // 文件大小 - 8
    this.writeString(view, 8, "WAVE");

    // fmt 子块（24 字节）
    this.writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // fmt 块大小
    view.setUint16(20, 1, true); // 音频格式 (1 = PCM)
    view.setUint16(22, outputChannels, true); // 声道数
    view.setUint32(24, outputSampleRate, true); // 采样率
    view.setUint32(
      28,
      outputSampleRate * outputChannels * bytesPerSample,
      true,
    ); // 字节率
    view.setUint16(32, outputChannels * bytesPerSample, true); // 块对齐
    view.setUint16(34, outputBitDepth, true); // 位深度

    // data 子块头部（8 字节）
    this.writeString(view, 36, "data");
    view.setUint32(40, dataSize, true); // PCM 数据大小

    // 准备声道数据
    const sourceChannels = [];
    for (let i = 0; i < numberOfChannels; i++) {
      sourceChannels.push(audioBuffer.getChannelData(i));
    }

    // 主路径已经在 AudioRepeater 中完成了重采样、混音和单声道处理。
    // 对 16kHz/单声道/16-bit 音频直接写入字节数组，避免每个采样调用 DataView 方法。
    if (
      outputSampleRate === sourceSampleRate &&
      outputChannels === 1 &&
      outputBitDepth === 16 &&
      numberOfChannels === 1
    ) {
      const pcmData = new Int16Array(buffer, 44);
      const sourceData = sourceChannels[0];
      for (let i = 0; i < outputLength; i += 1) {
        const sample = sourceData[i];
        pcmData[i] =
          sample <= -1 ? -32768 : sample >= 1 ? 32767 : (sample * (sample < 0 ? 0x8000 : 0x7fff)) | 0;
      }
      return new Blob([buffer], { type: "audio/wav" });
    }

    // 写入 PCM 音频数据（重采样 + 单声道）
    let offset = 44;
    for (let i = 0; i < outputLength; i++) {
      const sourceIndex = Math.floor(i * sampleRateRatio);

      if (outputChannels === 1) {
        let mixed = 0;
        for (let c = 0; c < numberOfChannels; c++) {
          mixed += sourceChannels[c][sourceIndex] || 0;
        }
        mixed = mixed / numberOfChannels;
        offset = this.writeSample(view, offset, mixed, outputBitDepth);
      } else {
        for (let c = 0; c < outputChannels; c++) {
          const channelIndex = Math.min(c, numberOfChannels - 1);
          const sample = sourceChannels[channelIndex][sourceIndex] || 0;
          offset = this.writeSample(view, offset, sample, outputBitDepth);
        }
      }
    }

    return new Blob([buffer], { type: "audio/wav" });
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
   * 写入单个采样
   * @private
   */
  static writeSample(view, offset, sample, bitDepth) {
    const clamped = Math.max(-1, Math.min(1, sample));
    if (bitDepth === 8) {
      const int8 = Math.round(clamped * 127 + 128);
      view.setUint8(offset, int8);
      return offset + 1;
    }

    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, int16, true);
    return offset + 2;
  }

  /**
   * 获取 WAV 文件的预估大小（MB）
   * @param {number} duration - 音频时长（秒）
   * @param {number} channels - 声道数
   * @param {number} sampleRate - 采样率
   * @returns {number} 文件大小（MB）
   */
  static estimateSize(
    duration,
    channels = 1,
    sampleRate = 16000,
    bitDepth = 16,
  ) {
    const bytesPerSample = bitDepth / 8;
    const dataSize = duration * channels * sampleRate * bytesPerSample;
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
    // 主路径使用直接字节写入，编码时间主要是遍历 PCM 数据。
    // 预估值用于 UI 提示，保留少量固定开销与长音频余量。
    const baseOverhead = 5;
    const perSecond = 0.05;
    return baseOverhead + duration * perSecond;
  }
}

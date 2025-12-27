/**
 * MP3 编码器（基于 lamejs）
 * 默认 192kbps：速度快 40%（相比 320kbps），音质优秀（接近 CD 质量）
 *
 * 注意：需要先通过 <script> 标签加载 lamejs 库
 */
export class Mp3Encoder {
  static get lamejs() {
    if (typeof window !== 'undefined' && window.lamejs) {
      return window.lamejs;
    }
    throw new Error('lamejs 库未加载。请在 HTML 中添加: <script src="https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js"></script>');
  }
  /**
   * 将 AudioBuffer 编码为 MP3 格式
   * @param {AudioBuffer} audioBuffer - 音频缓冲区
   * @param {Object} options - 编码选项
   * @param {number} options.bitRate - 比特率（kbps），默认 192
   * @returns {Blob} MP3 格式的音频数据
   */
  static encode(audioBuffer, options = {}) {
    const { bitRate = 192 } = options; // 默认 192kbps（快速 + 高质量）
    const sampleRate = audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;
    
    // 创建 MP3 编码器
    const encoder = new this.lamejs.Mp3Encoder(channels, sampleRate, bitRate);
    
    // 获取音频通道数据并转换为 Int16
    const samples = this._getChannelData(audioBuffer);
    
    // 分块编码（lamejs 要求每次处理 1152 个样本）
    const mp3Data = [];
    const sampleBlockSize = 1152;
    
    if (channels === 1) {
      // 单声道编码
      for (let i = 0; i < samples[0].length; i += sampleBlockSize) {
        const sampleChunk = samples[0].subarray(i, i + sampleBlockSize);
        const mp3buf = encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }
    } else {
      // 立体声编码
      for (let i = 0; i < samples[0].length; i += sampleBlockSize) {
        const leftChunk = samples[0].subarray(i, i + sampleBlockSize);
        const rightChunk = samples[1].subarray(i, i + sampleBlockSize);
        const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }
    }
    
    // 完成编码（flush 缓冲区）
    const mp3buf = encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    
    // 合并所有 MP3 数据块
    const totalLength = mp3Data.reduce((acc, arr) => acc + arr.length, 0);
    const mp3Buffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of mp3Data) {
      mp3Buffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new Blob([mp3Buffer], { type: 'audio/mpeg' });
  }
  
  /**
   * 获取音频通道数据并转换为 Int16Array
   * @private
   * @param {AudioBuffer} audioBuffer - 音频缓冲区
   * @returns {Int16Array[]} Int16 格式的通道数据数组
   */
  static _getChannelData(audioBuffer) {
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const result = [];
    
    for (let ch = 0; ch < channels; ch++) {
      const float32 = audioBuffer.getChannelData(ch);
      const int16 = new Int16Array(length);
      
      // Float32 [-1.0, 1.0] 转换为 Int16 [-32768, 32767]
      for (let i = 0; i < length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i])); // 限制范围
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      result.push(int16);
    }
    
    return result;
  }
  
  /**
   * 估算 MP3 文件大小（MB）
   * @param {number} duration - 音频时长（秒）
   * @param {number} bitRate - 比特率（kbps）
   * @returns {number} 文件大小（MB）
   */
  static estimateSize(duration, bitRate = 192) {
    const sizeInBits = duration * bitRate * 1000; // kbps -> bps
    const sizeInBytes = sizeInBits / 8;
    return (sizeInBytes / 1024 / 1024).toFixed(2);
  }
  
  /**
   * 估算编码时间（秒）
   * @param {number} duration - 音频时长（秒）
   * @param {number} bitRate - 比特率（kbps）
   * @returns {number} 编码时间（秒）
   */
  static estimateEncodeTime(duration, bitRate = 192) {
    // 实测数据：192kbps 约 28x 实时速度，320kbps 约 20x 实时速度
    const speedFactor = bitRate <= 192 ? 28 : 20;
    return (duration / speedFactor).toFixed(1);
  }
}
/**
 * AudioRecorder - 录音核心模块
 * 使用 MediaRecorder API 实现录音功能，支持自动保存机制
 * 遵循静态方法模式，与 AudioRepeater 模块保持一致
 */
export class AudioRecorder {
  // 状态枚举
  static State = {
    IDLE: 'idle',
    RECORDING: 'recording',
    PAUSED: 'paused',
    STOPPED: 'stopped'
  };

  // 内部状态
  static #recorder = null;
  static #stream = null;
  static #audioContext = null;
  static #analyser = null;
  static #sourceNode = null;
  static #currentState = AudioRecorder.State.IDLE;
  static #recordedChunks = [];
  static #recordedBlob = null;
  static #startTime = 0;
  static #pausedTime = 0;
  static #pauseStartTime = 0;
  static #progressCallback = null;
  static #errorCallback = null;
  static #autoSaveInterval = null;
  static #fullSaveInterval = null;
  static #autoSaveStartTime = 0; // 自动保存开始时间
  static #autoSavePausedTime = 0; // 自动保存暂停时间

  // 自动保存配置
  static #SAVE_CONFIG = {
    quickInterval: 30000,    // 30秒快速保存（内存）
    fullInterval: 300000,     // 5分钟完整保存（临时文件）
    tempDir: './temp/recordings'
  };

  // 最大录音时长限制（1小时）
  static MAX_RECORDING_DURATION = 60 * 60 * 1000;

  /**
   * 开始录音
   * @param {Object} config - 录音配置
   * @param {string} config.mimeType - MIME类型，默认 'audio/webm'
   * @param {number} config.audioBitsPerSecond - 比特率
   * @param {function} config.onProgress - 进度回调 (duration: number)
   * @param {function} config.onError - 错误回调 (error: Error)
   * @returns {Promise<boolean>} 成功返回true
   * @throws {Error} 录音失败时抛出错误
   */
  static async startRecording(config = {}) {
    console.log('[AudioRecorder] startRecording 被调用，config:', config);
    
    // 验证当前状态
    if (this.#currentState !== AudioRecorder.State.IDLE &&
        this.#currentState !== AudioRecorder.State.STOPPED) {
      throw new Error(`无法开始录音：当前状态为 ${this.#currentState}`);
    }

    const {
      mimeType = 'audio/webm',
      audioBitsPerSecond = 128000,
      onProgress = null,
      onError = null
    } = config;

    try {
      console.log('[AudioRecorder] 请求麦克风权限...');
      // 请求麦克风权限并获取音频流
      this.#stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('[AudioRecorder] 音频流获取成功，tracks:', this.#stream.getTracks().length);

      // 创建音频上下文和分析器用于波形可视化
      console.log('[AudioRecorder] 创建音频上下文...');
      this.#audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.#analyser = this.#audioContext.createAnalyser();
      this.#sourceNode = this.#audioContext.createMediaStreamSource(this.#stream);
      this.#sourceNode.connect(this.#analyser);
      this.#analyser.fftSize = 256;
      this.#analyser.smoothingTimeConstant = 0.8;
      console.log('[AudioRecorder] 音频分析器创建成功，fftSize:', this.#analyser.fftSize);

      // 检测浏览器支持的MIME类型
      const supportedMimeType = this.#getSupportedMimeType(mimeType);
      if (!supportedMimeType) {
        throw new Error('浏览器不支持任何音频录音格式');
      }
      console.log('[AudioRecorder] 支持的MIME类型:', supportedMimeType);

      // 创建 MediaRecorder 实例
      this.#recorder = new MediaRecorder(this.#stream, {
        mimeType: supportedMimeType,
        audioBitsPerSecond
      });
      console.log('[AudioRecorder] MediaRecorder 创建成功');

      // 重置录制数据
      this.#recordedChunks = [];
      this.#recordedBlob = null;
      this.#startTime = Date.now();
      this.#pausedTime = 0;
      this.#pauseStartTime = 0;
      this.#autoSaveStartTime = Date.now(); // 记录自动保存开始时间
      this.#currentState = AudioRecorder.State.RECORDING;
      this.#progressCallback = onProgress;
      this.#errorCallback = onError;
      console.log('[AudioRecorder] 状态初始化完成，开始录音');

      // 设置事件监听器
      this.#recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.#recordedChunks.push(event.data);
        }
      };

      this.#recorder.onerror = (event) => {
        const error = new Error(`录音错误: ${event.error || '未知错误'}`);
        console.error('[AudioRecorder] 录音错误:', error);
        
        // 调用错误回调
        if (this.#errorCallback) {
          this.#errorCallback(error);
        }

        // 尝试保存已录制的数据
        this.#saveOnEmergency();
      };

      this.#recorder.onstop = () => {
        this.#currentState = AudioRecorder.State.STOPPED;
        this.#cleanup();
      };

      // 开始录音
      this.#recorder.start(1000); // 每1秒触发一次dataavailable
      console.log('[AudioRecorder] MediaRecorder.start() 调用成功');
      
      // 启动定时自动保存
      this.#startAutoSave();

      // 设置最大录音时长检查定时器
      setTimeout(() => {
        if (this.#currentState === AudioRecorder.State.RECORDING ||
            this.#currentState === AudioRecorder.State.PAUSED) {
          console.warn('[AudioRecorder] 录音时长超过最大限制，强制停止');
          this.stopRecording().catch(error => {
            console.error('[AudioRecorder] 强制停止失败:', error);
          });
          if (this.#errorCallback) {
            this.#errorCallback(new Error('录音时长超过最大限制（1小时）'));
          }
        }
      }, AudioRecorder.MAX_RECORDING_DURATION);

      console.log('[AudioRecorder] startRecording 完成，返回true');
      return true;
    } catch (error) {
      console.error('[AudioRecorder] 开始录音失败:', error);
      
      // 处理权限错误
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('麦克风权限被拒绝，请允许访问麦克风');
      } else if (error.name === 'NotFoundError') {
        throw new Error('未检测到麦克风设备');
      } else {
        throw error;
      }
    }
  }

  /**
   * 停止录音
   * @returns {Promise<Blob>} 返回录音数据
   * @throws {Error} 没有录音数据时抛出错误
   */
  static async stopRecording() {
    if (this.#currentState === AudioRecorder.State.IDLE) {
      throw new Error('没有正在进行的录音');
    }

    // 停止录音
    if (this.#recorder && this.#recorder.state !== 'inactive') {
      this.#recorder.stop();
    }

    // 停止自动保存
    this.#stopAutoSave();

    // 生成Blob
    const blob = await this.#generateBlob();
    this.#recordedBlob = blob;

    // 清理资源
    this.#cleanup();

    return blob;
  }

  /**
   * 暂停录音
   * @returns {boolean} 成功返回true
   * @throws {Error} 当前状态不允许暂停时抛出错误
   */
  static pauseRecording() {
    if (this.#currentState !== AudioRecorder.State.RECORDING) {
      throw new Error('当前状态不允许暂停');
    }

    if (this.#recorder && this.#recorder.state === 'recording') {
      this.#recorder.pause();
      this.#pauseStartTime = Date.now();
      this.#currentState = AudioRecorder.State.PAUSED;
      
      // 暂停自动保存
      this.#pauseAutoSave();
      
      return true;
    }

    throw new Error('无法暂停录音');
  }

  /**
   * 恢复录音
   * @returns {boolean} 成功返回true
   * @throws {Error} 当前状态不允许恢复时抛出错误
   */
  static resumeRecording() {
    if (this.#currentState !== AudioRecorder.State.PAUSED) {
      throw new Error('当前状态不允许恢复');
    }

    if (this.#recorder && this.#recorder.state === 'paused') {
      this.#recorder.resume();
      this.#pausedTime += (Date.now() - this.#pauseStartTime);
      this.#currentState = AudioRecorder.State.RECORDING;
      
      // 恢复自动保存
      this.#resumeAutoSave();
      
      return true;
    }

    throw new Error('无法恢复录音');
  }

  /**
   * 获取当前录音状态
   * @returns {string} 状态值 (idle/recording/paused/stopped)
   */
  static getRecordingState() {
    return this.#currentState;
  }

  /**
   * 获取已录音的Blob数据
   * @returns {Promise<Blob|null>} 录音数据
   */
  static async getRecordedBlob() {
    if (this.#recordedBlob) {
      return this.#recordedBlob;
    }

    if (this.#recordedChunks.length === 0) {
      return null;
    }

    // 动态生成Blob
    return await this.#generateBlob();
  }

  /**
   * 获取录音时长（秒）
   * @returns {number} 时长（秒）
   */
  static getDuration() {
    if (this.#startTime === 0) {
      return 0;
    }

    let duration = (Date.now() - this.#startTime - this.#pausedTime) / 1000;
    
    // 如果已停止，使用最终时长
    if (this.#currentState === AudioRecorder.State.STOPPED && this.#recordedBlob) {
      return Math.max(0, duration);
    }

    return Math.max(0, duration);
  }

  /**
   * 获取录音文件大小（字节）
   * @returns {Promise<number>} 文件大小
   */
  static async getFileSize() {
    const blob = await this.getRecordedBlob();
    return blob ? blob.size : 0;
  }

  /**
   * 保存录音到指定路径
   * @param {string} filename - 文件名
   * @param {string} format - 格式（webm/ogg/wav）
   * @returns {Promise<string>} 保存的文件路径
   */
  static async saveRecording(filename, format = 'webm') {
    const blob = await this.getRecordedBlob();
    
    if (!blob) {
      throw new Error('没有录音数据可保存');
    }

    // 确定文件扩展名
    const extension = format.startsWith('.') ? format : `.${format}`;
    const fullFilename = filename.endsWith(extension) ? filename : `${filename}${extension}`;

    // 在浏览器环境中，下载文件
    if (typeof window !== 'undefined') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fullFilename;
      a.click();
      URL.revokeObjectURL(url);
      
      return fullFilename;
    }

    // 在Electron环境中，保存到文件系统
    if (typeof require !== 'undefined') {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      // 使用操作系统默认下载路径，避免依赖electron.remote
      const savePath = path.join(os.homedir(), 'Downloads', fullFilename);
      const buffer = Buffer.from(await blob.arrayBuffer());
      
      fs.writeFileSync(savePath, buffer);
      
      return savePath;
    }

    throw new Error('不支持的运行环境');
  }

  /**
   * 清理临时文件和缓存
   * @returns {Promise<number>} 清理的文件数量
   */
  static async clearTemporaryFiles() {
    if (typeof require === 'undefined') {
      console.warn('[AudioRecorder] 浏览器环境不支持清理临时文件');
      return 0;
    }

    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    // 使用操作系统默认临时目录，避免依赖electron.remote
    const tempDir = path.join(os.tmpdir(), this.#SAVE_CONFIG.tempDir);
    
    if (!fs.existsSync(tempDir)) {
      return 0;
    }

    let cleanedCount = 0;
    
    try {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        
        // 删除7天前的临时文件
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (stats.mtimeMs < sevenDaysAgo) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      }
    } catch (error) {
      console.error('[AudioRecorder] 清理临时文件失败:', error);
    }

    return cleanedCount;
  }

 /**
   * 获取音频分析器用于波形可视化
   * @returns {AnalyserNode|null} 分析器节点
   */
 static getAnalyser() {
   return this.#analyser;
 }

 /**
   * 重置录音器状态
   * @returns {void}
   */
 static reset() {
   this.#cleanup();
   this.#recordedChunks = [];
   this.#recordedBlob = null;
   this.#startTime = 0;
   this.#pausedTime = 0;
   this.#pauseStartTime = 0;
   this.#currentState = AudioRecorder.State.IDLE;
   this.#progressCallback = null;
   this.#errorCallback = null;
   this.#stopAutoSave();
 }

  // ============ 私有方法 ============

  /**
   * 获取浏览器支持的MIME类型
   * @private
   */
  static #getSupportedMimeType(preferredMimeType) {
    const types = [
      preferredMimeType,
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`[AudioRecorder] 使用格式: ${type}`);
        return type;
      }
    }

    return null;
  }

  /**
   * 生成Blob数据
   * @private
   */
  static async #generateBlob() {
    if (this.#recordedChunks.length === 0) {
      return null;
    }

    // 确保mimeType有默认值，避免null
    const mimeType = this.#recorder?.mimeType || this.#getSupportedMimeType('audio/webm') || 'audio/webm';
    return new Blob(this.#recordedChunks, { type: mimeType });
  }

  /**
   * 清理资源
   * @private
   */
 static #cleanup() {
   // 停止音频流
   if (this.#stream) {
     this.#stream.getTracks().forEach(track => track.stop());
     this.#stream = null;
   }

   // 清理音频分析器
   if (this.#sourceNode) {
     this.#sourceNode.disconnect();
     this.#sourceNode = null;
   }
   if (this.#analyser) {
     this.#analyser.disconnect();
     this.#analyser = null;
   }
   if (this.#audioContext && this.#audioContext.state !== 'closed') {
     this.#audioContext.close();
     this.#audioContext = null;
   }

   // 停止自动保存
   this.#stopAutoSave();
 }

  /**
   * 启动自动保存
   * @private
   */
  static #startAutoSave() {
    const elapsed = Date.now() - this.#autoSaveStartTime;
    
    // 快速保存（每30秒），考虑已经过的时间
    const quickDelay = Math.max(0, this.#SAVE_CONFIG.quickInterval - elapsed);
    this.#autoSaveInterval = setTimeout(() => {
      this.#saveToMemory();
      // 之后每30秒保存一次
      this.#autoSaveInterval = setInterval(() => {
        this.#saveToMemory();
      }, this.#SAVE_CONFIG.quickInterval);
    }, quickDelay);

    // 完整保存（每5分钟），考虑已经过的时间
    const fullDelay = Math.max(0, this.#SAVE_CONFIG.fullInterval - elapsed);
    this.#fullSaveInterval = setTimeout(() => {
      this.#saveToTempFile();
      // 之后每5分钟保存一次
      this.#fullSaveInterval = setInterval(() => {
        this.#saveToTempFile();
      }, this.#SAVE_CONFIG.fullInterval);
    }, fullDelay);
  }

  /**
   * 停止自动保存
   * @private
   */
  static #stopAutoSave() {
    if (this.#autoSaveInterval) {
      clearTimeout(this.#autoSaveInterval);
      clearInterval(this.#autoSaveInterval);
      this.#autoSaveInterval = null;
    }

    if (this.#fullSaveInterval) {
      clearTimeout(this.#fullSaveInterval);
      clearInterval(this.#fullSaveInterval);
      this.#fullSaveInterval = null;
    }
  }

  /**
   * 暂停自动保存
   * @private
   */
  static #pauseAutoSave() {
    this.#autoSavePausedTime = Date.now();
    this.#stopAutoSave();
  }

  /**
   * 恢复自动保存
   * @private
   */
  static #resumeAutoSave() {
    const pausedDuration = Date.now() - this.#autoSavePausedTime;
    this.#autoSaveStartTime += pausedDuration;
    this.#startAutoSave();
  }

  /**
   * 保存到内存缓存
   * @private
   */
  static async #saveToMemory() {
    try {
      const blob = await this.#generateBlob();
      if (blob && this.#progressCallback) {
        const duration = this.getDuration();
        this.#progressCallback(duration);
        console.log(`[AudioRecorder] 快速保存: 时长=${duration.toFixed(2)}s, 大小=${(blob.size / 1024).toFixed(2)}KB`);
      }
    } catch (error) {
      console.error('[AudioRecorder] 内存保存失败:', error);
    }
  }

  /**
   * 保存到临时文件
   * @private
   */
  static async #saveToTempFile() {
    if (typeof require === 'undefined') {
      console.warn('[AudioRecorder] 浏览器环境不支持保存到临时文件');
      return;
    }

    try {
      const blob = await this.#generateBlob();
      if (!blob) return;

      const fs = require('fs');
      const path = require('path');
      const { app } = require('electron').remote || require('@electron/remote');

      // 确保临时目录存在
      const tempDir = path.join(app.getPath('temp'), this.#SAVE_CONFIG.tempDir);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // 生成文件名（时间戳）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = blob.type.includes('ogg') ? '.ogg' : '.webm';
      const filename = `recording-${timestamp}${extension}`;
      const filePath = path.join(tempDir, filename);

      // 保存文件
      const buffer = Buffer.from(await blob.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      console.log(`[AudioRecorder] 临时文件保存: ${filePath}`);
    } catch (error) {
      console.error('[AudioRecorder] 临时文件保存失败:', error);
    }
  }

  /**
   * 异常时自动保存
   * @private
   */
  static async #saveOnEmergency() {
    try {
      const blob = await this.#generateBlob();
      if (!blob) return;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `emergency-${timestamp}.webm`;
      
      await this.saveRecording(filename);
      console.log('[AudioRecorder] 异常保存成功');
    } catch (error) {
      console.error('[AudioRecorder] 异常保存失败:', error);
    }
  }
}
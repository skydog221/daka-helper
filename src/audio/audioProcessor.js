const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const { EventEmitter } = require("events");

/**
 * 音频处理器类
 * 负责音频文件的读取、拼接、重复和导出
 */
class AudioProcessor extends EventEmitter {
  constructor() {
    super();
    this.tempDir = path.join(__dirname, "../../temp");
    this.ensureTempDir();
  }

  /**
   * 确保临时目录存在
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 获取音频文件信息
   * @param {string} filePath - 音频文件路径
   * @returns {Promise<Object>} 音频信息
   */
  async getAudioInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`无法读取音频文件信息: ${err.message}`));
          return;
        }

        const audioStream = metadata.streams.find(
          (stream) => stream.codec_type === "audio"
        );
        if (!audioStream) {
          reject(new Error("文件中未找到音频流"));
          return;
        }

        resolve({
          duration: parseFloat(audioStream.duration) || 0,
          bitrate: parseInt(audioStream.bit_rate) || 0,
          sampleRate: parseInt(audioStream.sample_rate) || 0,
          channels: parseInt(audioStream.channels) || 0,
          codec: audioStream.codec_name || "unknown",
          format: metadata.format.format_name || "unknown",
        });
      });
    });
  }

  /**
   * 处理音频文件
   * @param {Object} options - 处理选项
   * @param {string} options.inputPath - 输入文件路径
   * @param {number} options.targetDuration - 目标时长（秒）
   * @param {boolean} options.randomExtend - 是否随机延长
   * @param {number} options.randomRange - 随机延长范围（秒）
   * @param {string} options.outputFormat - 输出格式
   * @param {string} options.outputPath - 输出文件路径
   * @returns {Promise<string>} 输出文件路径
   */
  async processAudio(options) {
    const {
      inputPath,
      targetDuration,
      randomExtend = false,
      randomRange = 0,
      outputFormat = "mp3",
      outputPath,
    } = options;

    try {
      // 获取原始音频信息
      const audioInfo = await this.getAudioInfo(inputPath);
      const originalDuration = audioInfo.duration;

      if (originalDuration <= 0) {
        throw new Error("无法获取音频时长");
      }

      // 计算最终目标时长
      let finalDuration = targetDuration;
      if (randomExtend && randomRange > 0) {
        const randomSeconds = Math.random() * randomRange;
        finalDuration += randomSeconds;
      }

      this.emit("progress", { stage: "calculating", progress: 10 });

      // 如果原始时长已经大于等于目标时长，直接转换格式
      if (originalDuration >= finalDuration) {
        return await this.convertAudio(
          inputPath,
          outputPath,
          outputFormat,
          finalDuration
        );
      }

      // 计算需要重复的次数
      const repeatCount = Math.ceil(finalDuration / originalDuration);

      this.emit("progress", { stage: "preparing", progress: 20 });

      // 创建重复音频
      const repeatedAudioPath = await this.repeatAudio(inputPath, repeatCount);

      this.emit("progress", { stage: "processing", progress: 60 });

      // 截取到目标时长并转换格式
      const result = await this.convertAudio(
        repeatedAudioPath,
        outputPath,
        outputFormat,
        finalDuration
      );

      // 清理临时文件
      this.cleanupTempFile(repeatedAudioPath);

      this.emit("progress", { stage: "completed", progress: 100 });

      return result;
    } catch (error) {
      throw new Error(`音频处理失败: ${error.message}`);
    }
  }

  /**
   * 重复音频文件
   * @param {string} inputPath - 输入文件路径
   * @param {number} repeatCount - 重复次数
   * @returns {Promise<string>} 重复后的临时文件路径
   */
  async repeatAudio(inputPath, repeatCount) {
    return new Promise((resolve, reject) => {
      const tempOutputPath = path.join(
        this.tempDir,
        `repeated_${Date.now()}.wav`
      );

      // 创建输入文件列表
      const inputList = Array(repeatCount).fill(inputPath);

      let command = ffmpeg();

      // 添加所有输入文件
      inputList.forEach((file) => {
        command = command.input(file);
      });

      // 使用 concat 滤镜拼接音频
      const filterComplex =
        inputList.map((_, index) => `[${index}:a]`).join("") +
        `concat=n=${repeatCount}:v=0:a=1[out]`;

      command
        .complexFilter(filterComplex)
        .outputOptions(["-map", "[out]"])
        .output(tempOutputPath)
        .on("progress", (progress) => {
          const percent = Math.min(Math.max(progress.percent || 0, 0), 100);
          this.emit("progress", {
            stage: "repeating",
            progress: 20 + percent * 0.4, // 20-60%
          });
        })
        .on("end", () => {
          resolve(tempOutputPath);
        })
        .on("error", (err) => {
          reject(new Error(`音频重复失败: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * 转换音频格式并截取时长
   * @param {string} inputPath - 输入文件路径
   * @param {string} outputPath - 输出文件路径
   * @param {string} format - 输出格式
   * @param {number} duration - 目标时长（秒）
   * @returns {Promise<string>} 输出文件路径
   */
  async convertAudio(inputPath, outputPath, format, duration) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // 设置输出时长
      if (duration > 0) {
        command = command.duration(duration);
      }

      // 根据格式设置编码器和选项
      switch (format.toLowerCase()) {
        case "mp3":
          command = command.audioCodec("libmp3lame").audioBitrate("192k");
          break;
        case "wav":
          command = command.audioCodec("pcm_s16le");
          break;
        case "flac":
          command = command.audioCodec("flac");
          break;
        case "aac":
          command = command.audioCodec("aac").audioBitrate("128k");
          break;
        default:
          command = command.audioCodec("libmp3lame").audioBitrate("192k");
      }

      command
        .output(outputPath)
        .on("progress", (progress) => {
          const percent = Math.min(Math.max(progress.percent || 0, 0), 100);
          this.emit("progress", {
            stage: "converting",
            progress: 60 + percent * 0.4, // 60-100%
          });
        })
        .on("end", () => {
          resolve(outputPath);
        })
        .on("error", (err) => {
          reject(new Error(`音频转换失败: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * 清理临时文件
   * @param {string} filePath - 文件路径
   */
  cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`清理临时文件失败: ${error.message}`);
    }
  }

  /**
   * 格式化时间显示
   * @param {number} seconds - 秒数
   * @returns {string} 格式化的时间字符串
   */
  static formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
  }

  /**
   * 解析时间字符串为秒数
   * @param {string} timeString - 时间字符串 (HH:MM:SS 或 MM:SS)
   * @returns {number} 秒数
   */
  static parseTime(timeString) {
    const parts = timeString.split(":").map((part) => parseInt(part, 10));

    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      // SS
      return parts[0];
    }

    return 0;
  }
}

module.exports = AudioProcessor;

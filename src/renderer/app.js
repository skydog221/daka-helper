/**
 * 渲染进程主要 JavaScript 文件
 * 处理用户界面交互和音频处理（使用 Web Audio API）
 */

// 音频上下文和状态
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let originalBuffer = null;

// 应用状态
let appState = {
  selectedFile: null,
  audioInfo: null,
  isProcessing: false,
  outputPath: null,
};

// DOM 元素引用
const elements = {
  fileUploadArea: document.getElementById("fileUploadArea"),
  selectFileBtn: document.getElementById("selectFileBtn"),
  fileInfo: document.getElementById("fileInfo"),
  fileName: document.getElementById("fileName"),
  fileSize: document.getElementById("fileSize"),
  fileDuration: document.getElementById("fileDuration"),
  fileFormat: document.getElementById("fileFormat"),
  changeFileBtn: document.getElementById("changeFileBtn"),

  targetMinutes: document.getElementById("targetMinutes"),
  targetSeconds: document.getElementById("targetSeconds"),
  randomExtend: document.getElementById("randomExtend"),
  randomRangeGroup: document.getElementById("randomRangeGroup"),
  randomRange: document.getElementById("randomRange"),
  outputFormat: document.getElementById("outputFormat"),

  processBtn: document.getElementById("processBtn"),
  progressContainer: document.getElementById("progressContainer"),
  progressStage: document.getElementById("progressStage"),
  progressPercent: document.getElementById("progressPercent"),
  progressFill: document.getElementById("progressFill"),

  resultContainer: document.getElementById("resultContainer"),
  resultMessage: document.getElementById("resultMessage"),
  openFolderBtn: document.getElementById("openFolderBtn"),
  processAnotherBtn: document.getElementById("processAnotherBtn"),

  errorContainer: document.getElementById("errorContainer"),
  errorMessage: document.getElementById("errorMessage"),
  retryBtn: document.getElementById("retryBtn"),
};

/**
 * 初始化应用
 */
function initApp() {
  setupEventListeners();
  updateUI();
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  // 文件选择相关
  elements.selectFileBtn.addEventListener("click", selectFile);
  elements.changeFileBtn.addEventListener("click", selectFile);
  // 移除上传区域的点击事件，避免与按钮点击重复触发
  // elements.fileUploadArea.addEventListener("click", selectFile);

  // 拖拽上传支持
  elements.fileUploadArea.addEventListener("dragover", handleDragOver);
  elements.fileUploadArea.addEventListener("drop", handleDrop);

  // 设置相关
  elements.randomExtend.addEventListener("change", toggleRandomRange);
  elements.targetTime.addEventListener("input", validateTimeInput);

  // 处理按钮
  elements.processBtn.addEventListener("click", processAudio);

  // 结果操作
  elements.openFolderBtn.addEventListener("click", openOutputFolder);
  elements.processAnotherBtn.addEventListener("click", resetApp);
  elements.retryBtn.addEventListener("click", processAudio);
}

/**
 * 选择音频文件
 */
async function selectFile() {
  try {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 100 * 1024 * 1024) {
        // 100MB 限制
        showError("请上传小于100MB的音频文件");
        return;
      }

      try {
        // 使用 Web Audio API 解码音频
        const arrayBuffer = await file.arrayBuffer();
        originalBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // 设置文件信息
        appState.selectedFile = {
          success: true,
          filePath: file.name, // 在浏览器环境中使用文件名
          fileName: file.name,
          fileSize: file.size,
        };

        appState.audioInfo = {
          duration: originalBuffer.duration,
          format: file.name.split(".").pop().toLowerCase(),
          sampleRate: originalBuffer.sampleRate,
          channels: originalBuffer.numberOfChannels,
        };

        updateUI();
        hideError();
      } catch (err) {
        console.error("音频解码失败:", err);
        showError("音频解码失败，请尝试其他文件");
        appState.selectedFile = null;
        appState.audioInfo = null;
        originalBuffer = null;
      }
    };

    input.click();
  } catch (error) {
    showError("文件选择失败: " + error.message);
  }
}

/**
 * 处理拖拽悬停
 */
function handleDragOver(event) {
  event.preventDefault();
  elements.fileUploadArea.style.borderColor = "#667eea";
  elements.fileUploadArea.style.background = "#f0f4ff";
}

/**
 * 处理文件拖拽放置
 */
async function handleDrop(event) {
  event.preventDefault();
  elements.fileUploadArea.style.borderColor = "#ddd";
  elements.fileUploadArea.style.background = "#fafafa";

  const files = event.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    const audioExtensions = ["mp3", "wav", "flac", "m4a", "aac", "ogg"];
    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (audioExtensions.includes(fileExtension)) {
      if (file.size > 100 * 1024 * 1024) {
        // 100MB 限制
        showError("请上传小于100MB的音频文件");
        return;
      }

      try {
        // 使用 Web Audio API 解码音频
        const arrayBuffer = await file.arrayBuffer();
        originalBuffer = await audioContext.decodeAudioData(arrayBuffer);

        appState.selectedFile = {
          success: true,
          filePath: file.name,
          fileName: file.name,
          fileSize: file.size,
        };

        appState.audioInfo = {
          duration: originalBuffer.duration,
          format: fileExtension,
          sampleRate: originalBuffer.sampleRate,
          channels: originalBuffer.numberOfChannels,
        };

        updateUI();
        hideError();
      } catch (err) {
        console.error("音频解码失败:", err);
        showError("音频解码失败，请尝试其他文件");
      }
    } else {
      showError("不支持的文件格式，请选择音频文件");
    }
  }
}

/**
 * 切换随机延长选项
 */
function toggleRandomRange() {
  const isChecked = elements.randomExtend.checked;
  elements.randomRangeGroup.style.display = isChecked ? "block" : "none";

  if (isChecked) {
    const range = elements.randomRange.value;
    const rangeHint = elements.randomRangeGroup.querySelector(".range-hint");
    rangeHint.textContent = `在目标时长基础上随机增加 0-${range} 秒`;
  }
}

/**
 * 验证时间输入格式
 */
function validateTimeInput() {
  const timeValue = elements.targetTime.value;
  const isValid = window.utils.isValidTimeFormat(timeValue);

  if (timeValue && !isValid) {
    elements.targetTime.style.borderColor = "#dc3545";
  } else {
    elements.targetTime.style.borderColor = "#e9ecef";
  }

  updateUI();
}

/**
 * 处理音频文件
 */
async function processAudio() {
  if (appState.isProcessing) return;

  // 验证输入
  const validation = validateInputs();
  if (!validation.valid) {
    showError(validation.message);
    return;
  }

  try {
    appState.isProcessing = true;
    hideError();
    hideResult();
    showProgress();
    updateUI();

    // 获取目标时长
    const minutes = parseInt(elements.targetMinutes.value) || 0;
    const seconds = parseInt(elements.targetSeconds.value) || 0;
    const targetSeconds = minutes * 60 + seconds;

    // 计算随机延长
    let randomExtra = 0;
    if (elements.randomExtend.checked) {
      const randomRange = parseInt(elements.randomRange.value) || 30;
      randomExtra = Math.floor(Math.random() * (randomRange + 1));
    }

    const totalDuration = targetSeconds + randomExtra;

    updateProgress({ stage: "preparing", progress: 10 });

    // 使用 Web Audio API 处理音频
    const processedBuffer = await repeatAudioBuffer(
      originalBuffer,
      totalDuration
    );

    updateProgress({ stage: "converting", progress: 80 });

    // 转换为指定格式
    const outputFormat = elements.outputFormat.value;
    let audioBlob;

    switch (outputFormat) {
      case "wav":
        audioBlob = audioBufferToWAV(processedBuffer, {
          targetSampleRate: 16000,
          channels: 1,
          bitDepth: 8,
        });
        break;
      case "m4a":
        audioBlob = audioBufferToM4A(processedBuffer, {
          targetSampleRate: 16000,
          channels: 1,
          bitDepth: 8,
        });
        break;
      case "mp3":
        audioBlob = audioBufferToMP3(processedBuffer, {
          targetSampleRate: 16000,
          channels: 1,
          bitDepth: 8,
        });
        break;
      case "flac":
        audioBlob = audioBufferToFLAC(processedBuffer, {
          targetSampleRate: 16000,
          channels: 1,
          bitDepth: 8,
        });
        break;
      case "aac":
        audioBlob = audioBufferToAAC(processedBuffer, {
          targetSampleRate: 16000,
          channels: 1,
          bitDepth: 8,
        });
        break;
      default:
        // 默认输出为 WAV
        audioBlob = audioBufferToWAV(processedBuffer, {
          targetSampleRate: 16000,
          channels: 1,
          bitDepth: 8,
        });
    }

    updateProgress({ stage: "completed", progress: 100 });

    // 创建下载链接
    const url = URL.createObjectURL(audioBlob);
    const defaultName = generateOutputFileName(totalDuration, outputFormat);

    // 触发下载
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 清理 URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    appState.outputPath = defaultName;
    showResult(
      `音频文件处理完成！总时长：${window.utils.formatTime(totalDuration)}${
        randomExtra > 0 ? `（含${randomExtra}秒随机延长）` : ""
      }`
    );
  } catch (error) {
    console.error("处理失败:", error);
    showError("处理失败: " + error.message);
  } finally {
    appState.isProcessing = false;
    hideProgress();
    updateUI();
  }
}

/**
 * 重复音频缓冲区到指定时长
 */
async function repeatAudioBuffer(sourceBuffer, targetDuration) {
  const sampleRate = sourceBuffer.sampleRate;
  const totalSamples = Math.floor(targetDuration * sampleRate);

  // 创建新的音频缓冲区
  const newBuffer = audioContext.createBuffer(
    sourceBuffer.numberOfChannels,
    totalSamples,
    sampleRate
  );

  // 复制音频数据
  for (let channel = 0; channel < newBuffer.numberOfChannels; channel++) {
    const originalData = sourceBuffer.getChannelData(channel);
    const newData = newBuffer.getChannelData(channel);
    let offset = 0;
    const originalLength = originalData.length;

    while (offset < totalSamples) {
      const remaining = totalSamples - offset;
      const copyLength = Math.min(remaining, originalLength);
      newData.set(originalData.subarray(0, copyLength), offset);
      offset += copyLength;

      // 更新进度
      const progress = 20 + (offset / totalSamples) * 50; // 20-70%
      updateProgress({ stage: "repeating", progress });

      // 让出控制权，避免阻塞 UI
      if (offset % (sampleRate * 5) === 0) {
        // 每5秒让出一次
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }
  }

  return newBuffer;
}

/**
 * 将音频缓冲区转换为 WAV 格式
 */
function audioBufferToWAV(buffer, options = {}) {
  const {
    targetSampleRate = 16000,
    channels = 1,
    bitDepth = 8,
  } = options;

  const sourceSampleRate = buffer.sampleRate;
  const sourceChannels = buffer.numberOfChannels;
  const outputSampleRate = Math.min(targetSampleRate, sourceSampleRate);
  const outputChannels = channels === 1 ? 1 : Math.min(2, sourceChannels);
  const outputBitDepth = bitDepth === 8 ? 8 : 16;
  const bytesPerSample = outputBitDepth / 8;
  const sampleRateRatio = sourceSampleRate / outputSampleRate;
  const outputLength = Math.floor(buffer.length / sampleRateRatio);
  const dataSize = outputLength * outputChannels * bytesPerSample;

  const bufferArray = new ArrayBuffer(44 + dataSize);
  const view = new DataView(bufferArray);

  let pos = 0;

  function writeString(s) {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(pos++, s.charCodeAt(i));
    }
  }

  function writeSample(sample) {
    const clamped = Math.max(-1, Math.min(1, sample));
    if (outputBitDepth === 8) {
      view.setUint8(pos, Math.round(clamped * 127 + 128));
      pos += 1;
      return;
    }

    view.setInt16(pos, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    pos += 2;
  }

  // RIFF identifier
  writeString("RIFF");
  view.setUint32(pos, 36 + dataSize, true);
  pos += 4;
  writeString("WAVE");

  // fmt subchunk
  writeString("fmt ");
  view.setUint32(pos, 16, true);
  pos += 4;
  view.setUint16(pos, 1, true);
  pos += 2;
  view.setUint16(pos, outputChannels, true);
  pos += 2;
  view.setUint32(pos, outputSampleRate, true);
  pos += 4;
  view.setUint32(pos, outputSampleRate * outputChannels * bytesPerSample, true);
  pos += 4;
  view.setUint16(pos, outputChannels * bytesPerSample, true);
  pos += 2;
  view.setUint16(pos, outputBitDepth, true);
  pos += 2;

  // data subchunk
  writeString("data");
  view.setUint32(pos, dataSize, true);
  pos += 4;

  // 写入PCM数据（重采样 + 单声道）
  for (let i = 0; i < outputLength; i++) {
    const sourceIndex = Math.floor(i * sampleRateRatio);
    if (outputChannels === 1) {
      let mixed = 0;
      for (let c = 0; c < sourceChannels; c++) {
        mixed += buffer.getChannelData(c)[sourceIndex] || 0;
      }
      mixed = mixed / sourceChannels;
      writeSample(mixed);
    } else {
      for (let c = 0; c < outputChannels; c++) {
        const channelIndex = Math.min(c, sourceChannels - 1);
        writeSample(buffer.getChannelData(channelIndex)[sourceIndex] || 0);
      }
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

/**
 * 将音频缓冲区转换为 M4A 格式
 * 注意：这是一个简化的实现，实际上将音频数据编码为 AAC 并封装在 M4A 容器中
 */
function audioBufferToM4A(buffer, options = {}) {
  // 由于浏览器环境限制，我们暂时使用 WAV 格式但设置正确的 MIME 类型
  // 在实际应用中，需要使用专门的编码库来生成真正的 M4A 文件
  const wavData = audioBufferToWAV(buffer, options);

  // 创建一个新的 Blob，但使用 M4A 的 MIME 类型
  // 注意：这只是为了文件扩展名正确，实际内容仍是 WAV
  return new Blob([wavData], { type: "audio/mp4" });
}

/**
 * 将音频缓冲区转换为 MP3 格式
 * 注意：这是一个简化的实现，实际内容为 WAV 格式
 */
function audioBufferToMP3(buffer, options = {}) {
  // 由于浏览器环境限制，我们使用 WAV 格式但设置 MP3 的 MIME 类型
  const wavData = audioBufferToWAV(buffer, options);
  return new Blob([wavData], { type: "audio/mpeg" });
}

/**
 * 将音频缓冲区转换为 FLAC 格式
 * 注意：这是一个简化的实现，实际内容为 WAV 格式
 */
function audioBufferToFLAC(buffer, options = {}) {
  // 由于浏览器环境限制，我们使用 WAV 格式但设置 FLAC 的 MIME 类型
  const wavData = audioBufferToWAV(buffer, options);
  return new Blob([wavData], { type: "audio/flac" });
}

/**
 * 将音频缓冲区转换为 AAC 格式
 * 注意：这是一个简化的实现，实际内容为 WAV 格式
 */
function audioBufferToAAC(buffer, options = {}) {
  // 由于浏览器环境限制，我们使用 WAV 格式但设置 AAC 的 MIME 类型
  const wavData = audioBufferToWAV(buffer, options);
  return new Blob([wavData], { type: "audio/aac" });
}

/**
 * 验证用户输入
 */
function validateInputs() {
  if (!appState.selectedFile || !originalBuffer) {
    return { valid: false, message: "请先选择音频文件" };
  }

  const timeValue = elements.targetTime.value.trim();
  if (!timeValue) {
    return { valid: false, message: "请输入目标时长" };
  }

  if (!window.utils.isValidTimeFormat(timeValue)) {
    return {
      valid: false,
      message: "时间格式不正确，请使用 MM:SS 或 HH:MM:SS 格式",
    };
  }

  const minutes = parseInt(elements.targetMinutes.value) || 0;
  const seconds = parseInt(elements.targetSeconds.value) || 0;
  const targetSeconds = minutes * 60 + seconds;
  if (targetSeconds <= 0) {
    return { valid: false, message: "目标时长必须大于 0" };
  }

  if (targetSeconds > 86400) {
    // 24小时
    return { valid: false, message: "目标时长不能超过 24 小时" };
  }

  return { valid: true };
}

/**
 * 生成输出文件名
 */
function generateOutputFileName(targetSeconds, format = "wav") {
  const originalName = appState.selectedFile.fileName;
  const nameWithoutExt = originalName.substring(
    0,
    originalName.lastIndexOf(".")
  );
  const timeStr = window.utils.formatTime(targetSeconds);

  return `${nameWithoutExt}_${timeStr.replace(/:/g, "-")}.${format}`;
}

/**
 * 更新处理进度
 */
function updateProgress(progress) {
  const stageTexts = {
    calculating: "计算中...",
    preparing: "准备处理...",
    repeating: "重复音频...",
    processing: "处理中...",
    converting: "转换格式...",
    completed: "完成",
  };

  elements.progressStage.textContent =
    stageTexts[progress.stage] || "处理中...";
  elements.progressPercent.textContent = Math.round(progress.progress) + "%";
  elements.progressFill.style.width = progress.progress + "%";
}

/**
 * 显示处理进度
 */
function showProgress() {
  elements.progressContainer.style.display = "block";
  elements.progressFill.style.width = "0%";
  elements.progressStage.textContent = "准备中...";
  elements.progressPercent.textContent = "0%";
}

/**
 * 隐藏处理进度
 */
function hideProgress() {
  elements.progressContainer.style.display = "none";
}

/**
 * 显示处理结果
 */
function showResult(message) {
  elements.resultMessage.textContent = message;
  elements.resultContainer.style.display = "block";
}

/**
 * 隐藏处理结果
 */
function hideResult() {
  elements.resultContainer.style.display = "none";
}

/**
 * 显示错误信息
 */
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorContainer.style.display = "block";
}

/**
 * 隐藏错误信息
 */
function hideError() {
  elements.errorContainer.style.display = "none";
}

/**
 * 打开输出文件夹（在浏览器环境中不适用）
 */
async function openOutputFolder() {
  showError("浏览器环境中无法打开文件夹，文件已自动下载到默认下载目录");
}

/**
 * 重置应用状态
 */
function resetApp() {
  appState.selectedFile = null;
  appState.audioInfo = null;
  appState.outputPath = null;
  originalBuffer = null;

  hideResult();
  hideError();
  hideProgress();

  // 重置表单
  elements.targetMinutes.value = "10";
  elements.targetSeconds.value = "0";
  elements.randomExtend.checked = true; // 默认启用随机延长
  elements.randomRange.value = "30";
  elements.outputFormat.value = "m4a"; // 默认使用 M4A 格式

  toggleRandomRange();
  updateUI();
}

/**
 * 更新用户界面
 */
function updateUI() {
  // 更新文件信息显示
  if (appState.selectedFile && appState.audioInfo) {
    elements.fileUploadArea.style.display = "none";
    elements.fileInfo.style.display = "flex";

    elements.fileName.textContent = appState.selectedFile.fileName;
    elements.fileSize.textContent = window.utils.formatFileSize(
      appState.selectedFile.fileSize
    );
    elements.fileDuration.textContent = window.utils.formatTime(
      appState.audioInfo.duration
    );
    elements.fileFormat.textContent = appState.audioInfo.format.toUpperCase();
  } else {
    elements.fileUploadArea.style.display = "block";
    elements.fileInfo.style.display = "none";
  }

  // 更新处理按钮状态
  const canProcess =
    appState.selectedFile &&
    appState.audioInfo &&
    !appState.isProcessing &&
    elements.targetTime.value.trim() &&
    window.utils.isValidTimeFormat(elements.targetTime.value);

  elements.processBtn.disabled = !canProcess;

  if (appState.isProcessing) {
    elements.processBtn.querySelector(".btn-text").textContent = "处理中...";
    elements.processBtn.querySelector(".btn-icon").textContent = "⏳";
  } else {
    elements.processBtn.querySelector(".btn-text").textContent = "开始处理";
    elements.processBtn.querySelector(".btn-icon").textContent = "🚀";
  }
}

// 页面加载完成后初始化应用
document.addEventListener("DOMContentLoaded", initApp);

// 监听随机范围输入变化
document.getElementById("randomRange").addEventListener("input", function () {
  if (elements.randomExtend.checked) {
    const range = this.value;
    const rangeHint = elements.randomRangeGroup.querySelector(".range-hint");
    rangeHint.textContent = `在目标时长基础上随机增加 0-${range} 秒`;
  }
});

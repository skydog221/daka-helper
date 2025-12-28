/**
 * 统一的 UI 控制逻辑
 * 使用核心模块和平台适配器
 */

// 导入核心模块
import { TimeCalculator } from '../core/time-calculator.js';
import { Validator } from '../core/validator.js';
import { FormatDetector } from '../core/format-detector.js';
import { AudioRepeater } from '../core/audio-repeater.js';
import { AudioRecorder } from '../core/audio-recorder.js';

// 导入编码器
import { AudioEncoder } from '../encoders/audio-encoder.js';

// 导入平台适配器
import { PlatformDetector } from '../adapters/platform-detector.js';
import { ConfigStorage, getConfigStorage } from '../adapters/config-storage.js';
import { getFileHandler } from '../adapters/file-handler.js';

// 获取文件处理器单例
const fileHandler = getFileHandler();

// 获取配置存储单例
const configStorage = getConfigStorage();

// 音频上下文
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// 应用状态
const appState = {
  selectedFile: null,
  audioBuffer: null,
  audioInfo: null,
  isProcessing: false,
  recordingInterval: null,
};

// DOM 元素引用
const elements = {
  fileUploadArea: document.getElementById('fileUploadArea'),
  selectFileBtn: document.getElementById('selectFileBtn'),
  fileInfo: document.getElementById('fileInfo'),
  fileName: document.getElementById('fileName'),
  fileSize: document.getElementById('fileSize'),
  fileDuration: document.getElementById('fileDuration'),
  fileFormat: document.getElementById('fileFormat'),
  changeFileBtn: document.getElementById('changeFileBtn'),

  targetMinutes: document.getElementById('targetMinutes'),
  targetSeconds: document.getElementById('targetSeconds'),
  randomExtend: document.getElementById('randomExtend'),
  randomRangeGroup: document.getElementById('randomRangeGroup'),
  randomRange: document.getElementById('randomRange'),
  outputFormat: document.getElementById('outputFormat'),

  processBtn: document.getElementById('processBtn'),
  progressContainer: document.getElementById('progressContainer'),
  progressStage: document.getElementById('progressStage'),
  progressPercent: document.getElementById('progressPercent'),
  progressFill: document.getElementById('progressFill'),

  resultContainer: document.getElementById('resultContainer'),
  resultMessage: document.getElementById('resultMessage'),
  openFolderBtn: document.getElementById('openFolderBtn'),
  processAnotherBtn: document.getElementById('processAnotherBtn'),

  errorContainer: document.getElementById('errorContainer'),
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn'),
  
  // 录音相关元素
  btnStartRecording: document.getElementById('btn-start-recording'),
  btnPauseRecording: document.getElementById('btn-pause-recording'),
  btnStopRecording: document.getElementById('btn-stop-recording'),
  recordingState: document.getElementById('recording-state'),
  recordingDuration: document.getElementById('recording-duration'),
  recordingInfo: document.getElementById('recording-info'),
  recordingSize: document.getElementById('recording-size'),
  waveformVisualizer: document.getElementById('waveform-visualizer'),
  waveformCanvas: document.getElementById('waveform-canvas'),
};

// 波形可视化相关变量
let analyser = null;
let dataArray = null;
let animationId = null;

/**
 * 初始化应用
 */
async function initApp() {
  console.log(`[App] 初始化应用，平台: ${PlatformDetector.isElectron() ? 'Electron' : 'Web'}`);
  
  setupEventListeners();
  await loadConfig();
  setupWaveformVisualizer();
  updateUI();
}

/**
 * 设置波形可视化器
 */
function setupWaveformVisualizer() {
  console.log('[App] setupWaveformVisualizer 初始化');
  if (!elements.waveformCanvas) {
    console.error('[App] waveformCanvas 元素不存在');
    return;
  }
  
  const canvas = elements.waveformCanvas;
  const ctx = canvas.getContext('2d');
  console.log('[App] Canvas 尺寸:', canvas.offsetWidth, 'x', canvas.offsetHeight);
  
  // 设置canvas尺寸
  canvas.width = canvas.offsetWidth * window.devicePixelRatio;
  canvas.height = canvas.offsetHeight * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  
  // 绘制初始波形（直线）
  drawWaveform(ctx, canvas.width, canvas.height, []);
  console.log('[App] 初始波形绘制完成');
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    if (dataArray) {
      drawWaveform(ctx, canvas.width, canvas.height, dataArray);
    } else {
      drawWaveform(ctx, canvas.width, canvas.height, []);
    }
  });
}

/**
 * 绘制波形
 */
function drawWaveform(ctx, width, height, data) {
  ctx.clearRect(0, 0, width, height);
  
  // 设置样式
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#667eea';
  ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
  ctx.beginPath();
  
  if (data.length === 0) {
    // 没有数据时绘制中线
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    return;
  }
  
  const barWidth = width / data.length;
  
  // 绘制波形
  for (let i = 0; i < data.length; i++) {
    const barHeight = (data[i] / 255) * height * 0.8;
    const x = i * barWidth;
    const y = (height - barHeight) / 2;
    
    ctx.fillRect(x, y, barWidth - 1, barHeight);
  }
  
  // 绘制轮廓
  ctx.moveTo(0, height / 2);
  for (let i = 0; i < data.length; i++) {
    const barHeight = (data[i] / 255) * height * 0.8;
    const x = i * barWidth + barWidth / 2;
    const y = (height - barHeight) / 2;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

/**
 * 开始波形动画
 */
function startWaveformAnimation() {
  console.log('[App] startWaveformAnimation 被调用');
  
  if (animationId) {
    console.log('[App] 动画已在运行，忽略重复调用');
    return;
  }
  
  // 获取音频分析器
  analyser = AudioRecorder.getAnalyser();
  console.log('[App] 获取到的analyser:', analyser);
  
  if (!analyser) {
    console.warn('[App] 音频分析器未初始化');
    return;
  }
  
  // 创建数据缓冲区
  const bufferLength = analyser.frequencyBinCount;
  console.log('[App] bufferLength:', bufferLength);
  dataArray = new Uint8Array(bufferLength);
  
  const canvas = elements.waveformCanvas;
  const ctx = canvas.getContext('2d');
  
  function animate() {
    if (analyser && dataArray) {
      analyser.getByteFrequencyData(dataArray);
      drawWaveform(ctx, canvas.width, canvas.height, dataArray);
    }
    animationId = requestAnimationFrame(animate);
  }
  
  console.log('[App] 开始动画循环');
  animate();
}

/**
 * 停止波形动画
 */
function stopWaveformAnimation() {
  console.log('[App] stopWaveformAnimation 被调用');
  if (animationId) {
    console.log('[App] 停止动画，animationId:', animationId);
    cancelAnimationFrame(animationId);
    animationId = null;
  } else {
    console.log('[App] 没有正在运行的动画');
  }
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  // 文件选择
  elements.selectFileBtn.addEventListener('click', selectFile);
  elements.changeFileBtn.addEventListener('click', selectFile);
  
  // 拖拽上传
  elements.fileUploadArea.addEventListener('dragover', handleDragOver);
  elements.fileUploadArea.addEventListener('drop', handleDrop);
  elements.fileUploadArea.addEventListener('dragleave', handleDragLeave);

  // 随机延长切换
  elements.randomExtend.addEventListener('change', toggleRandomRange);
  elements.randomRange.addEventListener('input', updateRandomRangeHint);

  // 时间输入验证
  elements.targetMinutes.addEventListener('input', validateAndUpdateUI);
  elements.targetSeconds.addEventListener('input', validateAndUpdateUI);

  // 处理按钮
  elements.processBtn.addEventListener('click', processAudio);

  // 结果操作
  elements.openFolderBtn.addEventListener('click', openOutputFolder);
  elements.processAnotherBtn.addEventListener('click', resetApp);
  elements.retryBtn.addEventListener('click', processAudio);

  // 格式选择变化时保存配置
  elements.outputFormat.addEventListener('change', saveConfig);
  elements.randomExtend.addEventListener('change', saveConfig);
  elements.randomRange.addEventListener('change', saveConfig);

  // 录音控制按钮
  elements.btnStartRecording.addEventListener('click', handleStartRecording);
  elements.btnPauseRecording.addEventListener('click', handlePauseRecording);
  elements.btnStopRecording.addEventListener('click', handleStopRecording);
}

/**
 * 加载配置
 */
async function loadConfig() {
  try {
    const config = configStorage.get('userSettings');
    if (config) {
      if (config.outputFormat) {
        elements.outputFormat.value = config.outputFormat;
      }
      if (typeof config.randomExtend === 'boolean') {
        elements.randomExtend.checked = config.randomExtend;
      }
      if (config.randomRange) {
        elements.randomRange.value = config.randomRange;
      }
      toggleRandomRange();
      updateRandomRangeHint();
    }
  } catch (error) {
    console.error('[App] 加载配置失败:', error);
  }
}

/**
 * 保存配置
 */
async function saveConfig() {
  try {
    const config = {
      outputFormat: elements.outputFormat.value,
      randomExtend: elements.randomExtend.checked,
      randomRange: parseInt(elements.randomRange.value) || 30,
    };
    await configStorage.set('userSettings', config);
  } catch (error) {
    console.error('[App] 保存配置失败:', error);
  }
}

/**
 * 选择音频文件
 */
async function selectFile() {
  try {
    const file = await fileHandler.selectFile({
      accept: 'audio/*',
      multiple: false,
    });

    if (!file) return;

    await loadAudioFile(file);
  } catch (error) {
    console.error('[App] 文件选择失败:', error);
    showError('文件选择失败: ' + error.message);
  }
}

/**
 * 加载音频文件
 */
async function loadAudioFile(file) {
  try {
    // 验证文件
    const fileValidation = Validator.validateFile(file);
    if (!fileValidation.valid) {
      showError(fileValidation.error);
      return;
    }

    // 检测格式
    const formatInfo = FormatDetector.detectFromFile(file);
    console.log('[App] 检测到格式:', formatInfo);

    // 读取文件为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // 解码音频
    showProgress('正在解码音频...', 20);
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // 验证音频缓冲区
    const bufferValidation = Validator.validateAudioBuffer(audioBuffer);
    if (!bufferValidation.valid) {
      showError(bufferValidation.error);
      hideProgress();
      return;
    }

    // 更新状态
    appState.selectedFile = file;
    appState.audioBuffer = audioBuffer;
    appState.audioInfo = {
      name: file.name,
      size: file.size,
      duration: audioBuffer.duration,
      format: formatInfo.format,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
    };

    hideProgress();
    hideError();
    updateUI();

    console.log('[App] 音频加载成功:', appState.audioInfo);
  } catch (error) {
    console.error('[App] 音频加载失败:', error);
    showError('音频解码失败，请确保文件格式正确');
    appState.selectedFile = null;
    appState.audioBuffer = null;
    appState.audioInfo = null;
    hideProgress();
    updateUI();
  }
}

/**
 * 处理拖拽悬停
 */
function handleDragOver(event) {
  event.preventDefault();
  elements.fileUploadArea.style.borderColor = '#667eea';
  elements.fileUploadArea.style.background = '#f0f4ff';
}

/**
 * 处理拖拽离开
 */
function handleDragLeave(event) {
  event.preventDefault();
  elements.fileUploadArea.style.borderColor = '#ddd';
  elements.fileUploadArea.style.background = '#fafafa';
}

/**
 * 处理文件拖拽放置
 */
async function handleDrop(event) {
  event.preventDefault();
  elements.fileUploadArea.style.borderColor = '#ddd';
  elements.fileUploadArea.style.background = '#fafafa';

  const files = event.dataTransfer.files;
  if (files.length > 0) {
    await loadAudioFile(files[0]);
  }
}

/**
 * 切换随机延长选项
 */
function toggleRandomRange() {
  const isChecked = elements.randomExtend.checked;
  elements.randomRangeGroup.style.display = isChecked ? 'block' : 'none';
  updateRandomRangeHint();
  saveConfig();
}

/**
 * 更新随机延长提示
 */
function updateRandomRangeHint() {
  const range = parseInt(elements.randomRange.value) || 30;
  const rangeHint = elements.randomRangeGroup.querySelector('.range-hint');
  if (rangeHint) {
    rangeHint.textContent = `在目标时长基础上随机增加 0-${range} 秒`;
  }
}

/**
 * 验证输入并更新UI
 */
function validateAndUpdateUI() {
  updateUI();
}

/**
 * 处理音频
 */
async function processAudio() {
  if (appState.isProcessing) return;

  // 验证输入
  const minutes = parseInt(elements.targetMinutes.value) || 0;
  const seconds = parseInt(elements.targetSeconds.value) || 0;

  const validation = Validator.validateTargetDuration(minutes, seconds);
  if (!validation.valid) {
    showError(validation.message);
    return;
  }

  if (!appState.audioBuffer) {
    showError('请先选择音频文件');
    return;
  }

  try {
    appState.isProcessing = true;
    hideError();
    hideResult();
    updateUI();

    // 计算目标时长
    const baseDuration = validation.duration;
    let finalDuration = baseDuration;

    // 应用随机延长
    if (elements.randomExtend.checked) {
      const maxExtend = parseInt(elements.randomRange.value) || 30;
      finalDuration = TimeCalculator.calculateExtendedDuration(baseDuration, maxExtend);
      const extendSeconds = finalDuration - baseDuration;
      console.log(`[App] 随机延长 ${extendSeconds} 秒 (范围: 0-${maxExtend})`);
    }

    console.log(`[App] 开始处理音频，目标时长: ${TimeCalculator.formatDurationVerbose(finalDuration)}`);

    // 重复音频
    showProgress('正在重复音频...', 10);
    const repeatedBuffer = await AudioRepeater.repeatAudio(
      appState.audioBuffer,
      finalDuration,
      audioContext,
      (progress) => {
        showProgress('正在重复音频...', 10 + progress * 0.6);
      }
    );

    // 编码音频
    const outputFormat = elements.outputFormat.value;
    showProgress(`正在编码为 ${outputFormat.toUpperCase()}...`, 70);

    const audioBlob = await AudioEncoder.encode(repeatedBuffer, outputFormat, (progress) => {
      showProgress(`正在编码为 ${outputFormat.toUpperCase()}...`, 70 + progress * 0.25);
    });

    // 保存文件
    showProgress('正在保存文件...', 95);
    const fileName = generateOutputFileName(appState.audioInfo.name, finalDuration, outputFormat);
    const mimeType = outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    
    await fileHandler.saveAudioFile(audioBlob, fileName, mimeType);

    showProgress('处理完成！', 100);
    
    // 显示结果
    const extendInfo = elements.randomExtend.checked 
      ? ` (含${finalDuration - baseDuration}秒随机延长)` 
      : '';
    showResult(`音频文件处理完成！总时长：${TimeCalculator.formatDurationVerbose(finalDuration)}${extendInfo}`);

    console.log('[App] 处理完成，输出文件:', fileName);
  } catch (error) {
    console.error('[App] 处理失败:', error);
    showError('处理失败: ' + error.message);
  } finally {
    appState.isProcessing = false;
    setTimeout(() => hideProgress(), 1000);
    updateUI();
  }
}

/**
 * 生成输出文件名
 */
function generateOutputFileName(originalName, duration, format) {
  const nameWithoutExt = originalName.replace(/\.[^.]+$/, '');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const durationStr = TimeCalculator.formatDuration(duration).replace(':', '-');
  return `${nameWithoutExt}_${durationStr}_${timestamp}.${format}`;
}

/**
 * 打开输出文件夹
 */
async function openOutputFolder() {
  if (PlatformDetector.isElectron()) {
    try {
      // Electron 环境下打开文件夹
      // 这里需要通过 IPC 调用主进程
      console.log('[App] 打开输出文件夹 (Electron)');
      showError('打开文件夹功能需要在 Electron 主进程中实现');
    } catch (error) {
      console.error('[App] 打开文件夹失败:', error);
      showError('打开文件夹失败');
    }
  } else {
    showError('Web 版本不支持打开文件夹');
  }
}

/**
 * 重置应用
 */
function resetApp() {
  appState.selectedFile = null;
  appState.audioBuffer = null;
  appState.audioInfo = null;
  appState.isProcessing = false;
  
  hideResult();
  hideError();
  hideProgress();
  updateUI();
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 更新 UI
 */
function updateUI() {
  // 更新文件信息显示
  if (appState.audioInfo) {
    elements.fileUploadArea.style.display = 'none';
    elements.fileInfo.style.display = 'flex';
    
    elements.fileName.textContent = appState.audioInfo.name;
    elements.fileSize.textContent = formatFileSize(appState.audioInfo.size);
    elements.fileDuration.textContent = TimeCalculator.formatDuration(appState.audioInfo.duration);
    elements.fileFormat.textContent = appState.audioInfo.format.toUpperCase();
  } else {
    elements.fileUploadArea.style.display = 'block';
    elements.fileInfo.style.display = 'none';
  }

  // 更新处理按钮状态
  const minutes = parseInt(elements.targetMinutes.value) || 0;
  const seconds = parseInt(elements.targetSeconds.value) || 0;
  const validation = Validator.validateTargetDuration(minutes, seconds);
  
  const canProcess = appState.audioBuffer && validation.valid && !appState.isProcessing;
  elements.processBtn.disabled = !canProcess;
}

/**
 * 显示进度
 */
function showProgress(stage, percent) {
  elements.progressContainer.style.display = 'block';
  elements.progressStage.textContent = stage;
  elements.progressPercent.textContent = `${Math.round(percent)}%`;
  elements.progressFill.style.width = `${percent}%`;
}

/**
 * 隐藏进度
 */
function hideProgress() {
  elements.progressContainer.style.display = 'none';
}

/**
 * 显示结果
 */
function showResult(message) {
  elements.resultContainer.style.display = 'block';
  elements.resultMessage.textContent = message;
  
  // 在 Web 环境下隐藏"打开文件夹"按钮
  if (!PlatformDetector.isElectron()) {
    elements.openFolderBtn.style.display = 'none';
  }
}

/**
 * 隐藏结果
 */
function hideResult() {
  elements.resultContainer.style.display = 'none';
}

/**
 * 显示错误
 */
function showError(message) {
  elements.errorContainer.style.display = 'block';
  elements.errorMessage.textContent = message;
}

/**
 * 开始录音
 */
async function handleStartRecording() {
  console.log('[App] handleStartRecording 被调用');
  try {
    console.log('[App] 正在调用 AudioRecorder.startRecording...');
    await AudioRecorder.startRecording({
      onProgress: updateRecordingDuration,
      onError: handleRecordingError
    });
    
    console.log('[App] AudioRecorder.startRecording 完成，更新UI...');
    updateRecordingUI();
    startRecordingTimer();
    
    // 启动波形动画
    console.log('[App] 启动波形动画...');
    startWaveformAnimation();
    
    console.log('[App] 开始录音成功');
  } catch (error) {
    console.error('[App] 开始录音失败:', error);
    showError(error.message);
  }
}

/**
 * 暂停/恢复录音
 */
async function handlePauseRecording() {
  try {
    const state = AudioRecorder.getRecordingState();
    
    if (state === AudioRecorder.State.RECORDING) {
      await AudioRecorder.pauseRecording();
      elements.btnPauseRecording.textContent = '继续';
      stopRecordingTimer();
      
      // 停止波形动画
      stopWaveformAnimation();
      
      console.log('[App] 暂停录音');
    } else if (state === AudioRecorder.State.PAUSED) {
      await AudioRecorder.resumeRecording();
      elements.btnPauseRecording.textContent = '暂停';
      startRecordingTimer();
      
      // 启动波形动画
      startWaveformAnimation();
      
      console.log('[App] 恢复录音');
    }
    
    updateRecordingUI();
  } catch (error) {
    console.error('[App] 暂停/恢复录音失败:', error);
    showError(error.message);
  }
}

/**
 * 停止录音
 */
async function handleStopRecording() {
  try {
    const blob = await AudioRecorder.stopRecording();
    stopRecordingTimer();
    
    // 停止波形动画
    stopWaveformAnimation();
    
    // 更新录音信息
    const fileSize = blob.size;
    elements.recordingSize.textContent = formatFileSize(fileSize);
    elements.recordingInfo.style.display = 'block';
    
    updateRecordingUI();
    
    // 非阻塞对话框询问是否使用录音（问题6修复）
    const shouldUseRecording = await promptUseRecording(fileSize);
    if (shouldUseRecording) {
      await loadRecordingBlob(blob);
    }
    
    console.log('[App] 停止录音，大小:', fileSize);
  } catch (error) {
    console.error('[App] 停止录音失败:', error);
    showError(error.message);
  }
}

/**
 * 加载录音Blob为音频
 */
async function loadRecordingBlob(blob) {
  try {
    showProgress('正在解码录音...', 50);
    
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // 验证音频缓冲区
    const bufferValidation = Validator.validateAudioBuffer(audioBuffer);
    if (!bufferValidation.valid) {
      showError(bufferValidation.error);
      hideProgress();
      return;
    }
    
    // 更新状态
    appState.audioBuffer = audioBuffer;
    appState.audioInfo = {
      name: '录音_' + new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-'),
      size: blob.size,
      duration: audioBuffer.duration,
      format: 'webm',
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
    };
    
    hideProgress();
    hideError();
    updateUI();
    
    console.log('[App] 录音加载成功:', appState.audioInfo);
  } catch (error) {
    console.error('[App] 录音解码失败:', error);
    showError('录音解码失败，请重新录制');
    hideProgress();
  }
}

/**
 * 更新录音时长
 */
function updateRecordingDuration(duration) {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);
  
  elements.recordingDuration.textContent =
    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * 更新录音UI状态
 */
function updateRecordingUI() {
  const state = AudioRecorder.getRecordingState();
  const stateTexts = {
    'idle': '未开始录音',
    'recording': '录音中...',
    'paused': '已暂停',
    'stopped': '录音完成'
  };
  
  elements.recordingState.textContent = stateTexts[state] || '未知状态';
  
  // 更新按钮状态
  elements.btnStartRecording.disabled = state !== AudioRecorder.State.IDLE;
  elements.btnPauseRecording.disabled = state === AudioRecorder.State.IDLE || state === AudioRecorder.State.STOPPED;
  elements.btnStopRecording.disabled = state === AudioRecorder.State.IDLE || state === AudioRecorder.State.STOPPED;
}

/**
 * 开始录音计时器
 */
function startRecordingTimer() {
  stopRecordingTimer();
  appState.recordingInterval = setInterval(() => {
    const duration = AudioRecorder.getDuration();
    updateRecordingDuration(duration);
  }, 1000);
}

/**
 * 停止录音计时器
 */
function stopRecordingTimer() {
  if (appState.recordingInterval) {
    clearInterval(appState.recordingInterval);
    appState.recordingInterval = null;
  }
}

/**
 * 处理录音错误
 */
function handleRecordingError(error) {
  console.error('[App] 录音错误:', error);
  
  // 停止波形动画
  stopWaveformAnimation();
  
  // 重置录音器状态（问题3修复）
  AudioRecorder.reset();
  
  stopRecordingTimer();
  showError(error.message);
  updateRecordingUI();
}

/**
 * 隐藏错误
 */
function hideError() {
  elements.errorContainer.style.display = 'none';
}

/**
 * 非阻塞对话框 - 询问是否使用录音（问题6修复）
 */
async function promptUseRecording(fileSize) {
  return new Promise((resolve) => {
    // 创建模态对话框
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 400px;
      width: 90%;
    `;
    
    dialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #333;">录音已完成</h3>
      <p style="margin: 0 0 24px 0; color: #666; line-height: 1.5;">
        大小: ${formatFileSize(fileSize)}<br>
        是否使用此录音进行音频处理？
      </p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="btn-cancel" style="
          padding: 8px 16px;
          border: 1px solid #ccc;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">取消</button>
        <button id="btn-confirm" style="
          padding: 8px 16px;
          border: none;
          background: #2196F3;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        ">使用录音</button>
      </div>
    `;
    
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    // 绑定事件
    const btnCancel = dialog.querySelector('#btn-cancel');
    const btnConfirm = dialog.querySelector('#btn-confirm');
    
    btnCancel.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(false);
    });
    
    btnConfirm.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(true);
    });
    
    // ESC键取消
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleEsc);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
}

// 初始化应用
initApp();
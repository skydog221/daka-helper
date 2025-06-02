# 打卡剪辑助手 - 开发者指南

## 目录

1. [项目概述](#项目概述)
2. [架构设计](#架构设计)
3. [核心模块说明](#核心模块说明)
   - [主进程 (main.js)](#主进程-mainjs)
   - [渲染进程 (src/renderer/)](#渲染进程-srcrenderer)
   - [音频处理模块 (src/audio/audioProcessor.js)](#音频处理模块-srcaudioaudioprocessorjs)
   - [预加载脚本 (src/renderer/preload.js)](#预加载脚本-srcrendererpreloadjs)
4. [IPC 通信](#ipc-通信)
   - [通信通道](#通信通道)
   - [消息格式](#消息格式)
5. [音频处理流程](#音频处理流程)
6. [构建与打包](#构建与打包)
7. [编码规范](#编码规范)
8. [测试](#测试)
9. [未来展望](#未来展望)

## 1. 项目概述

打卡剪辑助手是一个基于 Electron 的桌面应用程序，旨在帮助用户快速将音频文件重复拼接到指定的目标时长。它利用 Web Audio API 进行音频处理，提供了一个简洁直观的用户界面。

## 2. 架构设计

项目采用标准的 Electron 应用架构，主要包含以下几个部分：

- **主进程 ([`main.js`](../main.js:1))**:
  - 负责应用程序的生命周期管理（创建、销毁窗口等）。
  - 处理与操作系统相关的交互（如文件对话框、菜单）。
  - 作为渲染进程与系统资源（如文件系统）之间的桥梁。
  - 调用音频处理模块执行核心任务。
- **渲染进程 ([`src/renderer/`](../src/renderer/))**:
  - 负责用户界面的展示和交互逻辑。
  - 由 HTML ([`index.html`](../src/renderer/index.html:1))、CSS ([`styles.css`](../src/renderer/styles.css:1)) 和 JavaScript ([`app.js`](../src/renderer/app.js:1)) 构成。
  - 通过预加载脚本与主进程进行安全的 IPC 通信。
- **音频处理模块 ([`src/audio/audioProcessor.js`](../src/audio/audioProcessor.js:1))**:
  - 包含所有与音频处理相关的核心逻辑。
  - 使用 Web Audio API 进行音频解码、拼接、编码。
- **IPC (Inter-Process Communication)**:
  - 主进程和渲染进程之间通过 IPC 通信来传递数据和调用功能。
  - 使用 Electron 提供的 `ipcMain` 和 `ipcRenderer`模块。

```mermaid
graph LR
    A[用户界面 (Renderer Process)] -- IPC --> B(主进程 Main Process)
    B -- 调用 --> C{音频处理模块 (Web Audio API)}
    C -- 返回结果 --> B
    B -- IPC --> A
    B -- 操作 --> D[文件系统/操作系统]
```

## 3. 核心模块说明

### 主进程 ([`main.js`](../main.js:1))

- **主要职责**:
  - 创建和管理 `BrowserWindow`。
  - 设置应用程序菜单和快捷键。
  - 监听渲染进程发送的 IPC 消息，并调用相应处理函数。
  - 调用 [`audioProcessor.js`](../src/audio/audioProcessor.js:1) 中的函数处理音频。
  - 将处理结果通过 IPC 返回给渲染进程。
- **关键函数**:
  - [`createWindow()`](../main.js:15) : 初始化主窗口。
  - `ipcMain.handle('process-audio', ...)`: 处理音频的核心 IPC 监听器。
  - `ipcMain.handle('select-file', ...)`: 打开文件选择对话框。

### 渲染进程 ([`src/renderer/`](../src/renderer/))

- **[`index.html`](../src/renderer/index.html:1)**: 应用的 HTML 结构。
- **[`styles.css`](../src/renderer/styles.css:1)**: 应用的 CSS 样式。
- **[`app.js`](../src/renderer/app.js:1)**: 渲染进程的 JavaScript 逻辑。
  - **主要职责**:
    - 获取用户输入（文件、目标时长、格式等）。
    - 校验用户输入。
    - 通过 `window.electronAPI` 调用主进程功能。
    - 更新 UI 状态（如进度条、结果显示）。
  - **关键函数**:
    - `handleFileSelect()`: 处理文件选择。
    - `handleDragOver() / handleDrop()`: 处理文件拖拽。
    - `processAudio()`: 发起音频处理请求。
    - `updateProgress()`: 更新进度条。

### 音频处理模块 ([`src/audio/audioProcessor.js`](../src/audio/audioProcessor.js:1))

- **主要职责**:
  - 使用 Web Audio API (`AudioContext`) 解码上传的音频文件。
  - 根据目标时长和随机延长选项，计算重复次数和最终时长。
  - 将解码后的 `AudioBuffer` 进行拼接。
  - 将拼接后的 `AudioBuffer` 编码为 WAV 格式。
  - （未来）支持将 `AudioBuffer` 编码为其他格式（MP3, M4A 等）。
- **关键函数**:
  - [`processAudio(filePath, targetDuration, randomExtend, outputFormat)`](../src/audio/audioProcessor.js:8): 核心处理函数。
  - [`decodeAudioData(arrayBuffer)`](../src/audio/audioProcessor.js:1): 将文件内容解码为 `AudioBuffer`。
  - [`concatenateAudioBuffers(buffers)`](../src/audio/audioProcessor.js:1): 拼接多个 `AudioBuffer`。
  - [`audioBufferToWAV(buffer)`](../src/audio/audioProcessor.js:1): 将 `AudioBuffer` 转换为 WAV 格式的 `Blob`。

### 预加载脚本 ([`src/renderer/preload.js`](../src/renderer/preload.js:1))

- **主要职责**:
  - 在渲染进程的 Web 上下文中安全地暴露主进程的特定 API。
  - 使用 `contextBridge.exposeInMainWorld` 方法。
- **暴露的 API**:
  - `window.electronAPI.selectFile()`: 调用主进程打开文件选择对话框。
  - `window.electronAPI.processAudio(params)`: 调用主进程处理音频。
  - `window.electronAPI.onUpdateProgress(callback)`: 注册进度更新回调。

## 4. IPC 通信

### 通信通道

- `select-file`: 渲染进程请求主进程打开文件选择对话框。
- `process-audio`: 渲染进程请求主进程处理音频。
- `update-progress`: 主进程向渲染进程发送音频处理进度。

### 消息格式

#### `process-audio` 请求

```json
{
  "filePath": "C:/path/to/audio.mp3",
  "targetDuration": 600, // 秒
  "randomExtend": true,
  "outputFormat": "wav"
}
```

#### `process-audio` 响应 (成功)

```json
{
  "success": true,
  "outputPath": "C:/path/to/output/processed_audio_timestamp.wav",
  "fileName": "processed_audio_timestamp.wav"
}
```

#### `process-audio` 响应 (失败)

```json
{
  "success": false,
  "error": "错误信息描述"
}
```

#### `update-progress` 消息

```json
{
  "percent": 50, // 0-100
  "message": "正在处理..."
}
```

## 5. 音频处理流程

1.  **用户选择文件**: 渲染进程通过 IPC `select-file` 请求主进程打开文件对话框，或用户拖拽文件。
2.  **文件传递**: 文件路径被发送到主进程。
3.  **参数设置**: 用户在渲染进程设置目标时长、格式、是否随机延长。
4.  **处理请求**: 渲染进程通过 IPC `process-audio` 将文件路径和参数发送给主进程。
5.  **音频读取**: 主进程读取音频文件内容。
6.  **音频解码**: [`audioProcessor.js`](../src/audio/audioProcessor.js:1) 使用 `AudioContext.decodeAudioData()` 将文件解码为 `AudioBuffer`。
7.  **计算参数**: 根据目标时长、源音频时长和随机延长计算重复次数和最终长度。
8.  **音频拼接**:
    - 根据重复次数，复制 `AudioBuffer`。
    - 如果需要裁剪，则裁剪最后一个 `AudioBuffer`。
    - 使用 `AudioContext.createBuffer()` 创建一个新的 `AudioBuffer`，并将所有片段数据复制进去。
9.  **随机延长 (如果启用)**:
    - 生成 0-60 秒的随机静音 `AudioBuffer`。
    - 将其拼接到主音频末尾。
10. **编码输出**:
    - 目前：使用 [`audioBufferToWAV()`](../src/audio/audioProcessor.js:1) 将最终的 `AudioBuffer` 转换为 WAV 格式的 `Blob`。
    - 主进程将 `Blob` 数据保存为文件。
11. **进度更新**: 主进程在处理过程中通过 IPC `update-progress` 向渲染进程发送进度信息。
12. **结果返回**: 主进程将处理结果（成功的文件路径或错误信息）通过 IPC 返回给渲染进程。
13. **用户反馈**: 渲染进程显示处理结果，并触发文件下载。

## 6. 构建与打包

- 使用 [`electron-builder`](https://www.electron.build/) 进行应用的打包和分发。
- 配置文件：[`electron-builder.json`](../electron-builder.json:1)
- **构建命令**:
  - `yarn build`: 根据 [`electron-builder.json`](../electron-builder.json:1) 中的配置构建。通常会构建当前操作系统的安装包。
- **输出目录**: `dist/`

## 7. 编码规范

- JavaScript: ESLint (推荐配置 StandardJS 或 Airbnb)
- 代码风格: Prettier
- 命名:
  - 变量和函数: camelCase (`myVariable`, `calculateTotal`)
  - 类和构造函数: PascalCase (`AudioProcessor`)
  - 常量: UPPER_CASE_SNAKE_CASE (`MAX_LENGTH`)
- 注释: JSDoc 风格注释关键函数和模块。

## 8. 测试

目前项目缺乏自动化测试。未来可以考虑引入：

- **单元测试**: 使用 Jest 或 Mocha 测试核心函数，特别是 [`audioProcessor.js`](../src/audio/audioProcessor.js:1) 中的逻辑。
- **集成测试**: 测试主进程和渲染进程之间的 IPC 通信。
- **端到端测试**: 使用 Spectron 或 Playwright 测试完整的应用流程。

## 9. 未来展望

- **真正的多格式导出**: 集成 FFmpeg (通过 fluent-ffmpeg 或 wasm 版本) 来支持 MP3, M4A 等格式的编码，而不仅仅是 WAV 包装。
- **音频预览**: 在上传后提供音频波形预览和播放功能。
- **更精细的拼接控制**: 允许用户设置淡入淡出效果，以减少拼接痕迹。
- **批量处理**: 支持一次处理多个文件或多个配置。
- **国际化 (i18n)**: 支持多种语言界面。
- **性能优化**: 对大型文件和超长目标时长的处理进行优化。
- **更完善的错误处理和用户反馈**。

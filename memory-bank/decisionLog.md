# Decision Log

This file records architectural and implementation decisions using a list format.
2025-06-02 11:53:37 - Log of updates made.

---

### Decision (Code)

2025-06-02 11:57:40 - 选择 fluent-ffmpeg 作为音频处理库

**Rationale:**
fluent-ffmpeg 是一个成熟的 Node.js FFmpeg 包装器，提供了简洁的 API 来处理音频文件的拼接、转换和导出。它支持多种音频格式，性能稳定，社区活跃。

**Details:**

- 添加到 package.json dependencies
- 将用于音频文件的读取、拼接、重复和导出功能
- 支持 MP3、WAV 等多种格式

---

### Decision (Code)

2025-06-02 12:24:43 - 使用 Web Audio API 替代 FFmpeg 进行音频处理

**Rationale:**
由于系统中缺少 FFmpeg 依赖，决定使用浏览器原生的 Web Audio API 进行音频处理。这种方案避免了外部依赖，提高了应用的可移植性，但目前所有格式的输出实际上都是 WAV 格式，只是设置了不同的 MIME 类型。

**Details:**

- 使用 AudioContext 和 decodeAudioData 处理音频文件
- 实现了 audioBufferToWAV 函数进行 WAV 格式转换
- 为其他格式（M4A、MP3、FLAC、AAC）创建了包装函数，暂时输出 WAV 内容但设置相应的 MIME 类型

---

Timestamp: {{CURRENT_TIMESTAMP}}
Decision: 创建 GitHub Actions 工作流用于自动发布
Context: 用户要求为“打卡剪辑助手”Electron 应用配置 GitHub Actions 工作流，以实现自动打包和创建 GitHub Release 的功能。
Rationale:

- 工作流将在推送新的 Git 标签 (tag) 到仓库时触发（例如，`v*.*.*` 格式的标签）。
- 工作流将在 Ubuntu 最新版 runner 上运行。
- 步骤包括：检出代码、设置 Node.js (pnpm)、安装依赖、构建应用、创建 Release、上传构建产物。
- 构建产物包括 Windows 安装程序和 win-unpacked 目录的 zip 压缩包。
  File Created: `.github/workflows/release.yml`

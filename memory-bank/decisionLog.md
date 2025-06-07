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

---

### Decision (Code)

[2025-06-02 13:42:51] - 创建 GitHub Actions 工作流用于多平台构建和发布

**Rationale:**
根据用户需求，为 Electron 应用 `daka-helper` 创建一个 CI/CD 工作流。该工作流将在推送到 `main` 分支或创建 `v*.*.*` 格式的标签时触发。它将使用 `electron-builder` 和 `pnpm` 在 Linux、Windows 和 macOS 上构建应用，并为 Android 进行交叉编译。所有构建产物最终将上传到 GitHub Release。

**Details:**

- 工作流文件: [` .github/workflows/release.yml`](.github/workflows/release.yml:0)
- 触发条件: `push`到 `main`, `tags` `v*.*.*`
- 构建矩阵: `ubuntu-latest` (Linux, Android), `macos-latest`, `windows-latest`
- 包管理器: `pnpm`
- 构建工具: `electron-builder`
- Android 构建: 需要 Java 环境 (Temurin JDK 17)
- 产物上传: 使用 `actions/upload-artifact` 和 `actions/download-artifact`

---

### Decision (Code)

[2025-06-02 13:49:06] - 将 GitHub Actions 工作流的包管理器从 pnpm 改为 yarn

**Rationale:**
根据项目规则文件 `.roo/rules/node.md` 的规定，该项目使用 yarn 作为包管理器。为保持一致性，需要将 GitHub Actions 工作流中的包管理器从 pnpm 更改为 yarn。

**Details:**
修改了 [`.github/workflows/release.yml`](.github/workflows/release.yml:44-66):

- 将 `cache: "pnpm"` 改为 `cache: "yarn"`
- 移除了 `pnpm/action-setup@v3` 步骤
- 将 `pnpm install --frozen-lockfile` 改为 `yarn install --frozen-lockfile`
- 将 `pnpm electron-builder` 改为 `yarn electron-builder`
- Release 创建: 使用 `softprops/action-gh-release`

---

### Decision

[2025-06-07 20:43:38] - 创建单文件 HTML Demo 架构

**Rationale:**
为了提供一个便捷的网页 demo 展示，将 Electron 应用的渲染进程 HTML、CSS 和 JavaScript 整合到一个独立的 HTML 文件中。这简化了部署和分享，并确保在浏览器环境中与 Electron 应用具有相同的逻辑和 UI 表现。

**Implications/Details:**

- 将 `src/renderer/styles.css` 内容内联到 `<style>` 标签中。
- 将 `src/renderer/preload.js` 中 `window.utils` 的定义直接嵌入到 `<script>` 标签中，并确保其在 `app.js` 之前加载，以保证 `window.utils` 对象的兼容性。
- 将 `src/renderer/app.js` 内容嵌入到另一个 `<script>` 标签中。
- `app.js` 中对 `electronAPI` 的调用在浏览器环境中不再需要，因为 `app.js` 已经适配了 Web Audio API 和文件 API 进行纯前端处理。
- `openOutputFolder` 函数在浏览器环境中将显示提示信息，而不是尝试打开本地文件夹。

---

### Decision

[2025-06-07 20:59:08] - 为单文件 HTML Demo 添加 GitHub 仓库按钮和区别弹窗

**Rationale:**
根据用户反馈，为了增强 Demo 的可用性和信息透明度，添加了直接访问 GitHub 仓库的按钮，并提供了清晰的弹窗说明 Demo 版本与 Electron 版本的关键区别，帮助用户更好地理解其功能限制。

**Implications/Details:**

- 在 `footer` 中添加了“前往 GitHub 仓库”按钮，链接到 `https://github.com/skydog221/daka-helper`。
- 在 `footer` 中添加了“Demo 区别”按钮，点击后显示一个模态弹窗。
- 弹窗内容包括文件操作、音频编码和系统集成方面的区别说明。
- 在 `app.js` 中新增了对这些新 DOM 元素的引用和事件监听器，以及 `showDiffModal` 和 `hideDiffModal` 函数来控制弹窗的显示与隐藏。

---

### Decision

[2025-06-07 20:43:38] - 创建单文件 HTML Demo 架构

**Rationale:**
为了提供一个便捷的网页 demo 展示，将 Electron 应用的渲染进程 HTML、CSS 和 JavaScript 整合到一个独立的 HTML 文件中。这简化了部署和分享，并确保在浏览器环境中与 Electron 应用具有相同的逻辑和 UI 表现。

**Implications/Details:**

- 将 `src/renderer/styles.css` 内容内联到 `<style>` 标签中。
- 将 `src/renderer/preload.js` 中 `window.utils` 的定义直接嵌入到 `<script>` 标签中，并确保其在 `app.js` 之前加载，以保证 `window.utils` 对象的兼容性。
- 将 `src/renderer/app.js` 内容嵌入到另一个 `<script>` 标签中。
- `app.js` 中对 `electronAPI` 的调用在浏览器环境中不再需要，因为 `app.js` 已经适配了 Web Audio API 和文件 API 进行纯前端处理。
- `openOutputFolder` 函数在浏览器环境中将显示提示信息，而不是尝试打开本地文件夹。

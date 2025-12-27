# 打卡剪辑助手 - 构建指南

本文档详细说明如何构建打卡剪辑助手的 Web 版本和 Electron 桌面版本。

## 目录

1. [环境要求](#环境要求)
2. [安装依赖](#安装依赖)
3. [开发模式](#开发模式)
4. [构建 Web 版本](#构建-web-版本)
5. [构建 Electron 版本](#构建-electron-版本)
6. [构建全部](#构建全部)
7. [输出文件说明](#输出文件说明)
8. [部署指南](#部署指南)
9. [常见问题](#常见问题)

## 1. 环境要求

- **Node.js**: >= 16.0.0（推荐 18.x 或 20.x LTS）
- **Yarn**: 1.22.x 或更高版本
- **操作系统**: Windows 10+、macOS 10.15+、Linux

### 安装 Node.js

从 [Node.js 官网](https://nodejs.org/) 下载并安装 LTS 版本。

### 安装 Yarn

```bash
npm install -g yarn
```

验证安装：
```bash
node --version  # 应显示 v16.0.0 或更高
yarn --version  # 应显示 1.22.x 或更高
```

## 2. 安装依赖

```bash
# 克隆项目
git clone https://github.com/skydog221/daka-helper.git
cd daka-helper

# 安装依赖
yarn install
```

## 3. 开发模式

### Electron 开发模式

```bash
# 启动 Electron 应用
yarn start

# 带开发者工具的模式
yarn dev
```

### Web 开发模式

```bash
# 启动 Vite 开发服务器
yarn dev:web
```

开发服务器默认运行在 `http://localhost:5173`。

## 4. 构建 Web 版本

Web 版本会构建为一个**单文件 HTML**，包含所有 CSS 和 JavaScript，可以直接部署到任何静态文件服务器。

```bash
yarn build:web
```

### 输出

- **输出目录**: `dist/web/`
- **主文件**: `dist/web/index.html`（单个 HTML 文件，约 200-300KB）

### 特点

- 所有资源内联到单个 HTML 文件
- 无需额外的 CSS 或 JS 文件
- 可直接在浏览器中打开
- 使用 CDN 加载 lamejs 库（MP3 编码）

## 5. 构建 Electron 版本

Electron 版本会构建为可安装的桌面应用程序。

```bash
yarn build:electron
```

此命令会：
1. 使用 Vite 构建渲染进程
2. 使用 electron-builder 打包应用

### 输出

- **输出目录**: `dist/`
- **Windows**: `dist/daka-helper Setup x.x.x.exe`（NSIS 安装包）
- **macOS**: `dist/daka-helper-x.x.x.dmg`
- **Linux**: `dist/daka-helper-x.x.x.AppImage`

### 仅构建当前平台

默认情况下，electron-builder 只构建当前操作系统的安装包。如需构建其他平台，请参考 [electron-builder 文档](https://www.electron.build/multi-platform-build)。

## 6. 构建全部

同时构建 Web 版本和 Electron 版本：

```bash
yarn build
```

等价于依次执行：
```bash
yarn build:web
yarn build:electron
```

## 7. 输出文件说明

### 目录结构

```
dist/
├── web/                           # Web 版本
│   └── index.html                 # 单文件 HTML（可直接部署）
├── electron/                      # Electron 渲染进程构建输出
│   ├── index.html
│   ├── assets/
│   │   └── ...
│   └── ...
├── win-unpacked/                  # Windows 未打包版本
├── daka-helper Setup x.x.x.exe    # Windows 安装包
└── ...
```

### 文件大小参考

| 文件 | 大小（约） | 说明 |
|------|-----------|------|
| `dist/web/index.html` | 200-300 KB | Web 单文件版本 |
| Windows 安装包 | 60-80 MB | 包含 Electron 运行时 |

## 8. 部署指南

### Web 版本部署

#### 静态文件服务器

将 `dist/web/index.html` 部署到任何静态文件服务器：

```bash
# 示例：使用 serve 本地测试
npx serve dist/web
```

#### Netlify

1. 连接 GitHub 仓库
2. 设置构建命令：`yarn build:web`
3. 设置发布目录：`dist/web`

#### GitHub Pages

1. 在 GitHub 仓库设置中启用 Pages
2. 使用 GitHub Actions 自动部署（参考 `.github/workflows/release.yml`）

#### Vercel

1. 导入 GitHub 仓库
2. 设置构建命令：`yarn build:web`
3. 设置输出目录：`dist/web`

### Electron 版本发布

#### GitHub Releases

使用 GitHub Actions 自动发布（已配置）：

1. 创建新的 Git 标签：`git tag v2.0.0`
2. 推送标签：`git push origin v2.0.0`
3. GitHub Actions 会自动构建并发布

#### 手动发布

```bash
# 构建并发布到 GitHub Releases
yarn build:electron --publish always
```

需要设置环境变量 `GH_TOKEN`（GitHub Personal Access Token）。

## 9. 常见问题

### Q: Web 构建后 lamejs 无法加载

**A**: 检查网络连接，lamejs 通过 CDN 加载。如需离线使用，可以将 lamejs 库本地化。

### Q: Electron 构建失败

**A**: 常见原因：
- 依赖未正确安装：运行 `yarn install`
- 权限问题（Windows）：以管理员身份运行
- 磁盘空间不足：Electron 打包需要较大临时空间

### Q: 如何更改 MP3 比特率

**A**: 修改 `src/core/constants.js` 中的 `MP3_BITRATE` 值：

```javascript
export const AUDIO_CONSTANTS = {
  MP3_BITRATE: 192,  // 可改为 128、256、320 等
  // ...
};
```

### Q: 如何添加新的输出格式

**A**: 
1. 在 `src/encoders/` 创建新的编码器（如 `ogg-encoder.js`）
2. 在 `src/encoders/audio-encoder.js` 中注册新格式
3. 在 `src/ui/index.html` 中添加格式选项

### Q: 构建后文件太大

**A**: 
- Web 版本已使用单文件优化，大小约 200-300KB
- Electron 版本大小主要由 Electron 运行时决定，无法显著减小

### Q: 如何调试构建问题

**A**: 使用 `--debug` 参数：

```bash
# Vite 详细日志
yarn build:web --debug

# electron-builder 详细日志
DEBUG=electron-builder yarn build:electron
```

---

## 快速参考

| 命令 | 说明 |
|------|------|
| `yarn install` | 安装依赖 |
| `yarn start` | 启动 Electron |
| `yarn dev` | Electron 开发模式 |
| `yarn dev:web` | Web 开发服务器 |
| `yarn build:web` | 构建 Web 版本 |
| `yarn build:electron` | 构建 Electron 版本 |
| `yarn build` | 构建全部 |
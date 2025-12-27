# 打卡剪辑助手

<p align="center">
  <a href="https://github.com/skydog221">
    <img src="https://img.shields.io/badge/Author-skydog221-red" alt="Author">
  </a>
  <img src="https://img.shields.io/badge/Electron-36.3.2-blue" alt="Electron Version">
  <img src="https://img.shields.io/badge/License-MPL--2.0-green" alt="License">
  <img src="https://img.shields.io/badge/Version-1.0.0-orange" alt="Version">
  <img src="https://api.netlify.com/api/v1/badges/5cdb1ee4-c545-494a-b7d5-b37294a4621b/deploy-status" alt="Netlify Status">
</p>

## 📖 项目简介

打卡剪辑助手是一款基于 Electron 开发的桌面应用程序，专门用于快速处理音频文件。它可以将音频文件重复拼接到指定的时间长度，非常适合需要制作固定时长音频内容的场景，如打卡、学习记录等。

## 🚉 Web Version

Web Version A（Cloudflare CDN & Netlify）：(https://daka-helper.mbod.me/)[https://daka-helper.mbod.me/]
Web Version B（GitHub Pages）：[(https://mbod.github.io/daka-helper/)[https://mbod.github.io/daka-helper/]](https://skydog221.github.io/daka-helper/web-demo/)
Web Version C (Netlify only):[https://daka-helper.netlify.app/](https://daka-helper.netlify.app/)

## ✨ 功能特性

- 🎵 **音频文件上传**：支持拖拽或点击上传音频文件
- ⏱️ **灵活的时间设定**：支持时分秒格式的目标时长设置
- 🔁 **智能重复拼接**：自动将音频重复到目标时长
- 🎲 **随机延长功能**：可在目标时间基础上增加随机时长（默认开启）
- 📦 **多格式导出**：支持 WAV、MP3、M4A、FLAC、AAC 等多种音频格式
- 📊 **实时进度显示**：处理过程中显示进度条
- 🎨 **现代化界面**：美观、直观的用户界面设计

## 🛠️ 技术栈

- **框架**: Electron 36.3.2
- **音频处理**: Web Audio API
- **界面**: HTML5 + CSS3 + JavaScript
- **构建工具**: electron-builder
- **包管理器**: Yarn

## 开发说明

[docs\DEVELOPER_GUIDE.md](docs\DEVELOPER_GUIDE.md)

## 使用说明

[docs\USER_GUIDE.md](docs\USER_GUIDE.md)

## 📦 安装和运行

### 开发环境要求

- Node.js >= 16.0.0
- Yarn 包管理器

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/skydog221/daka-helper.git
cd daka-helper

# 安装依赖
yarn install
```

### 开发模式运行

```bash
yarn start
# 或者使用开发模式（带调试信息）
yarn dev
```

### 构建应用

```bash
# 构建安装包
yarn build

# 构建后的文件将在 dist 目录中
```

## 📖 使用说明

1. **上传音频文件**

   - 点击"选择文件"按钮或直接拖拽音频文件到上传区域
   - 支持常见的音频格式（MP3、WAV、M4A 等）

2. **设置目标时长**

   - 在时间输入框中设置目标时长
   - 默认为 10 分钟，格式为 HH:MM:SS

3. **选择导出格式**

   - 从下拉菜单中选择需要的音频格式
   - 支持 WAV、MP3、M4A、FLAC、AAC 格式

4. **随机延长选项**

   - 勾选"随机延长"可在目标时间基础上增加 0-60 秒的随机时长
   - 默认开启此功能

5. **开始处理**
   - 点击"开始处理"按钮
   - 处理过程中会显示进度条
   - 完成后自动下载处理好的音频文件

## 📁 项目结构

```
daka-helper/
.
|-- .github  # Github 配置
|   `-- workflows
|       `-- release.yml
|-- CHANGELOG.md #  更新日志
|-- LICENSE #  开源协议
|-- README.md #  项目介绍
|-- docs #  项目文档
|   |-- DEVELOPER_GUIDE.md
|   `-- USER_GUIDE.md
|-- electron-builder.json  #  electron-builder 配置
|-- main.js #  主进程代码
|-- memory-bank  #  AI CHAT 记忆库
|   |-- activeContext.md
|   |-- decisionLog.md
|   |-- productContext.md
|   |-- progress.md
|   `-- systemPatterns.md
|-- package.json
|-- src
|   |-- audio #  音频处理模块
|   |   `-- audioProcessor.js
|   `-- renderer #  渲染进程代码
|       |-- app.js
|       |-- index.html
|       |-- preload.js
|       `-- styles.css

`-- yarn.lock
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证

本项目采用 Mozilla Public License 2.0 (MPL-2.0) 许可证。详见 [LICENSE](LICENSE) 文件。

## 👨‍💻 作者

- **skydog221** - [GitHub](https://github.com/skydog221)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

<p align="center">Made with ❤️ by skydog221</p>

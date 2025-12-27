# 打卡剪辑助手

<p align="center">
  <a href="https://github.com/skydog221">
    <img src="https://img.shields.io/badge/Author-skydog221-red" alt="Author">
  </a>
  <img src="https://img.shields.io/badge/Electron-36.3.2-blue" alt="Electron Version">
  <img src="https://img.shields.io/badge/License-MPL--2.0-green" alt="License">
  <img src="https://img.shields.io/badge/Version-2.0.0-orange" alt="Version">
  <img src="https://api.netlify.com/api/v1/badges/5cdb1ee4-c545-494a-b7d5-b37294a4621b/deploy-status" alt="Netlify Status">
</p>

## 📖 项目简介

打卡剪辑助手是一款跨平台音频处理工具，同时提供 **Electron 桌面版**和 **Web 浏览器版**。它可以将音频文件重复拼接到指定的时间长度，非常适合需要制作固定时长音频内容的场景，如打卡、学习记录等。

**v2.0 新特性**：Electron 和 Web 版本已统一为同一套代码，共享核心模块和 UI 组件，确保功能一致性。

## 🚉 Web Version

- **Netlify 部署**: [https://daka-helper.netlify.app/](https://daka-helper.netlify.app/)
- **GitHub Pages**: [https://skydog221.github.io/daka-helper/](https://skydog221.github.io/daka-helper/)

## ✨ 功能特性

- 🎵 **广泛的输入格式**：支持 MP3、WAV、FLAC、M4A、AAC、OGG 等多种音频格式
- ⏱️ **灵活的时间设定**：支持分钟+秒格式的目标时长设置
- 🔁 **智能重复拼接**：自动将音频重复到目标时长
- 🎲 **随机延长功能**：可在目标时间基础上增加 0-60 秒随机时长（可配置）
- 📦 **双格式导出**：
  - **WAV 格式（默认）**：无损音质，兼容性最佳
  - **MP3 格式（192kbps）**：较小文件体积，广泛兼容
- 📊 **实时进度显示**：处理过程中显示进度条
- 🎨 **现代化界面**：美观、直观的用户界面设计
- 🌐 **跨平台支持**：同时支持 Electron 桌面版和 Web 浏览器版

## 🛠️ 技术栈

- **框架**: Electron 36.3.2 + Vite
- **音频处理**: Web Audio API
- **MP3 编码**: lamejs (192kbps)
- **界面**: HTML5 + CSS3 + JavaScript (ES6 模块)
- **构建工具**: Vite + electron-builder + vite-plugin-singlefile
- **包管理器**: Yarn

## 开发说明

[docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)

## 使用说明

[docs/USER_GUIDE.md](docs/USER_GUIDE.md)

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
# 构建 Web 版本（单文件 HTML）
yarn build:web

# 构建 Electron 版本（包含安装包）
yarn build:electron

# 构建全部（Web + Electron）
yarn build

# 构建后的文件：
# - Web 版本: dist/web/index.html（单个 HTML 文件）
# - Electron 版本: dist/ 目录下的安装包
```

## 📖 使用说明

1. **上传音频文件**

   - 点击"选择文件"按钮或直接拖拽音频文件到上传区域
   - **支持格式**：MP3、WAV、FLAC、M4A、AAC、OGG

2. **设置目标时长**

   - 在时间输入框中设置目标时长（分钟 + 秒）
   - 默认为 10 分钟 0 秒

3. **选择导出格式**

   - **WAV（默认）**：无损音质，文件较大，兼容性最佳
   - **MP3（192kbps）**：有损压缩，文件较小，广泛兼容

4. **随机延长选项**

   - 勾选"随机延长"可在目标时间基础上增加随机时长
   - 可配置最大延长秒数（默认 60 秒）
   - 实际延长时间为 0 到设定值之间的随机数

5. **开始处理**
   - 点击"开始处理"按钮
   - 处理过程中会显示进度条
   - 完成后自动下载处理好的音频文件

## 📁 项目结构

```
daka-helper/
├── .github/                    # GitHub 配置
│   └── workflows/
│       └── release.yml
├── docs/                       # 项目文档
│   ├── DEVELOPER_GUIDE.md
│   ├── USER_GUIDE.md
│   └── BUILD.md
├── src/
│   ├── core/                   # 核心模块（平台无关）
│   │   ├── audio-repeater.js   # 音频重复拼接逻辑
│   │   ├── time-calculator.js  # 时间计算工具
│   │   ├── validator.js        # 输入验证
│   │   ├── format-detector.js  # 格式检测
│   │   └── constants.js        # 常量定义
│   ├── encoders/               # 音频编码器
│   │   ├── audio-encoder.js    # 编码器统一接口
│   │   ├── wav-encoder.js      # WAV 编码器
│   │   └── mp3-encoder.js      # MP3 编码器 (lamejs)
│   ├── adapters/               # 平台适配层
│   │   ├── platform-detector.js # 平台检测
│   │   ├── file-handler.js     # 文件处理适配器
│   │   └── config-storage.js   # 配置存储适配器
│   ├── ui/                     # 统一 UI（Electron + Web 共用）
│   │   ├── index.html
│   │   ├── app.js
│   │   └── styles.css
│   └── renderer/               # Electron 专用
│       └── preload.js
├── main.js                     # Electron 主进程
├── vite.config.js              # Vite 配置（Electron）
├── vite.config.web.js          # Vite 配置（Web 单文件）
├── electron-builder.json       # electron-builder 配置
├── package.json
└── yarn.lock
```

## 🎵 支持的音频格式

### 输入格式
| 格式 | 扩展名 | 备注 |
|------|--------|------|
| MP3 | .mp3 | 广泛支持 |
| WAV | .wav | 无损格式 |
| FLAC | .flac | 无损压缩 |
| M4A/AAC | .m4a, .aac | 需浏览器支持 |
| OGG | .ogg | 开源格式 |

### 输出格式
| 格式 | 比特率 | 特点 |
|------|--------|------|
| WAV（默认） | 无损 | 音质最佳，文件较大 |
| MP3 | 192kbps | 良好音质，文件较小 |

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

特别感谢：
- [lamejs](https://github.com/zhuker/lamejs) - JavaScript MP3 编码库
- [Vite](https://vitejs.dev/) - 现代前端构建工具
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架

---

<p align="center">Made with ❤️ by skydog221</p>
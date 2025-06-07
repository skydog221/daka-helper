# Product Context

This file provides a high-level overview of the project and the expected product that will be created. Initially it is based upon projectBrief.md (if provided) and all other available project-related information in the working directory. This file is intended to be updated as the project evolves, and should be used to inform all other modes of the project's goals and context.
2025-06-02 11:53:12 - Log of updates made will be appended as footnotes to the end of this file.

## Project Goal

开发一个基于 Electron 的音频打卡助手应用，能够快速重复拼接音频文件到指定时间长度，支持随机延长和多种导出格式。

## Key Features

- 音频文件上传和预览
- 目标时间设定（支持时分秒格式）
- 音频重复拼接到目标时长
- 随机延长选项（在目标时间基础上增加随机时长）
- 多种导出格式支持（MP3、WAV 等）
- 实时处理进度显示
- 美观的用户界面
- 生成一个用于网页 demo 展示的单文件 HTML 规范

## Overall Architecture

- **主进程 (main.js)**: 负责窗口管理、IPC 通信、音频处理逻辑调用
- **渲染进程 (renderer/)**: 用户界面，包括 HTML、CSS、JavaScript
- **音频处理模块 (audio/)**: 核心音频处理逻辑，使用 fluent-ffmpeg
- **IPC 通信**: 主进程与渲染进程间的数据传递和状态同步

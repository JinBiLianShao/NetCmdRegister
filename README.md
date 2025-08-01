# NetCmdRegister - 网络命令注册器


## 简介

**NetCmdRegister** 是一个基于 Electron 开发的桌面应用，旨在提供一个简单、直观的图形界面，用于测试和调试网络通信中的 UDP 命令收发。它特别适用于需要向嵌入式设备或特定网络服务发送自定义十六进制或文本命令的场景。

该工具允许用户：

  - 注册和管理自定义命令，包括命令名称和内容。
  - 通过图形界面向指定 IP 和端口发送已注册的命令。
  - 启动一个本地 UDP 服务器来监听并显示来自网络的响应。
  - 实时查看命令发送和接收的日志。

## 功能特性

  - **命令注册与管理**：轻松添加、编辑和删除带有自定义名称和内容的命令。
  - **UDP 命令发送**：一键发送已注册的命令到指定的目标 IP 和端口。
  - **本地 UDP 监听**：启动一个本地服务，监听指定端口的 UDP 响应，并将接收到的数据实时显示在日志中。
  - **十六进制支持**：命令内容支持十六进制格式，方便调试底层协议。
  - **日志记录**：详细记录所有命令发送、接收和应用状态信息，便于追溯和排查问题。
  - **持久化存储**：命令列表自动保存在本地，无需担心应用重启后数据丢失。
  - **跨平台支持**：得益于 Electron，该应用可以在 Windows、macOS 和 Linux 上运行。

## 技术栈

  - **Electron**：构建跨平台桌面应用的核心框架。
  - **Node.js**：处理后台的 UDP 网络通信。
  - **HTML/CSS/JavaScript**：构建用户界面和前端逻辑。
  - **Tailwind CSS**：用于快速、美观地构建响应式界面。

## 安装与运行

请确保您的系统中已安装 [Node.js](https://nodejs.org/) 和 [npm](https://www.npmjs.com/)（或 [cnpm](https://www.google.com/search?q=https://npm.taobao.org/)）。

1.  **克隆仓库**

    ```bash
    git clone https://github.com/your-username/NetCmdRegister.git
    cd NetCmdRegister
    ```

2.  **安装依赖**

    ```bash
    npm install
    # 或者使用 cnpm
    cnpm install
    ```

3.  **启动应用**

    ```bash
    npm start
    ```

## 屏幕截图

暂无

## 项目结构

```
NetCmdRegister/
├── main.js         # Electron 主进程文件，处理后端逻辑和窗口管理
├── renderer.js     # 渲染进程文件，处理UI交互和前端逻辑
├── preload.js      # 预加载脚本，提供主进程和渲染进程之间的安全通信桥梁
├── index.html      # 应用程序的用户界面
├── styles.css      # 自定义样式文件
├── package.json    # 项目配置和依赖管理
└── README.md       # 项目说明文件 (当前文件)
```

## 贡献

欢迎提交 Issue 和 Pull Request！如果您有任何想法或建议，请随时提出。

## 许可证

本项目采用 [MIT License](https://www.google.com/search?q=LICENSE) 许可。
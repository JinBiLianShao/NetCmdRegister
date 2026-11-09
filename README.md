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
  - **UDP / TCP 命令发送**：一键发送已注册的命令到指定的目标 IP 和端口，协议可切换；TCP 连接按目标地址复用。
  - **本地 UDP 监听**：启动一个本地服务，监听指定端口的 UDP 响应，并将接收到的数据实时显示在日志中。
  - **多编码解码视图**：接收到的数据可在 HEX / ASCII / UTF-8 之间切换查看。
  - **命令搜索**：按名称或内容实时过滤命令列表。
  - **十六进制支持**：命令内容支持十六进制格式，发送前会校验格式合法性。
  - **批量与定时发送**：支持多选并发发送，以及可配置间隔的定时发送。
  - **导入导出**：支持 JSON 配置导入导出，兼容 NetAssist 的 .cfg 文件；导入时可选择合并或覆盖。
  - **日志记录**：详细记录所有命令发送、接收和应用状态信息；日志上限 800 条，自动滚动。
  - **持久化存储**：命令列表自动保存在本地，无需担心应用重启后数据丢失。
  - **安全加固**：所有页面文本做 HTML 转义防注入，IPC 调用校验来源。
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
    git clone https://github.com/JinBiLianShao/NetCmdRegister.git
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

## 测试

```bash
npm test          # 运行单元测试（Jest）
npm run lint      # 运行 ESLint 检查
```

单元测试覆盖纯函数逻辑：十六进制校验、HTML 转义、.cfg 解析、命令规范化、多编码解码。

## 打包

```bash
npm run build:linux   # 打包 Linux（AppImage / deb / rpm）
npm run build:win     # 打包 Windows（NSIS 安装包，含 32/64 位）
```

> 注意：Electron 应用通常需要在目标平台上打包。Windows 安装包建议在 Windows 或 CI 上构建。

## 自动化发布

仓库已配置 GitHub Actions 工作流（`.github/workflows/release.yml`），推送 `v*` 格式的标签时会自动：

1. 运行语法检查、ESLint 与单元测试（任一失败即终止）
2. 在 Linux 上打包 AppImage / deb / rpm
3. 在 Windows 上打包 NSIS 安装包
4. 校验产物完整性（尺寸异常则失败）
5. 创建 GitHub Release 并上传全部产物

也可以到 Actions 页面手动触发（workflow_dispatch）。

```bash
git tag v1.1.5
git push origin v1.1.5
```

## 项目结构

```
NetCmdRegister/
├── main.js                      # Electron 主进程：窗口管理、UDP/TCP 服务、文件 IO
├── renderer.js                  # 渲染进程：UI 交互逻辑
├── preload.js                   # 预加载脚本：主进程与渲染进程的安全通信桥梁
├── utils.js                     # 纯函数工具库（浏览器 / Node 双环境）
├── utils.test.js                # 单元测试
├── index.html                   # 应用程序的用户界面
├── styles.css                   # 自定义样式文件
├── eslint.config.js             # ESLint 配置
├── package.json                 # 项目配置和依赖管理
├── icons/                       # Linux 打包图标
├── .github/workflows/release.yml # 自动化打包与发布
└── README.md                    # 项目说明文件（当前文件）
```

## 贡献

欢迎提交 Issue 和 Pull Request！如果您有任何想法或建议，请随时提出。

## 许可证

本项目采用 [MIT License](https://www.google.com/search?q=LICENSE) 许可。
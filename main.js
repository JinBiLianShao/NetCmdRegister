// main.js
/**
 * Electron 应用的主进程脚本
 * 
 * 主要功能：
 * 1. 创建和管理应用窗口
 * 2. 处理 UDP 服务端和客户端的生命周期
 * 3. 通过 IPC 与渲染进程通信
 * 
 * @file 主进程入口文件
 * @module main
 * @author jinbilianshao
 * @version 1.0.0
 * @license MIT
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dgram = require('dgram'); // 用于 UDP 通信的 Node.js 模块

// UDP 相关变量
let udpServer = null; // 存储 UDP 服务端实例
let udpClient = null; // 存储 UDP 客户端实例

/**
 * 创建应用主窗口
 * 
 * 初始化 BrowserWindow 实例并配置相关设置，
 * 同时初始化 UDP 客户端和设置 IPC 通信处理程序
 * 
 * @function createWindow
 * @author jinbilianshao
 */
const createWindow = () => {
    // 创建浏览器窗口实例
    const win = new BrowserWindow({
        width: 1000,    // 窗口初始宽度
        height: 800,    // 窗口初始高度
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // 预加载脚本路径
            contextIsolation: true // 启用上下文隔离以增强安全性
        }
    });

    // 加载应用的 HTML 文件
    win.loadFile('index.html');
    // 开发时取消下面注释可以打开开发者工具
    // win.webContents.openDevTools();

    // 初始化持久化的 UDP 客户端
    udpClient = dgram.createSocket('udp4');
    udpClient.on('error', (err) => {
        // 将错误信息发送到渲染进程
        win.webContents.send('log-message', `UDP客户端错误: ${err.stack}`, 'error');
    });

    // --- UDP 服务端管理函数 ---

    /**
     * 启动 UDP 服务端
     * 
     * 创建 UDP 服务端实例并绑定到指定端口，
     * 设置相关事件监听器
     * 
     * @param {number} port - 要监听的本地端口号
     * @author jinbilianshao
     */
    const startUDPServer = (port) => {
        // 检查是否已有运行中的服务端
        if (udpServer) {
            const currentPort = udpServer.address().port;
            win.webContents.send('log-message', 
                `UDP服务已在运行，端口: ${currentPort}`, 'error');
            return;
        }

        // 创建新的 UDP 服务端实例
        udpServer = dgram.createSocket('udp4');

        // 错误事件处理
        udpServer.on('error', (err) => {
            win.webContents.send('log-message', 
                `UDP服务错误: ${err.stack}`, 'error');
            stopUDPServer(); // 发生错误时自动停止服务
        });

        // 消息接收事件处理
        udpServer.on('message', (msg, rinfo) => {
            // 将接收到的 Buffer 转换为带空格的十六进制字符串
            const hexString = msg.toString('hex')
                .match(/.{1,2}/g) // 每两个字符分割
                .join(' ');       // 用空格连接
            win.webContents.send('log-message', 
                `从 ${rinfo.address}:${rinfo.port} 收到回执: ${hexString}`, 'recv');
        });

        // 服务启动成功事件处理
        udpServer.on('listening', () => {
            const address = udpServer.address();
            win.webContents.send('log-message', 
                `UDP服务已启动，监听地址: ${address.address}:${address.port}`, 'info');
            // 通知渲染进程服务状态更新
            win.webContents.send('server-status', { 
                running: true, 
                port: address.port 
            });
        });

        // 尝试绑定端口
        try {
            udpServer.bind(port);
        } catch (err) {
            win.webContents.send('log-message', 
                `绑定端口 ${port} 失败: ${err.message}`, 'error');
            stopUDPServer();
        }
    };

    /**
     * 停止 UDP 服务端
     * 
     * 关闭 UDP 服务端实例并清理资源
     * @author jinbilianshao
     */
    const stopUDPServer = () => {
        if (!udpServer) {
            win.webContents.send('log-message', 'UDP服务未运行', 'error');
            return;
        }
        
        // 关闭服务端
        udpServer.close(() => {
            win.webContents.send('log-message', 'UDP服务已成功关闭。', 'info');
            // 通知渲染进程服务状态更新
            win.webContents.send('server-status', { running: false });
            udpServer = null; // 清除引用
        });
    };

    // --- IPC 通信处理 ---

    /**
     * 处理启动 UDP 服务的请求
     * @author jinbilianshao
     */
    ipcMain.handle('start-udp-server', (event, port) => {
        startUDPServer(port);
    });

    /**
     * 处理停止 UDP 服务的请求
     * @author jinbilianshao
     */
    ipcMain.handle('stop-udp-server', () => {
        stopUDPServer();
    });

    /**
     * 处理发送 UDP 命令的请求
     * 
     * 使用持久化的 UDP 客户端发送命令到指定地址和端口
     * 
     * @param {Object} command - 命令对象
     * @param {string} command.ip - 目标 IP 地址
     * @param {number} command.port - 目标端口
     * @param {string} command.payload - 十六进制格式的命令内容
     * @author jinbilianshao
     */
    ipcMain.handle('send-udp-command', async (event, command) => {
        return new Promise((resolve, reject) => {
            // 检查客户端是否已初始化
            if (!udpClient) {
                win.webContents.send('log-message', 
                    'UDP客户端未初始化，无法发送命令。', 'error');
                return reject(new Error('UDP client not initialized.'));
            }

            try {
                // 将十六进制字符串转换为 Buffer
                // 移除所有空格后转换
                const message = Buffer.from(
                    command.payload.replace(/\s/g, ''), 
                    'hex'
                );

                // 发送 UDP 消息
                udpClient.send(
                    message, 
                    command.port, 
                    command.ip, 
                    (err) => {
                        if (err) {
                            win.webContents.send('log-message', 
                                `发送 UDP 命令到 ${command.ip}:${command.port} 失败: ${err.message}`, 
                                'error');
                            reject(err);
                        } else {
                            win.webContents.send('log-message', 
                                `成功发送 UDP 命令到 ${command.ip}:${command.port}`, 
                                'sent');
                            resolve();
                        }
                    }
                );
            } catch (error) {
                win.webContents.send('log-message', 
                    `发送 UDP 命令失败: ${error.message}`, 'error');
                reject(error);
            }
        });
    });
};

// --- 应用生命周期管理 ---

/**
 * 应用准备就绪时创建窗口
 * @author jinbilianshao
 */
app.whenReady().then(() => {
    createWindow();

    // macOS 特殊处理：当没有窗口时点击 Dock 图标重新创建窗口
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

/**
 * 所有窗口关闭时退出应用
 * @author jinbilianshao
 */
app.on('window-all-closed', () => {
    // 非 macOS 平台直接退出
    if (process.platform !== 'darwin') {
        // 确保关闭所有 UDP 套接字
        if (udpServer) udpServer.close();
        if (udpClient) udpClient.close();
        app.quit();
    }
});
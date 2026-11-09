// main.js
/**
 * Electron 应用的主进程脚本
 * * 主要功能：
 * 1. 创建和管理应用窗口
 * 2. 处理 UDP 服务端和客户端的生命周期
 * 3. 通过 IPC 与渲染进程通信
 * 4. (新增) 处理文件导入导出逻辑
 * * @file 主进程入口文件
 * @module main
 * @author jinbilianshao
 * @version 1.1.0
 * @license MIT
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const dgram = require('dgram'); // 用于 UDP 通信的 Node.js 模块
const net = require('net'); // 用于 TCP 通信的 Node.js 模块
const fs = require('fs/promises'); // 用于文件读写

// UDP 相关变量
let udpServer = null; // 存储 UDP 服务端实例
let udpClient = null; // 存储 UDP 客户端实例
// TCP 客户端缓存（按 host:port 复用连接，避免每次发送重复握手）
const tcpClients = new Map();

/**
 * 校验 payload 是否为合法的十六进制字节序列（允许空格分隔，必须为偶数个 hex 字符）
 * @param {string} payload
 * @returns {boolean}
 */
const isValidHexPayload = (payload) => {
    if (typeof payload !== 'string') return false;
    const hex = payload.replace(/\s/g, '');
    return hex.length > 0 && hex.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hex);
};

/**
 * 创建应用主窗口
 * * 初始化 BrowserWindow 实例并配置相关设置，
 * 同时初始化 UDP 客户端和设置 IPC 通信处理程序
 * * @function createWindow
 * @author jinbilianshao
 */
const createWindow = () => {
    // 创建浏览器窗口实例
    const win = new BrowserWindow({
        width: 1200,    // 窗口初始宽度 (适当加宽以容纳新按钮)
        height: 950,    // 窗口初始高度
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // 预加载脚本路径
            contextIsolation: true // 启用上下文隔离以增强安全性
        }
    });

    // 校验 IPC 调用是否来自本应用的渲染进程，防止外部脚本滥用
    const isTrustedSender = (event) => {
        const frameUrl = event.senderFrame && event.senderFrame.url;
        return typeof frameUrl === 'string' && frameUrl.startsWith('file://');
    };

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
     * * @param {number} port - 要监听的本地端口号
     * @author jinbilianshao
     */
    const startUDPServer = (port) => {
        if (udpServer) {
            const currentPort = udpServer.address().port;
            win.webContents.send('log-message', 
                `UDP服务已在运行，端口: ${currentPort}`, 'error');
            return;
        }

        udpServer = dgram.createSocket('udp4');

        udpServer.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                win.webContents.send('log-message',
                    `端口 ${port} 已被占用，无法启动 UDP 服务。请更换端口或先关闭占用该端口的程序。`, 'error');
            } else {
                win.webContents.send('log-message',
                    `UDP服务错误: ${err.stack}`, 'error');
            }
            stopUDPServer();
        });

        udpServer.on('message', (msg, rinfo) => {
            const rawHex = msg.toString('hex');
            const hexString = rawHex.match(/.{1,2}/g)?.join(' ') || '';
            win.webContents.send('recv-message', {
                address: `${rinfo.address}:${rinfo.port}`,
                rawHex
            });
            win.webContents.send('log-message', 
                `从 ${rinfo.address}:${rinfo.port} 收到回执: ${hexString}`, 'recv');
        });

        udpServer.on('listening', () => {
            const address = udpServer.address();
            win.webContents.send('log-message', 
                `UDP服务已启动，监听地址: ${address.address}:${address.port}`, 'info');
            win.webContents.send('server-status', { 
                running: true, 
                port: address.port 
            });
        });
        
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
     * @author jinbilianshao
     */
    const stopUDPServer = () => {
        if (!udpServer) {
            win.webContents.send('log-message', 'UDP服务未运行', 'error');
            return;
        }
        
        udpServer.close(() => {
            win.webContents.send('log-message', 'UDP服务已成功关闭。', 'info');
            win.webContents.send('server-status', { running: false });
            udpServer = null;
        });
    };

    // --- IPC 通信处理 ---

    ipcMain.handle('start-udp-server', (event, port) => {
        if (!isTrustedSender(event)) return;
        startUDPServer(port);
    });

    ipcMain.handle('stop-udp-server', (event) => {
        if (!isTrustedSender(event)) return;
        stopUDPServer();
    });

    ipcMain.handle('send-udp-command', async (event, command) => {
        return new Promise((resolve, reject) => {
            if (!isTrustedSender(event)) {
                return reject(new Error('Untrusted IPC sender.'));
            }
            if (!udpClient) {
                win.webContents.send('log-message', 
                    'UDP客户端未初始化，无法发送命令。', 'error');
                return reject(new Error('UDP client not initialized.'));
            }

            try {
                if (!isValidHexPayload(command.payload)) {
                    const err = new Error(`命令内容不是合法的十六进制: ${command.payload}`);
                    win.webContents.send('log-message', err.message, 'error');
                    return reject(err);
                }
                const message = Buffer.from(
                    command.payload.replace(/\s/g, ''), 
                    'hex'
                );

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
                            // 成功的日志由渲染进程根据上下文添加，这里只处理失败情况
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

    /**
     * 通过 TCP 发送命令（复用已建立的连接，按 host:port 缓存）
     */
    ipcMain.handle('send-tcp-command', async (event, command) => {
        if (!isTrustedSender(event)) throw new Error('Untrusted IPC sender.');
        if (!isValidHexPayload(command.payload)) {
            const err = new Error(`命令内容不是合法的十六进制: ${command.payload}`);
            win.webContents.send('log-message', err.message, 'error');
            throw err;
        }
        const message = Buffer.from(command.payload.replace(/\s/g, ''), 'hex');
        const key = `${command.ip}:${command.port}`;
        let client = tcpClients.get(key);

        return new Promise((resolve, reject) => {
            const sendOnSocket = (socket) => {
                socket.write(message, (err) => {
                    if (err) {
                        win.webContents.send('log-message',
                            `发送 TCP 命令到 ${key} 失败: ${err.message}`, 'error');
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            };

            if (client && !client.destroyed) {
                return sendOnSocket(client);
            }

            // 建立新连接
            client = net.createConnection({ host: command.ip, port: command.port });
            tcpClients.set(key, client);

            const onError = (err) => {
                tcpClients.delete(key);
                win.webContents.send('log-message',
                    `TCP 连接 ${key} 失败: ${err.message}`, 'error');
                reject(err);
            };
            const onTimeout = () => {
                tcpClients.delete(key);
                win.webContents.send('log-message',
                    `TCP 连接 ${key} 超时。`, 'error');
                reject(new Error('TCP connection timeout.'));
            };

            client.setTimeout(5000, onTimeout);
            client.once('error', onError);
            client.once('connect', () => {
                client.removeListener('error', onError);
                client.on('error', (err) => {
                    tcpClients.delete(key);
                    win.webContents.send('log-message',
                        `TCP 连接 ${key} 错误: ${err.message}`, 'error');
                });
                client.on('close', () => tcpClients.delete(key));
                sendOnSocket(client);
            });
        });
    });

    // --- 文件处理 IPC ---
    /**
     * 处理导出命令的请求
     */
    ipcMain.handle('export-commands', async (event, commandsData) => {
        if (!isTrustedSender(event)) return { success: false, error: '非法调用来源' };
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: '导出命令配置',
            defaultPath: 'net-cmd-config.json',
            filters: [{ name: 'JSON Files', extensions: ['json'] }]
        });

        if (!canceled && filePath) {
            try {
                await fs.writeFile(filePath, commandsData);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
        return { success: false, error: '用户取消了操作' };
    });

    /**
     * 处理导入命令的请求
     */
    ipcMain.handle('import-commands', async (event) => {
        if (!isTrustedSender(event)) return { success: false, error: '非法调用来源' };
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: '导入命令配置',
            filters: [{ name: '配置', extensions: ['json', 'cfg'] }],
            properties: ['openFile']
        });

        if (!canceled && filePaths.length > 0) {
            try {
                const filePath = filePaths[0];
                const data = await fs.readFile(filePath, 'utf-8');
                return { success: true, data, filePath };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
        return { success: false, error: '用户取消了操作' };
    });
};

// --- 应用生命周期管理 ---

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (udpServer) udpServer.close();
        if (udpClient) udpClient.close();
        app.quit();
    }
});
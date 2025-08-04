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
const fs = require('fs/promises'); // 用于文件读写

// UDP 相关变量
let udpServer = null; // 存储 UDP 服务端实例
let udpClient = null; // 存储 UDP 客户端实例

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
            win.webContents.send('log-message', 
                `UDP服务错误: ${err.stack}`, 'error');
            stopUDPServer();
        });

        udpServer.on('message', (msg, rinfo) => {
            const hexString = msg.toString('hex')
                .match(/.{1,2}/g)
                .join(' ');
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
        startUDPServer(port);
    });

    ipcMain.handle('stop-udp-server', () => {
        stopUDPServer();
    });

    ipcMain.handle('send-udp-command', async (event, command) => {
        return new Promise((resolve, reject) => {
            if (!udpClient) {
                win.webContents.send('log-message', 
                    'UDP客户端未初始化，无法发送命令。', 'error');
                return reject(new Error('UDP client not initialized.'));
            }

            try {
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

    // --- 文件处理 IPC ---
    /**
     * 处理导出命令的请求
     */
    ipcMain.handle('export-commands', async (event, commandsData) => {
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
    ipcMain.handle('import-commands', async () => {
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
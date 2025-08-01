// main.js
// 这是 Electron 应用的主进程脚本。

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dgram = require('dgram'); // 用于 UDP 通信的 Node.js 模块

let udpServer = null; // 用于存储 UDP 服务器实例
let udpClient = null; // 用于存储 UDP 客户端实例

// 创建主窗口
const createWindow = () => {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            // 确保 contextIsolation 开启以保证安全性
            contextIsolation: true
        }
    });

    win.loadFile('index.html');
    // win.webContents.openDevTools(); // 调试时可以开启

    // 在应用启动时创建持久化的 UDP 客户端实例
    udpClient = dgram.createSocket('udp4');
    udpClient.on('error', (err) => {
        win.webContents.send('log-message', `UDP客户端错误: ${err.stack}`, 'error');
    });

    // --- UDP 服务启动和停止 ---

    /**
     * 启动 UDP 服务
     * @param {number} port - 监听的本地端口
     */
    const startUDPServer = (port) => {
        if (udpServer) {
            win.webContents.send('log-message', `UDP服务已在运行，端口: ${udpServer.address().port}`, 'error');
            return;
        }

        udpServer = dgram.createSocket('udp4');

        udpServer.on('error', (err) => {
            win.webContents.send('log-message', `UDP服务错误: ${err.stack}`, 'error');
            stopUDPServer(); // 发生错误时关闭服务
        });

        udpServer.on('message', (msg, rinfo) => {
            // 将接收到的 Buffer 数据转换为带空格的十六进制字符串
            const hexString = msg.toString('hex').match(/.{1,2}/g).join(' ');
            win.webContents.send('log-message', `从 ${rinfo.address}:${rinfo.port} 收到回执: ${hexString}`, 'recv');
        });

        udpServer.on('listening', () => {
            const address = udpServer.address();
            win.webContents.send('log-message', `UDP服务已启动，监听地址: ${address.address}:${address.port}`, 'info');
            win.webContents.send('server-status', { running: true, port: address.port });
        });

        try {
            udpServer.bind(port);
        } catch (err) {
            win.webContents.send('log-message', `绑定端口 ${port} 失败: ${err.message}`, 'error');
            stopUDPServer();
        }
    };

    /**
     * 停止 UDP 服务
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

    // --- IPC 事件处理 ---

    // 监听启动服务的请求
    ipcMain.handle('start-udp-server', (event, port) => {
        startUDPServer(port);
    });

    // 监听停止服务的请求
    ipcMain.handle('stop-udp-server', () => {
        stopUDPServer();
    });

    // 监听发送命令的请求，使用持久化的 udpClient
    ipcMain.handle('send-udp-command', async (event, command) => {
        return new Promise((resolve, reject) => {
            if (!udpClient) {
                win.webContents.send('log-message', 'UDP客户端未初始化，无法发送命令。', 'error');
                return reject(new Error('UDP client not initialized.'));
            }

            try {
                // 将十六进制字符串转换为 Buffer
                const message = Buffer.from(command.payload.replace(/\s/g, ''), 'hex');

                udpClient.send(message, command.port, command.ip, (err) => {
                    if (err) {
                        win.webContents.send('log-message', `发送 UDP 命令到 ${command.ip}:${command.port} 失败: ${err.message}`, 'error');
                        reject(err);
                    } else {
                        win.webContents.send('log-message', `成功发送 UDP 命令到 ${command.ip}:${command.port}`, 'sent');
                        resolve();
                    }
                });
            } catch (error) {
                win.webContents.send('log-message', `发送 UDP 命令失败: ${error.message}`, 'error');
                reject(error);
            }
        });
    });
};

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
        // 在应用退出时确保关闭所有 UDP 套接字
        if (udpServer) udpServer.close();
        if (udpClient) udpClient.close();
        app.quit();
    }
});

// preload.js
// 这是一个安全脚本，用于在渲染进程中暴露一个有限的 API，以与主进程通信。
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // 暴露一个函数，用于在主进程中发送 UDP 命令
    sendUDPCommand: (command) => ipcRenderer.invoke('send-udp-command', command),

    // 暴露函数用于启动/停止 UDP 服务
    startUDPServer: (port) => ipcRenderer.invoke('start-udp-server', port),
    stopUDPServer: () => ipcRenderer.invoke('stop-udp-server'),

    // 监听主进程发来的日志和状态信息
    onLogMessage: (callback) => ipcRenderer.on('log-message', (_event, message, type) => callback(message, type)),
    onServerStatus: (callback) => ipcRenderer.on('server-status', (_event, status) => callback(status))
});

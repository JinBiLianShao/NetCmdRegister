// preload.js
/**
 * Electron 预加载脚本
 *
 * @file 预加载脚本
 * @module preload
 * @author jinbilianshao
 * @version 1.1.0
 * @license MIT
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * 暴露给渲染进程的 Electron API
 * @namespace electronAPI
 */
contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * 发送 UDP 命令到主进程
     */
    sendUDPCommand: (command) => ipcRenderer.invoke('send-udp-command', command),

    /**
     * 启动 UDP 服务
     */
    startUDPServer: (port) => ipcRenderer.invoke('start-udp-server', port),

    /**
     * 停止 UDP 服务
     */
    stopUDPServer: () => ipcRenderer.invoke('stop-udp-server'),
    
    /**
     * (新增) 导出命令到文件
     * @param {string} commandsData - JSON 格式的命令字符串
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    exportCommands: (commandsData) => ipcRenderer.invoke('export-commands', commandsData),

    /**
     * (新增) 从文件导入命令
     * @returns {Promise<{success: boolean, data?: string, error?: string}>}
     */
    importCommands: () => ipcRenderer.invoke('import-commands'),

    /**
     * 监听日志消息事件
     */
    onLogMessage: (callback) => {
        const handler = (_event, message, type) => callback(message, type);
        ipcRenderer.on('log-message', handler);
        return () => ipcRenderer.removeListener('log-message', handler);
    },

    /**
     * 监听服务器状态变化事件
     */
    onServerStatus: (callback) => {
        const handler = (_event, status) => callback(status);
        ipcRenderer.on('server-status', handler);
        return () => ipcRenderer.removeListener('server-status', handler);
    }
});
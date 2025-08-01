// preload.js
/**
 * Electron 预加载脚本
 * 
 * 在渲染进程和主进程之间建立安全的通信桥梁，
 * 暴露有限的 API 供渲染进程使用
 * 
 * @file 预加载脚本
 * @module preload
 * @author jinbilianshao
 * @version 1.0.0
 * @license MIT
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * 暴露给渲染进程的 Electron API
 * 
 * 通过 contextBridge 安全地将 IPC 通信方法暴露给渲染进程，
 * 避免直接暴露整个 ipcRenderer
 * 
 * @namespace electronAPI
 */
contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * 发送 UDP 命令到主进程
     * 
     * @function sendUDPCommand
     * @param {Object} command - UDP 命令对象
     * @param {string} command.ip - 目标 IP 地址
     * @param {number} command.port - 目标端口号
     * @param {string} command.payload - 十六进制格式的命令负载
     * @returns {Promise} 返回 Promise，表示命令发送状态
     * @example
     * window.electronAPI.sendUDPCommand({
     *   ip: '192.168.1.1',
     *   port: 8080,
     *   payload: 'A0 B1 C2'
     * });
     */
    sendUDPCommand: (command) => ipcRenderer.invoke('send-udp-command', command),

    /**
     * 启动 UDP 服务
     * 
     * @function startUDPServer
     * @param {number} port - 要监听的端口号
     * @returns {Promise} 返回 Promise，表示服务启动状态
     * @example
     * window.electronAPI.startUDPServer(8080);
     */
    startUDPServer: (port) => ipcRenderer.invoke('start-udp-server', port),

    /**
     * 停止 UDP 服务
     * 
     * @function stopUDPServer
     * @returns {Promise} 返回 Promise，表示服务停止状态
     * @example
     * window.electronAPI.stopUDPServer();
     */
    stopUDPServer: () => ipcRenderer.invoke('stop-udp-server'),

    /**
     * 监听日志消息事件
     * 
     * @function onLogMessage
     * @param {Function} callback - 日志消息回调函数
     * @param {string} callback.message - 日志消息内容
     * @param {string} callback.type - 日志类型 ('error', 'info', 'recv', 'sent')
     * @returns {Function} 返回取消监听函数
     * @example
     * const unsubscribe = window.electronAPI.onLogMessage((msg, type) => {
     *   console.log(`[${type}] ${msg}`);
     * });
     * // 取消监听
     * unsubscribe();
     */
    onLogMessage: (callback) => {
        // 包装回调函数以处理事件
        const handler = (_event, message, type) => callback(message, type);
        ipcRenderer.on('log-message', handler);
        
        // 返回取消监听函数
        return () => ipcRenderer.removeListener('log-message', handler);
    },

    /**
     * 监听服务器状态变化事件
     * 
     * @function onServerStatus
     * @param {Function} callback - 状态变化回调函数
     * @param {Object} callback.status - 服务器状态对象
     * @param {boolean} callback.status.running - 服务是否正在运行
     * @param {number} [callback.status.port] - 服务监听端口（当 running 为 true 时存在）
     * @returns {Function} 返回取消监听函数
     * @example
     * const unsubscribe = window.electronAPI.onServerStatus((status) => {
     *   console.log('Server status:', status.running ? 'Running' : 'Stopped');
     * });
     */
    onServerStatus: (callback) => {
        // 包装回调函数以处理事件
        const handler = (_event, status) => callback(status);
        ipcRenderer.on('server-status', handler);
        
        // 返回取消监听函数
        return () => ipcRenderer.removeListener('server-status', handler);
    }
});
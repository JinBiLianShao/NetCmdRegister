// renderer.js
/**
 * 渲染进程主脚本 - 用户界面交互逻辑
 * 
 * 负责处理所有用户界面交互，通过预加载脚本暴露的 API 与主进程通信
 * 
 * @file 渲染进程主脚本
 * @module renderer
 * @author jinbilianshao
 * @version 1.0.0
 * @license MIT
 */

// --- 全局变量定义 ---
/**
 * 存储所有注册的命令
 * @type {Array<{name: string, payload: string}>}
 */
let commands = [];

/**
 * 标识 UDP 服务是否正在运行
 * @type {boolean}
 */
let isServerRunning = false;

// --- DOM 元素获取 ---
// 命令相关元素
const commandNameInput = document.getElementById('command-name');
const commandPayloadTextarea = document.getElementById('command-payload');
const addCommandBtn = document.getElementById('add-command-btn');
const registeredCommandsList = document.getElementById('registered-commands-list');
const sendCommandsList = document.getElementById('send-commands-list');

// 网络设置相关元素
const destIpInput = document.getElementById('dest-ip');
const destPortInput = document.getElementById('dest-port');
const localPortInput = document.getElementById('local-port');

// 日志相关元素
const logContainer = document.getElementById('log-container');
const clearLogBtn = document.getElementById('clear-log-btn');

// 状态指示相关元素
const udpStatusIndicator = document.getElementById('udp-status-indicator');
const udpStatusText = document.getElementById('udp-status-text');
const toggleUdpBtn = document.getElementById('toggle-udp-btn');

// --- UI 渲染和数据管理功能 ---

/**
 * 添加日志条目到日志容器
 * 
 * @param {string} message - 要显示的日志消息
 * @param {string} [type='info'] - 日志类型 ('info'|'sent'|'error'|'recv')
 */
const addLog = (message, type = 'info') => {
    const now = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    
    // 根据日志类型设置颜色
    let colorClass = '';
    switch (type) {
        case 'sent':
            colorClass = 'text-green-400';
            break;
        case 'error':
            colorClass = 'text-red-400';
            break;
        case 'recv':
            colorClass = 'text-blue-400';
            break;
        default:
            colorClass = 'text-slate-400';
    }
    
    logEntry.innerHTML = `
        <span class="text-slate-500">[${now}]</span> 
        <span class="${colorClass}">${message}</span>
    `;
    logContainer.prepend(logEntry);
};

/**
 * 渲染已注册的命令列表到界面
 */
const renderRegisteredCommands = () => {
    registeredCommandsList.innerHTML = '';
    
    commands.forEach((cmd, index) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center bg-slate-100 p-3 rounded-md shadow-sm text-sm';
        li.innerHTML = `
            <div class="flex-grow">
                <span class="font-bold text-slate-800">${cmd.name}</span>
                <p class="text-slate-500 truncate">${cmd.payload}</p>
            </div>
            <div class="flex space-x-2 ml-4">
                <button class="edit-btn text-slate-600 hover:text-slate-800 transition-colors" 
                        data-index="${index}">编辑</button>
                <button class="delete-btn text-red-500 hover:text-red-700 transition-colors" 
                        data-index="${index}">删除</button>
            </div>
        `;
        registeredCommandsList.appendChild(li);
    });
};

/**
 * 渲染可发送的命令列表到界面
 */
const renderSendCommands = () => {
    sendCommandsList.innerHTML = '';
    
    commands.forEach((cmd, index) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center bg-slate-100 p-3 rounded-md shadow-sm';
        li.innerHTML = `
            <div class="flex-grow">
                <span class="font-bold text-slate-800">${cmd.name}</span>
                <p class="text-slate-500 truncate">${cmd.payload}</p>
            </div>
            <button class="send-btn bg-slate-500 text-white text-xs py-1 px-3 rounded-md font-bold 
                          hover:bg-slate-600 transition-colors shadow-sm ml-4" 
                    data-index="${index}">
                发送
            </button>
        `;
        sendCommandsList.appendChild(li);
    });
};

/**
 * 将当前命令列表保存到本地存储
 */
const saveCommands = () => {
    try {
        localStorage.setItem('netCmdRegisterCommands', JSON.stringify(commands));
        addLog('命令已成功保存到本地配置文件。');
    } catch (e) {
        addLog(`保存命令失败：${e.message}`, 'error');
    }
};

/**
 * 从本地存储加载命令列表
 */
const loadCommands = () => {
    try {
        const storedCommands = localStorage.getItem('netCmdRegisterCommands');
        if (storedCommands) {
            commands = JSON.parse(storedCommands);
            addLog('命令已从本地配置文件加载。');
        } else {
            addLog('未找到本地配置文件，已初始化为空列表。');
        }
    } catch (e) {
        addLog(`加载命令失败：${e.message}`, 'error');
        commands = [];
    }
    renderRegisteredCommands();
    renderSendCommands();
};

/**
 * 更新 UDP 服务状态显示
 * 
 * @param {boolean} running - 服务是否正在运行
 * @param {number} [port] - 服务运行的端口号(当 running 为 true 时)
 */
const updateServerStatusUI = (running, port = null) => {
    isServerRunning = running;
    
    // 更新状态指示器
    if (running) {
        udpStatusIndicator.classList.replace('bg-red-500', 'bg-green-500');
        udpStatusText.classList.replace('text-red-500', 'text-green-500');
        udpStatusText.textContent = `运行中 (端口: ${port})`;
        toggleUdpBtn.textContent = '停止服务';
        toggleUdpBtn.classList.replace('bg-green-600', 'bg-red-600');
        toggleUdpBtn.classList.replace('hover:bg-green-700', 'hover:bg-red-700');
    } else {
        udpStatusIndicator.classList.replace('bg-green-500', 'bg-red-500');
        udpStatusText.classList.replace('text-green-500', 'text-red-500');
        udpStatusText.textContent = '已停止';
        toggleUdpBtn.textContent = '启动服务';
        toggleUdpBtn.classList.replace('bg-red-600', 'bg-green-600');
        toggleUdpBtn.classList.replace('hover:bg-red-700', 'hover:bg-green-700');
    }
};

// --- 事件处理函数 ---

/**
 * 处理添加/更新命令操作
 */
const handleAddCommand = () => {
    const name = commandNameInput.value.trim();
    const payload = commandPayloadTextarea.value.trim();
    
    // 验证输入
    if (!name || !payload) {
        addLog('命令名称和内容不能为空！', 'error');
        return;
    }

    // 检查是否已存在同名命令
    const existingIndex = commands.findIndex(cmd => cmd.name === name);
    if (existingIndex !== -1) {
        // 更新现有命令
        commands[existingIndex] = { name, payload };
        addLog(`命令 "${name}" 已更新。`);
    } else {
        // 添加新命令
        commands.push({ name, payload });
        addLog(`命令 "${name}" 已添加。`);
    }

    // 清空输入框并更新UI
    commandNameInput.value = '';
    commandPayloadTextarea.value = '';
    saveCommands();
    renderRegisteredCommands();
    renderSendCommands();
};

/**
 * 处理发送命令操作
 * 
 * @param {Event} event - 点击事件对象
 */
const handleSendCommand = async (event) => {
    const btn = event.target.closest('.send-btn');
    if (!btn) return;

    const index = parseInt(btn.dataset.index);
    const command = commands[index];
    if (!command) {
        addLog('找不到要发送的命令！', 'error');
        return;
    }

    const destIp = destIpInput.value.trim();
    const destPort = parseInt(destPortInput.value.trim());

    // 验证目标地址
    if (!destIp || isNaN(destPort)) {
        addLog('请填写有效的IP和端口信息！', 'error');
        return;
    }
    
    // 记录发送日志
    addLog(`正在发送命令 "${command.name}"...`, 'info');
    addLog(`发送至: ${destIp}:${destPort} | 命令内容: ${command.payload}`, 'sent');

    try {
        await window.electronAPI.sendUDPCommand({
            ip: destIp,
            port: destPort,
            payload: command.payload
        });
    } catch (e) {
        // 错误日志由主进程发回
    }
};

/**
 * 处理注册命令列表的操作(编辑/删除)
 * 
 * @param {Event} event - 点击事件对象
 */
const handleRegisteredListActions = (event) => {
    const btn = event.target;
    const index = parseInt(btn.dataset.index);
    
    if (btn.classList.contains('delete-btn')) {
        // 删除命令
        const cmdName = commands[index].name;
        commands.splice(index, 1);
        addLog(`命令 "${cmdName}" 已删除。`);
        saveCommands();
        renderRegisteredCommands();
        renderSendCommands();
    } else if (btn.classList.contains('edit-btn')) {
        // 编辑命令
        const cmdToEdit = commands[index];
        commandNameInput.value = cmdToEdit.name;
        commandPayloadTextarea.value = cmdToEdit.payload;
        addLog(`正在编辑命令 "${cmdToEdit.name}"。请在左侧表单修改并点击"添加命令"按钮保存。`);
    }
};

/**
 * 处理 UDP 服务的启动/停止操作
 */
const handleToggleUdpService = async () => {
    const localPort = parseInt(localPortInput.value.trim());
    
    // 验证端口号
    if (isNaN(localPort) || localPort < 1 || localPort > 65535) {
        addLog('本地接收端口无效，请检查！', 'error');
        return;
    }

    if (isServerRunning) {
        addLog('正在关闭 UDP 服务...', 'info');
        await window.electronAPI.stopUDPServer();
    } else {
        addLog(`正在启动 UDP 服务，监听端口: ${localPort}...`, 'info');
        await window.electronAPI.startUDPServer(localPort);
    }
};

// --- 事件监听器绑定 ---
addCommandBtn.addEventListener('click', handleAddCommand);
sendCommandsList.addEventListener('click', handleSendCommand);
registeredCommandsList.addEventListener('click', handleRegisteredListActions);
clearLogBtn.addEventListener('click', () => {
    logContainer.innerHTML = '';
    addLog('日志已清空。');
});
toggleUdpBtn.addEventListener('click', handleToggleUdpService);

// --- 主进程通信监听 ---
window.electronAPI.onLogMessage((message, type) => {
    addLog(message, type);
});

window.electronAPI.onServerStatus((status) => {
    updateServerStatusUI(status.running, status.port);
});

// --- 初始化 ---
window.addEventListener('load', loadCommands);
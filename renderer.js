// renderer.js
// 这个脚本包含了所有与 UI 交互的逻辑。
// 注意：在这里不能直接使用 Node.js API，需要通过 preload.js 暴露的 API 进行通信。

// 定义全局变量来存储命令列表
let commands = [];
let isServerRunning = false;

// 获取 DOM 元素
const commandNameInput = document.getElementById('command-name');
const commandPayloadTextarea = document.getElementById('command-payload');
const addCommandBtn = document.getElementById('add-command-btn');
const registeredCommandsList = document.getElementById('registered-commands-list');
const sendCommandsList = document.getElementById('send-commands-list');
const destIpInput = document.getElementById('dest-ip');
const destPortInput = document.getElementById('dest-port');
const localPortInput = document.getElementById('local-port');
const logContainer = document.getElementById('log-container');
const clearLogBtn = document.getElementById('clear-log-btn');
const udpStatusIndicator = document.getElementById('udp-status-indicator');
const udpStatusText = document.getElementById('udp-status-text');
const toggleUdpBtn = document.getElementById('toggle-udp-btn');

// --- UI 渲染和数据管理功能 ---

/**
 * 将日志信息添加到日志界面
 * @param {string} message - 日志内容
 * @param {string} type - 日志类型 (例如: 'info', 'sent', 'error')
 */
const addLog = (message, type = 'info') => {
    const now = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    let colorClass = '';
    if (type === 'sent') {
        colorClass = 'text-green-400';
    } else if (type === 'error') {
        colorClass = 'text-red-400';
    } else if (type === 'recv') {
        colorClass = 'text-blue-400';
    }
    logEntry.innerHTML = `<span class="text-slate-500">[${now}]</span> <span class="${colorClass}">${message}</span>`;
    logContainer.prepend(logEntry);
};

/**
 * 渲染已注册的命令列表
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
                <button class="edit-btn text-slate-600 hover:text-slate-800 transition-colors" data-index="${index}">编辑</button>
                <button class="delete-btn text-red-500 hover:text-red-700 transition-colors" data-index="${index}">删除</button>
            </div>
        `;
        registeredCommandsList.appendChild(li);
    });
};

/**
 * 渲染用户操作界面的发送命令列表
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
            <button class="send-btn bg-slate-500 text-white text-xs py-1 px-3 rounded-md font-bold hover:bg-slate-600 transition-colors shadow-sm ml-4" data-index="${index}">
                发送
            </button>
        `;
        sendCommandsList.appendChild(li);
    });
};

/**
 * 将命令列表保存到本地存储
 */
const saveCommands = () => {
    try {
        localStorage.setItem('netCmdRegisterCommands', JSON.stringify(commands));
        addLog('命令已成功保存到本地配置文件。');
    } catch (e) {
        addLog('保存命令失败：' + e.message, 'error');
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
        addLog('加载命令失败：' + e.message, 'error');
        commands = [];
    }
    renderRegisteredCommands();
    renderSendCommands();
};

/**
 * 更新 UDP 服务状态的 UI
 * @param {boolean} running - 服务是否正在运行
 * @param {number} [port] - 如果服务运行，显示的端口
 */
const updateServerStatusUI = (running, port = null) => {
    isServerRunning = running;
    if (running) {
        udpStatusIndicator.classList.remove('bg-red-500');
        udpStatusIndicator.classList.add('bg-green-500');
        udpStatusText.classList.remove('text-red-500');
        udpStatusText.classList.add('text-green-500');
        udpStatusText.textContent = `运行中 (端口: ${port})`;
        toggleUdpBtn.textContent = '停止服务';
        toggleUdpBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        toggleUdpBtn.classList.add('bg-red-600', 'hover:bg-red-700');
    } else {
        udpStatusIndicator.classList.remove('bg-green-500');
        udpStatusIndicator.classList.add('bg-red-500');
        udpStatusText.classList.remove('text-green-500');
        udpStatusText.classList.add('text-red-500');
        udpStatusText.textContent = '已停止';
        toggleUdpBtn.textContent = '启动服务';
        toggleUdpBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        toggleUdpBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    }
};

// --- 事件处理函数 ---

/**
 * 添加或更新命令
 */
const handleAddCommand = () => {
    const name = commandNameInput.value.trim();
    const payload = commandPayloadTextarea.value.trim();
    if (!name || !payload) {
        addLog('命令名称和内容不能为空！', 'error');
        return;
    }

    const existingIndex = commands.findIndex(cmd => cmd.name === name);
    if (existingIndex !== -1) {
        commands[existingIndex] = { name, payload };
        addLog(`命令 "${name}" 已更新。`);
    } else {
        commands.push({ name, payload });
        addLog(`命令 "${name}" 已添加。`);
    }

    commandNameInput.value = '';
    commandPayloadTextarea.value = '';
    saveCommands();
    renderRegisteredCommands();
    renderSendCommands();
};

/**
 * 处理发送命令按钮的点击事件
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

    if (!destIp || isNaN(destPort)) {
        addLog('请填写有效的IP和端口信息！', 'error');
        return;
    }
    
    // 发送前在日志中记录原始的十六进制字符串
    addLog(`正在发送命令 "${command.name}"...`, 'info');
    addLog(`发送至: ${destIp}:${destPort} | 命令内容: ${command.payload}`, 'sent');

    try {
        await window.electronAPI.sendUDPCommand({
            ip: destIp,
            port: destPort,
            payload: command.payload
        });
        // 成功发送的日志由主进程发回
    } catch (e) {
        // 失败的日志由主进程发回
    }
};

/**
 * 处理注册命令列表的点击事件，包括编辑和删除
 * @param {Event} event - 点击事件对象
 */
const handleRegisteredListActions = (event) => {
    const btn = event.target;
    const index = parseInt(btn.dataset.index);
    if (btn.classList.contains('delete-btn')) {
        const cmdName = commands[index].name;
        commands.splice(index, 1);
        addLog(`命令 "${cmdName}" 已删除。`);
        saveCommands();
        renderRegisteredCommands();
        renderSendCommands();
    } else if (btn.classList.contains('edit-btn')) {
        const cmdToEdit = commands[index];
        commandNameInput.value = cmdToEdit.name;
        commandPayloadTextarea.value = cmdToEdit.payload;
        addLog(`正在编辑命令 "${cmdToEdit.name}"。请在左侧表单修改并点击“添加命令”按钮保存。`);
    }
};

/**
 * 处理 UDP 服务开关的点击事件
 */
const handleToggleUdpService = async () => {
    const localPort = parseInt(localPortInput.value.trim());
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

// --- 绑定事件监听器 ---

addCommandBtn.addEventListener('click', handleAddCommand);
sendCommandsList.addEventListener('click', handleSendCommand);
registeredCommandsList.addEventListener('click', handleRegisteredListActions);
clearLogBtn.addEventListener('click', () => {
    logContainer.innerHTML = '';
    addLog('日志已清空。');
});
toggleUdpBtn.addEventListener('click', handleToggleUdpService);

// 监听主进程发来的日志和状态信息
window.electronAPI.onLogMessage((message, type) => {
    addLog(message, type);
});
window.electronAPI.onServerStatus((status) => {
    updateServerStatusUI(status.running, status.port);
});

// 页面加载时执行
window.addEventListener('load', loadCommands);

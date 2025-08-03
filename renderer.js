// renderer.js
/**
 * 渲染进程主脚本 - 用户界面交互逻辑
 * * @file 渲染进程主脚本
 * @module renderer
 * @author jinbilianshao
 * @version 1.2.0
 * @license MIT
 */

// --- 全局变量定义 ---
let commands = [];
let isServerRunning = false;

// --- DOM 元素获取 ---
const commandNameInput = document.getElementById('command-name');
const commandPayloadTextarea = document.getElementById('command-payload');
const addCommandBtn = document.getElementById('add-command-btn');
const registeredCommandsList = document.getElementById('registered-commands-list');

const selectAllCheckbox = document.getElementById('select-all-checkbox');
const sendSelectedBtn = document.getElementById('send-selected-btn');
const importCommandsBtn = document.getElementById('import-commands-btn');
const exportCommandsBtn = document.getElementById('export-commands-btn');

const destIpInput = document.getElementById('dest-ip');
const destPortInput = document.getElementById('dest-port');
const localPortInput = document.getElementById('local-port');

const logContainer = document.getElementById('log-container');
const clearLogBtn = document.getElementById('clear-log-btn');

const udpStatusIndicator = document.getElementById('udp-status-indicator');
const udpStatusText = document.getElementById('udp-status-text');
const toggleUdpBtn = document.getElementById('toggle-udp-btn');

// --- 辅助函数 ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- UI 渲染和数据管理 ---

const addLog = (message, type = 'info') => {
    const now = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    
    let colorClass = 'text-slate-400';
    if (type === 'sent') colorClass = 'text-green-400';
    else if (type === 'error') colorClass = 'text-red-400';
    else if (type === 'recv') colorClass = 'text-blue-400';
    
    logEntry.innerHTML = `<span class="text-slate-500">[${now}]</span> <span class="${colorClass}">${message}</span>`;
    logContainer.prepend(logEntry);
};

const renderRegisteredCommands = () => {
    registeredCommandsList.innerHTML = '';
    
    if (commands.length === 0) {
        registeredCommandsList.innerHTML = `<li class="text-slate-400 text-center p-4">暂无命令</li>`;
    } else {
        commands.forEach((cmd, index) => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center bg-slate-100 p-2 rounded-md shadow-sm text-sm hover:bg-slate-200 transition-colors';
            li.innerHTML = `
                <div class="flex items-center flex-grow overflow-hidden">
                    <input type="checkbox" class="command-checkbox mx-2 h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 flex-shrink-0" data-index="${index}">
                    <div class="flex-grow overflow-hidden">
                        <span class="font-bold text-slate-800 truncate block">${cmd.name}</span>
                        <p class="text-slate-500 truncate font-mono text-xs">${cmd.payload}</p>
                    </div>
                </div>
                <div class="flex space-x-2 ml-2 flex-shrink-0">
                    <button class="edit-btn text-slate-600 hover:text-slate-800 transition-colors p-1" title="编辑" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                    </button>
                    <button class="delete-btn text-red-500 hover:text-red-700 transition-colors p-1" title="删除" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                    </button>
                </div>
            `;
            registeredCommandsList.appendChild(li);
        });
    }
    updateSelectAllCheckboxState();
};

const updateSelectAllCheckboxState = () => {
    const allCheckboxes = document.querySelectorAll('.command-checkbox');
    const checkedCount = document.querySelectorAll('.command-checkbox:checked').length;

    if (allCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        return;
    }
    selectAllCheckbox.checked = checkedCount === allCheckboxes.length;
    selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
};

const saveCommands = () => {
    try {
        localStorage.setItem('netCmdRegisterCommands', JSON.stringify(commands));
    } catch (e) {
        addLog(`保存命令到本地存储失败：${e.message}`, 'error');
    }
};

const loadCommands = () => {
    try {
        const storedCommands = localStorage.getItem('netCmdRegisterCommands');
        if (storedCommands) {
            commands = JSON.parse(storedCommands);
            addLog('已从本地存储加载命令。');
        } else {
            addLog('未找到本地命令，请手动添加或导入。');
        }
    } catch (e) {
        addLog(`加载本地命令失败：${e.message}`, 'error');
        commands = [];
    }
    renderRegisteredCommands();
};

const updateServerStatusUI = (running, port = null) => {
    isServerRunning = running;
    const btnSpan = toggleUdpBtn.querySelector('span');
    
    if (running) {
        udpStatusIndicator.classList.replace('bg-red-500', 'bg-green-500');
        udpStatusText.textContent = `运行中 (端口: ${port})`;
        udpStatusText.classList.replace('text-red-500', 'text-green-500');
        btnSpan.textContent = '停止服务';
        toggleUdpBtn.classList.replace('bg-green-600', 'bg-red-600');
        toggleUdpBtn.classList.replace('hover:bg-green-700', 'hover:bg-red-700');
    } else {
        udpStatusIndicator.classList.replace('bg-green-500', 'bg-red-500');
        udpStatusText.textContent = '服务已停止';
        udpStatusText.classList.replace('text-green-500', 'text-red-500');
        btnSpan.textContent = '启动服务';
        toggleUdpBtn.classList.replace('bg-red-600', 'bg-green-600');
        toggleUdpBtn.classList.replace('hover:bg-red-700', 'hover:bg-green-700');
    }
};

// --- 事件处理函数 ---

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
    const btnSpan = addCommandBtn.querySelector('span');
    btnSpan.textContent = '添加/更新命令';
    saveCommands();
    renderRegisteredCommands();
};

const handleSendSelectedCommands = async () => {
    const checkedCheckboxes = document.querySelectorAll('.command-checkbox:checked');
    if (checkedCheckboxes.length === 0) {
        addLog('没有选中任何命令，无法发送。', 'error');
        return;
    }

    const destIp = destIpInput.value.trim();
    const destPort = parseInt(destPortInput.value.trim(), 10);

    if (!destIp || isNaN(destPort)) {
        addLog('请填写有效的目标IP和端口！', 'error');
        return;
    }

    addLog(`开始批量发送 ${checkedCheckboxes.length} 条命令至 ${destIp}:${destPort}...`, 'info');

    for (const checkbox of checkedCheckboxes) {
        const index = parseInt(checkbox.dataset.index, 10);
        const command = commands[index];
        if (command) {
            try {
                await window.electronAPI.sendUDPCommand({ ip: destIp, port: destPort, payload: command.payload });
                addLog(`成功发送: "${command.name}" | 内容: ${command.payload}`, 'sent');
                await sleep(50); // 短暂延迟
            } catch (e) {
                // 错误日志已由主进程通过 onLogMessage 发送
            }
        }
    }
    addLog('批量发送完成。', 'info');
};

const handleRegisteredListActions = (event) => {
    const target = event.target.closest('button, input');
    if (!target) return;

    const li = target.closest('li');
    if (!li) return;

    const index = parseInt(target.dataset.index, 10);
    
    if (target.classList.contains('delete-btn')) {
        const cmdName = commands[index].name;
        commands.splice(index, 1);
        addLog(`命令 "${cmdName}" 已删除。`);
        saveCommands();
        renderRegisteredCommands();
    } else if (target.classList.contains('edit-btn')) {
        const cmdToEdit = commands[index];
        commandNameInput.value = cmdToEdit.name;
        commandPayloadTextarea.value = cmdToEdit.payload;
        const btnSpan = addCommandBtn.querySelector('span');
        btnSpan.textContent = `更新 "${cmdToEdit.name}"`;
        addLog(`正在编辑命令 "${cmdToEdit.name}"。`);
        commandNameInput.focus();
    } else if (target.classList.contains('command-checkbox')) {
        updateSelectAllCheckboxState();
    }
};

const handleToggleUdpService = async () => {
    const localPort = parseInt(localPortInput.value.trim(), 10);
    if (isNaN(localPort) || localPort < 1 || localPort > 65535) {
        addLog('本地监听端口无效！', 'error');
        return;
    }

    if (isServerRunning) {
        await window.electronAPI.stopUDPServer();
    } else {
        await window.electronAPI.startUDPServer(localPort);
    }
};

const handleSelectAll = () => {
    const isChecked = selectAllCheckbox.checked;
    document.querySelectorAll('.command-checkbox').forEach(checkbox => checkbox.checked = isChecked);
    updateSelectAllCheckboxState();
};

const handleImportCommands = async () => {
    const result = await window.electronAPI.importCommands();
    if (result.success) {
        try {
            const importedCommands = JSON.parse(result.data);
            if (Array.isArray(importedCommands)) {
                commands = importedCommands;
                saveCommands();
                renderRegisteredCommands();
                addLog(`成功导入 ${commands.length} 条命令。`);
            } else {
                throw new Error('配置文件格式错误，不是有效的命令数组。');
            }
        } catch (e) {
            addLog(`导入失败: ${e.message}`, 'error');
        }
    } else if (result.error !== '用户取消了操作') {
        addLog(`导入失败: ${result.error}`, 'error');
    }
};

const handleExportCommands = async () => {
    if (commands.length === 0) {
        addLog('没有可导出的命令。', 'error');
        return;
    }
    const commandsJson = JSON.stringify(commands, null, 2);
    const result = await window.electronAPI.exportCommands(commandsJson);
    if (result.success) {
        addLog('命令已成功导出。');
    } else if (result.error !== '用户取消了操作') {
        addLog(`导出失败: ${result.error}`, 'error');
    }
};

// --- 事件监听器绑定 ---
addCommandBtn.addEventListener('click', handleAddCommand);
registeredCommandsList.addEventListener('click', handleRegisteredListActions);
clearLogBtn.addEventListener('click', () => {
    logContainer.innerHTML = '';
    addLog('日志已清空。');
});
toggleUdpBtn.addEventListener('click', handleToggleUdpService);
selectAllCheckbox.addEventListener('click', handleSelectAll);
sendSelectedBtn.addEventListener('click', handleSendSelectedCommands);
importCommandsBtn.addEventListener('click', handleImportCommands);
exportCommandsBtn.addEventListener('click', handleExportCommands);

// --- 主进程通信监听 ---
window.electronAPI.onLogMessage((message, type) => addLog(message, type));
window.electronAPI.onServerStatus((status) => updateServerStatusUI(status.running, status.port));

// --- 初始化 ---
window.addEventListener('load', loadCommands);
// renderer.js
/**
 * 渲染进程主脚本 - 用户界面交互逻辑
 * * @file 渲染进程主脚本
 * @module renderer
 * @author jinbilianshao
 * @version 1.8.1
 * @license MIT
 */

// --- 全局变量 ---
let commands = [];
let isServerRunning = false;
let isScheduledSending = false;
let scheduledSendTimer = null;

// --- DOM 元素 ---
const commandNameInput = document.getElementById('command-name');
const commandPayloadTextarea = document.getElementById('command-payload');
const addCommandBtn = document.getElementById('add-command-btn');
const registeredCommandsList = document.getElementById('registered-commands-list');
const selectAllCheckbox = document.getElementById('select-all-checkbox');
const importCommandsBtn = document.getElementById('import-commands-btn');
const exportCommandsBtn = document.getElementById('export-commands-btn');
const destIpInput = document.getElementById('dest-ip');
const destPortInput = document.getElementById('dest-port');
const sendSelectedBtn = document.getElementById('send-selected-btn');
const localPortInput = document.getElementById('local-port');
const udpStatusIndicator = document.getElementById('udp-status-indicator');
const udpStatusText = document.getElementById('udp-status-text');
const toggleUdpBtn = document.getElementById('toggle-udp-btn');
const logContainer = document.getElementById('log-container');
const clearLogBtn = document.getElementById('clear-log-btn');
const logEmptyState = document.getElementById('log-empty-state');
const sendIntervalInput = document.getElementById('send-interval-input');
const toggleScheduledSendBtn = document.getElementById('toggle-scheduled-send-btn');
const scheduledSendBtnText = document.getElementById('scheduled-send-btn-text');
const playIcon = toggleScheduledSendBtn.querySelector('.play-icon');
const stopIcon = toggleScheduledSendBtn.querySelector('.stop-icon');
const intervalWarning = document.getElementById('interval-warning');
const tabListBtn = document.getElementById('tab-list-btn');
const tabAddBtn = document.getElementById('tab-add-btn');
const tabPanelList = document.getElementById('tab-panel-list');
const tabPanelAdd = document.getElementById('tab-panel-add');

// --- 工具函数 ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- 日志处理 ---
const addLog = (message, type = 'info') => {
    if (logEmptyState) logEmptyState.style.display = 'none';
    const now = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    let colorClass = 'text-slate-400';
    if (type === 'sent') colorClass = 'text-green-400';
    else if (type === 'error') colorClass = 'text-red-400';
    else if (type === 'recv') colorClass = 'text-blue-400';
    logEntry.innerHTML = `<span class="text-slate-500">[${now}]</span> <span class="${colorClass}">${message}</span>`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight; // 自动滚动到底部
};

// --- 命令列表渲染 ---
const renderRegisteredCommands = () => {
    registeredCommandsList.innerHTML = '';
    if (commands.length === 0) {
        registeredCommandsList.innerHTML = `<li class="text-slate-400 text-center p-4">暂无命令，请在"添加/编辑"页签中新增。</li>`;
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
                    <button class="send-btn bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded shadow-sm" data-index="${index}">发送</button>
                    <button class="edit-btn text-slate-600 hover:text-slate-800 transition-colors p-1" title="编辑" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                    </button>
                    <button class="delete-btn text-red-500 hover:text-red-700 transition-colors p-1" title="删除" data-index="${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                    </button>
                </div>`;
            registeredCommandsList.appendChild(li);
        });
    }
    updateSelectAllCheckboxState();
};

// --- 复选框全选状态更新 ---
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

// --- 本地存储 ---
const saveCommands = () => {
    try {
        localStorage.setItem('netCmdRegisterCommands', JSON.stringify(commands));
    } catch (e) {
        addLog(`保存命令失败：${e.message}`, 'error');
    }
};

const loadCommands = () => {
    try {
        const stored = localStorage.getItem('netCmdRegisterCommands');
        commands = stored ? JSON.parse(stored) : [];
    } catch (e) {
        commands = [];
    }
    renderRegisteredCommands();
};

// --- UI 更新 ---
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

const updateScheduledSendUI = () => {
    if (isScheduledSending) {
        scheduledSendBtnText.textContent = '停止定时';
        toggleScheduledSendBtn.classList.replace('bg-indigo-600', 'bg-red-600');
        toggleScheduledSendBtn.classList.replace('hover:bg-indigo-700', 'hover:bg-red-700');
        playIcon.classList.add('hidden');
        stopIcon.classList.remove('hidden');
        sendSelectedBtn.disabled = true;
        sendIntervalInput.disabled = true;
    } else {
        scheduledSendBtnText.textContent = '开始定时';
        toggleScheduledSendBtn.classList.replace('bg-red-600', 'bg-indigo-600');
        toggleScheduledSendBtn.classList.replace('hover:bg-red-700', 'hover:bg-indigo-700');
        playIcon.classList.remove('hidden');
        stopIcon.classList.add('hidden');
        sendSelectedBtn.disabled = false;
        sendIntervalInput.disabled = false;
    }
};

// --- TAB 切换 ---
const switchTab = (tabName) => {
    if (tabName === 'add') {
        tabPanelAdd.classList.remove('hidden');
        tabPanelList.classList.add('hidden');
        tabAddBtn.classList.add('active');
        tabListBtn.classList.remove('active');
    } else {
        tabPanelAdd.classList.add('hidden');
        tabPanelList.classList.remove('hidden');
        tabAddBtn.classList.remove('active');
        tabListBtn.classList.add('active');
    }
};

// --- 事件处理 ---
// 添加/更新命令
const handleAddCommand = () => {
    const name = commandNameInput.value.trim();
    const payload = commandPayloadTextarea.value.trim();
    if (!name || !payload) {
        addLog('命令名称和内容不能为空！', 'error');
        return;
    }
    const idx = commands.findIndex(cmd => cmd.name === name);
    if (idx !== -1) {
        commands[idx] = { name, payload };
        addLog(`命令 "${name}" 已更新。`);
    } else {
        commands.push({ name, payload });
        addLog(`命令 "${name}" 已添加。`);
    }
    commandNameInput.value = '';
    commandPayloadTextarea.value = '';
    addCommandBtn.querySelector('span').textContent = '添加/更新命令';
    saveCommands();
    renderRegisteredCommands();
    selectAllCheckbox.checked = false;
    switchTab('list');
};

// 发送所选命令
const handleSendSelectedCommands = async () => {
    const checked = document.querySelectorAll('.command-checkbox:checked');
    if (checked.length === 0) {
        addLog('没有选中任何命令，无法发送。', 'error');
        return;
    }
    const destIp = destIpInput.value.trim();
    const destPort = parseInt(destPortInput.value.trim(), 10);
    if (!destIp || isNaN(destPort)) {
        addLog('请填写有效的目标IP和端口！', 'error');
        return;
    }
    for (const cb of checked) {
        const cmd = commands[parseInt(cb.dataset.index, 10)];
        if (cmd) {
            try {
                await window.electronAPI.sendUDPCommand({ ip: destIp, port: destPort, payload: cmd.payload });
                addLog(`成功发送: "${cmd.name}" | ${cmd.payload}`, 'sent');
                await sleep(50);
            } catch {}
        }
    }
    addLog('批量发送完成。');
};

// 列表按钮处理（删除、编辑、单条发送）
const handleRegisteredListActions = (e) => {
    const target = e.target.closest('button, input');
    if (!target) return;
    const idx = parseInt(target.dataset.index, 10);
    if (target.classList.contains('delete-btn')) {
        const name = commands[idx].name;
        commands.splice(idx, 1);
        addLog(`命令 "${name}" 已删除。`);
        saveCommands();
        renderRegisteredCommands();
    } else if (target.classList.contains('edit-btn')) {
        const cmd = commands[idx];
        commandNameInput.value = cmd.name;
        commandPayloadTextarea.value = cmd.payload;
        addCommandBtn.querySelector('span').textContent = `更新 "${cmd.name}"`;
        addLog(`正在编辑命令 "${cmd.name}"。`);
        switchTab('add');
    } else if (target.classList.contains('send-btn')) {
        const cmd = commands[idx];
        const destIp = destIpInput.value.trim();
        const destPort = parseInt(destPortInput.value.trim(), 10);
        if (!destIp || isNaN(destPort)) {
            addLog('请填写有效的目标IP和端口！', 'error');
            return;
        }
        window.electronAPI.sendUDPCommand({ ip: destIp, port: destPort, payload: cmd.payload })
            .then(() => addLog(`成功发送: "${cmd.name}" | ${cmd.payload}`, 'sent'))
            .catch(() => addLog(`发送失败: "${cmd.name}"`, 'error'));
    } else if (target.classList.contains('command-checkbox')) {
        updateSelectAllCheckboxState();
    }
};

// UDP 服务开关
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

// 全选复选框
const handleSelectAll = () => {
    const isChecked = selectAllCheckbox.checked;
    document.querySelectorAll('.command-checkbox').forEach(cb => cb.checked = isChecked);
    updateSelectAllCheckboxState();
};

// 定时发送
const executeScheduledSend = async () => {
    const checked = document.querySelectorAll('.command-checkbox:checked');
    if (checked.length === 0) {
        addLog('没有选中任何命令，定时发送已自动停止。', 'error');
        handleToggleScheduledSend();
        return;
    }
    const destIp = destIpInput.value.trim();
    const destPort = parseInt(destPortInput.value.trim(), 10);
    if (!destIp || isNaN(destPort)) {
        addLog('目标IP或端口无效，定时发送已停止。', 'error');
        handleToggleScheduledSend();
        return;
    }
    for (const cb of checked) {
        const cmd = commands[parseInt(cb.dataset.index, 10)];
        try {
            await window.electronAPI.sendUDPCommand({ ip: destIp, port: destPort, payload: cmd.payload });
            addLog(`(定时)发送: "${cmd.name}"`, 'sent');
            await sleep(50);
        } catch {}
    }
};

const handleToggleScheduledSend = () => {
    if (isScheduledSending) {
        clearInterval(scheduledSendTimer);
        scheduledSendTimer = null;
        isScheduledSending = false;
        addLog('定时发送已停止。');
    } else {
        const interval = parseInt(sendIntervalInput.value, 10);
        if (isNaN(interval) || interval < 1) {
            addLog('发送间隔无效！', 'error');
            return;
        }
        if (document.querySelectorAll('.command-checkbox:checked').length === 0) {
            addLog('请至少选择一个命令！', 'error');
            return;
        }
        isScheduledSending = true;
        addLog(`定时发送启动，间隔 ${interval} ms。`);
        executeScheduledSend();
        scheduledSendTimer = setInterval(executeScheduledSend, interval);
    }
    updateScheduledSendUI();
};

// 发送间隔提示
const handleIntervalChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val < 20) {
        intervalWarning.classList.remove('hidden');
        intervalWarning.classList.add('flex');
    } else {
        intervalWarning.classList.add('hidden');
        intervalWarning.classList.remove('flex');
    }
};

// --- 绑定事件 ---
addCommandBtn.addEventListener('click', handleAddCommand);
registeredCommandsList.addEventListener('click', handleRegisteredListActions);
clearLogBtn.addEventListener('click', () => {
    logContainer.innerHTML = '<div id="log-empty-state" class="flex items-center justify-center h-full text-slate-500">日志为空</div>';
});
toggleUdpBtn.addEventListener('click', handleToggleUdpService);
selectAllCheckbox.addEventListener('click', handleSelectAll);
sendSelectedBtn.addEventListener('click', handleSendSelectedCommands);
importCommandsBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.importCommands();
    if (result.success) {
        try {
            const imported = result.filePath.toLowerCase().endsWith('.json')
                ? JSON.parse(result.data)
                : parseCfgCommands(result.data);
            if (Array.isArray(imported)) {
                commands = imported;
                saveCommands();
                renderRegisteredCommands();
                addLog(`导入 ${commands.length} 条命令。`);
            }
        } catch (e) {
            addLog(`导入失败: ${e.message}`, 'error');
        }
    }
});
exportCommandsBtn.addEventListener('click', async () => {
    if (commands.length === 0) return addLog('没有可导出的命令。', 'error');
    const result = await window.electronAPI.exportCommands(JSON.stringify(commands, null, 2));
    if (result.success) addLog('命令已成功导出。');
});
toggleScheduledSendBtn.addEventListener('click', handleToggleScheduledSend);
sendIntervalInput.addEventListener('input', handleIntervalChange);
tabListBtn.addEventListener('click', () => switchTab('list'));
tabAddBtn.addEventListener('click', () => switchTab('add'));

// --- 主进程事件监听 ---
window.electronAPI.onLogMessage((msg, type) => addLog(msg, type));
window.electronAPI.onServerStatus((status) => updateServerStatusUI(status.running, status.port));

// --- 初始化 ---
window.addEventListener('load', () => {
    loadCommands();
    switchTab('list');
});

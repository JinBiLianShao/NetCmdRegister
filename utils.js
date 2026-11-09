// utils.js
/**
 * 纯函数工具库：浏览器（window）与 Node（CommonJS）双环境可用，便于单元测试。
 * @module utils
 * @author jinbilianshao
 * @license MIT
 */

/**
 * 校验 payload 是否为合法的十六进制字节序列（允许空格分隔，必须为偶数个 hex 字符）
 * @param {string} payload
 * @returns {boolean}
 */
function isValidHexPayload(payload) {
    if (typeof payload !== 'string') return false;
    const hex = payload.replace(/\s/g, '');
    return hex.length > 0 && hex.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hex);
}

/**
 * HTML 转义，防止 XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 解析 NetAssist 软件的 .cfg 文件
 * 支持 [BATCHSEND] 和 [SHORTCUT] 区域
 * @param {string} cfgData - 文件内容
 * @returns {Array<{name: string, payload: string}>}
 */
function parseCfgCommands(cfgData) {
    const parsedCmds = [];
    const lines = String(cfgData).split(/\r?\n/);
    let inBatchSendSection = false;
    let inShortcutSection = false;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            const section = trimmed.toUpperCase();
            inBatchSendSection = (section === '[BATCHSEND]');
            inShortcutSection = (section === '[SHORTCUT]');
            return;
        }

        if (inBatchSendSection) {
            const parts = trimmed.split('=');
            if (parts.length >= 2) {
                const valuePart = parts.slice(1).join('=');
                const fields = valuePart.split('|');
                if (fields.length >= 5) {
                    const name = fields[3].trim();
                    const payload = fields[4].trim();
                    if (name && payload) {
                        parsedCmds.push({ name, payload });
                    }
                }
            }
        }

        if (inShortcutSection) {
            const parts = trimmed.split('=');
            if (parts.length >= 2) {
                const name = parts[0].trim();
                const valuePart = parts.slice(1).join('=');
                const fields = valuePart.split('|');
                if (fields.length >= 4) {
                    const rawPayload = fields[3].trim();
                    const payload = rawPayload.match(/.{1,2}/g)?.join(' ')?.toUpperCase() || '';
                    if (name && payload) {
                        parsedCmds.push({ name, payload });
                    }
                }
            }
        }
    });

    return parsedCmds;
}

/**
 * 规范化命令数组：过滤非法条目（缺字段或 payload 非 hex）
 * @param {Array} arr
 * @returns {Array<{name: string, payload: string}>}
 */
function normalizeCommands(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(cmd => {
        return cmd && typeof cmd.name === 'string' && cmd.name.trim()
            && typeof cmd.payload === 'string' && isValidHexPayload(cmd.payload);
    }).map(cmd => ({ name: cmd.name.trim(), payload: cmd.payload.trim() }));
}

/**
 * 将十六进制字符串按指定编码解码显示
 * @param {string} rawHex - 无空格的十六进制字符串
 * @param {string} mode - hex | ascii | utf8
 * @returns {string}
 */
function decodeHex(rawHex, mode) {
    try {
        if (mode === 'hex') {
            return rawHex.match(/.{1,2}/g)?.join(' ').toUpperCase() || '';
        }
        // 浏览器环境无 Buffer，仅 Node 环境使用 Buffer
        if (typeof Buffer === 'undefined') return rawHex;
        const buf = Buffer.from(rawHex, 'hex');
        if (mode === 'ascii') {
            return buf.toString('ascii').replace(/[\x00-\x1f\x7f]/g, '.');
        }
        return buf.toString('utf8').replace(/[\x00-\x1f\x7f]/g, '.');
    } catch {
        return rawHex;
    }
}

const api = {
    isValidHexPayload,
    escapeHtml,
    parseCfgCommands,
    normalizeCommands,
    decodeHex
};

// 双环境导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}
if (typeof window !== 'undefined') {
    window.NetCmdUtils = api;
}

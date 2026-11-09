// utils.test.js
/**
 * utils.js 纯函数单元测试
 * @module utils.test
 * @author jinbilianshao
 */

const {
    isValidHexPayload,
    escapeHtml,
    parseCfgCommands,
    normalizeCommands,
    decodeHex
} = require('./utils');

describe('isValidHexPayload', () => {
    test('合法的偶数长度 hex 通过', () => {
        expect(isValidHexPayload('01 02 03 FF')).toBe(true);
        expect(isValidHexPayload('0102')).toBe(true);
        expect(isValidHexPayload('0A0B')).toBe(true);
        expect(isValidHexPayload('0a0b0c0d')).toBe(true);
    });

    test('奇数长度或非法字符拒绝', () => {
        expect(isValidHexPayload('1')).toBe(false);
        expect(isValidHexPayload('123')).toBe(false);
        expect(isValidHexPayload('GG')).toBe(false);
        expect(isValidHexPayload('01 2')).toBe(false);
        expect(isValidHexPayload('')).toBe(false);
        expect(isValidHexPayload(123)).toBe(false);
        expect(isValidHexPayload(null)).toBe(false);
    });

    test('允许空格和换行分隔', () => {
        expect(isValidHexPayload('01\n02\t03')).toBe(true);
    });
});

describe('escapeHtml', () => {
    test('转义危险字符', () => {
        expect(escapeHtml('<img src=x onerror=alert(1)>'))
            .toBe('&lt;img src=x onerror=alert(1)&gt;');
        expect(escapeHtml('a&b"c\'d')).toBe('a&amp;b&quot;c&#39;d');
    });

    test('非字符串安全', () => {
        expect(escapeHtml(123)).toBe('123');
        expect(escapeHtml(null)).toBe('null');
    });
});

describe('parseCfgCommands', () => {
    test('解析 BATCHSEND 区域', () => {
        const cfg = [
            '[BATCHSEND]',
            '1=a|b|c|重启|01 02 03',
            ''
        ].join('\r\n');
        const result = parseCfgCommands(cfg);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ name: '重启', payload: '01 02 03' });
    });

    test('解析 SHORTCUT 区域并转大写', () => {
        const cfg = [
            '[SHORTCUT]',
            '开机=a|b|c|0a0b0c',
            ''
        ].join('\n');
        const result = parseCfgCommands(cfg);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ name: '开机', payload: '0A 0B 0C' });
    });

    test('空输入返回空数组', () => {
        expect(parseCfgCommands('')).toEqual([]);
        expect(parseCfgCommands(null)).toEqual([]);
    });
});

describe('normalizeCommands', () => {
    test('过滤非法条目并规范化', () => {
        const input = [
            { name: ' 合法 ', payload: ' 01 02 ' },
            { name: '缺payload' },
            { name: '非法hex', payload: 'GG' },
            { name: '奇数', payload: '123' },
            null,
            'not-an-object'
        ];
        const result = normalizeCommands(input);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ name: '合法', payload: '01 02' });
    });

    test('非数组返回空数组', () => {
        expect(normalizeCommands('x')).toEqual([]);
        expect(normalizeCommands(null)).toEqual([]);
    });
});

describe('decodeHex', () => {
    test('hex 模式格式化为大写空格分隔', () => {
        expect(decodeHex('0a0b', 'hex')).toBe('0A 0B');
    });

    test('ascii 模式解码', () => {
        expect(decodeHex('48656c6c6f', 'ascii')).toBe('Hello');
    });

    test('utf8 模式解码', () => {
        // '你好' 的 UTF-8 编码
        expect(decodeHex('e4bda0e5a5bd', 'utf8')).toBe('你好');
    });

    test('控制字符替换为点', () => {
        // 41='A', 01=控制符, 0d0a=CRLF, 42='B' → 3 个控制字节各替换为 '.'
        expect(decodeHex('41010d0a42', 'ascii')).toBe('A...B');
    });

    test('非法输入回退原值', () => {
        expect(decodeHex('zz', 'hex')).toBe('ZZ');
    });
});

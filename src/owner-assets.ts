export const OWNER_STYLE = String.raw`
.q-owner-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 22px;
    background: linear-gradient(#f8fcfe, #eaf5fa);
}
.q-owner-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}
.q-owner-stat {
    border: 1px solid var(--q-border);
    border-radius: 14px;
    background: #fff;
    padding: 16px;
    min-height: 92px;
}
.q-owner-stat span {
    display: block;
    color: var(--q-muted);
    font-size: 12px;
    margin-bottom: 8px;
}
.q-owner-stat strong {
    display: block;
    font-size: 22px;
    line-height: 1.2;
    overflow-wrap: anywhere;
}
.q-owner-panel {
    border: 1px solid var(--q-border);
    border-radius: 16px;
    background: #fff;
    padding: 18px;
}
.q-owner-panel h2 {
    margin: 0 0 8px;
    font-size: 17px;
}
.q-owner-panel p {
    margin: 0;
    color: var(--q-muted);
    font-size: 13px;
    line-height: 1.7;
}
.q-owner-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}
.q-owner-action {
    appearance: none;
    border: 1px solid var(--q-border);
    border-radius: 14px;
    background: #fff;
    min-height: 94px;
    padding: 16px;
    text-align: left;
    cursor: pointer;
    font: inherit;
    color: var(--q-text);
}
.q-owner-action:hover:not(:disabled) {
    border-color: var(--q-accent);
    box-shadow: 0 10px 24px rgba(8,127,168,.12);
}
.q-owner-action:disabled { opacity: .48; cursor: not-allowed; }
.q-owner-action strong { display: block; font-size: 15px; margin-bottom: 7px; }
.q-owner-action span { display: block; color: var(--q-muted); font-size: 12px; line-height: 1.55; }
.q-owner-action-danger { border-color: #efc9c6; }
.q-owner-action-danger strong { color: var(--q-danger); }
.q-owner-message {
    min-height: 22px;
    color: var(--q-muted);
    font-size: 13px;
    line-height: 1.6;
}
.q-owner-message.q-error { color: var(--q-danger); }
.q-owner-message.q-success { color: #16794a; }
@media (max-width: 640px) {
    .q-owner-wrap { padding: 14px 10px; }
    .q-owner-summary { grid-template-columns: 1fr; }
    .q-owner-grid { grid-template-columns: 1fr; }
}
`;

interface OwnerScriptOptions {
    csrf: string;
    transportSalt: string;
    idleSeconds: number;
}

export function renderOwnerScript(options: OwnerScriptOptions): string {
    const config = JSON.stringify(options).replace(/</g, "\\u003c");
    return String.raw`
(async () => {
    'use strict';

    const config = ${config};
    const host = document.getElementById('formulaCalcApp');
    if (!host) return;

    let contextValue = '';
    window.dispatchEvent(new CustomEvent('formula:value-request', {
        detail: { accept: (value) => { contextValue = String(value || ''); } }
    }));
    const signalActivationFailure = () => window.dispatchEvent(new CustomEvent('formula:result-error'));
    if (!contextValue || !window.crypto?.subtle || !window.TextEncoder || !window.TextDecoder) {
        signalActivationFailure();
        return;
    }

    const endpoint = new URL(host.dataset.endpoint || '/expression', location.href).href;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const controlAad = encoder.encode('formula-control-v4');
    const exportAad = encoder.encode('formula-export-v4');
    const fromBase64 = (value) => {
        const raw = atob(String(value || ''));
        const bytes = new Uint8Array(raw.length);
        for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
        return bytes;
    };
    const toBase64 = (bytes) => {
        let raw = '';
        const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        for (let index = 0; index < view.length; index += 0x8000) raw += String.fromCharCode(...view.subarray(index, index + 0x8000));
        return btoa(raw);
    };
    const randomId = () => {
        if (typeof crypto.randomUUID === 'function') return crypto.randomUUID().replaceAll('-', '');
        return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    };

    let transportKey;
    try {
        const transportSalt = fromBase64(config.transportSalt);
        if (transportSalt.length !== 32) throw new Error('invalid_transport_salt');
        const material = await crypto.subtle.importKey('raw', encoder.encode(contextValue), 'PBKDF2', false, ['deriveKey']);
        transportKey = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: transportSalt, iterations: 250000, hash: 'SHA-256' },
            material,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
        contextValue = '';
    } catch {
        contextValue = '';
        signalActivationFailure();
        return;
    }

    const encryptLayer = async payload => {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv, additionalData: controlAad, tagLength: 128 },
            transportKey,
            encoder.encode(JSON.stringify(payload))
        );
        return { v: 2, iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
    };

    const decryptLayer = async (envelope, additionalData = controlAad) => {
        if (!envelope || envelope.v !== 2 || typeof envelope.iv !== 'string' || typeof envelope.ciphertext !== 'string') {
            throw new Error('invalid_secure_envelope');
        }
        const iv = fromBase64(envelope.iv);
        const ciphertext = fromBase64(envelope.ciphertext);
        if (iv.length !== 12 || ciphertext.length < 17) throw new Error('invalid_secure_envelope');
        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv, additionalData, tagLength: 128 },
            transportKey,
            ciphertext
        );
        const decoded = JSON.parse(decoder.decode(plaintext));
        if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new Error('invalid_secure_payload');
        return decoded;
    };

    let busy = false;
    let lastActivity = Date.now();

    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    };

    const postJson = async (op, payload = {}) => {
        const requestId = randomId();
        const envelope = await encryptLayer({ op, token: config.csrf, request_id: requestId, payload });
        const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify(envelope)
        });
        if (response.status === 404) throw new Error('expired');
        const outer = await response.json().catch(() => null);
        const data = await decryptLayer(outer);
        if (data.request_id !== requestId || !data.ok) throw new Error(data.reason || 'request_failed');
        return data;
    };

    const formatBytes = (value) => {
        let bytes = Math.max(0, Number(value) || 0);
        const units = ['B', 'KB', 'MB', 'GB'];
        let index = 0;
        while (bytes >= 1024 && index < units.length - 1) {
            bytes /= 1024;
            index++;
        }
        return (index === 0 ? Math.round(bytes) : bytes.toFixed(bytes >= 10 ? 1 : 2)) + ' ' + units[index];
    };

    host.replaceChildren();
    host.className = 'formula-private-host';
    const shell = el('section', 'q-shell');
    const head = el('header', 'q-head');
    const nameBox = el('div');
    nameBox.append(el('div', 'q-title', 'Storage Console'), el('div', 'q-sub', '独立管理会话 · 仅导出密文'));
    const actions = el('div', 'q-actions');
    const lock = el('button', 'q-btn q-btn-quiet', '锁定');
    lock.type = 'button';
    actions.append(lock);
    head.append(nameBox, actions);
    const main = el('main', 'q-main');
    const wrap = el('div', 'q-owner-wrap');
    const summary = el('div', 'q-owner-summary');
    const messageStat = el('div', 'q-owner-stat');
    const byteStat = el('div', 'q-owner-stat');
    const saltStat = el('div', 'q-owner-stat');
    messageStat.append(el('span', '', '密文记录'), el('strong', '', '—'));
    byteStat.append(el('span', '', '密文体积'), el('strong', '', '—'));
    saltStat.append(el('span', '', '加密空间'), el('strong', '', '—'));
    summary.append(messageStat, byteStat, saltStat);

    const panel = el('section', 'q-owner-panel');
    panel.append(
        el('h2', '', '管理操作'),
        el('p', '', '导出文件只包含密文和解密所需的盐值；服务器不会接收聊天解锁密钥，也不会在云端解密。')
    );
    const grid = el('div', 'q-owner-grid');
    const download = el('button', 'q-owner-action');
    const clear = el('button', 'q-owner-action q-owner-action-danger');
    const reset = el('button', 'q-owner-action q-owner-action-danger');
    const refresh = el('button', 'q-owner-action');
    for (const button of [download, clear, reset, refresh]) button.type = 'button';
    download.append(el('strong', '', '下载加密备份'), el('span', '', '生成一个 v2 NDJSON 文件，已内含 message_salt，可直接交给 BAT 解密。'));
    clear.append(el('strong', '', '清空聊天记录'), el('span', '', '删除全部密文，保留现有加密盐；在线聊天会话将被强制退出。'));
    reset.append(el('strong', '', '重置聊天空间'), el('span', '', '删除全部密文并生成新的消息加密盐。'));
    refresh.append(el('strong', '', '刷新状态'), el('span', '', '重新读取记录数量、密文体积和加密空间状态。'));
    grid.append(download, clear, reset, refresh);
    panel.append(grid);
    const message = el('div', 'q-owner-message', '正在读取状态…');
    wrap.append(summary, panel, message);
    main.append(wrap);
    shell.append(head, main);
    host.append(shell);

    const buttons = [download, clear, reset, refresh, lock];
    const setBusy = (value) => {
        busy = value;
        for (const button of buttons) button.disabled = value;
    };
    const setMessage = (text, kind = '') => {
        message.textContent = text;
        message.className = 'q-owner-message' + (kind ? ' ' + kind : '');
    };

    const loadStatus = async () => {
        const data = await postJson('owner_status');
        messageStat.querySelector('strong').textContent = String(Math.max(0, Number(data.messages) || 0));
        byteStat.querySelector('strong').textContent = formatBytes(data.encrypted_bytes);
        saltStat.querySelector('strong').textContent = data.message_salt_initialized ? '已初始化' : '尚未初始化';
        return data;
    };

    const withAction = async (work) => {
        if (busy) return;
        setBusy(true);
        try {
            await work();
        } catch (error) {
            if (error?.message === 'expired') {
                location.reload();
                return;
            }
            setMessage('操作失败，请稍后重试。', 'q-error');
        } finally {
            setBusy(false);
        }
    };

    download.addEventListener('click', () => withAction(async () => {
        setMessage('正在生成加密备份…');
        const ticket = await postJson('owner_export');
        if (typeof ticket.url !== 'string') throw new Error('export_failed');
        const response = await fetch(new URL(ticket.url, endpoint).href, {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store'
        });
        if (!response.ok) throw new Error('export_failed');
        if (!response.body) throw new Error('export_failed');
        const reader = response.body.getReader();
        const streamDecoder = new TextDecoder();
        const parts = [];
        let pending = '';
        const consumeLine = async line => {
            if (!line.trim()) return;
            const decoded = await decryptLayer(JSON.parse(line), exportAad);
            if (typeof decoded.content !== 'string') throw new Error('export_failed');
            parts.push(decoded.content);
        };
        while (true) {
            const result = await reader.read();
            if (result.done) break;
            pending += streamDecoder.decode(result.value, { stream: true });
            let newline;
            while ((newline = pending.indexOf('\n')) >= 0) {
                const line = pending.slice(0, newline);
                pending = pending.slice(newline + 1);
                await consumeLine(line);
            }
        }
        pending += streamDecoder.decode();
        await consumeLine(pending);
        const blob = new Blob(parts, { type: 'application/x-ndjson;charset=UTF-8' });
        const filename = 'chat-backup-v2-' + new Date().toISOString().slice(0, 10) + '.ndjson';
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.hidden = true;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        setMessage('加密备份已生成。请妥善保存备份文件和对应的聊天解锁密钥。', 'q-success');
    }));

    clear.addEventListener('click', () => withAction(async () => {
        if (!confirm('确定删除全部聊天密文吗？建议先下载加密备份。')) return;
        setMessage('正在清空聊天记录…');
        const data = await postJson('owner_clear');
        await loadStatus();
        setMessage('已清空 ' + String(data.deleted || 0) + ' 条记录。聊天端需要重新输入密钥。', 'q-success');
    }));

    reset.addEventListener('click', () => withAction(async () => {
        if (!confirm('重置会删除全部聊天密文，并生成新的 message_salt。是否继续？')) return;
        const proof = prompt('为防止误操作，请输入 RESET');
        if (proof !== 'RESET') {
            setMessage('已取消重置。');
            return;
        }
        setMessage('正在重置聊天空间…');
        const data = await postJson('owner_reset');
        await loadStatus();
        setMessage('聊天空间已重置，已删除 ' + String(data.deleted || 0) + ' 条记录并生成新盐。', 'q-success');
    }));

    refresh.addEventListener('click', () => withAction(async () => {
        setMessage('正在刷新状态…');
        await loadStatus();
        setMessage('状态已更新。', 'q-success');
    }));

    lock.addEventListener('click', () => withAction(async () => {
        try { await postJson('close'); } catch { /* session may already be expired */ }
        location.reload();
    }));

    const markActivity = () => { lastActivity = Date.now(); };
    for (const name of ['pointerdown', 'keydown', 'touchstart']) {
        document.addEventListener(name, markActivity, { passive: true });
    }
    const idleTimer = setInterval(() => {
        if (Date.now() - lastActivity > Math.max(60, Number(config.idleSeconds) || 600) * 1000) {
            clearInterval(idleTimer);
            location.reload();
        }
    }, 15000);
    window.addEventListener('pagehide', () => {
        clearInterval(idleTimer);
        host.replaceChildren();
        host.className = 'calc-app';
    });
    window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });

    try {
        await loadStatus();
        setMessage('管理会话已就绪。');
    } catch {
        location.reload();
    }
})();
`;
}

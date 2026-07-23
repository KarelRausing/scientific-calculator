export const PRIVATE_STYLE = String.raw`
#formulaCalcApp {
    --q-bg: #eaf5fa;
    --q-panel: #ffffff;
    --q-text: #143247;
    --q-muted: #5d7b8c;
    --q-border: #bfdce9;
    --q-accent: #087fa8;
    --q-other: #e4f2f8;
    --q-danger: #b3261e;
}
#formulaCalcApp, #formulaCalcApp * { box-sizing: border-box; }
#formulaCalcApp { background: var(--q-bg); }
#formulaCalcApp.formula-private-host {
    min-height: 100vh;
    width: 100%;
    font-family: "Microsoft YaHei", "Microsoft YaHei UI", "PingFang SC", "Noto Sans CJK SC", sans-serif;
    color: var(--q-text);
    display: flex;
    align-items: stretch;
    justify-content: center;
    padding: 16px;
}
.q-shell {
    width: min(980px, 100%);
    min-height: calc(100vh - 32px);
    background: var(--q-panel);
    border: 1px solid var(--q-border);
    border-radius: 18px;
    box-shadow: 0 18px 50px rgba(16, 82, 112, .12);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
.q-head {
    min-height: 68px;
    padding: 12px 18px;
    border-bottom: 1px solid var(--q-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}
.q-title { font-size: 18px; font-weight: 700; }
.q-sub { color: var(--q-muted); font-size: 12px; margin-top: 3px; }
.q-actions { display: flex; align-items: center; gap: 8px; }
.q-btn {
    appearance: none;
    border: 1px solid var(--q-border);
    background: #fff;
    color: var(--q-text);
    border-radius: 10px;
    min-height: 38px;
    padding: 0 14px;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
}
.q-btn:hover { background: #eef8fc; }
.q-btn:disabled { opacity: .48; cursor: not-allowed; }
.q-btn-primary { background: var(--q-accent); color: #fff; border-color: var(--q-accent); }
.q-btn-primary:hover { background: #076b8d; }
.q-btn-quiet { color: var(--q-muted); }
.q-main { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.q-choice { flex: 1; display: grid; place-items: center; padding: 32px 18px; }
.q-choice-box { width: min(620px, 100%); text-align: center; }
.q-choice-box h1 { margin: 0 0 10px; font-size: clamp(24px, 5vw, 36px); }
.q-choice-box p { color: var(--q-muted); margin: 0 0 26px; }
.q-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.q-card {
    appearance: none;
    border: 1px solid var(--q-border);
    background: #fff;
    border-radius: 16px;
    padding: 28px 16px;
    cursor: pointer;
    font: inherit;
    text-align: center;
    transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease;
}
.q-card:hover:not(:disabled) { transform: translateY(-2px); border-color: var(--q-accent); box-shadow: 0 12px 28px rgba(8,127,168,.14); }
.q-card:disabled { opacity: .45; cursor: not-allowed; }
.q-card strong { display: block; font-size: 22px; margin-bottom: 8px; }
.q-card span { color: var(--q-muted); font-size: 13px; }
.q-feed {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px;
    background: linear-gradient(#f8fcfe, #eaf5fa);
}
.q-row { display: flex; margin: 10px 0; }
.q-row-self { justify-content: flex-end; }
.q-row-other { justify-content: flex-start; }
.q-bubble {
    max-width: min(76%, 720px);
    padding: 10px 13px;
    border-radius: 15px;
    line-height: 1.55;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    box-shadow: 0 2px 8px rgba(16,82,112,.07);
}
.q-row-self .q-bubble { background: var(--q-accent); color: #fff; border-bottom-right-radius: 5px; }
.q-row-other .q-bubble { background: var(--q-other); color: var(--q-text); border-bottom-left-radius: 5px; }
.q-meta { font-size: 11px; opacity: .72; margin-bottom: 4px; }
.q-text { font-size: 15px; }
.q-empty { height: 100%; min-height: 200px; display: grid; place-items: center; color: var(--q-muted); text-align: center; }
.q-compose { border-top: 1px solid var(--q-border); padding: 12px; background: #fff; }
.q-input-wrap { border: 1px solid var(--q-border); border-radius: 14px; padding: 10px; }
.q-input {
    display: block;
    width: 100%;
    min-height: 74px;
    max-height: 220px;
    resize: vertical;
    border: 0;
    outline: 0;
    padding: 0;
    font: inherit;
    font-size: 15px;
    line-height: 1.55;
    color: var(--q-text);
    background: transparent;
}
.q-compose-foot { margin-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.q-count { color: var(--q-muted); font-size: 12px; }
.q-count-bad { color: var(--q-danger); font-weight: 700; }
.q-status { color: var(--q-muted); font-size: 12px; min-height: 18px; }
.q-error { color: var(--q-danger); }
@media (max-width: 640px) {
    #formulaCalcApp.formula-private-host { padding: 0; }
    .q-shell { min-height: 100vh; border: 0; border-radius: 0; box-shadow: none; }
    .q-head { min-height: 60px; padding: 10px 12px; }
    .q-title { font-size: 16px; }
    .q-sub { display: none; }
    .q-choice { padding: 24px 12px; }
    .q-cards { grid-template-columns: 1fr; }
    .q-card { padding: 22px 14px; }
    .q-feed { padding: 12px; }
    .q-bubble { max-width: 88%; }
    .q-compose { padding: 8px; }
    .q-btn { min-height: 36px; padding: 0 11px; }
}
`;

interface ScriptOptions {
    csrf: string;
    messageSalt: string;
    transportSalt: string;
    maxChars: number;
    ttlHours: number;
    idleSeconds: number;
}

export function renderPrivateScript(options: ScriptOptions): string {
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
    if (!contextValue || !window.crypto?.subtle || !window.TextEncoder || !window.TextDecoder || !window.WebSocket) {
        signalActivationFailure();
        return;
    }

    const endpoint = new URL(host.dataset.endpoint || '/expression', location.href).href;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    const packetAad = encoder.encode('formula-message-v4');
    const controlAad = encoder.encode('formula-control-v4');
    const socketAad = encoder.encode('formula-socket-v4');
    const fromBase64 = (value) => {
        const raw = atob(String(value || ''));
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        return bytes;
    };
    const toBase64 = (bytes) => {
        let raw = '';
        const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        for (let i = 0; i < view.length; i += 0x8000) raw += String.fromCharCode(...view.subarray(i, i + 0x8000));
        return btoa(raw);
    };
    const randomId = () => {
        if (typeof crypto.randomUUID === 'function') return crypto.randomUUID().replaceAll('-', '');
        return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    };

    let messageKey;
    let transportKey;
    try {
        const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(contextValue), 'PBKDF2', false, ['deriveKey']);
        const messageSalt = fromBase64(config.messageSalt);
        if (messageSalt.length !== 32) throw new Error('invalid_message_salt');
        messageKey = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: messageSalt, iterations: 250000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
        const transportSalt = fromBase64(config.transportSalt);
        if (transportSalt.length !== 32) throw new Error('invalid_transport_salt');
        transportKey = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: transportSalt, iterations: 250000, hash: 'SHA-256' },
            keyMaterial,
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

    const encryptPacket = async (text, sender) => {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const clientId = randomId();
        const payload = encoder.encode(JSON.stringify({ version: 4, sender, text, sent_at: Math.floor(Date.now() / 1000), uuid: clientId }));
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv, additionalData: packetAad, tagLength: 128 },
            messageKey,
            payload
        );
        return { iv: toBase64(iv), ciphertext: toBase64(ciphertext), client_id: clientId };
    };

    const decryptPacket = async (item) => {
        try {
            const iv = fromBase64(item.iv);
            const ciphertext = fromBase64(item.ciphertext);
            if (iv.length !== 12 || ciphertext.length < 17) return null;
            const plaintext = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv, additionalData: packetAad, tagLength: 128 },
                messageKey,
                ciphertext
            );
            const decoded = JSON.parse(decoder.decode(plaintext));
            if (
                !decoded
                || decoded.version !== 4
                || !['wave', 'snow'].includes(decoded.sender)
                || typeof decoded.text !== 'string'
                || decoded.text.length > config.maxChars
                || !Number.isInteger(decoded.sent_at)
                || decoded.sent_at <= 0
                || typeof decoded.uuid !== 'string'
                || !/^[a-f0-9]{32}$/i.test(decoded.uuid)
                || decoded.uuid !== item.client_id
            ) return null;
            return {
                id: Number(item.id) || 0,
                sender: decoded.sender,
                text: decoded.text,
                sent_at: decoded.sent_at,
                uuid: decoded.uuid
            };
        } catch {
            return null;
        }
    };

    const encryptLayer = async (payload, additionalData) => {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv, additionalData, tagLength: 128 },
            transportKey,
            encoder.encode(JSON.stringify(payload))
        );
        return { v: 2, iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
    };

    const decryptLayer = async (envelope, additionalData) => {
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

    let myRole = null;
    let socket = null;
    let chooserTimer = null;
    let pulseTimer = null;
    let reconnectTimer = null;
    let activityDirty = true;
    let manualClose = false;
    let lastId = 0;
    let viewVersion = 0;
    const seen = new Set();

    const request = async (op, payload = {}) => {
        const requestId = randomId();
        const envelope = await encryptLayer({ op, token: config.csrf, request_id: requestId, payload }, controlAad);
        const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify(envelope)
        });
        if (response.status === 404) throw new Error('expired');
        const outer = await response.json().catch(() => null);
        const data = await decryptLayer(outer, controlAad);
        if (data.request_id !== requestId) throw new Error('response_mismatch');
        if (!response.ok && !data.reason) throw new Error('request_failed');
        return data;
    };

    const sendSocketFrame = async (target, payload) => {
        target.send(JSON.stringify(await encryptLayer(payload, socketAad)));
    };

    const readSocketFrame = async (value) => {
        const outer = JSON.parse(String(value));
        return decryptLayer(outer, socketAad);
    };

    const stopTimers = () => {
        if (chooserTimer) clearInterval(chooserTimer);
        if (pulseTimer) clearInterval(pulseTimer);
        if (reconnectTimer) clearTimeout(reconnectTimer);
        chooserTimer = pulseTimer = reconnectTimer = null;
    };

    const closeSocket = () => {
        if (!socket) return;
        const current = socket;
        socket = null;
        try { current.close(1000, ''); } catch { /* no-op */ }
    };

    const scrubView = () => {
        manualClose = true;
        stopTimers();
        closeSocket();
        host.replaceChildren();
        host.className = 'calc-app';
    };
    window.addEventListener('pagehide', scrubView);
    window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
    for (const eventName of ['pointerdown', 'keydown', 'touchstart']) {
        document.addEventListener(eventName, () => { activityDirty = true; }, { passive: true });
    }

    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    };

    const shell = () => {
        host.replaceChildren();
        host.className = 'formula-private-host';
        const box = el('section', 'q-shell');
        const head = el('header', 'q-head');
        const nameBox = el('div');
        const title = el('div', 'q-title', 'Private Space');
        const sub = el('div', 'q-sub', '前端仅显示最近 ' + config.ttlHours + ' 小时记录');
        nameBox.append(title, sub);
        const actions = el('div', 'q-actions');
        head.append(nameBox, actions);
        const main = el('main', 'q-main');
        box.append(head, main);
        host.append(box);
        return { title, actions, main };
    };

    const lockButton = (actions) => {
        const lock = el('button', 'q-btn q-btn-quiet', '锁定');
        lock.type = 'button';
        lock.addEventListener('click', async () => {
            lock.disabled = true;
            manualClose = true;
            closeSocket();
            try { await request('close'); } catch { /* cookie may already be expired */ }
            location.reload();
        });
        actions.append(lock);
        return lock;
    };

    const showChooser = async (initialState = null) => {
        stopTimers();
        closeSocket();
        myRole = null;
        lastId = 0;
        seen.clear();
        const localVersion = ++viewVersion;
        const ui = shell();
        ui.title.textContent = 'Choose a role';
        lockButton(ui.actions);

        const wrap = el('div', 'q-choice');
        const box = el('div', 'q-choice-box');
        box.append(el('h1', '', '选择角色'), el('p', '', '多个设备可以选择同一角色，最多同时在线 5 个客户端。'));
        const cards = el('div', 'q-cards');
        const status = el('div', 'q-status');
        box.append(cards, status);
        wrap.append(box);
        ui.main.append(wrap);

        const draw = (state) => {
            if (localVersion !== viewVersion) return;
            cards.replaceChildren();
            for (const role of ['wave', 'snow']) {
                const count = Math.max(0, Number(state?.counts?.[role]) || 0);
                const maxClients = Math.max(1, Number(state?.max_clients) || 5);
                const full = Boolean(state?.full);
                const card = el('button', 'q-card');
                card.type = 'button';
                card.disabled = full;
                const hint = full ? '客户端已达上限（' + maxClients + '）' : (count ? '当前 ' + count + ' 个客户端 · 点击选择' : '点击选择');
                card.append(el('strong', '', role), el('span', '', hint));
                card.addEventListener('click', async () => {
                    status.textContent = '正在进入…';
                    status.classList.remove('q-error');
                    for (const button of cards.querySelectorAll('button')) button.disabled = true;
                    try {
                        const result = await request('bind', { value: role, after: 0 });
                        if (!result.ok) {
                            status.textContent = result.reason === 'full' ? '当前在线客户端已达到上限。' : '暂时无法选择该角色。';
                            status.classList.add('q-error');
                            draw(result.state || state);
                            return;
                        }
                        await showRoom(role, result.ticket);
                    } catch (error) {
                        if (error?.message === 'expired') location.reload();
                        status.textContent = '连接失败，请重试。';
                        status.classList.add('q-error');
                        draw(state);
                    }
                });
                cards.append(card);
            }
        };

        let state = initialState;
        if (!state) {
            try { state = (await request('inspect')).state; }
            catch (error) { if (error?.message === 'expired') location.reload(); }
        }
        draw(state || { counts: { wave: 0, snow: 0 }, max_clients: 5, full: false });

        chooserTimer = setInterval(async () => {
            try { draw((await request('inspect')).state); }
            catch (error) { if (error?.message === 'expired') location.reload(); }
        }, 5000);
    };

    const showRoom = async (role, initialTicket) => {
        stopTimers();
        closeSocket();
        myRole = role;
        const localVersion = ++viewVersion;
        const ui = shell();
        ui.title.textContent = role;
        lockButton(ui.actions);

        const feed = el('div', 'q-feed');
        const empty = el('div', 'q-empty', '正在连接…');
        feed.append(empty);
        const compose = el('div', 'q-compose');
        const inputWrap = el('div', 'q-input-wrap');
        const input = el('textarea', 'q-input');
        input.placeholder = '输入内容，Ctrl + Enter 发送';
        input.setAttribute('aria-label', '输入内容');
        const foot = el('div', 'q-compose-foot');
        const left = el('div');
        const count = el('div', 'q-count', '0 / ' + config.maxChars);
        const status = el('div', 'q-status', '正在连接…');
        left.append(count, status);
        const send = el('button', 'q-btn q-btn-primary', '发送');
        send.type = 'button';
        send.disabled = true;
        foot.append(left, send);
        inputWrap.append(input, foot);
        compose.append(inputWrap);
        ui.main.append(feed, compose);

        const characterCount = () => Array.from(input.value).length;
        let waitingAck = false;
        let submittedText = '';
        let pendingPacket = null;
        let socketTicket = String(initialTicket || '');
        const updateCount = () => {
            const length = characterCount();
            count.textContent = length + ' / ' + config.maxChars;
            count.classList.toggle('q-count-bad', length > config.maxChars);
            send.disabled = waitingAck || !socket || socket.readyState !== WebSocket.OPEN || length === 0 || length > config.maxChars;
        };

        const appendItems = async (encryptedItems) => {
            const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 120;
            const decryptedItems = (await Promise.all((encryptedItems || []).map(decryptPacket))).filter(Boolean);
            for (const item of decryptedItems) {
                lastId = Math.max(lastId, item.id);
                const key = item.uuid || ('id-' + item.id);
                if (seen.has(key)) continue;
                seen.add(key);
                if (empty.isConnected) empty.remove();
                if (pendingPacket && item.uuid === pendingPacket.client_id) {
                    waitingAck = false;
                    if (input.value === submittedText) input.value = '';
                    submittedText = '';
                    pendingPacket = null;
                    status.textContent = '';
                    status.classList.remove('q-error');
                    updateCount();
                }
                const own = item.sender === myRole;
                const row = el('div', 'q-row ' + (own ? 'q-row-self' : 'q-row-other'));
                const bubble = el('div', 'q-bubble');
                const time = new Date((Number(item.sent_at) || 0) * 1000);
                const meta = el('div', 'q-meta', item.sender + ' · ' + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                bubble.append(meta, el('div', 'q-text', String(item.text || '')));
                row.append(bubble);
                feed.append(row);
            }
            if (!decryptedItems.length && empty.isConnected) empty.textContent = '还没有内容';
            if (nearBottom) feed.scrollTop = feed.scrollHeight;
        };

        const scheduleReconnect = () => {
            if (manualClose || localVersion !== viewVersion || reconnectTimer) return;
            status.textContent = '连接中断，正在重连…';
            status.classList.add('q-error');
            reconnectTimer = setTimeout(async () => {
                reconnectTimer = null;
                try {
                    const result = await request('bind', { value: role, after: lastId });
                    if (result.ok && typeof result.ticket === 'string') {
                        socketTicket = result.ticket;
                        connect(socketTicket);
                    }
                    else if (result.reason === 'full') await showChooser(result.state);
                    else scheduleReconnect();
                } catch (error) {
                    if (error?.message === 'expired') location.reload();
                    else scheduleReconnect();
                }
            }, 1500);
        };

        const connect = (ticket) => {
            if (manualClose || localVersion !== viewVersion) return;
            const url = new URL('/socket', location.href);
            url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            url.searchParams.set('ticket', String(ticket || ''));
            const ws = new WebSocket(url.href);
            socket = ws;

            ws.addEventListener('open', () => {
                status.textContent = '已连接';
                status.classList.remove('q-error');
                updateCount();
            });
            ws.addEventListener('message', async event => {
                let data;
                try { data = await readSocketFrame(event.data); } catch { return; }
                if (data.type === 'ready') {
                    status.textContent = '已连接';
                    status.classList.remove('q-error');
                    if (empty.isConnected) empty.textContent = '还没有内容';
                    updateCount();
                } else if (data.type === 'history') {
                    await appendItems(data.items);
                } else if (data.type === 'message') {
                    await appendItems([data.item]);
                } else if (data.type === 'ack') {
                    if (!pendingPacket || !data.client_id || data.client_id === pendingPacket.client_id) {
                        waitingAck = false;
                        if (input.value === submittedText) input.value = '';
                        submittedText = '';
                        pendingPacket = null;
                        status.textContent = '';
                        status.classList.remove('q-error');
                        updateCount();
                        input.focus();
                    }
                } else if (data.type === 'history_done') {
                    if (waitingAck && pendingPacket && socket === ws && ws.readyState === WebSocket.OPEN) {
                        await sendSocketFrame(ws, { type: 'message', ...pendingPacket });
                        status.textContent = '正在确认发送结果…';
                    }
                } else if (data.type === 'state') {
                    // State is shown on the chooser; no room UI update is needed.
                } else if (data.type === 'error') {
                    waitingAck = false;
                    pendingPacket = null;
                    submittedText = '';
                    status.textContent = data.reason === 'too_fast' ? '发送过快，请稍后再试。'
                        : data.reason === 'too_long' ? '内容超过长度限制。'
                        : data.reason === 'storage_limit' ? '存储空间已达到上限。'
                        : data.reason === 'storage_error' ? '存储服务暂时异常，请稍后重试。'
                        : '操作失败，请重试。';
                    status.classList.add('q-error');
                    updateCount();
                } else if (data.type === 'session_expired') {
                    manualClose = true;
                    location.reload();
                }
            });
            ws.addEventListener('close', event => {
                const wasCurrent = socket === ws;
                if (wasCurrent) socket = null;
                updateCount();
                if (!wasCurrent) return;
                scheduleReconnect();
            });
            ws.addEventListener('error', () => { /* close event performs recovery */ });
        };

        const submit = async () => {
            const text = input.value;
            const length = characterCount();
            if (!text || length > config.maxChars || !socket || socket.readyState !== WebSocket.OPEN || waitingAck) return;
            waitingAck = true;
            submittedText = text;
            status.textContent = '正在发送…';
            status.classList.remove('q-error');
            updateCount();
            try {
                const packet = await encryptPacket(text, myRole);
                pendingPacket = packet;
                await sendSocketFrame(socket, { type: 'message', ...packet });
            } catch {
                waitingAck = false;
                pendingPacket = null;
                submittedText = '';
                status.textContent = '发送失败，请重试。';
                status.classList.add('q-error');
                updateCount();
            }
        };

        input.addEventListener('input', updateCount);
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter' && event.ctrlKey) {
                event.preventDefault();
                submit();
            }
        });
        send.addEventListener('click', submit);
        pulseTimer = setInterval(() => {
            if (!socket || socket.readyState !== WebSocket.OPEN) return;
            void sendSocketFrame(socket, { type: 'pulse', active: activityDirty }).catch(() => {});
            activityDirty = false;
        }, 30000);

        if (!socketTicket) {
            scheduleReconnect();
        } else {
            connect(socketTicket);
        }
        input.focus();
    };

    try {
        const state = (await request('inspect')).state;
        await showChooser(state);
    } catch {
        signalActivationFailure();
    }
})();
`;
}

(() => {
    'use strict';

    const app = document.getElementById('formulaCalcApp');
    if (!app) return;

    let serviceAllowed = true;
    if (window.top !== window.self) {
        let sameOriginFrame = false;
        try {
            sameOriginFrame = window.top.location.origin === window.location.origin;
        } catch {
            sameOriginFrame = false;
        }

        if (!sameOriginFrame) {
            serviceAllowed = false;
            try {
                const referrer = new URL(document.referrer);
                const normalizeHost = value => String(value || '').toLowerCase().replace(/^www\./, '');
                serviceAllowed = referrer.protocol === window.location.protocol
                    && normalizeHost(referrer.hostname) === normalizeHost(window.location.hostname);
            } catch {
                serviceAllowed = false;
            }
        }
    }

    const input = app.querySelector('#expressionInput');
    const output = app.querySelector('#resultDisplay');
    const modeButton = app.querySelector('#angleMode');
    const historyButton = app.querySelector('#historyToggle');
    const historyPanel = app.querySelector('#historyPanel');
    const historyList = app.querySelector('#historyList');
    const clearHistoryButton = app.querySelector('#clearHistory');
    const closeHistoryButton = app.querySelector('#closeHistory');
    const keypad = app.querySelector('.calc-keypad');
    const endpoint = new URL(app.dataset.endpoint || '/expression', window.location.href).href;

    if (!input || !output || !modeButton || !historyButton || !historyPanel || !historyList || !clearHistoryButton || !closeHistoryButton || !keypad) {
        return;
    }

    class ParseError extends Error {}

    let angleMode = 'DEG';
    let answer = 0;
    let entries = loadHistory();
    let applyingResult = false;
    let resolving = false;
    let resultStyle = null;
    let resultScript = null;
    let resultValueHandler = null;
    let resultAttachTimer = null;
    let resultBlobUrls = [];

    const functions = new Set([
        'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
        'sinh', 'cosh', 'tanh', 'sqrt', 'cbrt', 'abs',
        'ln', 'log', 'log2', 'exp', 'floor', 'ceil', 'round',
        'trunc', 'min', 'max', 'pow', 'mod', 'fact', 'inv',
        'ncr', 'npr', 'gcd', 'lcm'
    ]);
    const constants = new Set(['pi', 'e', 'ans']);

    function loadHistory() {
        try {
            const parsed = JSON.parse(sessionStorage.getItem('formula_history_v1') || '[]');
            return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
        } catch {
            return [];
        }
    }

    function saveHistory() {
        try {
            sessionStorage.setItem('formula_history_v1', JSON.stringify(entries.slice(0, 30)));
        } catch {
            // Storage can be unavailable in strict privacy modes.
        }
    }

    function normalize(source) {
        return source
            .replace(/[×·]/g, '*')
            .replace(/÷/g, '/')
            .replace(/[−–—]/g, '-')
            .replace(/π/g, 'pi')
            .replace(/√/g, 'sqrt');
    }

    function tokenize(source) {
        const tokens = [];
        let index = 0;
        if (source.length > 4096) throw new ParseError('too_long');

        while (index < source.length) {
            const rest = source.slice(index);
            const first = rest[0];
            if (/\s/.test(first)) {
                index++;
                continue;
            }

            const number = rest.match(/^(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?/);
            if (number) {
                const value = Number(number[0]);
                if (!Number.isFinite(value)) throw new ParseError('number');
                tokens.push({ type: 'number', value });
                index += number[0].length;
                continue;
            }

            const identifier = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
            if (identifier) {
                tokens.push({ type: 'id', value: identifier[0].toLowerCase() });
                index += identifier[0].length;
                continue;
            }

            if ('+-*/^!%'.includes(first)) {
                tokens.push({ type: 'op', value: first });
                index++;
                continue;
            }
            if (first === '(') {
                tokens.push({ type: 'left', value: first });
                index++;
                continue;
            }
            if (first === ')') {
                tokens.push({ type: 'right', value: first });
                index++;
                continue;
            }
            if (first === ',') {
                tokens.push({ type: 'comma', value: first });
                index++;
                continue;
            }
            throw new ParseError('symbol');
        }

        if (tokens.length > 1000) throw new ParseError('complex');
        return insertImplicitMultiplication(tokens);
    }

    function insertImplicitMultiplication(tokens) {
        const result = [];
        const canEnd = token => token && (
            token.type === 'number' ||
            token.type === 'right' ||
            (token.type === 'id' && constants.has(token.value)) ||
            (token.type === 'op' && (token.value === '!' || token.value === '%'))
        );
        const canStart = token => token && (
            token.type === 'number' ||
            token.type === 'left' ||
            token.type === 'id'
        );

        for (const token of tokens) {
            const previous = result[result.length - 1];
            const functionCall = previous?.type === 'id' && functions.has(previous.value) && token.type === 'left';
            if (!functionCall && canEnd(previous) && canStart(token)) {
                result.push({ type: 'op', value: '*' });
            }
            result.push(token);
        }
        return result;
    }

    function factorial(value) {
        if (!Number.isInteger(value) || value < 0 || value > 170) throw new ParseError('factorial');
        let result = 1;
        for (let i = 2; i <= value; i++) result *= i;
        return result;
    }

    function requireSafeIntegers(args, count, allowNegative = true) {
        if (args.length !== count || args.some(value => !Number.isSafeInteger(value))) {
            throw new ParseError('arguments');
        }
        if (!allowNegative && args.some(value => value < 0)) throw new ParseError('arguments');
        return args;
    }

    function greatestCommonDivisor(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b !== 0) {
            const remainder = a % b;
            a = b;
            b = remainder;
        }
        return a;
    }

    function combination(n, r) {
        requireSafeIntegers([n, r], 2, false);
        if (r > n || n > 170) throw new ParseError('arguments');
        r = Math.min(r, n - r);
        let value = 1;
        for (let i = 1; i <= r; i++) value = value * (n - r + i) / i;
        return value;
    }

    function permutation(n, r) {
        requireSafeIntegers([n, r], 2, false);
        if (r > n || n > 170) throw new ParseError('arguments');
        let value = 1;
        for (let i = 0; i < r; i++) value *= n - i;
        return value;
    }

    function toRadians(value) {
        return angleMode === 'DEG' ? value * Math.PI / 180 : value;
    }

    function fromRadians(value) {
        return angleMode === 'DEG' ? value * 180 / Math.PI : value;
    }

    function callFunction(name, args) {
        const one = () => {
            if (args.length !== 1) throw new ParseError('arguments');
            return args[0];
        };
        let value;
        switch (name) {
            case 'sin': value = Math.sin(toRadians(one())); break;
            case 'cos': value = Math.cos(toRadians(one())); break;
            case 'tan': value = Math.tan(toRadians(one())); break;
            case 'asin': value = fromRadians(Math.asin(one())); break;
            case 'acos': value = fromRadians(Math.acos(one())); break;
            case 'atan': value = fromRadians(Math.atan(one())); break;
            case 'sinh': value = Math.sinh(one()); break;
            case 'cosh': value = Math.cosh(one()); break;
            case 'tanh': value = Math.tanh(one()); break;
            case 'sqrt': value = Math.sqrt(one()); break;
            case 'cbrt': value = Math.cbrt(one()); break;
            case 'abs': value = Math.abs(one()); break;
            case 'ln': value = Math.log(one()); break;
            case 'log': value = Math.log10(one()); break;
            case 'log2': value = Math.log2(one()); break;
            case 'exp': value = Math.exp(one()); break;
            case 'floor': value = Math.floor(one()); break;
            case 'ceil': value = Math.ceil(one()); break;
            case 'trunc': value = Math.trunc(one()); break;
            case 'fact': value = factorial(one()); break;
            case 'inv': {
                const inputValue = one();
                if (inputValue === 0) throw new ParseError('zero');
                value = 1 / inputValue;
                break;
            }
            case 'ncr':
                if (args.length !== 2) throw new ParseError('arguments');
                value = combination(args[0], args[1]);
                break;
            case 'npr':
                if (args.length !== 2) throw new ParseError('arguments');
                value = permutation(args[0], args[1]);
                break;
            case 'gcd': {
                const pair = requireSafeIntegers(args, 2);
                value = greatestCommonDivisor(pair[0], pair[1]);
                break;
            }
            case 'lcm': {
                const pair = requireSafeIntegers(args, 2);
                value = pair[0] === 0 || pair[1] === 0 ? 0 : Math.abs((pair[0] / greatestCommonDivisor(pair[0], pair[1])) * pair[1]);
                if (!Number.isSafeInteger(value)) throw new ParseError('domain');
                break;
            }
            case 'min':
                if (args.length < 1) throw new ParseError('arguments');
                value = Math.min(...args);
                break;
            case 'max':
                if (args.length < 1) throw new ParseError('arguments');
                value = Math.max(...args);
                break;
            case 'pow':
                if (args.length !== 2) throw new ParseError('arguments');
                value = Math.pow(args[0], args[1]);
                break;
            case 'mod':
                if (args.length !== 2 || args[1] === 0) throw new ParseError('arguments');
                value = ((args[0] % args[1]) + args[1]) % args[1];
                break;
            case 'round':
                if (args.length === 1) {
                    value = Math.round(args[0]);
                } else if (args.length === 2 && Number.isInteger(args[1]) && Math.abs(args[1]) <= 15) {
                    const scale = Math.pow(10, args[1]);
                    value = Math.round((args[0] + Number.EPSILON) * scale) / scale;
                } else {
                    throw new ParseError('arguments');
                }
                break;
            default:
                throw new ParseError('function');
        }
        if (!Number.isFinite(value)) throw new ParseError('domain');
        return value;
    }

    class Parser {
        constructor(tokens) {
            this.tokens = tokens;
            this.position = 0;
            this.depth = 0;
        }

        peek(offset = 0) {
            return this.tokens[this.position + offset] || null;
        }

        take() {
            return this.tokens[this.position++] || null;
        }

        parse() {
            if (this.tokens.length === 0) throw new ParseError('empty');
            const value = this.expression(0);
            if (this.peek()) throw new ParseError('trailing');
            if (!Number.isFinite(value)) throw new ParseError('domain');
            return value;
        }

        expression(minimum) {
            if (++this.depth > 100) throw new ParseError('depth');
            let left = this.prefix();

            while (true) {
                const token = this.peek();
                if (!token) break;

                if (token.type === 'op' && (token.value === '!' || token.value === '%')) {
                    this.take();
                    left = token.value === '!' ? factorial(left) : left / 100;
                    continue;
                }

                if (token.type !== 'op' || !['+', '-', '*', '/', '^'].includes(token.value)) break;
                const precedence = token.value === '+' || token.value === '-' ? 1 : token.value === '*' || token.value === '/' ? 2 : 3;
                if (precedence < minimum) break;

                this.take();
                const right = this.expression(token.value === '^' ? precedence : precedence + 1);
                switch (token.value) {
                    case '+': left += right; break;
                    case '-': left -= right; break;
                    case '*': left *= right; break;
                    case '/':
                        if (right === 0) throw new ParseError('zero');
                        left /= right;
                        break;
                    case '^': left = Math.pow(left, right); break;
                }
                if (!Number.isFinite(left)) throw new ParseError('domain');
            }

            this.depth--;
            return left;
        }

        prefix() {
            const token = this.take();
            if (!token) throw new ParseError('missing');

            if (token.type === 'number') return token.value;

            if (token.type === 'op' && (token.value === '+' || token.value === '-')) {
                const value = this.expression(3);
                return token.value === '-' ? -value : value;
            }

            if (token.type === 'left') {
                const value = this.expression(0);
                if (this.take()?.type !== 'right') throw new ParseError('parenthesis');
                return value;
            }

            if (token.type === 'id') {
                if (constants.has(token.value)) {
                    if (token.value === 'pi') return Math.PI;
                    if (token.value === 'e') return Math.E;
                    return answer;
                }
                if (!functions.has(token.value) || this.take()?.type !== 'left') throw new ParseError('identifier');
                const args = [];
                if (this.peek()?.type !== 'right') {
                    while (true) {
                        args.push(this.expression(0));
                        if (this.peek()?.type === 'comma') {
                            this.take();
                            continue;
                        }
                        break;
                    }
                }
                if (this.take()?.type !== 'right') throw new ParseError('parenthesis');
                return callFunction(token.value, args);
            }

            throw new ParseError('prefix');
        }
    }

    function calculate(source) {
        const normalized = normalize(source);
        const parser = new Parser(tokenize(normalized));
        return parser.parse();
    }

    function formatNumber(value) {
        if (Object.is(value, -0)) value = 0;
        if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
        const magnitude = Math.abs(value);
        if ((magnitude !== 0 && magnitude < 1e-9) || magnitude >= 1e15) {
            return value.toExponential(10).replace(/\.0+(?=e)/, '').replace(/(\.\d*?)0+(?=e)/, '$1');
        }
        return Number(value.toPrecision(12)).toString();
    }

    function setOutput(text, error = false) {
        output.textContent = text;
        output.classList.toggle('result-error', error);
    }

    function addHistory(expression, result) {
        entries.unshift({ expression, result, at: Date.now() });
        entries = entries.slice(0, 30);
        saveHistory();
        renderHistory();
    }

    function renderHistory() {
        historyList.replaceChildren();
        if (entries.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'history-empty';
            empty.textContent = '暂无计算记录';
            historyList.append(empty);
            return;
        }
        for (const item of entries) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'history-item';
            const expression = document.createElement('div');
            expression.className = 'history-expression';
            expression.textContent = item.expression;
            const result = document.createElement('div');
            result.className = 'history-result';
            result.textContent = `= ${item.result}`;
            button.append(expression, result);
            button.addEventListener('click', () => {
                input.value = item.expression;
                setOutput(item.result);
                historyPanel.hidden = true;
                input.focus();
            });
            historyList.append(button);
        }
    }

    function insertAtCursor(text) {
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        input.setRangeText(text, start, end, 'end');
        input.focus();
        preview();
    }

    function eraseOne() {
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        if (start !== end) {
            input.setRangeText('', start, end, 'end');
        } else if (start > 0) {
            const before = Array.from(input.value.slice(0, start));
            before.pop();
            const replacement = before.join('');
            input.value = replacement + input.value.slice(start);
            input.setSelectionRange(replacement.length, replacement.length);
        }
        input.focus();
        preview();
    }

    function preview() {
        const source = input.value.trim();
        if (!source) {
            setOutput('0');
            return;
        }
        try {
            setOutput(formatNumber(calculate(source)));
        } catch {
            setOutput('…');
        }
    }

    async function queryExpression(value) {
        if (!serviceAllowed) {
            throw new Error('embedded');
        }
        if (!window.crypto?.subtle || value.length > 4096) throw new Error('crypto_unavailable');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const encoder = new TextEncoder();
        const toBase64 = bytes => {
            let raw = '';
            const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
            for (let index = 0; index < view.length; index += 0x8000) {
                raw += String.fromCharCode(...view.subarray(index, index + 0x8000));
            }
            return btoa(raw);
        };
        const fromBase64 = text => {
            const raw = atob(String(text || ''));
            const bytes = new Uint8Array(raw.length);
            for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
            return bytes;
        };
        const post = async body => {
            const response = await fetch(endpoint, {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(body)
            });
            return await response.json();
        };
        try {
            const clientNonce = toBase64(crypto.getRandomValues(new Uint8Array(32)));
            const challenge = await post({ op: 'challenge', client_nonce: clientNonce });
            if (!challenge?.ok) return challenge;
            if (
                typeof challenge.challenge !== 'string'
                || typeof challenge.server_nonce !== 'string'
                || typeof challenge.salt !== 'string'
                || challenge.iterations !== 250000
            ) throw new Error('invalid_challenge');
            const salt = fromBase64(challenge.salt);
            if (salt.length !== 32) throw new Error('invalid_challenge');
            const material = await crypto.subtle.importKey('raw', encoder.encode(value), 'PBKDF2', false, ['deriveKey']);
            const proofKey = await crypto.subtle.deriveKey(
                { name: 'PBKDF2', salt, iterations: challenge.iterations, hash: 'SHA-256' },
                material,
                { name: 'HMAC', hash: 'SHA-256', length: 256 },
                false,
                ['sign']
            );
            const transcript = `formula-auth-v4\n${challenge.challenge}\n${clientNonce}\n${challenge.server_nonce}`;
            const proof = await crypto.subtle.sign('HMAC', proofKey, encoder.encode(transcript));
            return await post({ op: 'resolve', challenge: challenge.challenge, proof: toBase64(proof) });
        } finally {
            clearTimeout(timer);
        }
    }

    function recoverResult() {
        if (resultValueHandler) window.removeEventListener('formula:value-request', resultValueHandler);
        if (resultAttachTimer) clearTimeout(resultAttachTimer);
        resultStyle?.remove();
        resultScript?.remove();
        for (const url of resultBlobUrls) URL.revokeObjectURL(url);
        resultStyle = null;
        resultScript = null;
        resultBlobUrls = [];
        resultValueHandler = null;
        resultAttachTimer = null;
        applyingResult = false;
        setOutput('暂时无法完成计算，请稍后重试。', true);
        input.focus();
    }

    async function applyResult(data, contextValue) {
        if (applyingResult) return;
        if (data?.protocol !== 4 || !data.style || !data.script || typeof data.transport_salt !== 'string') {
            throw new Error('invalid_protocol');
        }
        applyingResult = true;
        input.value = '';
        setOutput('0');

        let pendingValue = String(contextValue || '');
        const encoder = new TextEncoder();
        const decoder = new TextDecoder('utf-8', { fatal: true });
        const fromBase64 = text => {
            const raw = atob(String(text || ''));
            const bytes = new Uint8Array(raw.length);
            for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
            return bytes;
        };
        const decryptAsset = async (url, part, key) => {
            const response = await fetch(new URL(url, endpoint).href, {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            });
            if (!response.ok) throw new Error('asset_request_failed');
            const envelope = await response.json();
            if (!envelope || envelope.v !== 2 || typeof envelope.iv !== 'string' || typeof envelope.ciphertext !== 'string') {
                throw new Error('invalid_asset_envelope');
            }
            const iv = fromBase64(envelope.iv);
            const ciphertext = fromBase64(envelope.ciphertext);
            if (iv.length !== 12 || ciphertext.length < 17) throw new Error('invalid_asset_envelope');
            const plaintext = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv,
                    additionalData: encoder.encode('formula-asset-v4:' + part),
                    tagLength: 128
                },
                key,
                ciphertext
            );
            const decoded = JSON.parse(decoder.decode(plaintext));
            if (!decoded || typeof decoded.content !== 'string') throw new Error('invalid_asset_payload');
            return decoded.content;
        };

        try {
            const transportSalt = fromBase64(data.transport_salt);
            if (transportSalt.length !== 32) throw new Error('invalid_transport_salt');
            const material = await crypto.subtle.importKey('raw', encoder.encode(pendingValue), 'PBKDF2', false, ['deriveKey']);
            const key = await crypto.subtle.deriveKey(
                { name: 'PBKDF2', salt: transportSalt, iterations: 250000, hash: 'SHA-256' },
                material,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );
            const [styleText, scriptText] = await Promise.all([
                decryptAsset(data.style, 'style', key),
                decryptAsset(data.script, 'script', key)
            ]);
            const styleUrl = URL.createObjectURL(new Blob([styleText], { type: 'text/css' }));
            const scriptUrl = URL.createObjectURL(new Blob([scriptText], { type: 'application/javascript' }));
            resultBlobUrls = [styleUrl, scriptUrl];

            const style = document.createElement('link');
            style.rel = 'stylesheet';
            style.href = styleUrl;
            const script = document.createElement('script');
            script.src = scriptUrl;
            script.async = true;
            resultStyle = style;
            resultScript = script;

        resultValueHandler = event => {
            const accept = event?.detail?.accept;
            if (typeof accept !== 'function') return;
            const value = pendingValue;
            pendingValue = '';
            window.removeEventListener('formula:value-request', resultValueHandler);
            resultValueHandler = null;
            accept(value);
        };
        window.addEventListener('formula:value-request', resultValueHandler);
        const clearHandoff = () => {
            pendingValue = '';
            if (resultValueHandler) window.removeEventListener('formula:value-request', resultValueHandler);
            if (resultAttachTimer) clearTimeout(resultAttachTimer);
            resultValueHandler = null;
            resultAttachTimer = null;
        };
            script.addEventListener('load', () => {
                clearHandoff();
                for (const url of resultBlobUrls) URL.revokeObjectURL(url);
                resultBlobUrls = [];
            }, { once: true });
        script.addEventListener('error', () => {
            clearHandoff();
            recoverResult();
        }, { once: true });
        let attached = false;
        const attachScript = () => {
            if (attached) return;
            attached = true;
            if (resultAttachTimer) clearTimeout(resultAttachTimer);
            resultAttachTimer = null;
            document.head.append(script);
        };
        style.addEventListener('load', attachScript, { once: true });
        style.addEventListener('error', attachScript, { once: true });
        resultAttachTimer = setTimeout(attachScript, 2500);
        document.head.append(style);
        } catch {
            pendingValue = '';
            recoverResult();
        }
    }

    window.addEventListener('formula:result-error', recoverResult);

    async function evaluate() {
        const rawSource = input.value;
        const source = rawSource.trim();
        if (!source || applyingResult || resolving) return;

        try {
            const value = calculate(source);
            const localResult = formatNumber(value);
            answer = value;
            setOutput(localResult);
            addHistory(source, localResult);
            return;
        } catch {}

        resolving = true;
        setOutput('正在解析…');
        try {
            const remote = await queryExpression(rawSource);
            if (remote?.ok) {
                await applyResult(remote, rawSource);
                return;
            }
            setOutput(remote?.result || '无法计算该表达式。', true);
        } catch {
            setOutput('无法计算该表达式。', true);
        } finally {
            resolving = false;
        }
    }

    keypad.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        const action = button.dataset.action;
        if (action === 'clear') {
            input.value = '';
            setOutput('0');
            input.focus();
            return;
        }
        if (action === 'delete') {
            eraseOne();
            return;
        }
        if (action === 'evaluate') {
            evaluate();
            return;
        }
        if (button.dataset.insert !== undefined) {
            insertAtCursor(button.dataset.insert);
        }
    });

    input.addEventListener('input', preview);
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            evaluate();
        } else if (event.key === 'Escape') {
            input.value = '';
            setOutput('0');
        } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
            event.preventDefault();
            input.value = '';
            setOutput('0');
        }
    });

    modeButton.addEventListener('click', () => {
        angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
        modeButton.textContent = angleMode;
        preview();
    });

    historyButton.addEventListener('click', () => {
        historyPanel.hidden = !historyPanel.hidden;
        renderHistory();
    });

    closeHistoryButton.addEventListener('click', () => {
        historyPanel.hidden = true;
        input.focus();
    });

    clearHistoryButton.addEventListener('click', () => {
        entries = [];
        saveHistory();
        renderHistory();
    });

    historyPanel.addEventListener('click', event => {
        if (event.target === historyPanel) historyPanel.hidden = true;
    });

    renderHistory();
    const calculatorPanel = input.closest('[data-tool-panel]');
    if (!calculatorPanel || !calculatorPanel.hidden) input.focus();
})();

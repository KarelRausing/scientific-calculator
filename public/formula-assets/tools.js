const UNIT_GROUPS = {
    length: {
        label: '长度',
        base: 'm',
        units: {
            mm: { label: '毫米 (mm)', factor: 0.001 },
            cm: { label: '厘米 (cm)', factor: 0.01 },
            m: { label: '米 (m)', factor: 1 },
            km: { label: '千米 (km)', factor: 1000 },
            inch: { label: '英寸 (in)', factor: 0.0254 },
            ft: { label: '英尺 (ft)', factor: 0.3048 },
            yd: { label: '码 (yd)', factor: 0.9144 },
            mile: { label: '英里 (mi)', factor: 1609.344 },
            nmi: { label: '海里 (nmi)', factor: 1852 },
        },
    },
    mass: {
        label: '质量',
        base: 'kg',
        units: {
            mg: { label: '毫克 (mg)', factor: 0.000001 },
            g: { label: '克 (g)', factor: 0.001 },
            kg: { label: '千克 (kg)', factor: 1 },
            tonne: { label: '吨 (t)', factor: 1000 },
            oz: { label: '盎司 (oz)', factor: 0.028349523125 },
            lb: { label: '磅 (lb)', factor: 0.45359237 },
        },
    },
    area: {
        label: '面积',
        base: 'm²',
        units: {
            mm2: { label: '平方毫米 (mm²)', factor: 0.000001 },
            cm2: { label: '平方厘米 (cm²)', factor: 0.0001 },
            m2: { label: '平方米 (m²)', factor: 1 },
            km2: { label: '平方千米 (km²)', factor: 1000000 },
            hectare: { label: '公顷 (ha)', factor: 10000 },
            acre: { label: '英亩 (acre)', factor: 4046.8564224 },
            ft2: { label: '平方英尺 (ft²)', factor: 0.09290304 },
        },
    },
    volume: {
        label: '体积',
        base: 'L',
        units: {
            ml: { label: '毫升 (mL)', factor: 0.001 },
            l: { label: '升 (L)', factor: 1 },
            m3: { label: '立方米 (m³)', factor: 1000 },
            cm3: { label: '立方厘米 (cm³)', factor: 0.001 },
            tsp: { label: '茶匙 (US tsp)', factor: 0.00492892159375 },
            tbsp: { label: '汤匙 (US tbsp)', factor: 0.01478676478125 },
            cup: { label: '美制杯 (US cup)', factor: 0.2365882365 },
            floz: { label: '液量盎司 (US fl oz)', factor: 0.0295735295625 },
            gallon: { label: '美制加仑 (US gal)', factor: 3.785411784 },
        },
    },
    temperature: {
        label: '温度',
        base: '°C',
        units: {
            c: { label: '摄氏度 (°C)' },
            f: { label: '华氏度 (°F)' },
            k: { label: '开尔文 (K)' },
        },
    },
    speed: {
        label: '速度',
        base: 'm/s',
        units: {
            ms: { label: '米/秒 (m/s)', factor: 1 },
            kmh: { label: '千米/小时 (km/h)', factor: 1 / 3.6 },
            mph: { label: '英里/小时 (mph)', factor: 0.44704 },
            knot: { label: '节 (kn)', factor: 0.5144444444444445 },
            fts: { label: '英尺/秒 (ft/s)', factor: 0.3048 },
        },
    },
    pressure: {
        label: '压力',
        base: 'Pa',
        units: {
            pa: { label: '帕 (Pa)', factor: 1 },
            kpa: { label: '千帕 (kPa)', factor: 1000 },
            mpa: { label: '兆帕 (MPa)', factor: 1000000 },
            bar: { label: '巴 (bar)', factor: 100000 },
            atm: { label: '标准大气压 (atm)', factor: 101325 },
            psi: { label: '磅力/平方英寸 (psi)', factor: 6894.757293168 },
            mmhg: { label: '毫米汞柱 (mmHg)', factor: 133.322387415 },
        },
    },
    energy: {
        label: '能量',
        base: 'J',
        units: {
            j: { label: '焦耳 (J)', factor: 1 },
            kj: { label: '千焦 (kJ)', factor: 1000 },
            wh: { label: '瓦时 (Wh)', factor: 3600 },
            kwh: { label: '千瓦时 (kWh)', factor: 3600000 },
            cal: { label: '卡 (cal)', factor: 4.184 },
            kcal: { label: '千卡 (kcal)', factor: 4184 },
            btu: { label: '英热单位 (BTU)', factor: 1055.05585262 },
            ev: { label: '电子伏特 (eV)', factor: 1.602176634e-19 },
        },
    },
    power: {
        label: '功率',
        base: 'W',
        units: {
            mw: { label: '毫瓦 (mW)', factor: 0.001 },
            w: { label: '瓦 (W)', factor: 1 },
            kw: { label: '千瓦 (kW)', factor: 1000 },
            mwatt: { label: '兆瓦 (MW)', factor: 1000000 },
            hp: { label: '机械马力 (hp)', factor: 745.6998715822702 },
        },
    },
    time: {
        label: '时间',
        base: 's',
        units: {
            ms: { label: '毫秒 (ms)', factor: 0.001 },
            s: { label: '秒 (s)', factor: 1 },
            min: { label: '分钟 (min)', factor: 60 },
            h: { label: '小时 (h)', factor: 3600 },
            day: { label: '天 (d)', factor: 86400 },
            week: { label: '周', factor: 604800 },
            year: { label: '平年 (365天)', factor: 31536000 },
        },
    },
    data: {
        label: '数据容量',
        base: 'B',
        units: {
            bit: { label: '比特 (bit)', factor: 0.125 },
            byte: { label: '字节 (B)', factor: 1 },
            kb: { label: '千字节 (kB, 10³)', factor: 1000 },
            mb: { label: '兆字节 (MB, 10⁶)', factor: 1000000 },
            gb: { label: '吉字节 (GB, 10⁹)', factor: 1000000000 },
            kib: { label: 'KiB (2¹⁰)', factor: 1024 },
            mib: { label: 'MiB (2²⁰)', factor: 1048576 },
            gib: { label: 'GiB (2³⁰)', factor: 1073741824 },
        },
    },
};

export function formatNumeric(value) {
    if (!Number.isFinite(value)) return '';
    if (Object.is(value, -0)) value = 0;
    const magnitude = Math.abs(value);
    if ((magnitude > 0 && magnitude < 1e-9) || magnitude >= 1e15) {
        return value.toExponential(12).replace(/\.0+(?=e)/, '').replace(/(\.\d*?)0+(?=e)/, '$1');
    }
    return Number(value.toPrecision(13)).toString();
}

function toCelsius(value, unit) {
    if (unit === 'c') return value;
    if (unit === 'f') return (value - 32) * 5 / 9;
    if (unit === 'k') return value - 273.15;
    throw new Error('unknown_unit');
}

function fromCelsius(value, unit) {
    if (unit === 'c') return value;
    if (unit === 'f') return value * 9 / 5 + 32;
    if (unit === 'k') return value + 273.15;
    throw new Error('unknown_unit');
}

export function convertUnit(value, category, from, to) {
    if (!Number.isFinite(value)) throw new Error('invalid_number');
    const group = UNIT_GROUPS[category];
    if (!group || !group.units[from] || !group.units[to]) throw new Error('unknown_unit');
    if (category === 'temperature') {
        const celsius = toCelsius(value, from);
        if (celsius < -273.15) throw new Error('below_absolute_zero');
        return fromCelsius(celsius, to);
    }
    return value * group.units[from].factor / group.units[to].factor;
}

export function parseBigInteger(input, sourceBase = 'auto') {
    let text = String(input ?? '').trim().replace(/[\s_]/g, '');
    if (!text || text.length > 512) throw new Error('invalid_integer');
    let sign = 1n;
    if (text.startsWith('+') || text.startsWith('-')) {
        if (text[0] === '-') sign = -1n;
        text = text.slice(1);
    }
    if (!text) throw new Error('invalid_integer');

    let base = sourceBase === 'auto' ? 10 : Number(sourceBase);
    const prefix = text.slice(0, 2).toLowerCase();
    if (sourceBase === 'auto') {
        if (prefix === '0x') { base = 16; text = text.slice(2); }
        else if (prefix === '0b') { base = 2; text = text.slice(2); }
        else if (prefix === '0o') { base = 8; text = text.slice(2); }
    } else {
        if ((base === 16 && prefix === '0x') || (base === 2 && prefix === '0b') || (base === 8 && prefix === '0o')) {
            text = text.slice(2);
        }
    }
    if (!text) throw new Error('invalid_integer');
    const patterns = {
        2: /^[01]+$/,
        8: /^[0-7]+$/,
        10: /^\d+$/,
        16: /^[0-9a-f]+$/i,
    };
    if (!patterns[base]?.test(text)) throw new Error('invalid_digit');

    let value = 0n;
    const radix = BigInt(base);
    for (const char of text.toLowerCase()) {
        const digit = BigInt(char >= 'a' ? char.charCodeAt(0) - 87 : char.charCodeAt(0) - 48);
        value = value * radix + digit;
    }
    return sign * value;
}

function parseDateParts(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw new Error('invalid_date');
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        throw new Error('invalid_date');
    }
    return { year, month, day, date };
}

function formatIsoDate(date) {
    const year = date.getUTCFullYear().toString().padStart(4, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function calculateDateDifference(startValue, endValue) {
    const start = parseDateParts(startValue).date;
    const end = parseDateParts(endValue).date;
    const signedDays = Math.round((end.getTime() - start.getTime()) / 86400000);
    const direction = signedDays === 0 ? 0 : signedDays > 0 ? 1 : -1;
    const absoluteDays = Math.abs(signedDays);
    let weekdays = Math.floor(absoluteDays / 7) * 5;
    const remainder = absoluteDays % 7;
    const cursor = new Date(start.getTime());
    for (let index = 0; index < remainder; index++) {
        cursor.setUTCDate(cursor.getUTCDate() + direction);
        const weekday = cursor.getUTCDay();
        if (weekday !== 0 && weekday !== 6) weekdays++;
    }
    return { signedDays, absoluteDays, signedWeekdays: weekdays * direction };
}

function daysInMonth(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function addToDate(baseValue, amount, unit = 'days', operation = 'add', businessDays = false) {
    const parts = parseDateParts(baseValue);
    if (!Number.isInteger(amount) || amount < 0 || amount > 100000) throw new Error('invalid_amount');
    const direction = operation === 'subtract' ? -1 : 1;
    const date = new Date(parts.date.getTime());

    if (businessDays) {
        if (unit !== 'days' || amount > 10000) throw new Error('business_limit');
        let remaining = amount;
        while (remaining > 0) {
            date.setUTCDate(date.getUTCDate() + direction);
            const weekday = date.getUTCDay();
            if (weekday !== 0 && weekday !== 6) remaining--;
        }
        return formatIsoDate(date);
    }

    if (unit === 'days') date.setUTCDate(date.getUTCDate() + direction * amount);
    else if (unit === 'weeks') date.setUTCDate(date.getUTCDate() + direction * amount * 7);
    else if (unit === 'months' || unit === 'years') {
        const sourceDay = date.getUTCDate();
        date.setUTCDate(1);
        if (unit === 'months') date.setUTCMonth(date.getUTCMonth() + direction * amount);
        else date.setUTCFullYear(date.getUTCFullYear() + direction * amount);
        date.setUTCDate(Math.min(sourceDay, daysInMonth(date.getUTCFullYear(), date.getUTCMonth())));
    } else throw new Error('invalid_unit');
    return formatIsoDate(date);
}

function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function initTabs(app) {
    const tabs = Array.from(app.querySelectorAll('[data-tool-target]'));
    const panels = Array.from(app.querySelectorAll('[data-tool-panel]'));
    const validNames = new Set(tabs.map(tab => tab.dataset.toolTarget));
    const stateKey = 'dict_calc_active_tool_v1';
    const activate = name => {
        if (!validNames.has(name)) name = 'dictionary';
        for (const tab of tabs) {
            const active = tab.dataset.toolTarget === name;
            tab.classList.toggle('is-active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
        }
        for (const panel of panels) panel.hidden = panel.dataset.toolPanel !== name;
        if (name === 'dictionary') app.querySelector('#dictionaryInput')?.focus();
        if (name === 'calculator') app.querySelector('#expressionInput')?.focus();
    };
    const remember = name => {
        try { sessionStorage.setItem(stateKey, name); } catch {}
    };
    for (const tab of tabs) {
        tab.addEventListener('click', () => {
            activate(tab.dataset.toolTarget);
            remember(tab.dataset.toolTarget);
        });
    }
    let initial = 'dictionary';
    try {
        const saved = sessionStorage.getItem(stateKey);
        if (validNames.has(saved)) initial = saved;
    } catch {}
    activate(initial);
}

function renderDictionary(resultHost, payload) {
    resultHost.replaceChildren();
    const summary = createElement('div', 'dictionary-summary');
    const title = createElement('h3', 'dictionary-query', payload.dictionary?.word || payload.query || '查询结果');
    summary.append(title);

    if (payload.dictionary?.phonetic) summary.append(createElement('div', 'dictionary-phonetic', payload.dictionary.phonetic));
    if (payload.translation?.text) {
        summary.append(createElement('div', 'dictionary-translation', payload.translation.text));
        summary.append(createElement('div', 'dictionary-source', `翻译来源：${payload.translation.source}${payload.cached ? '（缓存）' : ''}`));
    }
    if (payload.dictionary?.audio) {
        const button = createElement('button', 'dictionary-audio', '播放发音');
        button.type = 'button';
        button.addEventListener('click', () => {
            try {
                const audio = new Audio(payload.dictionary.audio);
                audio.play().catch(() => {});
            } catch {
                // Audio support is optional.
            }
        });
        summary.append(button);
    }
    resultHost.append(summary);

    for (const meaning of payload.dictionary?.meanings || []) {
        const section = createElement('section', 'dictionary-meaning');
        section.append(createElement('h4', 'dictionary-pos', meaning.partOfSpeech));
        const list = createElement('ol', 'dictionary-definition-list');
        for (const definition of meaning.definitions || []) {
            const item = createElement('li', '', definition.definition);
            if (definition.example) item.append(createElement('div', 'dictionary-example', `例：${definition.example}`));
            if (Array.isArray(definition.synonyms) && definition.synonyms.length) {
                item.append(createElement('div', 'dictionary-synonyms', `近义词：${definition.synonyms.join('、')}`));
            }
            list.append(item);
        }
        section.append(list);
        resultHost.append(section);
    }
    resultHost.hidden = false;
}

function initDictionary(app) {
    const form = app.querySelector('#dictionaryForm');
    const input = app.querySelector('#dictionaryInput');
    const direction = app.querySelector('#dictionaryDirection');
    const submit = app.querySelector('#dictionarySubmit');
    const status = app.querySelector('#dictionaryStatus');
    const result = app.querySelector('#dictionaryResult');
    if (!form || !input || !direction || !submit || !status || !result) return;
    const endpoint = new URL(app.dataset.dictionaryEndpoint || '/api/dictionary', location.href).href;
    let busy = false;

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const query = input.value.trim();
        if (!query || busy) return;
        busy = true;
        submit.disabled = true;
        result.hidden = true;
        status.classList.remove('status-error');
        status.textContent = '正在查询多个词典源…';
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 18000);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ query, direction: direction.value }),
            });
            const payload = await response.json().catch(() => ({ ok: false, message: '返回数据格式异常。' }));
            if (!response.ok || !payload.ok) throw new Error(payload.message || '查询失败。');
            renderDictionary(result, payload);
            status.textContent = payload.cached ? '查询完成（已使用缓存结果）。' : '查询完成。';
        } catch (error) {
            status.classList.add('status-error');
            status.textContent = error?.name === 'AbortError' ? '查询超时，请稍后重试。' : (error?.message || '查询失败，请稍后重试。');
        } finally {
            clearTimeout(timer);
            busy = false;
            submit.disabled = false;
        }
    });

    input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            form.requestSubmit();
        }
    });
}

function initUnitConverter(app) {
    const category = app.querySelector('#unitCategory');
    const input = app.querySelector('#unitInput');
    const from = app.querySelector('#unitFrom');
    const to = app.querySelector('#unitTo');
    const output = app.querySelector('#unitOutput');
    const swap = app.querySelector('#unitSwap');
    const formula = app.querySelector('#unitFormula');
    if (!category || !input || !from || !to || !output || !swap || !formula) return;

    for (const [key, group] of Object.entries(UNIT_GROUPS)) category.append(new Option(group.label, key));
    category.value = 'length';

    const populateUnits = () => {
        const group = UNIT_GROUPS[category.value];
        from.replaceChildren();
        to.replaceChildren();
        for (const [key, unit] of Object.entries(group.units)) {
            from.append(new Option(unit.label, key));
            to.append(new Option(unit.label, key));
        }
        const keys = Object.keys(group.units);
        from.value = keys[0];
        to.value = keys[Math.min(2, keys.length - 1)];
        calculate();
    };

    const calculate = () => {
        const rawValue = String(input.value).trim();
        const value = rawValue ? Number(rawValue.replace(',', '.')) : Number.NaN;
        if (!Number.isFinite(value)) {
            output.value = '';
            formula.textContent = input.value.trim() ? '请输入有效数字。' : '';
            formula.classList.toggle('status-error', Boolean(input.value.trim()));
            return;
        }
        try {
            const result = convertUnit(value, category.value, from.value, to.value);
            output.value = formatNumeric(result);
            formula.classList.remove('status-error');
            formula.textContent = `${value} ${UNIT_GROUPS[category.value].units[from.value].label} = ${output.value} ${UNIT_GROUPS[category.value].units[to.value].label}`;
        } catch (error) {
            output.value = '';
            formula.classList.add('status-error');
            formula.textContent = error?.message === 'below_absolute_zero' ? '结果低于绝对零度。' : '无法完成换算。';
        }
    };

    category.addEventListener('change', populateUnits);
    for (const node of [input, from, to]) node.addEventListener(node === input ? 'input' : 'change', calculate);
    swap.addEventListener('click', () => {
        const old = from.value;
        from.value = to.value;
        to.value = old;
        calculate();
    });
    populateUnits();
}

function initBaseConverter(app) {
    const input = app.querySelector('#baseInput');
    const source = app.querySelector('#baseSource');
    const status = app.querySelector('#baseStatus');
    const outputs = {
        2: app.querySelector('#baseBin'),
        8: app.querySelector('#baseOct'),
        10: app.querySelector('#baseDec'),
        16: app.querySelector('#baseHex'),
    };
    if (!input || !source || !status || Object.values(outputs).some(item => !item)) return;
    const clear = () => Object.values(outputs).forEach(item => { item.value = ''; });
    const calculate = () => {
        const raw = input.value.trim();
        if (!raw) {
            clear();
            status.textContent = '';
            status.classList.remove('status-error');
            return;
        }
        try {
            const value = parseBigInteger(raw, source.value);
            outputs[2].value = value.toString(2);
            outputs[8].value = value.toString(8);
            outputs[10].value = value.toString(10);
            outputs[16].value = value.toString(16).toUpperCase();
            status.classList.remove('status-error');
            status.textContent = '转换完成。支持最多 512 个输入字符。';
        } catch {
            clear();
            status.classList.add('status-error');
            status.textContent = '输入内容与所选进制不匹配，或整数过长。';
        }
    };
    input.addEventListener('input', calculate);
    source.addEventListener('change', calculate);
}

function todayIso() {
    const now = new Date();
    const year = now.getFullYear().toString().padStart(4, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateLong(iso) {
    const parts = parseDateParts(iso);
    return new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    }).format(parts.date);
}

function initDateCalculator(app) {
    const start = app.querySelector('#dateStart');
    const end = app.querySelector('#dateEnd');
    const difference = app.querySelector('#dateDifference');
    const base = app.querySelector('#dateBase');
    const operation = app.querySelector('#dateOperation');
    const amount = app.querySelector('#dateAmount');
    const unit = app.querySelector('#dateUnit');
    const business = app.querySelector('#businessDaysOnly');
    const addResult = app.querySelector('#dateAddResult');
    if (!start || !end || !difference || !base || !operation || !amount || !unit || !business || !addResult) return;

    const today = todayIso();
    start.value = today;
    end.value = addToDate(today, 30, 'days');
    base.value = today;

    const updateDifference = () => {
        try {
            const result = calculateDateDifference(start.value, end.value);
            const signText = result.signedDays > 0 ? '结束日期在开始日期之后' : result.signedDays < 0 ? '结束日期在开始日期之前' : '两个日期相同';
            const weeks = Math.floor(result.absoluteDays / 7);
            const remainder = result.absoluteDays % 7;
            difference.textContent = `${signText}：相差 ${result.absoluteDays} 天（${weeks} 周 ${remainder} 天）；按周一至周五计为 ${Math.abs(result.signedWeekdays)} 个工作日。`;
        } catch {
            difference.textContent = '请选择有效日期。';
        }
    };

    const updateAdd = () => {
        const rawAmount = amount.value.trim();
        const numericAmount = rawAmount ? Number(rawAmount) : Number.NaN;
        business.disabled = unit.value !== 'days';
        if (business.disabled) business.checked = false;
        try {
            const result = addToDate(base.value, numericAmount, unit.value, operation.value, business.checked);
            addResult.textContent = `${formatDateLong(result)}（${result}）`;
        } catch (error) {
            addResult.textContent = error?.message === 'business_limit'
                ? '工作日计算仅支持 0–10000 天。'
                : '请输入有效日期和非负整数。';
        }
    };

    for (const node of [start, end]) node.addEventListener('change', updateDifference);
    for (const node of [base, operation, amount, unit, business]) {
        node.addEventListener(node === amount ? 'input' : 'change', updateAdd);
    }
    updateDifference();
    updateAdd();
}

function formatVisitorCount(value) {
    if (!/^\d{1,19}$/.test(value)) throw new Error('invalid_visit_count');
    try {
        return BigInt(value).toLocaleString('zh-CN');
    } catch {
        return value;
    }
}

async function initVisitorCounter(app) {
    const counter = app.querySelector('#visitorCounter');
    if (!counter) return;
    try {
        const response = await fetch('/api/visit', {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: '{}',
        });
        if (!response.ok) throw new Error('visit_request_failed');
        const data = await response.json();
        if (!data?.ok || typeof data.count !== 'string') throw new Error('invalid_visit_response');
        counter.textContent = `访问次数：${formatVisitorCount(data.count)}`;
    } catch {
        counter.textContent = '访问次数：—';
    }
}

function init() {
    const app = document.getElementById('formulaCalcApp');
    if (!app) return;
    initTabs(app);
    initDictionary(app);
    initUnitConverter(app);
    initBaseConverter(app);
    initDateCalculator(app);
    void initVisitorCounter(app);
}

if (typeof document !== 'undefined') init();

export { UNIT_GROUPS };

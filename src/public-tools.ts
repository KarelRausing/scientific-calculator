const encoder = new TextEncoder();

const RESPONSE_HEADERS = {
    "Content-Type": "application/json; charset=UTF-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
};


function defaultCache(): Cache {
    return (caches as CacheStorage & { default: Cache }).default;
}

interface DictionaryDefinition {
    definition: string;
    example?: string;
    synonyms?: string[];
}

interface DictionaryMeaning {
    partOfSpeech: string;
    definitions: DictionaryDefinition[];
}

interface DictionaryEntry {
    word: string;
    phonetic?: string;
    audio?: string;
    meanings: DictionaryMeaning[];
}

interface TranslationResult {
    text: string;
    source: string;
}

interface DictionaryPayload {
    ok: boolean;
    query: string;
    direction: "en-zh" | "zh-en";
    translation?: TranslationResult;
    dictionary?: DictionaryEntry;
    cached?: boolean;
    message?: string;
}

function jsonResponse(payload: DictionaryPayload, status = 200): Response {
    return new Response(JSON.stringify(payload), { status, headers: RESPONSE_HEADERS });
}

function cleanText(value: unknown, maxLength = 1200): string {
    if (typeof value !== "string") return "";
    return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

function isChineseText(value: string): boolean {
    return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u.test(value);
}

function timeoutSignal(milliseconds: number): { signal: AbortSignal; cancel: () => void } {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), milliseconds);
    return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = 4500, maxBytes = 800_000): Promise<unknown> {
    const timeout = timeoutSignal(timeoutMs);
    try {
        const response = await fetch(url, {
            ...init,
            signal: timeout.signal,
            redirect: "follow",
            headers: {
                "Accept": "application/json",
                ...(init.headers || {}),
            },
        });
        if (!response.ok) throw new Error(`upstream_${response.status}`);
        const text = await response.text();
        if (encoder.encode(text).byteLength > maxBytes) throw new Error("upstream_too_large");
        return JSON.parse(text);
    } finally {
        timeout.cancel();
    }
}

function normalizeTranslation(value: unknown, original: string): string {
    const text = cleanText(value, 2000);
    if (!text || text.toLocaleLowerCase() === original.toLocaleLowerCase()) return "";
    const blocked = [
        "QUERY LENGTH LIMIT EXCEEDED",
        "NO QUERY SPECIFIED",
        "MYMEMORY WARNING",
        "INVALID SOURCE LANGUAGE",
        "INVALID TARGET LANGUAGE",
    ];
    if (blocked.some(item => text.toUpperCase().includes(item))) return "";
    return text;
}

async function translateWithMyMemory(query: string, source: "en" | "zh-CN", target: "en" | "zh-CN"): Promise<TranslationResult> {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", query);
    url.searchParams.set("langpair", `${source}|${target}`);
    url.searchParams.set("mt", "1");
    const data = await fetchJson(url.toString(), {}, 4500) as {
        responseData?: { translatedText?: unknown };
        matches?: Array<{ translation?: unknown; quality?: unknown }>;
    };
    let text = normalizeTranslation(data?.responseData?.translatedText, query);
    if (!text && Array.isArray(data?.matches)) {
        for (const match of data.matches.slice(0, 8)) {
            text = normalizeTranslation(match?.translation, query);
            if (text) break;
        }
    }
    if (!text) throw new Error("empty_translation");
    return { text, source: "MyMemory" };
}

async function translateWithLibre(instance: string, query: string, source: "en" | "zh", target: "en" | "zh"): Promise<TranslationResult> {
    const data = await fetchJson(`${instance.replace(/\/$/, "")}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, source, target, format: "text" }),
    }, 5000) as { translatedText?: unknown };
    const text = normalizeTranslation(data?.translatedText, query);
    if (!text) throw new Error("empty_translation");
    return { text, source: "LibreTranslate" };
}

async function translateWithLingva(instance: string, query: string, source: "en" | "zh", target: "en" | "zh"): Promise<TranslationResult> {
    const path = `${instance.replace(/\/$/, "")}/api/v1/${source}/${target}/${encodeURIComponent(query)}`;
    const data = await fetchJson(path, {}, 5000) as { translation?: unknown };
    const text = normalizeTranslation(data?.translation, query);
    if (!text) throw new Error("empty_translation");
    return { text, source: "Lingva" };
}

async function firstSuccessful<T>(tasks: Array<() => Promise<T>>): Promise<T> {
    if (tasks.length === 0) throw new Error("no_tasks");
    return await new Promise<T>((resolve, reject) => {
        let pending = tasks.length;
        let settled = false;
        let lastError: unknown = new Error("all_failed");
        for (const task of tasks) {
            task().then(value => {
                if (settled) return;
                settled = true;
                resolve(value);
            }).catch(error => {
                lastError = error;
                pending--;
                if (!settled && pending === 0) reject(lastError);
            });
        }
    });
}

async function fetchTranslation(query: string, direction: "en-zh" | "zh-en"): Promise<TranslationResult | undefined> {
    const fromMyMemory = direction === "en-zh"
        ? ["en", "zh-CN"] as const
        : ["zh-CN", "en"] as const;
    const fromGeneric = direction === "en-zh"
        ? ["en", "zh"] as const
        : ["zh", "en"] as const;

    try {
        return await translateWithMyMemory(query, fromMyMemory[0], fromMyMemory[1]);
    } catch {
        // Continue with independent public mirrors.
    }

    try {
        return await firstSuccessful([
            () => translateWithLibre("https://translate.fedilab.app", query, fromGeneric[0], fromGeneric[1]),
            () => translateWithLibre("https://translate.cutie.dating", query, fromGeneric[0], fromGeneric[1]),
        ]);
    } catch {
        // Continue with Lingva mirrors.
    }

    try {
        return await firstSuccessful([
            () => translateWithLingva("https://translate.dr460nf1r3.org", query, fromGeneric[0], fromGeneric[1]),
            () => translateWithLingva("https://lingva.garudalinux.org", query, fromGeneric[0], fromGeneric[1]),
            () => translateWithLingva("https://translate.jae.fi", query, fromGeneric[0], fromGeneric[1]),
        ]);
    } catch {
        return undefined;
    }
}


function toBase64Url(value: string): string {
    return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
    if (!/^[A-Za-z0-9_-]{1,3000}$/.test(value)) throw new Error("invalid_audio_token");
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    return atob(padded);
}

function allowedAudioUrl(value: string): URL {
    const url = new URL(value);
    const allowedHosts = new Set(["ssl.gstatic.com", "api.dictionaryapi.dev"]);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !allowedHosts.has(url.hostname.toLowerCase())) {
        throw new Error("audio_host_not_allowed");
    }
    return url;
}

async function fetchAudioFollowingSafeRedirects(initialUrl: URL): Promise<Response> {
    let current = initialUrl;
    for (let redirect = 0; redirect < 3; redirect++) {
        const timeout = timeoutSignal(6000);
        let response: Response;
        try {
            response = await fetch(current.toString(), {
                method: "GET",
                signal: timeout.signal,
                redirect: "manual",
                headers: { "Accept": "audio/*,application/octet-stream;q=0.8" },
            });
        } finally {
            timeout.cancel();
        }
        if ([301, 302, 303, 307, 308].includes(response.status)) {
            const location = response.headers.get("Location");
            if (!location) throw new Error("audio_redirect_missing");
            current = allowedAudioUrl(new URL(location, current).toString());
            continue;
        }
        if (!response.ok) throw new Error(`audio_${response.status}`);
        return response;
    }
    throw new Error("audio_redirect_limit");
}

export async function handleDictionaryAudioRequest(request: Request): Promise<Response> {
    if (request.method !== "GET") {
        return new Response("Method Not Allowed", {
            status: 405,
            headers: { "Content-Type": "text/plain; charset=UTF-8", "Allow": "GET", "Cache-Control": "no-store" },
        });
    }
    try {
        const requestUrl = new URL(request.url);
        const source = allowedAudioUrl(fromBase64Url(requestUrl.searchParams.get("src") || ""));
        const upstream = await fetchAudioFollowingSafeRedirects(source);
        const contentType = (upstream.headers.get("Content-Type") || "application/octet-stream").split(";", 1)[0].trim().toLowerCase();
        if (!contentType.startsWith("audio/") && contentType !== "application/octet-stream") {
            throw new Error("invalid_audio_type");
        }
        const declaredLength = Number(upstream.headers.get("Content-Length") || "0");
        if (declaredLength > 3_000_000) throw new Error("audio_too_large");
        const bytes = await upstream.arrayBuffer();
        if (bytes.byteLength > 3_000_000) throw new Error("audio_too_large");
        return new Response(bytes, {
            headers: {
                "Content-Type": contentType,
                "Content-Length": String(bytes.byteLength),
                "Cache-Control": "public, max-age=86400",
                "X-Content-Type-Options": "nosniff",
                "Content-Disposition": "inline",
            },
        });
    } catch {
        return new Response("Not Found", {
            status: 404,
            headers: {
                "Content-Type": "text/plain; charset=UTF-8",
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    }
}

function normalizeAudioUrl(value: unknown): string {
    let audio = cleanText(value, 800);
    if (!audio) return "";
    if (audio.startsWith("//")) audio = `https:${audio}`;
    try {
        const url = new URL(audio);
        return url.protocol === "https:" ? url.toString() : "";
    } catch {
        return "";
    }
}

async function fetchEnglishDictionary(query: string): Promise<DictionaryEntry | undefined> {
    if (!/^[A-Za-z][A-Za-z' -]{0,79}$/.test(query)) return undefined;
    const data = await fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`, {}, 5000) as Array<{
        word?: unknown;
        phonetic?: unknown;
        phonetics?: Array<{ text?: unknown; audio?: unknown }>;
        meanings?: Array<{
            partOfSpeech?: unknown;
            definitions?: Array<{ definition?: unknown; example?: unknown; synonyms?: unknown[] }>;
        }>;
    }>;
    if (!Array.isArray(data) || data.length === 0) return undefined;
    const first = data[0];
    const phonetics = Array.isArray(first.phonetics) ? first.phonetics : [];
    const phonetic = cleanText(first.phonetic, 120) || phonetics.map(item => cleanText(item?.text, 120)).find(Boolean) || "";
    const audioSource = phonetics.map(item => normalizeAudioUrl(item?.audio)).find(Boolean) || "";
    const audio = audioSource ? `/api/dictionary-audio?src=${toBase64Url(audioSource)}` : "";
    const meanings: DictionaryMeaning[] = [];
    for (const meaning of (Array.isArray(first.meanings) ? first.meanings : []).slice(0, 8)) {
        const definitions: DictionaryDefinition[] = [];
        for (const definition of (Array.isArray(meaning?.definitions) ? meaning.definitions : []).slice(0, 5)) {
            const text = cleanText(definition?.definition, 900);
            if (!text) continue;
            const example = cleanText(definition?.example, 700);
            const synonyms = Array.isArray(definition?.synonyms)
                ? definition.synonyms.map(item => cleanText(item, 80)).filter(Boolean).slice(0, 8)
                : [];
            definitions.push({ definition: text, ...(example ? { example } : {}), ...(synonyms.length ? { synonyms } : {}) });
        }
        if (definitions.length) {
            meanings.push({
                partOfSpeech: cleanText(meaning?.partOfSpeech, 80) || "definition",
                definitions,
            });
        }
    }
    if (!meanings.length) return undefined;
    return {
        word: cleanText(first.word, 120) || query,
        ...(phonetic ? { phonetic } : {}),
        ...(audio ? { audio } : {}),
        meanings,
    };
}

async function cacheKeyFor(query: string, direction: string): Promise<Request> {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${direction}\n${query.toLocaleLowerCase()}`));
    const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    return new Request(`https://utility-cache.invalid/dictionary-v1/${hex}`, { method: "GET" });
}

async function readRequestBody(request: Request): Promise<{ query: string; direction: "auto" | "en-zh" | "zh-en" }> {
    const contentLength = Number(request.headers.get("Content-Length") || "0");
    if (contentLength > 4096) throw new Error("body_too_large");
    const rawBody = await request.text();
    if (encoder.encode(rawBody).byteLength > 4096) throw new Error("body_too_large");
    const body = JSON.parse(rawBody) as { query?: unknown; direction?: unknown };
    const query = cleanText(body?.query, 300).replace(/\s+/g, " ");
    const direction = body?.direction === "en-zh" || body?.direction === "zh-en" ? body.direction : "auto";
    if (!query) throw new Error("empty_query");
    if (encoder.encode(query).byteLength > 500) throw new Error("query_too_large");
    return { query, direction };
}

function requestIsSameOrigin(request: Request): boolean {
    const origin = request.headers.get("Origin");
    if (!origin) return true;
    try {
        return new URL(origin).origin === new URL(request.url).origin;
    } catch {
        return false;
    }
}

export async function handleDictionaryRequest(request: Request): Promise<Response> {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ ok: false, query: "", direction: "en-zh", message: "仅支持 POST 请求。" }), {
            status: 405,
            headers: { ...RESPONSE_HEADERS, "Allow": "POST" },
        });
    }
    if (!requestIsSameOrigin(request)) {
        return jsonResponse({ ok: false, query: "", direction: "en-zh", message: "请求来源无效。" }, 403);
    }

    let query: string;
    let requestedDirection: "auto" | "en-zh" | "zh-en";
    try {
        ({ query, direction: requestedDirection } = await readRequestBody(request));
    } catch {
        return jsonResponse({ ok: false, query: "", direction: "en-zh", message: "请输入不超过 500 字节的查询内容。" }, 400);
    }

    const direction: "en-zh" | "zh-en" = requestedDirection === "auto"
        ? (isChineseText(query) ? "zh-en" : "en-zh")
        : requestedDirection;

    const cacheKey = await cacheKeyFor(query, direction);
    try {
        const cached = await defaultCache().match(cacheKey);
        if (cached) {
            const payload = await cached.json() as DictionaryPayload;
            payload.cached = true;
            return jsonResponse(payload);
        }
    } catch {
        // Cache availability must never break the public tool.
    }

    const [translationResult, dictionaryResult] = await Promise.allSettled([
        fetchTranslation(query, direction),
        direction === "en-zh" ? fetchEnglishDictionary(query) : Promise.resolve(undefined),
    ]);

    const translation = translationResult.status === "fulfilled" ? translationResult.value : undefined;
    const dictionary = dictionaryResult.status === "fulfilled" ? dictionaryResult.value : undefined;
    if (!translation && !dictionary) {
        return jsonResponse({
            ok: false,
            query,
            direction,
            message: "暂时无法连接词典服务，请稍后重试。",
        }, 502);
    }

    const payload: DictionaryPayload = {
        ok: true,
        query,
        direction,
        ...(translation ? { translation } : {}),
        ...(dictionary ? { dictionary } : {}),
    };

    try {
        const cacheResponse = new Response(JSON.stringify(payload), {
            headers: {
                "Content-Type": "application/json; charset=UTF-8",
                "Cache-Control": "public, max-age=604800",
                "X-Content-Type-Options": "nosniff",
            },
        });
        await defaultCache().put(cacheKey, cacheResponse);
    } catch {
        // Upstream result is still useful even if cache storage fails.
    }

    return jsonResponse(payload);
}

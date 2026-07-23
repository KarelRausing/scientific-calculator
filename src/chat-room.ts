import { DurableObject } from "cloudflare:workers";
import { PRIVATE_STYLE, renderPrivateScript } from "./private-assets";
import { OWNER_STYLE, renderOwnerScript } from "./owner-assets";
import { ensureDatabaseSchema } from "./schema";

export interface Env {
    DB: D1Database;
    CHAT_ROOM: DurableObjectNamespace<ChatRoom>;
    ASSETS: Fetcher;
    UNLOCK_SECRET: string;
    OWNER_SECRET?: string;
    RATE_LIMIT_SALT?: string;
}

interface SessionRecord {
    protocol: 4;
    sid: string;
    csrf: string;
    module: string;
    transportKey: string;
    transportSalt: string;
    kind: SessionKind;
    createdAt: number;
    lastActivity: number;
    absoluteExpires: number;
    pendingRole?: Role;
    socketTicket?: SocketTicket;
    exportTicket?: ExportTicket;
}

interface ChallengeRecord {
    id: string;
    clientNonce: string;
    serverNonce: string;
    salt: string;
    createdAt: number;
}

interface SocketTicket {
    value: string;
    role: Role;
    after: number;
    until: number;
}

interface ExportTicket {
    value: string;
    until: number;
}

interface AttemptRecord {
    windowStart: number;
    count: number;
    blockedUntil: number;
}

interface Reservation {
    role: Role;
    until: number;
}

type Reservations = Record<string, Reservation>;
type Role = "wave" | "snow";
type SessionKind = "chat" | "owner";

interface SocketAttachment {
    sid: string;
    role: Role;
    lastActivity: number;
    burstStart: number;
    burstCount: number;
    hourStart: number;
    hourBytes: number;
}

interface StoredMessage {
    id: number;
    created_at: number;
    iv: string;
    ciphertext: string;
    client_id: string;
}

const SESSION_IDLE_SECONDS = 30 * 60;
const SESSION_ABSOLUTE_SECONDS = 8 * 60 * 60;
const OWNER_SESSION_IDLE_SECONDS = 10 * 60;
const OWNER_SESSION_ABSOLUTE_SECONDS = 30 * 60;
const RESERVATION_SECONDS = 20;
const CHALLENGE_SECONDS = 60;
const EXPORT_TICKET_SECONDS = 30;
const RECORD_TTL_SECONDS = 24 * 60 * 60;
const MAX_CLIENTS = 5;
const MAX_CHARS = 10_000;
const MAX_CIPHER_BYTES = 70_000;
const MAX_REQUEST_BYTES = 131_072;
const MAX_STORAGE_BYTES = 128 * 1024 * 1024;
const WRITE_BURST_WINDOW = 10;
const WRITE_BURST_LIMIT = 12;
const WRITE_HOUR_BYTES = 5_000_000;
const ATTEMPT_WINDOW = 10 * 60;
const ATTEMPT_LIMIT = 60;
const ATTEMPT_BLOCK = 15 * 60;
const HISTORY_LIMIT = 5_000;
const HISTORY_CHUNK = 10;
const AUTH_ITERATIONS = 250_000;
const MAX_ACTIVE_CHALLENGES = 4;
const CONTROL_AAD = "formula-control-v4";
const SOCKET_AAD = "formula-socket-v4";
const encoder = new TextEncoder();

function sessionKind(session: SessionRecord): SessionKind {
    return session.kind;
}

function sessionIdleSeconds(session: SessionRecord): number {
    return sessionKind(session) === "owner" ? OWNER_SESSION_IDLE_SECONDS : SESSION_IDLE_SECONDS;
}

function nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
}

function randomToken(bytes = 32): string {
    const value = crypto.getRandomValues(new Uint8Array(bytes));
    let binary = "";
    for (const byte of value) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function toBase64(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> | null {
    if (base64DecodedLength(value) < 0) return null;
    try {
        const raw = atob(value);
        const bytes = new Uint8Array(new ArrayBuffer(raw.length));
        for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
        return bytes;
    } catch {
        return null;
    }
}

function parseCookies(header: string | null): Map<string, string> {
    const cookies = new Map<string, string>();
    for (const part of (header || "").split(";")) {
        const index = part.indexOf("=");
        if (index < 1) continue;
        const name = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        if (name) cookies.set(name, value);
    }
    return cookies;
}

function sessionIdFromRequest(request: Request): string {
    const cookies = parseCookies(request.headers.get("Cookie"));
    return cookies.get("__Host-NMX8SID") || cookies.get("NMX8SID") || "";
}

function cookieHeader(request: Request, sid: string, maxAge: number): string {
    const secure = new URL(request.url).protocol === "https:";
    const name = secure ? "__Host-NMX8SID" : "NMX8SID";
    return `${name}=${sid}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function clearCookieHeader(request: Request): string {
    return cookieHeader(request, "", 0);
}

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "Cache-Control": "no-store, private",
            "X-Content-Type-Options": "nosniff",
            "X-Robots-Tag": "noindex, nofollow, noarchive",
            ...headers,
        },
    });
}

function notFound(): Response {
    return new Response("Not Found", {
        status: 404,
        headers: {
            "Content-Type": "text/plain; charset=UTF-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
    });
}

function sameOrigin(request: Request): boolean {
    const origin = request.headers.get("Origin");
    return !origin || origin === new URL(request.url).origin;
}

function isNeutralJsonRequest(request: Request): boolean {
    const contentType = (request.headers.get("Content-Type") || "").toLowerCase();
    return request.method === "POST"
        && contentType.startsWith("application/json")
        && request.headers.get("X-Requested-With") === "XMLHttpRequest"
        && sameOrigin(request);
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
    const length = Number(request.headers.get("Content-Length") || "0");
    if (Number.isFinite(length) && length > MAX_REQUEST_BYTES) return null;
    try {
        const text = await request.text();
        if (encoder.encode(text).byteLength > MAX_REQUEST_BYTES) return null;
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let difference = 0;
    for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
    return difference === 0;
}

function base64DecodedLength(value: string): number {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) return -1;
    const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
    return (value.length / 4) * 3 - padding;
}

async function deriveSecretBits(
    secret: string,
    salt: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
    const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations: AUTH_ITERATIONS, hash: "SHA-256" },
        material,
        256,
    );
    return new Uint8Array(bits);
}

async function authProof(secret: string, challenge: ChallengeRecord): Promise<Uint8Array<ArrayBuffer>> {
    const salt = fromBase64(challenge.salt);
    if (!salt || salt.length !== 32) throw new Error("invalid_challenge_salt");
    const proofBits = await deriveSecretBits(secret, salt);
    const key = await crypto.subtle.importKey(
        "raw",
        proofBits,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const transcript = `formula-auth-v4\n${challenge.id}\n${challenge.clientNonce}\n${challenge.serverNonce}`;
    return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(transcript)));
}

export class ChatRoom extends DurableObject<Env> {
    private writeTail: Promise<void> = Promise.resolve();
    private maintenance = false;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.ctx.waitUntil(this.ensureAlarm());
    }

    private async ensureAlarm(): Promise<void> {
        const alarm = await this.ctx.storage.getAlarm();
        if (alarm === null) await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000);
    }

    async alarm(): Promise<void> {
        const now = nowSeconds();
        const sessions = await this.ctx.storage.list<SessionRecord>({ prefix: "session:" });
        for (const [key, session] of sessions) {
            if (
                session.protocol !== 4
                || (session.kind !== "chat" && session.kind !== "owner")
                || session.absoluteExpires <= now
                || now - session.lastActivity > sessionIdleSeconds(session)
            ) {
                await this.deleteSessionRecord(key.slice("session:".length));
            }
        }
        const attempts = await this.ctx.storage.list<AttemptRecord>({ prefix: "attempt:" });
        for (const [key, attempt] of attempts) {
            if (attempt.blockedUntil <= now && now - attempt.windowStart > ATTEMPT_WINDOW) {
                await this.ctx.storage.delete(key);
            }
        }
        const challenges = await this.ctx.storage.list<ChallengeRecord>({ prefix: "challenge:" });
        for (const [key, challenge] of challenges) {
            if (now - challenge.createdAt > CHALLENGE_SECONDS) await this.ctx.storage.delete(key);
        }
        await this.cleanReservations(now);
        await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000);
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname === "/expression") return this.handleExpression(request);
        if (url.pathname === "/notation") return this.handleNotation(request);
        if (url.pathname === "/socket") return this.handleSocket(request);
        return notFound();
    }

    private async handleExpression(request: Request): Promise<Response> {
        if (!isNeutralJsonRequest(request)) return notFound();
        const data = await readJson(request);
        if (!data) return notFound();
        const operation = typeof data.op === "string" ? data.op : "";

        if (operation === "challenge") return this.handleChallenge(request, data);
        if (operation === "resolve") return this.handleUnlock(request, data);

        return this.handleSecureExpression(request, data);
    }

    private async handleChallenge(request: Request, data: Record<string, unknown>): Promise<Response> {
        const clientNonce = typeof data.client_nonce === "string" ? data.client_nonce : "";
        const nonceBytes = fromBase64(clientNonce);
        if (!this.env.UNLOCK_SECRET || !nonceBytes || nonceBytes.length !== 32) return notFound();

        const clientKey = await this.clientAttemptKey(request);
        if (!(await this.attemptAllowed(clientKey))) {
            return json({ ok: false, result: "请求过于频繁，请稍后再试。" }, 429);
        }

        const challenge: ChallengeRecord = {
            id: randomToken(24),
            clientNonce,
            serverNonce: randomToken(32),
            salt: toBase64(crypto.getRandomValues(new Uint8Array(32))),
            createdAt: nowSeconds(),
        };
        const challengePrefix = `challenge:${clientKey}:`;
        const pending = await this.ctx.storage.list<ChallengeRecord>({ prefix: challengePrefix });
        const active = Array.from(pending.entries())
            .filter(([, item]) => challenge.createdAt - item.createdAt <= CHALLENGE_SECONDS)
            .sort((left, right) => left[1].createdAt - right[1].createdAt);
        const remove = Array.from(pending.entries())
            .filter(([, item]) => challenge.createdAt - item.createdAt > CHALLENGE_SECONDS)
            .map(([key]) => key);
        while (active.length >= MAX_ACTIVE_CHALLENGES) {
            const oldest = active.shift();
            if (oldest) remove.push(oldest[0]);
        }
        if (remove.length) await this.ctx.storage.delete(remove);
        await this.ctx.storage.put(`${challengePrefix}${challenge.id}`, challenge);
        return json({
            ok: true,
            challenge: challenge.id,
            salt: challenge.salt,
            server_nonce: challenge.serverNonce,
            iterations: AUTH_ITERATIONS,
        });
    }

    private async handleUnlock(request: Request, data: Record<string, unknown>): Promise<Response> {
        const clientKey = await this.clientAttemptKey(request);
        if (!(await this.attemptAllowed(clientKey))) {
            return json({ ok: false, result: "请求过于频繁，请稍后再试。" }, 429);
        }

        const challengeId = typeof data.challenge === "string" ? data.challenge : "";
        const suppliedProof = typeof data.proof === "string" ? fromBase64(data.proof) : null;
        const challengeKey = `challenge:${clientKey}:${challengeId}`;
        const challenge = await this.ctx.storage.get<ChallengeRecord>(challengeKey);
        await this.ctx.storage.delete(challengeKey);
        const challengeValid = Boolean(
            challenge
            && challenge.id === challengeId
            && nowSeconds() - challenge.createdAt <= CHALLENGE_SECONDS
            && suppliedProof
            && suppliedProof.length === 32,
        );
        if (!challengeValid || !challenge || !suppliedProof || !this.env.UNLOCK_SECRET) {
            await this.recordFailedAttempt(clientKey);
            return json({ ok: false, result: "无法计算该表达式。" });
        }

        const ownerSecret = this.env.OWNER_SECRET || "\u0000owner-secret-not-configured";
        const [chatProof, ownerProof] = await Promise.all([
            authProof(this.env.UNLOCK_SECRET, challenge),
            authProof(ownerSecret, challenge),
        ]);
        const ownerMatch = Boolean(this.env.OWNER_SECRET) && constantTimeEqual(ownerProof, suppliedProof);
        const chatMatch = constantTimeEqual(chatProof, suppliedProof);
        if (!ownerMatch && !chatMatch) {
            await this.recordFailedAttempt(clientKey);
            return json({ ok: false, result: "无法计算该表达式。" });
        }

        try {
            await ensureDatabaseSchema(this.env.DB);
        } catch {
            return json({ ok: false, result: "暂时无法完成计算，请稍后重试。" });
        }

        await this.ctx.storage.delete(`attempt:${clientKey}`);
        const now = nowSeconds();
        const sid = randomToken(32);
        const kind: SessionKind = ownerMatch ? "owner" : "chat";
        const matchedSecret = ownerMatch ? ownerSecret : this.env.UNLOCK_SECRET;
        const transportSaltBytes = crypto.getRandomValues(new Uint8Array(32));
        const transportKeyBytes = await deriveSecretBits(matchedSecret, transportSaltBytes);
        const absoluteSeconds = kind === "owner" ? OWNER_SESSION_ABSOLUTE_SECONDS : SESSION_ABSOLUTE_SECONDS;
        const session: SessionRecord = {
            protocol: 4,
            sid,
            csrf: randomToken(32),
            module: randomToken(24),
            transportKey: toBase64(transportKeyBytes),
            transportSalt: toBase64(transportSaltBytes),
            kind,
            createdAt: now,
            lastActivity: now,
            absoluteExpires: now + absoluteSeconds,
        };
        await this.ctx.storage.put(`session:${sid}`, session);
        const module = encodeURIComponent(session.module);
        return json({
            ok: true,
            style: `/notation?part=style&n=${module}`,
            script: `/notation?part=script&n=${module}`,
            transport_salt: session.transportSalt,
            protocol: 4,
        }, 200, { "Set-Cookie": cookieHeader(request, sid, absoluteSeconds) });
    }

    private async handleNotation(request: Request): Promise<Response> {
        if (request.method !== "GET" || !sameOrigin(request)) return notFound();
        const url = new URL(request.url);
        const session = await this.getSession(sessionIdFromRequest(request), true);
        if (!session || url.searchParams.get("n") !== session.module) return notFound();

        const part = url.searchParams.get("part");
        if (part === "data") {
            const ticket = url.searchParams.get("t") || "";
            const exportTicket = session.exportTicket;
            if (
                sessionKind(session) !== "owner"
                || !exportTicket
                || exportTicket.until < nowSeconds()
                || ticket !== exportTicket.value
            ) return notFound();
            session.exportTicket = undefined;
            await this.ctx.storage.put(`session:${session.sid}`, session);
            return this.ownerExport(session);
        }
        if (part === "style") {
            const style = sessionKind(session) === "owner" ? PRIVATE_STYLE + OWNER_STYLE : PRIVATE_STYLE;
            return json(await this.encryptTransport(session, { content: style }, "formula-asset-v4:style"));
        }
        if (part === "script") {
            let script: string;
            if (sessionKind(session) === "owner") {
                script = renderOwnerScript({
                    csrf: session.csrf,
                    transportSalt: session.transportSalt,
                    idleSeconds: OWNER_SESSION_IDLE_SECONDS,
                });
            } else {
                const messageSalt = await this.getOrCreateMessageSalt();
                script = renderPrivateScript({
                    csrf: session.csrf,
                    messageSalt,
                    transportSalt: session.transportSalt,
                    maxChars: MAX_CHARS,
                    ttlHours: RECORD_TTL_SECONDS / 3600,
                    idleSeconds: SESSION_IDLE_SECONDS,
                });
            }
            return json(await this.encryptTransport(session, { content: script }, "formula-asset-v4:script"));
        }
        return notFound();
    }

    private async handleSocket(request: Request): Promise<Response> {
        const upgrade = request.headers.get("Upgrade");
        if (request.method !== "GET" || upgrade?.toLowerCase() !== "websocket" || !sameOrigin(request)) {
            return notFound();
        }
        const url = new URL(request.url);
        const sid = sessionIdFromRequest(request);
        const session = await this.getSession(sid, true);
        const ticketValue = url.searchParams.get("ticket") || "";
        const socketTicket = session?.socketTicket;
        if (
            !session
            || sessionKind(session) !== "chat"
            || !socketTicket
            || socketTicket.until < nowSeconds()
            || socketTicket.value !== ticketValue
        ) return notFound();
        const role = socketTicket.role;
        const after = socketTicket.after;

        const now = nowSeconds();
        await this.pruneIdleSockets(now);
        const reservations = await this.cleanReservations(now);
        const reservation = reservations[sid];
        if (!reservation || reservation.role !== role || reservation.until < now) {
            return notFound();
        }

        const currentSockets = this.ctx.getWebSockets();
        const occupiedSids = new Set<string>();
        for (const ws of currentSockets) {
            const attachment = ws.deserializeAttachment() as SocketAttachment | null;
            if (!attachment) continue;
            if (attachment.sid === sid) {
                try { ws.close(1000, ""); } catch { /* no-op */ }
            } else {
                occupiedSids.add(attachment.sid);
            }
        }
        for (const reservedSid of Object.keys(reservations)) {
            if (reservedSid !== sid) occupiedSids.add(reservedSid);
        }
        if (occupiedSids.size >= MAX_CLIENTS) return notFound();

        delete reservations[sid];
        await this.ctx.storage.put("reservations", reservations);
        session.pendingRole = undefined;
        session.socketTicket = undefined;
        session.lastActivity = now;
        await this.ctx.storage.put(`session:${sid}`, session);

        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];
        this.ctx.acceptWebSocket(server);
        const attachment: SocketAttachment = {
            sid,
            role,
            lastActivity: now,
            burstStart: now,
            burstCount: 0,
            hourStart: now,
            hourBytes: 0,
        };
        server.serializeAttachment(attachment);
        await this.sendSecure(server, session, { type: "ready", role, state: await this.getState(sid) });
        this.ctx.waitUntil(this.sendHistory(server, session, after));
        this.ctx.waitUntil(this.broadcastState());
        return new Response(null, { status: 101, webSocket: client });
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        if (typeof message !== "string" || encoder.encode(message).byteLength > MAX_REQUEST_BYTES) {
            try { ws.close(1000, ""); } catch { /* no-op */ }
            return;
        }
        let envelope: Record<string, unknown>;
        try {
            const parsed = JSON.parse(message);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
            envelope = parsed;
        } catch {
            try { ws.close(1000, ""); } catch { /* no-op */ }
            return;
        }

        const attachment = ws.deserializeAttachment() as SocketAttachment | null;
        if (!attachment) {
            try { ws.close(1000, ""); } catch { /* no-op */ }
            return;
        }
        const now = nowSeconds();
        const session = await this.getSession(attachment.sid, false);
        if (!session || now - attachment.lastActivity > SESSION_IDLE_SECONDS) {
            await this.deleteSessionRecord(attachment.sid);
            try { ws.close(1000, ""); } catch { /* no-op */ }
            return;
        }
        const data = await this.decryptTransport(session, envelope, SOCKET_AAD);
        if (!data) {
            try { ws.close(1000, ""); } catch { /* no-op */ }
            return;
        }

        if (data.type === "pulse") {
            if (data.active === true) {
                attachment.lastActivity = now;
                session.lastActivity = now;
                await this.ctx.storage.put(`session:${attachment.sid}`, session);
                ws.serializeAttachment(attachment);
            }
            return;
        }

        if (data.type !== "message") return;
        if (this.maintenance) {
            await this.sendSecure(ws, session, { type: "session_expired" });
            try { ws.close(1000, ""); } catch { /* no-op */ }
            return;
        }
        attachment.lastActivity = now;
        session.lastActivity = now;
        await this.ctx.storage.put(`session:${attachment.sid}`, session);

        const iv = typeof data.iv === "string" ? data.iv : "";
        const ciphertext = typeof data.ciphertext === "string" ? data.ciphertext : "";
        const clientId = typeof data.client_id === "string" ? data.client_id : "";
        const ivBytes = base64DecodedLength(iv);
        const cipherBytes = base64DecodedLength(ciphertext);
        if (ivBytes !== 12 || cipherBytes < 17 || cipherBytes > MAX_CIPHER_BYTES || !/^[a-f0-9]{32}$/i.test(clientId)) {
            await this.sendSecure(ws, session, { type: "error", reason: "too_long" });
            return;
        }

        if (now - attachment.burstStart >= WRITE_BURST_WINDOW) {
            attachment.burstStart = now;
            attachment.burstCount = 0;
        }
        if (now - attachment.hourStart >= 3600) {
            attachment.hourStart = now;
            attachment.hourBytes = 0;
        }
        if (attachment.burstCount >= WRITE_BURST_LIMIT || attachment.hourBytes + cipherBytes > WRITE_HOUR_BYTES) {
            await this.sendSecure(ws, session, { type: "error", reason: "too_fast" });
            return;
        }
        attachment.burstCount++;
        attachment.hourBytes += cipherBytes;
        ws.serializeAttachment(attachment);

        const recordBytes = ivBytes + cipherBytes;
        try {
            const result = await this.serializeWrite(async () => {
                const existing = await this.env.DB.prepare(
                    "SELECT id, created_at, iv, ciphertext, client_id FROM messages WHERE client_id = ? LIMIT 1"
                ).bind(clientId).first<StoredMessage>();
                if (existing) return { kind: "duplicate" as const, item: existing };

                const meta = await this.env.DB.prepare(
                    "SELECT value FROM app_meta WHERE key = 'total_cipher_bytes' LIMIT 1"
                ).first<{ value: string }>();
                const totalBytes = Math.max(0, Number(meta?.value || "0") || 0);
                if (totalBytes + recordBytes > MAX_STORAGE_BYTES) {
                    return { kind: "full" as const };
                }

                const insert = this.env.DB.prepare(
                    "INSERT INTO messages (created_at, iv, ciphertext, client_id) VALUES (?, ?, ?, ?)"
                ).bind(now, iv, ciphertext, clientId);
                const updateTotal = this.env.DB.prepare(
                    "INSERT INTO app_meta (key, value) VALUES ('total_cipher_bytes', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
                ).bind(String(totalBytes + recordBytes));
                const results = await this.env.DB.batch([insert, updateTotal]);
                const id = Number(results[0]?.meta?.last_row_id || 0);
                if (!id) throw new Error("message_insert_failed");
                return {
                    kind: "inserted" as const,
                    item: { id, created_at: now, iv, ciphertext, client_id: clientId } satisfies StoredMessage,
                };
            });

            if (result.kind === "full") {
                await this.sendSecure(ws, session, { type: "error", reason: "storage_limit" });
                return;
            }
            if (result.kind === "duplicate") {
                await this.sendSecure(ws, session, { type: "ack", id: result.item.id, client_id: clientId });
                return;
            }
            await this.broadcastSecure({ type: "message", item: result.item });
            await this.sendSecure(ws, session, { type: "ack", id: result.item.id, client_id: clientId });
        } catch {
            await this.sendSecure(ws, session, { type: "error", reason: "storage_error" });
        }
    }

    async webSocketClose(): Promise<void> {
        await this.broadcastState();
    }

    async webSocketError(): Promise<void> {
        await this.broadcastState();
    }


    private serializeWrite<T>(operation: () => Promise<T>): Promise<T> {
        const run = this.writeTail.then(operation, operation);
        this.writeTail = run.then(() => undefined, () => undefined);
        return run;
    }

    private async handleSecureExpression(request: Request, data: Record<string, unknown>): Promise<Response> {
        const authorized = await this.authorizeSecure(request, data);
        if (!authorized) return notFound();
        const { session, operation, payload, requestId } = authorized;

        try {
            if (operation === "close") {
                await this.closeSession(session.sid);
                return this.secureJson(session, requestId, { ok: true }, {
                    "Set-Cookie": clearCookieHeader(request),
                });
            }

            if (sessionKind(session) === "owner") {
                if (operation === "owner_status") {
                    return this.secureJson(session, requestId, await this.ownerStatus());
                }
                if (operation === "owner_export") {
                    const ticket = randomToken(32);
                    session.exportTicket = { value: ticket, until: nowSeconds() + EXPORT_TICKET_SECONDS };
                    await this.ctx.storage.put(`session:${session.sid}`, session);
                    const module = encodeURIComponent(session.module);
                    const url = `/notation?part=data&n=${module}&t=${encodeURIComponent(ticket)}`;
                    return this.secureJson(session, requestId, { ok: true, url });
                }
                if (operation === "owner_clear") {
                    return this.secureJson(session, requestId, await this.ownerClear(false));
                }
                if (operation === "owner_reset") {
                    return this.secureJson(session, requestId, await this.ownerClear(true));
                }
                return notFound();
            }

            if (operation === "inspect") {
                return this.secureJson(session, requestId, { ok: true, state: await this.getState(session.sid) });
            }
            if (operation === "bind") {
                const role = payload.value === "wave" || payload.value === "snow" ? payload.value : null;
                const after = Math.max(0, Number(payload.after || 0) || 0);
                if (!role) return notFound();
                return this.secureJson(session, requestId, await this.bindRole(session, role, after));
            }
            return notFound();
        } catch {
            return this.secureJson(session, requestId, { ok: false, reason: "request_failed" });
        }
    }

    private async authorizeSecure(
        request: Request,
        envelope: Record<string, unknown>,
    ): Promise<{
        session: SessionRecord;
        operation: string;
        payload: Record<string, unknown>;
        requestId: string;
    } | null> {
        const sid = sessionIdFromRequest(request);
        const session = await this.getSession(sid, false);
        if (!session) return null;
        const data = await this.decryptTransport(session, envelope, CONTROL_AAD);
        if (!data) return null;
        const token = typeof data.token === "string" ? data.token : "";
        const operation = typeof data.op === "string" ? data.op : "";
        const requestId = typeof data.request_id === "string" ? data.request_id : "";
        const payload = data.payload && typeof data.payload === "object" && !Array.isArray(data.payload)
            ? data.payload as Record<string, unknown>
            : {};
        if (!token || token !== session.csrf || !operation || !/^[a-f0-9]{32}$/i.test(requestId)) return null;
        const claimedSession = await this.claimControlRequest(session, requestId);
        if (!claimedSession) return null;
        return { session: claimedSession, operation, payload, requestId };
    }

    private async claimControlRequest(session: SessionRecord, requestId: string): Promise<SessionRecord | null> {
        const sessionKey = `session:${session.sid}`;
        const replayKey = `control-request:${session.sid}:${requestId.toLowerCase()}`;
        const now = nowSeconds();
        return this.ctx.storage.transaction(async transaction => {
            const current = await transaction.get<SessionRecord>(sessionKey);
            if (
                !current
                || current.protocol !== 4
                || (current.kind !== "chat" && current.kind !== "owner")
                || current.absoluteExpires <= now
                || now - current.lastActivity > sessionIdleSeconds(current)
                || current.csrf !== session.csrf
                || current.transportKey !== session.transportKey
            ) return null;
            if (await transaction.get<number>(replayKey) !== undefined) return null;
            await transaction.put(replayKey, current.absoluteExpires);
            current.lastActivity = now;
            await transaction.put(sessionKey, current);
            return current;
        });
    }

    private async importTransportKey(session: SessionRecord): Promise<CryptoKey | null> {
        const keyBytes = fromBase64(session.transportKey || "");
        if (!keyBytes || keyBytes.length !== 32) return null;
        return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    }

    private async encryptTransport(
        session: SessionRecord,
        payload: unknown,
        aad: string,
    ): Promise<{ v: number; iv: string; ciphertext: string }> {
        const key = await this.importTransportKey(session);
        if (!key) throw new Error("transport_key_unavailable");
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const plaintext = encoder.encode(JSON.stringify(payload));
        const ciphertext = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv, additionalData: encoder.encode(aad), tagLength: 128 },
            key,
            plaintext,
        );
        return { v: 2, iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
    }

    private async decryptTransport(
        session: SessionRecord,
        envelope: Record<string, unknown>,
        aad: string,
    ): Promise<Record<string, unknown> | null> {
        try {
            if (envelope.v !== 2) return null;
            const iv = typeof envelope.iv === "string" ? fromBase64(envelope.iv) : null;
            const ciphertext = typeof envelope.ciphertext === "string" ? fromBase64(envelope.ciphertext) : null;
            if (!iv || iv.length !== 12 || !ciphertext || ciphertext.length < 17) return null;
            const key = await this.importTransportKey(session);
            if (!key) return null;
            const plaintext = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv, additionalData: encoder.encode(aad), tagLength: 128 },
                key,
                ciphertext,
            );
            const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext));
            return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                ? parsed as Record<string, unknown>
                : null;
        } catch {
            return null;
        }
    }

    private async secureJson(
        session: SessionRecord,
        requestId: string,
        payload: Record<string, unknown>,
        headers: HeadersInit = {},
    ): Promise<Response> {
        const envelope = await this.encryptTransport(session, { request_id: requestId, ...payload }, CONTROL_AAD);
        return json(envelope, 200, headers);
    }

    private async getSession(sid: string, touch: boolean): Promise<SessionRecord | null> {
        if (!sid) return null;
        const key = `session:${sid}`;
        const session = await this.ctx.storage.get<SessionRecord>(key);
        if (!session) return null;
        if (session.protocol !== 4 || (session.kind !== "chat" && session.kind !== "owner")) {
            await this.deleteSessionRecord(sid);
            return null;
        }
        const now = nowSeconds();
        if (session.absoluteExpires <= now || now - session.lastActivity > sessionIdleSeconds(session)) {
            await this.deleteSessionRecord(sid);
            return null;
        }
        if (touch) {
            session.lastActivity = now;
            await this.ctx.storage.put(key, session);
        }
        return session;
    }

    private async bindRole(session: SessionRecord, role: Role, after: number): Promise<Record<string, unknown>> {
        if (sessionKind(session) !== "chat") return { ok: false, reason: "invalid" };
        const now = nowSeconds();
        await this.pruneIdleSockets(now);
        const reservations = await this.cleanReservations(now);
        const occupiedSids = new Set<string>();
        for (const ws of this.ctx.getWebSockets()) {
            const attachment = ws.deserializeAttachment() as SocketAttachment | null;
            if (!attachment) continue;
            if (attachment.sid === session.sid) {
                try { ws.close(1000, ""); } catch { /* no-op */ }
            } else {
                occupiedSids.add(attachment.sid);
            }
        }
        for (const reservedSid of Object.keys(reservations)) {
            if (reservedSid !== session.sid) occupiedSids.add(reservedSid);
        }
        if (occupiedSids.size >= MAX_CLIENTS) {
            return { ok: false, reason: "full", state: await this.getState(session.sid) };
        }
        reservations[session.sid] = { role, until: now + RESERVATION_SECONDS };
        await this.ctx.storage.put("reservations", reservations);
        session.pendingRole = role;
        const ticket = randomToken(32);
        session.socketTicket = {
            value: ticket,
            role,
            after: Number.isSafeInteger(after) ? Math.max(0, after) : 0,
            until: now + RESERVATION_SECONDS,
        };
        session.lastActivity = now;
        await this.ctx.storage.put(`session:${session.sid}`, session);
        return { ok: true, state: await this.getState(session.sid), ticket };
    }

    private async getState(forSid = ""): Promise<Record<string, unknown>> {
        const now = nowSeconds();
        await this.pruneIdleSockets(now);
        const reservations = await this.cleanReservations(now);
        const occupants = new Map<string, Role>();
        for (const ws of this.ctx.getWebSockets()) {
            const attachment = ws.deserializeAttachment() as SocketAttachment | null;
            if (attachment) occupants.set(attachment.sid, attachment.role);
        }
        // A reservation represents an in-progress role bind/reconnect and takes
        // precedence over a same-session socket that is still closing.
        for (const [sid, reservation] of Object.entries(reservations)) {
            occupants.set(sid, reservation.role);
        }
        const counts: Record<Role, number> = { wave: 0, snow: 0 };
        for (const occupantRole of occupants.values()) counts[occupantRole]++;
        const role = forSid ? occupants.get(forSid) || null : null;
        const total = occupants.size;
        return { counts, max_clients: MAX_CLIENTS, full: total >= MAX_CLIENTS, role };
    }

    private async cleanReservations(now = nowSeconds()): Promise<Reservations> {
        const reservations = (await this.ctx.storage.get<Reservations>("reservations")) || {};
        let changed = false;
        for (const [sid, reservation] of Object.entries(reservations)) {
            if (!reservation || reservation.until < now) {
                delete reservations[sid];
                changed = true;
            }
        }
        if (changed) await this.ctx.storage.put("reservations", reservations);
        return reservations;
    }

    private async pruneIdleSockets(now = nowSeconds()): Promise<void> {
        for (const ws of this.ctx.getWebSockets()) {
            const attachment = ws.deserializeAttachment() as SocketAttachment | null;
            if (!attachment || now - attachment.lastActivity > SESSION_IDLE_SECONDS) {
                if (attachment) await this.deleteSessionRecord(attachment.sid);
                try { ws.close(1000, ""); } catch { /* no-op */ }
            }
        }
    }

    private async closeSession(sid: string): Promise<void> {
        for (const ws of this.ctx.getWebSockets()) {
            const attachment = ws.deserializeAttachment() as SocketAttachment | null;
            if (attachment?.sid === sid) {
                try { ws.close(1000, ""); } catch { /* no-op */ }
            }
        }
        const reservations = await this.cleanReservations();
        if (reservations[sid]) {
            delete reservations[sid];
            await this.ctx.storage.put("reservations", reservations);
        }
        await this.deleteSessionRecord(sid);
        await this.broadcastState();
    }

    private async deleteSessionRecord(sid: string): Promise<void> {
        await this.ctx.storage.delete(`session:${sid}`);
        const prefix = `control-request:${sid}:`;
        while (true) {
            const records = await this.ctx.storage.list({ prefix, limit: 128 });
            const keys = Array.from(records.keys());
            if (!keys.length) return;
            await this.ctx.storage.delete(keys);
        }
    }

    private async sendHistory(ws: WebSocket, session: SessionRecord, after: number): Promise<void> {
        const cutoff = nowSeconds() - RECORD_TTL_SECONDS;
        let rows: StoredMessage[];
        if (after > 0) {
            const result = await this.env.DB.prepare(
                "SELECT id, created_at, iv, ciphertext, client_id FROM messages WHERE created_at >= ? AND id > ? ORDER BY id ASC LIMIT ?"
            ).bind(cutoff, after, HISTORY_LIMIT).all<StoredMessage>();
            rows = result.results || [];
        } else {
            const result = await this.env.DB.prepare(
                "SELECT id, created_at, iv, ciphertext, client_id FROM (SELECT id, created_at, iv, ciphertext, client_id FROM messages WHERE created_at >= ? ORDER BY id DESC LIMIT ?) ORDER BY id ASC"
            ).bind(cutoff, HISTORY_LIMIT).all<StoredMessage>();
            rows = result.results || [];
        }
        for (let index = 0; index < rows.length; index += HISTORY_CHUNK) {
            await this.sendSecure(ws, session, { type: "history", items: rows.slice(index, index + HISTORY_CHUNK) });
        }
        await this.sendSecure(ws, session, { type: "history_done", count: rows.length, truncated: rows.length >= HISTORY_LIMIT });
    }

    private async broadcastSecure(payload: unknown): Promise<void> {
        for (const ws of this.ctx.getWebSockets()) {
            const attachment = ws.deserializeAttachment() as SocketAttachment | null;
            if (!attachment) continue;
            const session = await this.getSession(attachment.sid, false);
            if (session) await this.sendSecure(ws, session, payload);
        }
    }

    private async broadcastState(): Promise<void> {
        await this.broadcastSecure({ type: "state", state: await this.getState() });
    }

    private async sendSecure(ws: WebSocket, session: SessionRecord, payload: unknown): Promise<void> {
        try {
            ws.send(JSON.stringify(await this.encryptTransport(session, payload, SOCKET_AAD)));
        } catch {
            // A stale socket or invalid session key is handled by normal reconnect logic.
        }
    }

    private async ownerStatus(): Promise<Record<string, unknown>> {
        const [messageCount, metaRows] = await Promise.all([
            this.env.DB.prepare(
                "SELECT COUNT(*) AS count, COALESCE(MAX(id), 0) AS max_id FROM messages"
            ).first<{ count: number; max_id: number }>(),
            this.env.DB.prepare(
                "SELECT key, value FROM app_meta WHERE key IN ('message_salt_v4', 'total_cipher_bytes')"
            ).all<{ key: string; value: string }>(),
        ]);
        const meta = Object.fromEntries((metaRows.results || []).map(row => [row.key, row.value]));
        return {
            ok: true,
            messages: Number(messageCount?.count || 0),
            latest_id: Number(messageCount?.max_id || 0),
            encrypted_bytes: Number(meta.total_cipher_bytes || 0),
            message_salt_initialized: Boolean(meta.message_salt_v4),
        };
    }

    private async ownerExport(session: SessionRecord): Promise<Response> {
        const messageSalt = await this.getOrCreateMessageSalt();
        const snapshot = await this.env.DB.prepare(
            "SELECT COUNT(*) AS count, COALESCE(MAX(id), 0) AS max_id FROM messages"
        ).first<{ count: number; max_id: number }>();
        const maxId = Math.max(0, Number(snapshot?.max_id || 0));
        const messageCount = Math.max(0, Number(snapshot?.count || 0));
        const exportedAt = nowSeconds();
        let lastId = 0;
        let started = false;
        let finished = false;
        const stream = new ReadableStream<Uint8Array>({
            pull: async controller => {
                if (finished) {
                    controller.close();
                    return;
                }
                let chunk = "";
                if (!started) {
                    started = true;
                    chunk += JSON.stringify({
                        type: "formula-chat-backup-v2",
                        version: 2,
                        exported_at: exportedAt,
                        latest_id: maxId,
                        message_count: messageCount,
                        message_salt: messageSalt,
                        kdf: { name: "PBKDF2", hash: "SHA-256", iterations: 250000, length: 256 },
                        cipher: { name: "AES-GCM", tag_length: 128, iv_length: 96, aad: "formula-message-v4" },
                    }) + "\n";
                }
                if (lastId < maxId) {
                    const result = await this.env.DB.prepare(
                        "SELECT id, created_at, iv, ciphertext, client_id FROM messages WHERE id > ? AND id <= ? ORDER BY id ASC LIMIT 500"
                    ).bind(lastId, maxId).all<StoredMessage>();
                    const rows = result.results || [];
                    for (const row of rows) {
                        lastId = Math.max(lastId, Number(row.id) || 0);
                        chunk += JSON.stringify({
                            id: row.id,
                            ts: row.created_at,
                            iv: row.iv,
                            ciphertext: row.ciphertext,
                            client_id: row.client_id,
                        }) + "\n";
                    }
                    if (!rows.length || rows.length < 500 || lastId >= maxId) finished = true;
                } else {
                    finished = true;
                }
                if (chunk) {
                    const envelope = await this.encryptTransport(session, { content: chunk }, "formula-export-v4");
                    controller.enqueue(encoder.encode(JSON.stringify(envelope) + "\n"));
                }
                if (finished) controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename="data-${new Date().toISOString().slice(0, 10)}.bin"`,
                "Cache-Control": "no-store, private",
                "X-Content-Type-Options": "nosniff",
                "X-Robots-Tag": "noindex, nofollow, noarchive",
            },
        });
    }

    private async ownerClear(resetSalt: boolean): Promise<Record<string, unknown>> {
        if (this.maintenance) return { ok: false, reason: "busy" };
        this.maintenance = true;
        try {
            const result = await this.serializeWrite(async () => {
                const countRow = await this.env.DB.prepare(
                    "SELECT COUNT(*) AS count FROM messages"
                ).first<{ count: number }>();
                const deleted = Math.max(0, Number(countRow?.count || 0));
                const statements = [
                    this.env.DB.prepare("DELETE FROM messages"),
                    this.env.DB.prepare(
                        "INSERT INTO app_meta (key, value) VALUES ('total_cipher_bytes', '0') ON CONFLICT(key) DO UPDATE SET value = '0'"
                    ),
                ];
                if (resetSalt) {
                    const salt = toBase64(crypto.getRandomValues(new Uint8Array(32)));
                    statements.push(this.env.DB.prepare(
                        "INSERT INTO app_meta (key, value) VALUES ('message_salt_v4', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
                    ).bind(salt));
                }
                await this.env.DB.batch(statements);
                await this.invalidateChatSessions();
                return { deleted };
            });
            return { ok: true, deleted: result.deleted, reset: resetSalt };
        } finally {
            this.maintenance = false;
        }
    }

    private async invalidateChatSessions(): Promise<void> {
        for (const ws of this.ctx.getWebSockets()) {
            try { ws.close(1000, ""); } catch { /* no-op */ }
        }
        const sessions = await this.ctx.storage.list<SessionRecord>({ prefix: "session:" });
        const sids: string[] = [];
        for (const [key, session] of sessions) {
            if (session.protocol !== 4 || session.kind === "chat") sids.push(key.slice("session:".length));
        }
        for (const sid of sids) await this.deleteSessionRecord(sid);
        await this.ctx.storage.delete("reservations");
        await this.broadcastState();
    }

    private async getOrCreateMessageSalt(): Promise<string> {
        const existing = await this.env.DB.prepare(
            "SELECT value FROM app_meta WHERE key = 'message_salt_v4' LIMIT 1"
        ).first<{ value: string }>();
        if (existing?.value) return existing.value;
        const salt = toBase64(crypto.getRandomValues(new Uint8Array(32)));
        await this.env.DB.prepare(
            "INSERT INTO app_meta (key, value) VALUES ('message_salt_v4', ?) ON CONFLICT(key) DO NOTHING"
        ).bind(salt).run();
        const stored = await this.env.DB.prepare(
            "SELECT value FROM app_meta WHERE key = 'message_salt_v4' LIMIT 1"
        ).first<{ value: string }>();
        if (!stored?.value) throw new Error("message_salt_unavailable");
        return stored.value;
    }

    private async clientAttemptKey(request: Request): Promise<string> {
        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const secret = this.env.RATE_LIMIT_SALT || `${this.env.UNLOCK_SECRET}\u0000${this.env.OWNER_SECRET || ""}`;
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
        );
        const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(ip)));
        return Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
    }

    private async attemptAllowed(key: string): Promise<boolean> {
        const now = nowSeconds();
        const attempt = await this.ctx.storage.get<AttemptRecord>(`attempt:${key}`);
        return !attempt || attempt.blockedUntil <= now;
    }

    private async recordFailedAttempt(key: string): Promise<void> {
        const now = nowSeconds();
        const storageKey = `attempt:${key}`;
        let attempt = await this.ctx.storage.get<AttemptRecord>(storageKey);
        if (!attempt || now - attempt.windowStart >= ATTEMPT_WINDOW) {
            attempt = { windowStart: now, count: 0, blockedUntil: 0 };
        }
        attempt.count++;
        if (attempt.count >= ATTEMPT_LIMIT) attempt.blockedUntil = now + ATTEMPT_BLOCK;
        await this.ctx.storage.put(storageKey, attempt);
    }
}

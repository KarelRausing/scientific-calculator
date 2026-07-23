import { ChatRoom, type Env } from "./chat-room";
import { handleDictionaryAudioRequest, handleDictionaryRequest } from "./public-tools";
import { ensureDatabaseSchema } from "./schema";

export { ChatRoom };

const CRAWLER_BLOCK = "noindex, nofollow, noarchive, nosnippet, noimageindex";

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

function withCrawlerBlock(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set("X-Robots-Tag", CRAWLER_BLOCK);
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

function sameOrigin(request: Request): boolean {
    const origin = request.headers.get("Origin");
    return !origin || origin === new URL(request.url).origin;
}

function validVisitRequest(request: Request): boolean {
    const contentType = (request.headers.get("Content-Type") || "").toLowerCase();
    return request.method === "POST"
        && contentType.startsWith("application/json")
        && request.headers.get("X-Requested-With") === "XMLHttpRequest"
        && sameOrigin(request);
}

function visitJson(payload: { ok: boolean; count?: string }, status = 200): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Robots-Tag": CRAWLER_BLOCK,
        },
    });
}

async function handleVisitRequest(request: Request, env: Env): Promise<Response> {
    if (!validVisitRequest(request)) return notFound();

    try {
        await ensureDatabaseSchema(env.DB);
        const row = await env.DB.prepare(`
            INSERT INTO app_meta (key, value)
            VALUES ('public_page_views', '1')
            ON CONFLICT(key) DO UPDATE SET
                value = CAST(CAST(app_meta.value AS INTEGER) + 1 AS TEXT)
            RETURNING value
        `).first<{ value: string | number }>();
        const count = String(row?.value ?? "");
        if (!/^\d{1,19}$/.test(count)) throw new Error("invalid_visit_count");
        return visitJson({ ok: true, count });
    } catch {
        return visitJson({ ok: false }, 503);
    }
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === "/api/dictionary") {
            return handleDictionaryRequest(request);
        }
        if (url.pathname === "/api/dictionary-audio") {
            return handleDictionaryAudioRequest(request);
        }
        if (url.pathname === "/api/visit") {
            return handleVisitRequest(request, env);
        }

        if (["/expression", "/notation", "/socket"].includes(url.pathname)) {
            if (!env.UNLOCK_SECRET) return notFound();
            const stub = env.CHAT_ROOM.getByName("primary");
            return stub.fetch(request);
        }

        return withCrawlerBlock(await env.ASSETS.fetch(request));
    },
};

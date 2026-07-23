let schemaPromise: Promise<void> | null = null;

/**
 * Creates the D1 tables on the first dynamic request that needs storage.
 * CREATE IF NOT EXISTS keeps this safe across Worker isolates and retries.
 */
export async function ensureDatabaseSchema(db: D1Database): Promise<void> {
    if (!schemaPromise) {
        schemaPromise = db.batch([
            db.prepare(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at INTEGER NOT NULL,
                    iv TEXT NOT NULL,
                    ciphertext TEXT NOT NULL,
                    client_id TEXT NOT NULL UNIQUE
                )
            `),
            db.prepare(`
                CREATE INDEX IF NOT EXISTS idx_messages_created_id
                ON messages(created_at, id)
            `),
            db.prepare(`
                CREATE TABLE IF NOT EXISTS app_meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            `),
            db.prepare(`
                INSERT INTO app_meta (key, value)
                VALUES ('total_cipher_bytes', '0')
                ON CONFLICT(key) DO NOTHING
            `),
            db.prepare(`
                INSERT INTO app_meta (key, value)
                VALUES ('public_page_views', '0')
                ON CONFLICT(key) DO NOTHING
            `),
        ]).then(() => undefined).catch((error: unknown) => {
            schemaPromise = null;
            throw error;
        });
    }
    return schemaPromise;
}

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    iv TEXT NOT NULL,
    ciphertext TEXT NOT NULL,
    client_id TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_messages_created_id
ON messages(created_at, id);

CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO app_meta (key, value)
VALUES ('total_cipher_bytes', '0')
ON CONFLICT(key) DO NOTHING;

INSERT INTO app_meta (key, value)
VALUES ('public_page_views', '0')
ON CONFLICT(key) DO NOTHING;

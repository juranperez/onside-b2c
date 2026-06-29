// Stub for the `server-only` package under vitest. That package throws on import
// outside a React Server Component runtime, which would otherwise break unit tests
// that transitively import server modules (e.g. the resolver via rumour-ingest).
// Importing it must be a harmless no-op here.
export {};

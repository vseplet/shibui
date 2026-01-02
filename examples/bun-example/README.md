# Shibui + Bun Example

This example demonstrates running Shibui in Bun runtime.

## Setup

```bash
# Install dependencies from JSR
bunx jsr add @vseplet/shibui
```

## Run

```bash
bun run main.ts
```

## Expected Output

```
Runtime: { runtime: 'bun', version: '1.x.x', isDeno: false, isBun: true, isNode: false }

--- Running task ---

[INF] Current value: 42
[INF] Incremented to: 43

--- Result ---
Success: true
```

## Notes

- Shibui automatically uses `MemoryProvider` in Bun (since Deno KV is not
  available)
- For persistent storage in Bun, implement a custom `StorageProvider` (e.g.,
  Redis, SQLite)

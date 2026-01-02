# Shibui + Node.js Example

This example demonstrates running Shibui in Node.js runtime with native
TypeScript support (v22.6+).

## Requirements

- Node.js v22.6+ (native TypeScript support)
- Node.js v23.6+ recommended (stable TypeScript support)

## Setup

```bash
# Install dependencies from JSR
npx jsr add @vseplet/shibui
```

## Run

```bash
node main.ts
```

## Expected Output

```
Runtime: { runtime: 'node', version: '22.x.x', isDeno: false, isBun: false, isNode: true }

--- Running task ---

[INF] Current value: 42
[INF] Incremented to: 43

--- Result ---
Success: true
```

## Notes

- Shibui automatically uses `MemoryProvider` in Node.js (since Deno KV is not
  available)
- For persistent storage in Node.js, implement a custom `StorageProvider` (e.g.,
  Redis, PostgreSQL)

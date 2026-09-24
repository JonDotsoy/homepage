# @jondotsoy/configs

v1.1.4 · MIT

Reactive, typed configuration for your apps, backed by pluggable sources: feature flags, remote toggles, and settings served over HTTP or SSE that change at runtime. Every field is a live `Store` — subscribe to it and react the moment a source pushes a new value.

- npm: https://www.npmjs.com/package/@jondotsoy/configs
- GitHub: https://github.com/JonDotsoy/configs

## Install

```bash
npm install @jondotsoy/configs
```

## Why

- **Reactive configs** — every field is a live Store; subscribe to it and get notified whenever an upstream source changes.
- **Lightweight** — no dependencies, just a thin layer over plain objects and stores.
- **Typed with TS check** — schemas are statically checked, so `cfg.port.get()` is inferred as `number | null` (or `number` with a `default`), not `any`.

## Examples

### configs.ts

```ts
import { create } from "@jondotsoy/configs";
import { envSource, mapKey } from "@jondotsoy/configs/sources/env";
import { fileSource } from "@jondotsoy/configs/sources/file";

export default await create(
  {
    server: create(
      {
        port: { type: "number", summary: "HTTP port", default: 3000 },
        host: { type: "string", summary: "bind host", default: "localhost" },
      },
      { sources: [ envSource({ mapKey: mapKey.camelCase() }) ] }
    ),
    features: create({
      promoService: {
        type: "boolean",
        summary: "enable the promo service",
        default: false,
      },
    }),
  },
  { sources: [fileSource("./configs.json")] },
);
```

### .env

```ini
PORT=3000
HOST=localhost
```

### configs.json

```json
{
  "features": {
    "promoService": false
  }
}
```

Or with `fetchSource` polling a remote resource every minute:

### App.tsx

```tsx
import { create } from "@jondotsoy/configs";
import { fetchSource } from "@jondotsoy/configs/sources/fetch";
import { useConfig } from "@jondotsoy/configs/react";
import { Temporal } from "temporal-polyfill";

const cfg = await create(
  {
    features: create({
      promoService: { type: "boolean", summary: "enable the promo service", default: false },
    }),
  },
  {
    sources: [
      fetchSource({
        url: "http://my-resource/features.json",
        pollingInterval: Temporal.Duration.from({ minutes: 1 }).total("milliseconds"),
      }),
    ],
  },
);

export default function App() {
  const promoService = useConfig(cfg.features.promoService);

  return <p>Promo service is {promoService ? "on" : "off"}</p>;
}
```

### http://my-resource/features.json

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "features": {
    "promoService": true
  }
}
```

Or verifying Google-issued JWTs by keeping Google's rotating public keys (JWKS) always fresh:

### auth.ts

```ts
import { create } from "@jondotsoy/configs";
import { fetchSource } from "@jondotsoy/configs/sources/fetch";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import { Temporal } from "temporal-polyfill";

const cfg = await create(
  {
    keys: { type: "array", required: true },
  },
  {
    sources: [
      fetchSource({
        url: "https://www.googleapis.com/oauth2/v3/certs",
        // Google's response only has "keys" — keep just that subtree.
        treePath: ["keys"],
        // Google rotates these keys every few hours — polling keeps them fresh.
        pollingInterval: Temporal.Duration.from({ hours: 1 }).total("milliseconds"),
      }),
    ],
  },
);

export async function verifyGoogleIdToken(idToken: string) {
  const { kid, alg } = decodeProtectedHeader(idToken);
  const jwk = cfg.keys.get()!.find((key) => key.kid === kid);
  const key = await importJWK(jwk, alg);

  const { payload } = await jwtVerify(idToken, key, {
    issuer: "https://accounts.google.com",
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  return payload;
}
```

### www.googleapis.com/oauth2/v3/certs

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=UTF-8
Cache-Control: public, max-age=21600, must-revalidate, no-transform

{
  "keys": [
    {
      "kty": "RSA",
      "e": "AQAB",
      "use": "sig",
      "kid": "f0f9f4a3c2b1d0e5a6b7c8d9e0f1a2b3c4d5e6f7",
      "alg": "RS256",
      "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXOshU..."
    },
    {
      "kty": "RSA",
      "e": "AQAB",
      "use": "sig",
      "kid": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
      "alg": "RS256",
      "n": "yGkzX3vRJvQvR5xz4C1QYr8bK2dLxN6mFwZtJq..."
    }
  ]
}
```

## Sources

Every config tree is built from pluggable `Source`s. You can also build your own with `Source` directly.

### envSource

`@jondotsoy/configs/sources/env`

Reads environment variables — process.env or another object passed as env — into the config tree, one field per key (mapped by mapKey).

- **env** — the env vars to read. Defaults to process.env.
- **prefix** — only keys starting with prefix are included; the prefix is stripped before mapKey runs.
- **suffix** — only keys ending with suffix are included; the suffix is stripped before mapKey runs.
- **mapKey.snakeCase(options?)** — splits a `SCREAMING_SNAKE_CASE` key into a lowercase nested path on separator (default `"_"`): `"FOO_TAR" => ["foo", "tar"]`. A different separator (e.g. `"__"`) keeps a single underscore inside a segment from splitting it.
- **mapKey.identity()** — passes each key through unchanged, as a single-segment path: `"FOO_TAR" => ["FOO_TAR"]`. Same as omitting mapKey.
- **mapKey.camelCase()** — maps a key to a single camelCase segment: `"FOO_TAR" => ["fooTar"]`.
- **mapKey.lookup(table, fallback?)** — maps specific keys to explicit paths via a `Record<string, string[]>` lookup table; a key not in the table falls back to fallback (default: the identity).

You can also pass your own EnvKeyMapper instead of a built-in strategy — it's just a `(key: string) => string[]` function.

```ts
import { envSource, mapKey } from "@jondotsoy/configs/sources/env";

// SERVER_PORT=3000 SERVER_HOST=localhost → { server: { port: "3000", host: "localhost" } }
const source = envSource({ mapKey: mapKey.snakeCase() });

// PORT=3000 HOST=localhost → { server: { port: "3000" }, HOST: "localhost" }
const source2 = envSource({ mapKey: mapKey.lookup({ PORT: ["server", "port"] }) });
```

### fetchSource

`@jondotsoy/configs/sources/fetch`

Fetches a snapshot from url. The response body is turned into T by bodyParser (defaulting to `(res) => res.json()`), so non-JSON responses are supported by passing a custom parser.

- **method** — the HTTP method to use for the request.
- **headers** — headers to send with the request.
- **body** — request body, passed through to fetch as-is (e.g. a JSON string, FormData, Blob).
- **signal** — aborts the in-flight fetch (and stops retrying it) when the signal fires. Only covers a single round — with pollingInterval set, later rounds still run; close the Source itself to stop polling entirely.
- **mode / cache / redirect** — passed through to fetch as-is. See `RequestInit["mode"]`, `RequestInit["cache"]` and `RequestInit["redirect"]`.
- **credentials** — sets the Authorization header: `{ basic: { username, password } }` sends `Basic <base64>`; `{ bearer: { token } }` sends `Bearer <token>`.
- **bodyParser** — turns the fetched Response into T. Defaults to `(res) => res.json()`.
- **acceptStatus** — decides whether a response's status code counts as accepted. Defaults to 2xx: `(statusCode) => statusCode >= 200 && statusCode < 300`.
- **attempts** — retries the download on a network error or a non-ok response (default 1, no retry).
- **pollingInterval** — off by default (false): fetchSource fetches url once and closes. Pass a number of milliseconds to turn polling on — it keeps re-fetching on that interval (each round still retried up to attempts times) until the Source is closed.
- **treePath** — selects a subtree of the fetched body to use as the config tree instead of the whole thing, e.g. `["containers", "settings"]`. Defaults to `[]`, the whole body unchanged.
- **reduce** — combines each successful fetch with the previously published value instead of replacing it outright. Useful with pollingInterval when a later round's response is a partial update. Receives the freshly fetched (and treePath-selected) body as incoming and the last published value as previous (null before the first round). Defaults to publishing incoming as-is — a full replace.

If the download never succeeds (a network error, or a status rejected by acceptStatus after exhausting attempts), or bodyParser throws, fetchSource logs a console.error and leaves the store empty instead of throwing. A failed round after the first one is logged and skipped, without closing the source or stopping the polling.

```ts
import { fetchSource } from "@jondotsoy/configs/sources/fetch";
import { Temporal } from "temporal-polyfill";

const source = fetchSource<{ port: number }>({
  url: "https://config-service.internal/app",
  method: "GET",
  headers: { authorization: `Bearer ${process.env.CONFIG_TOKEN}` },
  attempts: 3,
  // Off by default — pass milliseconds to poll instead of a single fetch.
  pollingInterval: Temporal.Duration.from({ seconds: 30 }).total("milliseconds"),
});
```

### sseSource

`@jondotsoy/configs/sources/sse`

Connects to an SSE endpoint. Every message tries to parse as JSON and, if it's a plain object, is applied as a patch on top of what was already received — fields add up and overwrite, the tree is never replaced wholesale.

- **method** — the HTTP method used to open the connection.
- **headers** — headers to send when opening the SSE connection.
- **body** — request body, passed through to fetch as-is (e.g. a JSON string, FormData, Blob).
- **signal** — aborts the connection (and stops retrying it) when the signal fires. Independent of the Source's own close(), which also aborts the connection.
- **mode / cache / redirect** — passed through to fetch as-is. See `RequestInit["mode"]`, `RequestInit["cache"]` and `RequestInit["redirect"]`.
- **credentials** — sets the Authorization header: `{ basic: { username, password } }` sends `Basic <base64>`; `{ bearer: { token } }` sends `Bearer <token>`.
- **attempts** — attempts to establish the connection before giving up. Defaults to 1 (no retry).
- **acceptStatus** — decides whether a response's status code counts as accepted. Defaults to 2xx: `(statusCode) => statusCode >= 200 && statusCode < 300`.
- **reduce** — combines each parsed message with the config tree accumulated so far, overriding the default shallow patch-merge (new fields added, existing ones overwritten, everything else kept). Receives the parsed message as incoming and the previously published tree as previous (null before the first message). A custom reduce replaces that behavior entirely, so it must do its own merging if that's still wanted.

A message that isn't valid JSON, or doesn't parse to a plain object, is logged via console.error and skipped — it never resets what was already received. Opening the source waits for the first message (so the Store you get back already has data, not null), then keeps the connection alive in the background, applying further messages as patches until the resource closes the stream. Beyond url/method/headers, it accepts the same request-shaping options as fetchSource; attempts only retries the initial connection — once the stream is open, a dropped connection closes the source rather than reconnecting.

```ts
import { sseSource } from "@jondotsoy/configs/sources/sse";

const source = sseSource<{ port?: number; host?: string }>({
  url: "https://config-service.internal/app/events",
});

// message: {"port":3000}       => Store<{ port: 3000 }>
// message: {"host":"10.0.0.1"} => Store<{ port: 3000, host: "10.0.0.1" }>
```

### fileSource

`@jondotsoy/configs/sources/file`

Reads a config tree from path — a string or a file: URL —, parsed by its extension: .json or .env by default (matched by extension, or by the bare .env filename itself — a .env file always parses to a flat string map, one entry per KEY=VALUE line, blank lines and #-comments skipped), or any other format via a custom parser.

- **watch** — defaults to true: the file is re-read and the store updated live on every change; watch: false reads it once.
- **treePath** — selects a subtree of the parsed file to use as the config tree, e.g. `["containers", "settings"]` to use `{ containers: { settings: {...} } }`'s inner object and ignore the rest of the file. Defaults to `[]`, the whole parsed file unchanged.
- **format** — picks which built-in parser to use — "json" or "env" — overriding extension-based detection. Handy when path has no extension to detect. Ignored when parser is set.
- **parser** — overrides the default parsing entirely: receives the file's raw bytes and returns the parsed config tree. Use it for formats this module doesn't parse itself, like YAML with a library of your choice.
- **reduce** — combines each read with the previously published value instead of replacing it outright. Especially useful with watch (the default), when a later read should merge into what's already there rather than replace it wholesale. Receives the freshly read (and treePath-selected) tree as incoming and the last published value as previous (null before the first read). Defaults to publishing incoming as-is — a full replace.

A missing file, an unrecognized extension, or a parse failure (including on a later watched change) is logged via console.error and leaves the store empty instead of throwing — a parse error on a later change keeps the last good value instead. If treePath points at a missing or non-object segment, it's also logged via console.error, but it still publishes an empty snapshot (`{}`) instead of null, since the file itself was read and parsed fine.

```ts
import { fileSource } from "@jondotsoy/configs/sources/file";

const source = fileSource<{ port: number; host: string }>("./config.json");
// config.json: { "port": 3000, "host": "localhost" }
```

### pullSource

`@jondotsoy/configs/sources/pull`

Calls pull and publishes whatever it returns as the next snapshot — once immediately, then again every interval milliseconds until the Source is closed. pull can be sync or async, so it's a general-purpose escape hatch for any input that isn't already covered by a built-in source (a database query, a cloud secrets manager, a gRPC call, ...).

- **pull** — called on every round to produce a fresh snapshot. May be sync or async.
- **interval** — milliseconds between calls to pull.

A pull failure is logged via console.error and swallowed instead of thrown: on the first call this leaves the store empty (same as fetchSource); on a later call it's skipped, keeping the last good value and the polling running.

```ts
import { pullSource } from "@jondotsoy/configs/sources/pull";
import { Temporal } from "temporal-polyfill";

const source = pullSource<{ port: number }>({
  pull: async () => fetchPortFromSomewhere(),
  interval: Temporal.Duration.from({ seconds: 30 }).total("milliseconds"),
});
```

### literalSource

`@jondotsoy/configs/sources/literal`

Publishes a plain, already-in-hand value as a snapshot immediately, then closes. No I/O, no options — just wraps value in a Source so it can sit in a sources array alongside the rest.

Handy as a static fallback tree (put it last so real sources win), a hardcoded default for a single environment, or a stand-in source in a test.

```ts
import { create } from "@jondotsoy/configs";
import { envSource, mapKey } from "@jondotsoy/configs/sources/env";
import { literalSource } from "@jondotsoy/configs/sources/literal";

const cfg = await create(
  {
    port: { type: "number", required: true },
    host: { type: "string", required: true },
  },
  {
    sources: [
      envSource({ mapKey: mapKey.snakeCase() }),
      literalSource({ port: 3000, host: "localhost" }), // fallback if env vars are unset
    ],
  },
);
```

## React integration

_new in v1.1.1_

`@jondotsoy/configs/react` exposes `useConfig(store)`, a hook that subscribes a component to a `Store`/`ReadOnlyStore` via `useSyncExternalStore` and re-renders on every update. `react` is an optional peer dependency (`>=18`) — only needed if you import this entrypoint.

```tsx
import { useConfig } from "@jondotsoy/configs/react";

function ServerStatus({ cfg }: { cfg: typeof serverConfigs }) {
  const port = useConfig(cfg.server.port);
  const promoService = useConfig(cfg.features.promoService);

  return (
    <p>
      Listening on port {port} — promo service {promoService ? "on" : "off"}
    </p>
  );
}
```

## Kubernetes integration

When a `ConfigMap` is mounted as a volume, kubelet updates the file inside the pod every time the `ConfigMap` changes — without restarting the container. `fileSource` watches that file (`watch` is `true` by default) and publishes the new value on the `Store`, so the rest of the app reacts to the change right away.

### server.ts

```ts
import { create } from "@jondotsoy/configs";
import { fileSource } from "@jondotsoy/configs/sources/file";

const cfg = await create(
  {
    features: create({
      promoService: { type: "boolean", summary: "enable the promo service", default: false },
    }),
  },
  // fileSource re-reads the file every time kubelet syncs the mounted ConfigMap
  { sources: [fileSource("/etc/config/configs.json")] },
);

cfg.features.promoService.subscribe((enabled) => {
  console.log(`promo service ${enabled ? "enabled" : "disabled"}`);
});
```

### configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  configs.json: |
    {
      "features": {
        "promoService": true
      }
    }
```

### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: registry.example.com/app:latest
          volumeMounts:
            - name: config
              mountPath: /etc/config
      volumes:
        - name: config
          configMap:
            name: app-config
```

## Closing a config tree

`create(...)` exposes `close()`, which closes every source behind it (for `sseSource`, this aborts the live connection). It also implements `Symbol.asyncDispose`, so `await using` closes it automatically at the end of the scope.

```ts
import { create } from "@jondotsoy/configs";
import { sseSource } from "@jondotsoy/configs/sources/sse";

const source = sseSource({ url: "https://config-service.internal/app/events" });
const serverConfigs = await create({ port: { type: "number" } }, { sources: [source] });

await serverConfigs.close();

// or, with Symbol.asyncDispose:
async function run() {
  await using serverConfigs = await create(
    { port: { type: "number" } },
    { sources: [sseSource({ url: "https://config-service.internal/app/events" })] },
  );

  console.log(serverConfigs.port.get());
  // closed automatically here, no need for serverConfigs.close()
}
```

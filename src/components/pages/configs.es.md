# @jondotsoy/configs

v1.1.4 · MIT

Configuración reactiva y tipada para tus apps, respaldada por fuentes conectables: feature flags, toggles remotos y settings servidos por HTTP o SSE que cambian en tiempo real. Cada campo es un `Store` vivo — te suscribes y reaccionas apenas una fuente publica un nuevo valor.

- npm: https://www.npmjs.com/package/@jondotsoy/configs
- GitHub: https://github.com/JonDotsoy/configs

## Instalación

```bash
npm install @jondotsoy/configs
```

## Por qué

- **Configs reactivas** — cada campo es un Store vivo; te suscribes y te notifica cada vez que una fuente upstream cambia.
- **Liviana** — sin dependencias, solo una capa delgada sobre objetos planos y stores.
- **Tipada con chequeo TS** — los schemas se verifican estáticamente, así `cfg.port.get()` se infiere como `number | null` (o `number` con un `default`), no `any`.

## Ejemplos

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

O con `fetchSource` haciendo polling cada minuto a un recurso remoto:

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

O verificando JWTs emitidos por Google manteniendo siempre al día sus claves públicas rotativas (JWKS):

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
        // La respuesta de Google solo trae "keys"; nos quedamos con ese subárbol.
        treePath: ["keys"],
        // Google rota estas claves cada pocas horas — el polling las mantiene al día.
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

Cada árbol de config se arma a partir de `Source`s conectables. También puedes construir uno propio con `Source` directamente.

### envSource

`@jondotsoy/configs/sources/env`

Lee variables de entorno — process.env u otro objeto pasado como env — hacia el árbol de config, un campo por clave (mapeada por mapKey).

- **env** — los env vars a leer. Por defecto, process.env.
- **prefix** — solo se incluyen claves que empiezan con prefix; el prefix se remueve antes de que corra mapKey.
- **suffix** — solo se incluyen claves que terminan con suffix; el suffix se remueve antes de que corra mapKey.
- **mapKey.snakeCase(options?)** — divide una clave `SCREAMING_SNAKE_CASE` en un path anidado en minúsculas por separator (por defecto `"_"`): `"FOO_TAR" => ["foo", "tar"]`. Un separator distinto (p. ej. `"__"`) evita que un guion bajo dentro de un segmento se divida.
- **mapKey.identity()** — pasa cada clave sin cambios, como un path de un solo segmento: `"FOO_TAR" => ["FOO_TAR"]`. Es lo mismo que omitir mapKey.
- **mapKey.camelCase()** — mapea una clave a un solo segmento camelCase: `"FOO_TAR" => ["fooTar"]`.
- **mapKey.lookup(table, fallback?)** — mapea claves específicas a paths explícitos vía una tabla `Record<string, string[]>`; una clave fuera de la tabla cae al fallback (por defecto, la identidad).

También puedes pasar tu propio EnvKeyMapper en vez de una estrategia integrada — es solo una función `(key: string) => string[]`.

```ts
import { envSource, mapKey } from "@jondotsoy/configs/sources/env";

// SERVER_PORT=3000 SERVER_HOST=localhost → { server: { port: "3000", host: "localhost" } }
const source = envSource({ mapKey: mapKey.snakeCase() });

// PORT=3000 HOST=localhost → { server: { port: "3000" }, HOST: "localhost" }
const source2 = envSource({ mapKey: mapKey.lookup({ PORT: ["server", "port"] }) });
```

### fetchSource

`@jondotsoy/configs/sources/fetch`

Descarga un snapshot desde url. El body de la respuesta se convierte a T vía bodyParser (por defecto `(res) => res.json()`), así que también soporta respuestas que no sean JSON pasando un parser propio.

- **method** — método HTTP a usar para el request.
- **headers** — headers a enviar con el request.
- **body** — cuerpo del request, se pasa tal cual a fetch (un string JSON, FormData, Blob, etc.).
- **signal** — aborta el fetch en curso (y detiene su reintento) cuando la señal se dispara. Solo cubre una ronda — con pollingInterval activo, las rondas siguientes igual corren; cierra el Source mismo para detener el polling por completo.
- **mode / cache / redirect** — se pasan tal cual a fetch. Ver `RequestInit["mode"]`, `RequestInit["cache"]` y `RequestInit["redirect"]`.
- **credentials** — arma el header Authorization: `{ basic: { username, password } }` envía `Basic <base64>`; `{ bearer: { token } }` envía `Bearer <token>`.
- **bodyParser** — convierte el Response descargado en T. Por defecto, `(res) => res.json()`.
- **acceptStatus** — decide si un status code cuenta como aceptado. Por defecto, 2xx: `(statusCode) => statusCode >= 200 && statusCode < 300`.
- **attempts** — reintenta la descarga ante un error de red o una respuesta que no sea ok (por defecto 1, sin reintento).
- **pollingInterval** — apagado por defecto (false): fetchSource descarga url una sola vez y se cierra. Pasa un número de milisegundos para activar el polling — sigue re-descargando en ese intervalo (cada ronda reintentada hasta attempts veces) hasta que el Source se cierre.
- **treePath** — selecciona un subárbol del body descargado para usar como árbol de config, p. ej. `["containers", "settings"]`. Por defecto `[]` usa el body completo, sin cambios.
- **reduce** — combina cada descarga exitosa con el valor publicado anteriormente en vez de reemplazarlo por completo. Útil con pollingInterval cuando una ronda posterior es una actualización parcial. Recibe el body recién descargado (y ya filtrado por treePath) como incoming y el último valor publicado como previous (null antes de la primera ronda). Por defecto publica incoming tal cual — un reemplazo completo.

Si la descarga nunca tiene éxito (error de red, o un status rechazado por acceptStatus tras agotar attempts), o bodyParser lanza, fetchSource registra un console.error y deja el store vacío en vez de lanzar. Una ronda fallida después de la primera se registra y se salta, sin cerrar el source ni detener el polling.

```ts
import { fetchSource } from "@jondotsoy/configs/sources/fetch";
import { Temporal } from "temporal-polyfill";

const source = fetchSource<{ port: number }>({
  url: "https://config-service.internal/app",
  method: "GET",
  headers: { authorization: `Bearer ${process.env.CONFIG_TOKEN}` },
  attempts: 3,
  // Apagado por defecto — pasa milisegundos para hacer polling en vez de un solo fetch.
  pollingInterval: Temporal.Duration.from({ seconds: 30 }).total("milliseconds"),
});
```

### sseSource

`@jondotsoy/configs/sources/sse`

Se conecta a un endpoint SSE. Cada mensaje intenta parsearse como JSON y, si es un objeto plano, se aplica como patch sobre lo ya recibido — los campos se suman y sobrescriben, el árbol nunca se reemplaza por completo.

- **method** — método HTTP para abrir la conexión.
- **headers** — headers a enviar al abrir la conexión SSE.
- **body** — cuerpo del request, se pasa tal cual a fetch (un string JSON, FormData, Blob, etc.).
- **signal** — aborta la conexión (y detiene su reintento) cuando la señal se dispara. Independiente del close() propio del Source, que también aborta la conexión.
- **mode / cache / redirect** — se pasan tal cual a fetch. Ver `RequestInit["mode"]`, `RequestInit["cache"]` y `RequestInit["redirect"]`.
- **credentials** — arma el header Authorization: `{ basic: { username, password } }` envía `Basic <base64>`; `{ bearer: { token } }` envía `Bearer <token>`.
- **attempts** — intenta establecer la conexión antes de darse por vencido (por defecto 1, sin reintento).
- **acceptStatus** — decide si un status code cuenta como aceptado. Por defecto, 2xx: `(statusCode) => statusCode >= 200 && statusCode < 300`.
- **reduce** — combina cada mensaje parseado con el árbol acumulado hasta ahora, sobreescribiendo el patch-merge superficial por defecto (campos nuevos se agregan, existentes se sobreescriben, el resto se conserva). Recibe el mensaje parseado como incoming y el árbol publicado previamente como previous (null antes del primer mensaje). Un reduce propio reemplaza ese comportamiento por completo, así que debe encargarse de su propio merge si aún lo quieres.

Un mensaje que no sea JSON válido, o que no parsee a un objeto plano, se registra vía console.error y se salta — nunca resetea lo ya recibido. Abrir el source espera el primer mensaje (así el Store que recibes ya trae datos, no null), y luego mantiene la conexión viva en segundo plano, aplicando más mensajes como patches hasta que el recurso cierre el stream. Además de url/method/headers, acepta las mismas opciones de fetchSource para dar forma al request; attempts solo reintenta la conexión inicial — una vez abierto el stream, una conexión caída cierra el source en vez de reconectar.

```ts
import { sseSource } from "@jondotsoy/configs/sources/sse";

const source = sseSource<{ port?: number; host?: string }>({
  url: "https://config-service.internal/app/events",
});

// mensaje: {"port":3000}       => Store<{ port: 3000 }>
// mensaje: {"host":"10.0.0.1"} => Store<{ port: 3000, host: "10.0.0.1" }>
```

### fileSource

`@jondotsoy/configs/sources/file`

Lee un árbol de config desde path — un string o una URL file: —, parseado según su extensión: .json o .env por defecto (por extensión, o por el nombre de archivo .env a secas — un archivo .env siempre parsea a un mapa plano de strings, una entrada por línea KEY=VALUE, saltando líneas en blanco y comentarios #), o cualquier otro formato vía un parser propio.

- **watch** — true por defecto: el archivo se relee y el store se actualiza en vivo en cada cambio; watch: false lo lee una sola vez.
- **treePath** — selecciona un subárbol del archivo parseado para usar como árbol de config, p. ej. `["containers", "settings"]` para usar el objeto interno de `{ containers: { settings: {...} } }` e ignorar el resto. Por defecto `[]` usa el archivo completo, sin cambios.
- **format** — elige qué parser integrado usar — "json" o "env" — sobreescribiendo la detección por extensión. Útil cuando path no tiene una extensión que detectar. Se ignora si parser está definido.
- **parser** — sobreescribe el parseo por defecto: recibe los bytes crudos del archivo y retorna el árbol de config parseado. Útil para formatos que este módulo no parsea, como YAML con una librería propia.
- **reduce** — combina cada lectura con el valor publicado anteriormente en vez de reemplazarlo por completo. Útil con watch (el default) cuando una lectura posterior debería mezclarse con lo que ya hay en vez de reemplazarlo del todo. Recibe el árbol recién leído (y ya filtrado por treePath) como incoming y el último valor publicado como previous (null antes de la primera lectura). Por defecto publica incoming tal cual — un reemplazo completo.

Un archivo ausente, una extensión no reconocida, o un parseo fallido (incluso en un cambio observado posterior) se registra vía console.error y deja el store vacío en vez de lanzar — un error de parseo en un cambio posterior conserva el último valor bueno. Si treePath apunta a un segmento ausente o que no es un objeto, también se registra un error, pero igual publica un snapshot vacío (`{}`) en vez de null, ya que el archivo sí se leyó y parseó bien.

```ts
import { fileSource } from "@jondotsoy/configs/sources/file";

const source = fileSource<{ port: number; host: string }>("./config.json");
// config.json: { "port": 3000, "host": "localhost" }
```

### pullSource

`@jondotsoy/configs/sources/pull`

Llama a pull y publica lo que retorne como el siguiente snapshot — una vez de inmediato, y luego de nuevo cada interval milisegundos hasta que el Source se cierre. pull puede ser sync o async, así que es un escape hatch de propósito general para cualquier input que no esté cubierto por un source integrado (una consulta a base de datos, un secrets manager en la nube, una llamada gRPC, ...).

- **pull** — función llamada en cada ronda para producir un snapshot nuevo. Puede ser sync o async.
- **interval** — milisegundos entre llamadas a pull.

Un fallo de pull se registra vía console.error y se traga en vez de lanzarse: en la primera llamada esto deja el store vacío (igual que fetchSource); en una llamada posterior se salta, conservando el último valor bueno y el polling sigue corriendo.

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

Publica un valor plano que ya tienes a mano (value) como snapshot de inmediato, y luego se cierra. Sin I/O, sin opciones — solo envuelve value en un Source para que pueda ir en un arreglo sources junto al resto.

Útil como árbol de respaldo estático (ponlo al final, para que ganen los sources reales), como default hardcodeado para un solo ambiente, o como source de relleno en un test.

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
      literalSource({ port: 3000, host: "localhost" }), // respaldo si faltan las env vars
    ],
  },
);
```

## Integración con React

_nuevo en v1.1.1_

`@jondotsoy/configs/react` expone `useConfig(store)`, un hook que suscribe un componente a un `Store`/`ReadOnlyStore` vía `useSyncExternalStore` y re-renderiza en cada actualización. `react` es un peer dependency opcional (`>=18`) — solo se necesita si importas este entrypoint.

```tsx
import { useConfig } from "@jondotsoy/configs/react";

function ServerStatus({ cfg }: { cfg: typeof serverConfigs }) {
  const port = useConfig(cfg.server.port);
  const promoService = useConfig(cfg.features.promoService);

  return (
    <p>
      Escuchando en el puerto {port} — promo service {promoService ? "on" : "off"}
    </p>
  );
}
```

## Integración con Kubernetes

Cuando un `ConfigMap` se monta como volumen, kubelet actualiza el archivo en el pod cada vez que el `ConfigMap` cambia — sin reiniciar el contenedor. `fileSource` observa ese archivo (`watch` es `true` por defecto) y publica el nuevo valor en el `Store`, así que el resto de la app reacciona al cambio de inmediato.

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
  // fileSource relee el archivo cada vez que kubelet sincroniza el ConfigMap montado
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

## Cerrando un árbol de config

`create(...)` expone `close()`, que cierra cada source detrás (para `sseSource`, esto aborta la conexión en vivo). También implementa `Symbol.asyncDispose`, así que `await using` lo cierra automáticamente al salir del scope.

```ts
import { create } from "@jondotsoy/configs";
import { sseSource } from "@jondotsoy/configs/sources/sse";

const source = sseSource({ url: "https://config-service.internal/app/events" });
const serverConfigs = await create({ port: { type: "number" } }, { sources: [source] });

await serverConfigs.close();

// o, con Symbol.asyncDispose:
async function run() {
  await using serverConfigs = await create(
    { port: { type: "number" } },
    { sources: [sseSource({ url: "https://config-service.internal/app/events" })] },
  );

  console.log(serverConfigs.port.get());
  // se cierra automáticamente aquí, sin necesidad de serverConfigs.close()
}
```

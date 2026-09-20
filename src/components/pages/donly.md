# donly

Guía rápida · MIT

**donly** es la implementación de referencia de DON (Directive Object Notation), un formato de serialización de datos legible por humanos basado en directivas y subdirectivas. Ideal para archivos de configuración, definiciones de infraestructura y datos estructurados.

- npm: https://www.npmjs.com/package/donly
- Extensión de VS Code: https://marketplace.visualstudio.com/items?itemName=jondotsoy.don-textmate
- GitHub: https://github.com/JonDotsoy/don

## Instalación

```bash
npm install donly
# o
bun add donly
# o
pnpm add donly
```

## Uso básico

Importa `DON` y parsea un texto en formato DON para obtener un árbol de directivas.

```ts
import { DON } from "donly";

const text = `
name "my-app"
port 8080
database {
  host "localhost"
  port 5432
}
`;

const root = DON.parse(text);
```

También puedes serializar directivas a JSON y decodificarlas de vuelta:

```ts
import { DirectiveJSONEncoder, DirectiveJSONDecoder } from "donly/decoder";

const encoded = DirectiveJSONEncoder.encode(root);
const decoded = new DirectiveJSONDecoder().decode(encoded);
```

## Sintaxis básica

DON organiza los datos en directivas: un nombre seguido de argumentos posicionales y, opcionalmente, un bloque `{ }` con subdirectivas anidadas.

```don
route GET /api {
  respond 200 "Ok"
}
```

### Tipos de datos

Strings, números (enteros, decimales, hex, bigint), booleanos y `null`.

```don
name "donly"
port 8080
price 19.99
retries -1
big 9007199254740993n
mask 0xFF
enabled true
disabled false
description null
```

### Comentarios

De línea con `#` y de bloque con `/* ... */`.

```don
# Puerto donde escucha el servidor HTTP
port 8080

/*
  Bloque de comentario
  de varias líneas
*/
host "localhost"
```

### Heredocs

Bloques de contenido multilínea embebido que empiezan con `<<<DELIMITADOR` y terminan en la primera línea sin indentar; no se cierran repitiendo el delimitador.

```don
description <<<TEXT
  Este es un bloque de texto
  que puede ocupar varias líneas,
  siempre que estén indentadas.
name "my-app"
```

### Anidamiento

Las directivas pueden anidarse a cualquier profundidad dentro de bloques `{ }`.

```don
server {
  route GET /health {
    respond 200 "Ok"
  }
  route POST /users {
    respond 201 "Created"
  }
}
```

## CLI

El CLI de `donly` permite inspeccionar y validar archivos `.donly`.

### Inspeccionar

```bash
bunx donly inspect file.donly
bunx donly inspect --strategy nested|tuple|raw file.donly
```

Por ejemplo, para un `file.donly` con:

```don
name "my-app"
port 8080
database {
  host "localhost"
  port 5432
}
```

`bunx donly inspect file.donly` imprime:

```json
{
  "name": "my-app",
  "port": 8080,
  "database": {
    "host": "localhost",
    "port": 5432
  }
}
```

### Lint

```bash
bunx donly lint --rules rules.json file.donly
bunx donly lint --rules rules.json -o json file.donly
```

Por ejemplo, con un `rules.json` que exige que `port` sea numérico:

```json
{
  "rules": [{ "directive": "port", "require": "number" }]
}
```

Al lintear un `file.donly` que rompe esa regla:

```don
name "my-app"
port "8080"
```

`bunx donly lint --rules rules.json file.donly` imprime:

```
✖ file.donly:2:6  port expects a number, got string  (port-must-be-number)

1 problem (1 error, 0 warnings)
```

## Instalar en tu editor

La extensión DON TextMate Grammar agrega resaltado de sintaxis para archivos `.don` y `.donly`. Funciona en VS Code, Kiro, o cualquier editor que soporte gramáticas TextMate.

### Desde VS Code

1. Abre Quick Open con `Ctrl+P` (o `Cmd+P` en macOS).
2. Pega el siguiente comando y presiona Enter:

```
ext install jondotsoy.don-textmate
```

También puedes buscar "DON TextMate" en el Marketplace de extensiones o instalarla directamente desde https://marketplace.visualstudio.com/items?itemName=jondotsoy.don-textmate.

---

Más detalles, el sistema de plugins y la referencia completa en el repositorio de GitHub: https://github.com/JonDotsoy/don

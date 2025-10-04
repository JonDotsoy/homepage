# Jonathan Delgado Zamorano - Homepage

Sitio web personal y portafolio profesional de Jonathan Delgado Zamorano, desarrollador de software chileno especializado en desarrollo backend, implementación de infraestructura y migraciones.

## 🚀 Tech Stack

- **Astro 5.x** - Framework de sitio estático con arquitectura de islas
- **React 19** - Componentes interactivos
- **Tailwind CSS 4.x** - Framework CSS utility-first
- **shadcn/ui** - Sistema de componentes UI
- **Radix UI** - Primitivos UI headless
- **Lucide React** - Librería de iconos
- **Bun** - Gestor de paquetes y runtime
- **Playwright** - Testing end-to-end

## 📁 Estructura del Proyecto

```
/
├── public/              # Assets estáticos (favicon, imágenes)
├── src/
│   ├── components/      # Componentes Astro y React
│   │   ├── layouts/     # Componentes de layout
│   │   └── ui/          # Componentes shadcn/ui
│   ├── data/            # Archivos JSON de datos
│   ├── lib/             # Funciones utilitarias
│   ├── pages/           # Rutas basadas en archivos (páginas Astro)
│   └── styles/          # Archivos CSS globales
├── tests/               # Archivos de prueba Playwright
└── .astro/              # Tipos y metadata generados por Astro
```

## 🧞 Comandos

Todos los comandos se ejecutan desde la raíz del proyecto:

| Comando           | Acción                                               |
| :---------------- | :--------------------------------------------------- |
| `bun install`     | Instala las dependencias                             |
| `bun dev`         | Inicia el servidor de desarrollo en `localhost:4321` |
| `bun build`       | Construye el sitio de producción en `./dist/`        |
| `bun preview`     | Previsualiza la build de producción localmente       |
| `bun run lint`    | Verifica el formato con Prettier                     |
| `bun run fmt`     | Formatea el código con Prettier                      |
| `bun astro ...`   | Ejecuta comandos CLI de Astro                        |
| `bun astro check` | Verifica tipos en archivos Astro                     |

## 🛠️ Convenciones de Desarrollo

### Imports

- Usa el alias `@/*` para todos los imports desde src (ej: `@/components/Hero.astro`)
- Evita imports relativos como `../` cuando importes desde src

### Componentes

- **Componentes Astro** (`.astro`): Layouts de página y componentes estáticos
- **Componentes React** (`.tsx`): Componentes UI interactivos, especialmente shadcn/ui
- **Componentes UI**: Ubicados en `src/components/ui/`, siguen patrones de shadcn/ui

### Estilos

- Clases utilitarias de Tailwind para todo el styling
- Usa la utilidad `cn()` de `@/lib/utils` para clases condicionales
- Variantes de componentes gestionadas con `class-variance-authority`
- Estilos globales en `src/styles/global.css`

### Datos

- Datos estáticos almacenados como JSON en `src/data/`
- Importa y usa directamente en componentes Astro

### Rutas

- Enrutamiento basado en archivos vía `src/pages/`
- Cada archivo `.astro` en pages se convierte en una ruta
- `index.astro` mapea a la ruta raíz `/`

## 📝 Configuración TypeScript

- Extiende `astro/tsconfigs/strict`
- Alias de ruta: `@/*` mapea a `./src/*`
- JSX: React JSX transform

## 🧪 Testing

El proyecto usa Playwright para pruebas end-to-end. Los archivos de prueba se encuentran en el directorio `tests/`.

## 📄 Licencia

Este es un proyecto personal.

## 👤 Contacto

- **Email**: hi@jon.soy
- **LinkedIn**: [linkedin.com/in/jonadelgado](https://linkedin.com/in/jonadelgado)

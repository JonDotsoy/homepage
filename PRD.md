# PRD — Homepage Personal de Jonathan Delgado

## Visión del Producto

Sitio web personal de **Jonathan Delgado Zamorano** (`jon.soy`), desarrollador de software chileno especializado en backend. El sitio actúa como carta de presentación profesional y plataforma de publicación de contenido técnico.

El objetivo central es proyectar credibilidad técnica, facilitar el contacto profesional y consolidar una presencia digital coherente con el perfil de un engineer senior enfocado en backend, infraestructura y fintech.

---

## Usuarios Objetivo

| Perfil                          | Necesidad                                 |
| ------------------------------- | ----------------------------------------- |
| Reclutadores / hiring managers  | Evaluar experiencia y stack tecnológico   |
| Colegas y pares técnicos        | Leer artículos, explorar código en GitHub |
| Startups / clientes potenciales | Contactar para mentoría o consultoría     |
| Comunidad técnica hispana       | Consumir contenido en español             |

---

## Páginas y Funcionalidades

### 1. Página Principal (`/`)

**Secciones:**

- **Hero (`HelloHero`)** — pantalla completa (`min-h-screen`) con:
  - Subtítulo introductorio: _"El mundo digital es infinito y este es una web más"_
  - Título principal con acento animado: _"Estas [acento] en la web de Jonathan"_
  - Botón **Contáctame ahora** → LinkedIn
  - Botón **Ve mi código** → GitHub
  - Barra animada como indicador de scroll

- **Sobre mí (`AboutMe`)** — sección narrativa con tres párrafos que cubren:
  - Identidad profesional (backend engineer, fintech)
  - Stack tecnológico (.NET, TypeScript, React, Astro, Tailwind, Docker, Terraform, GCP)
  - Prácticas: TDD, herramientas de IA, mentoría, comunicación en equipos

- **Footer (`Footer`)** — enlace de email, derechos y switch de idioma (ES / EN)

**Soporte de idiomas:** Español (`/`) e Inglés (`/en/`)

**SEO estructurado:**

- JSON-LD tipo `Person` con nombre, email, título profesional, ocupación en Chile, links a LinkedIn y GitHub
- Open Graph y Twitter Cards
- URL canónica

---

### 2. Blog (`/blog`)

Lista de artículos agrupados por mes y año (orden cronológico inverso).

**Tarjeta de artículo:**

- Autor (handle GitHub)
- Fecha formateada según idioma del post
- Título en tipografía serif itálica
- Descripción truncada a 4 líneas
- Imagen de portada opcional (optimizada a WebP 400×200)

**SEO estructurado:**

- JSON-LD tipo `Blog` con lista de `BlogPosting`
- Open Graph y Twitter Cards por página

---

### 3. Artículo de Blog (`/blog/[article_id]`)

Vista individual de artículo desde la colección de contenido de Astro.

---

### 4. Página 404

Página de error para rutas no encontradas.

---

## Stack Tecnológico

| Capa          | Tecnología                                           |
| ------------- | ---------------------------------------------------- |
| Framework     | [Astro](https://astro.build) (SSR / prerender mixto) |
| UI Components | React (islas de hidratación con `client:load`)       |
| Estilos       | Tailwind CSS                                         |
| Animaciones   | `animate-ui` (Shine, efectos de brillo)              |
| Iconos        | `@tabler/icons-react`                                |
| Fechas        | `temporal-polyfill` (Temporal API)                   |
| Deploy / Edge | Cloudflare Workers (`wrangler.jsonc`)                |
| Imágenes      | Optimización automática con `astro:assets` (WebP)    |

---

## Internacionalización (i18n)

- Idioma principal: **Español** (`/`)
- Idioma secundario: **Inglés** (`/en/`)
- Las cadenas de texto se gestionan mediante diccionarios JSON en `src/dictionaries/` (`es.json`, `en.json`)
- El idioma se pasa como prop `lang` a cada sección

---

## Datos Personales / Configuración

Centralizado en `src/data/general.json`:

```json
{
  "personal": { "name", "email", "nationality", "linkedin", "github" },
  "professional": { "title", "specializations" },
  "languages": { "native", "additional" },
  "seo": { "title", "description", "keywords" }
}
```

Un único archivo de configuración evita inconsistencias entre páginas y facilita actualizaciones.

---

## Criterios de Calidad

- **Performance:** Imágenes optimizadas a WebP, prerendering estático donde es posible, hidratación selectiva con islas React
- **SEO:** JSON-LD completo en todas las páginas, meta tags Open Graph / Twitter, URL canónica
- **Accesibilidad:** Estructura semántica HTML (`section`, `h1`, `h2`, `article`), atributos `alt` en imágenes
- **Mantenibilidad:** Contenido desacoplado del markup (diccionarios + JSON de datos), componentes reutilizables por sección

---

## Métricas de Éxito

| Métrica              | Indicador                                                      |
| -------------------- | -------------------------------------------------------------- |
| Indexación SEO       | Posición en Google para "Jonathan Delgado desarrollador Chile" |
| Contacto profesional | Clics en botón LinkedIn / email                                |
| Audiencia blog       | Visitas únicas por artículo                                    |
| Tiempo de carga      | Core Web Vitals en verde (LCP < 2.5s, CLS < 0.1)               |

---

## Fuera de Scope (v1)

- Sistema de comentarios en blog
- Buscador de artículos
- Sistema de newsletter / suscripción
- Portafolio de proyectos separado (actualmente delegado a GitHub)
- Panel de administración de contenido (CMS)

---
title: Agent Deep Linking — Integra IA sin API ni backend
description: Una técnica simple para conectar tu aplicación con agentes de IA mediante URLs que precargan contexto. No requiere API, SDK ni costos de infraestructura.
cover: ./2026-02-22-agent-deep-linking-integra-ia-sin-api-ni-backend/assets/cover.png
lang: es
author:
  name: Jonathan Delgado
  email: hi@jon.soy
  website: https://jon.soy
  github: "@jondotsoy"
date: "2026-02-22"
publications:
  - url: https://www.linkedin.com/pulse/agent-deep-linking-integra-ia-sin-api-ni-backend-delgado-zamorano-mmlhf
    date: 2026-02-22
---

Si desarrollas aplicaciones web, probablemente ya conoces el concepto de **deep linking**: una URL que abre una aplicación móvil directamente en una pantalla específica con datos precargados. Por ejemplo, un link que abre Instagram en una publicación concreta, o Amazon en un producto determinado.

Ahora imagina aplicar ese mismo principio para abrir un agente de IA —como Claude, ChatGPT o Gemini— con el contexto de tu aplicación ya cargado, listo para responder. Sin integrar ninguna API. Sin manejar credenciales. Sin escribir prompts en tu backend.

Eso es **Agent Deep Linking**.

## Qué es Agent Deep Linking

**Agent Deep Linking** es una técnica que consiste en construir una URL que apunta a una plataforma de chat con IA e inyecta un prompt con contexto directamente desde tu aplicación. El agente ya está construido y entrenado. Tu aplicación solo le pasa los datos relevantes.

La gran diferencia con una integración tradicional es esta:

> El developer no integra la IA. Delega en ella.

En lugar de llamar a una API, procesar la respuesta y mostrarla en tu interfaz, generas un link. El usuario hace clic, el agente se abre en otra pestaña con el contexto ya cargado, y la conversación continúa desde ahí.

¿Es lo mismo que una integración completa? No. ¿Es suficiente para muchos casos de uso? Absolutamente.

## Anatomía de la URL

Construir un agent deep link es tan simple como armar una URL con estos componentes:

1. **URL base de la plataforma**: cada servicio de IA tiene su propia URL de entrada.
2. **Parámetro de query**: el nombre del parámetro que recibe el prompt (`?q=`, `?prompt=`, etc.).
3. **Encoding del contexto**: el texto del prompt debe estar correctamente codificado para viajar en la URL.

### Ejemplo en JavaScript

```javascript
const context = `Artículo: "Cómo funciona Agent Deep Linking"
Autor: Jonathan Delgado

Tengo dudas sobre este artículo, ayúdame a entenderlo.`;

const url = new URL("https://claude.ai/new");
url.searchParams.set("q", context);
```

Al hacer clic en ese link, Claude se abre con el contexto ya cargado en la caja de texto, listo para que el usuario presione Enter o agregue más información.

### Plataformas soportadas

- **Claude**
  - URL base: `https://claude.ai/new`
  - Parámetro: `?q=`
  - Comportamiento: Precarga el prompt en la caja de texto

- **ChatGPT**
  - URL base: `https://chat.openai.com/?q=`
  - Parámetro: `?q=`
  - Comportamiento: Precarga el prompt y puede auto-enviar

- **Gemini**
  - URL base: `https://gemini.google.com/app`
  - Parámetro: `?q=`
  - Comportamiento: Precarga el prompt en la caja de texto

- **Perplexity**
  - URL base: `https://www.perplexity.ai/`
  - Parámetro: `?q=`
  - Comportamiento: Precarga y busca automáticamente

**Nota:** El comportamiento puede variar según actualizaciones de cada plataforma. Algunos servicios envían el prompt automáticamente, otros lo dejan listo para que el usuario lo revise antes de enviar.

## Casos de uso

Ahora que entiendes cómo funciona la técnica, veamos algunos ejemplos concretos donde Agent Deep Linking aporta valor real sin necesidad de backend, APIs ni infraestructura adicional.

### Caso de uso 1 — Blog con botón "Pregúntale a la IA"

![Botón "Preguntar al chat" destacado en un artículo de blog, mostrando metadatos como autor, visitas y fecha de publicación](./2026-02-22-agent-deep-linking-integra-ia-sin-api-ni-backend/assets/boton-ask-chat.png)

Imagina que escribes un artículo técnico sobre arquitectura de microservices. Es denso, con conceptos complejos. Sabes que algunos lectores van a querer profundizar, hacer preguntas específicas o pedir ejemplos adicionales.

En lugar de construir una sección de comentarios, un chatbot embedded o un sistema de Q&A, agregas un botón en la barra de acciones del artículo:

**[📝 Pregúntale a Claude sobre este artículo]**

Cuando el lector hace clic, se abre Claude con un prompt que incluye:
- El título del artículo
- Un resumen del contenido
- La URL del artículo original
- Una instrucción inicial: *"Tengo dudas sobre este artículo, ayúdame a entenderlo"*

El lector puede continuar la conversación desde ahí, hacer preguntas específicas, pedir ejemplos en otro lenguaje de programación, o profundizar en cualquier sección.

### Por qué funciona

- **Cero infraestructura**: no necesitas server, database ni API keys.
- **Contexto automático**: el agente recibe información precisa sin que el usuario tenga que copiar y pegar.
- **Extensión natural del contenido**: conviertes tu artículo estático en una experiencia interactiva.

### Caso de uso 2 — App académica con botón "¿Por qué está mal?"

![Botón amarillo con el texto "¿Por qué? 🤔" que permite al estudiante obtener una explicación personalizada del error](./2026-02-22-agent-deep-linking-integra-ia-sin-api-ni-backend/assets/boton-por-que-esta-mal.png)

Si tu app es académica, como una aplicación para aprender inglés, los estudiantes responden preguntas de selección múltiple, se equivocan y ven la respuesta correcta. Pero muchas veces no entienden *por qué* se equivocaron.

En lugar de escribir explicaciones pedagógicas para cada error posible, agregas un botón:

**[¿Por qué? 🤔]**

Al hacer clic, el link construye un prompt con contexto específico del error. Por ejemplo:

```
Explícame por qué en la oración en inglés "I always ____ (try) my best in class."
(tema: Present Simple vs Present Continuous), la respuesta correcta es "try" y no
"am trying". Dame una explicación breve y clara en español.
```

Claude se abre con este prompt ya cargado y ofrece una explicación personalizada, adaptada al error específico del estudiante, sin que tengas que escribir explicaciones pedagógicas para cada caso posible.

### Por qué funciona

- **Feedback bajo demanda**: solo los estudiantes que necesitan ayuda adicional hacen clic.
- **Escalabilidad**: no tienes que anticipar todos los errores posibles.
- **Costo cero**: delegas el motor de feedback en el agente externo.

## Extendiendo el patrón

Agent Deep Linking es más flexible de lo que parece a primera vista. Más allá de los casos básicos, hay múltiples formas de extender el comportamiento de tu web o aplicación con integraciones creativas.

### Ejemplo real: Claude.com y "Ask questions about this page"

En la documentación de Claude, existe un botón llamado **"Ask questions about this page"** que, al hacer clic, abre Claude con un prompt precargado:

```
Read this page https://claude.com/platform/api so that I can ask you questions about it
```

Esto permite al usuario realizar más preguntas y resolver dudas rápidamente sin tener que copiar manualmente la URL o explicar de qué página está hablando. El agente ya tiene el contexto completo.

### Ventaja oculta: El agente ya conoce a tu usuario

Algo que no es obvio a primera vista: cuando abres un agente de IA como Claude o ChatGPT con un deep link, el agente tiene acceso al historial completo de conversaciones previas de ese usuario.

Esto significa que:

**El tono de las respuestas es más personalizado.** Si el usuario habitualmente pide explicaciones simples, ejemplos visuales o un estilo más técnico, el agente ya lo sabe y adapta su respuesta automáticamente.

**Se resuelven problemas con detalles implícitos.** El usuario puede haber mencionado en conversaciones anteriores su nivel de experiencia, el programming language que usa, o sus preferencias de aprendizaje. Aunque tu prompt no incluya estos detalles, el agente los tiene en cuenta.

**La experiencia mejora con el tiempo.** Cada interacción que el usuario tenga con el agente desde tu aplicación enriquece ese contexto, haciendo que las futuras respuestas sean más relevantes y personalizadas.

Esta es una ventaja significativa sobre construir tu propio chatbot desde cero: no solo delegas la lógica de IA, sino que también te beneficias del contexto acumulado que el usuario ya ha construido con su agente preferido.

### Buenas prácticas para implementaciones creativas

**1. Permite copiar el markdown de tu página**

Si tu contenido es técnico, educativo o informativo, considera ofrecer un botón que copie el contenido en formato markdown al clipboard. Esto permite que el usuario lo use como mejor le convenga: pegarlo en un chat con IA, procesarlo con herramientas propias o guardarlo para referencia futura.

```javascript
function copyMarkdownToClipboard() {
  const markdown = document.querySelector('article').dataset.markdown;
  navigator.clipboard.writeText(markdown);
}
```

**2. Ofrece una versión `llms.txt` de tu sitio**

Una buena práctica emergente es ofrecer una versión optimizada de tu contenido específicamente para que los agentes de IA lo procesen. En lugar de enviar toda la estructura HTML con animaciones, estilos, tracking scripts y elementos de navigation, puedes exponer un endpoint o archivo que contenga únicamente el contenido relevante.

Aunque hoy `llms.txt` no es un estándar oficial, es flexible y adaptable. Puedes tener un archivo global para todo tu sitio, o crear versiones específicas para cada página o artículo. Por ejemplo:

```
# Global para todo el sitio
https://tudominio.com/llms.txt

# Específico para un artículo particular
https://jon.soy/blog/2026-02-01-por-que-usar-runbook/llms.txt
```

Este archivo puede contener:
- Contenido principal sin elementos decorativos
- Estructura semántica clara
- Metadatos relevantes (autor, fecha, categorías)
- Enlaces importantes sin ruido de navigation

Esto permite que el chat entienda únicamente el contenido y no toda la parafernalia visual. Los agentes pueden leer esta versión limpia para dar respuestas más precisas y relevantes.

**3. Combina deep linking con contexto estructurado**

No te limites a enviar texto plano. Estructura tu prompt para que el agente entienda:
- **Qué tipo de contenido es** (tutorial, documentación, artículo académico, producto)
- **Qué acción esperas** (explicar, comparar, generar código, responder preguntas)
- **Qué nivel de profundidad** (básico, intermedio, avanzado)

Ejemplo de prompt estructurado:
```javascript
const prompt = `Tipo: Tutorial técnico
Tema: Autenticación JWT en Node.js
URL: ${window.location.href}
Nivel: Intermedio

El usuario necesita ayuda para entender este tutorial. Responde sus preguntas con ejemplos prácticos.`;

const url = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
```

### La creatividad abre más casos de uso

Piensa en Agent Deep Linking no solo como "un botón que abre un chat", sino como una **extensión programable** de tu aplicación. Con un poco de creatividad, puedes:

- Ofrecer feedback contextual sin construir lógica propia
- Permitir análisis de datos con un solo clic
- Generar explicaciones adaptadas al nivel del usuario
- Facilitar la traducción o simplificación de contenido técnico
- Crear asistentes especializados sin backend

## Cuándo usarlo y cuándo no

### Tiene sentido cuando:

- **Estás en fase de MVP o prototipo**: quieres validar si agregar IA aporta valor antes de construir una integración completa.
- **El contexto cabe en una URL**: el prompt no requiere adjuntar documentos pesados ni bases de datos completas.
- **El usuario ya tiene cuenta en la plataforma de IA**: la mayoría de desarrolladores, estudiantes y profesionales ya usan Claude, ChatGPT o Gemini.
- **Quieres extender la utilidad de contenido estático**: blogs, documentación, tutoriales, reportes.

### No tiene sentido cuando:

- **Necesitas una experiencia seamless**: el usuario no debería salir de tu aplicación.
- **El contexto es sensible o privado**: datos personales, información corporativa o cualquier cosa que no deba compartirse con un servicio externo.
- **Requieres escala, automatización o trazabilidad**: necesitas registrar las interacciones, procesar respuestas automáticamente o integrar el resultado en tu workflow.
- **El usuario no debería tener agencia**: si la IA debe responder de forma determinista y sin intervención humana, necesitas una API.

## Conclusión

**Agent Deep Linking** no reemplaza una integración completa con APIs de IA. Pero para una categoría amplia de casos de uso —especialmente en MVPs, herramientas internas, contenido educativo y aplicaciones que extienden la utilidad de información estática— es suficiente, rápida de implementar y completamente gratuita en términos de infraestructura propia.

Es gratis en costos de server y APIs, pero requiere pensar cuidadosamente en la experiencia del usuario: qué contexto necesita el agente, cómo estructurar el prompt para que sea útil, y cuándo tiene sentido abrir una nueva pestaña versus mantener al usuario dentro de tu aplicación.

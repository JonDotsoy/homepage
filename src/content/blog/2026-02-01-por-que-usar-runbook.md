---
title: "Por qué usar Runbooks: Automatiza la documentación de escenarios reproducibles con IA"
description: "Aprenderás a crear runbooks y generar evidencia de su ejecución con ayuda de IA para documentar y validar escenarios reproducibles en tus proyectos."
cover: ./assets/cover.png
lang: es-CL
author:
  name: Jonathan Delgado
  email: hi@jon.soy
  website: https://jon.soy
  github: "@jondotsoy"
date: "2026-02-01"
---

## Overview

Con este artículo quiero que desde ahora el crear runbooks sea un ritual natural que sea parte de tu flujo de trabajo, ya sea que seas parte del equipo de QA, Dev, DevOps, análisis de datos, etc. La creación de runbooks debería ser una práctica natural y recurrente para ti, y no solo una tarea en el tablero que deba ser solicitada por alguien más.

¿Y por qué? Simple, este documento permite reproducir una actividad una cantidad indeterminada de veces.

## TLDR

Aprenderás a crear runbooks y generar evidencia de su ejecución con ayuda de IA para documentar y validar escenarios reproducibles en tus proyectos. Solo necesitas un IDE con agente de IA (Claude, Copilot, Kiro, etc.) e instalar los siguientes skills:

- **runbook-generator**: Crea runbooks estructurados a partir de una descripción en lenguaje natural.
- **runbook-executor**: Genera evidencia documentada de la ejecución de un runbook.

```bash
npx skills add https://github.com/jondotsoy/skills --skill runbook-generator
npx skills add https://github.com/jondotsoy/skills --skill runbook-executor
```

## El Problema del Contexto

Por lo general ignoramos la importancia de los runbooks ya que dentro de un equipo muchos tienen tanto contexto que es fácil reproducir una actividad en el proyecto, y esto está genial. Enhorabuena, tienes el nivel suficiente para ser parte del equipo.

Pero ¿qué pasa si cambias de equipo o tienes que mantener código legado? Bueno, la historia es distinta. Tener que analizar código es parte fundamental, entender las reglas de negocio es imperativo y requiere horas y horas de reuniones. El problema no es si ya estás ahí en ese equipo, el problema es si tienes que ir a uno donde no existe mayor contexto.

![Desarrollador frente a un tablero de tareas con tickets pendientes para crear runbooks](./assets/ticket-to-the-runbook.png)

### ¿Y la IA?

Con ella puedo generar una consulta y analizará todo el código por mí, ¿cierto? En efecto, la IA puede analizar todo el código y describirlo con alta precisión, pero como dice el artículo ["How Does Naming Affect Language Models on Code Analysis Tasks?"](https://www.scirp.org/journal/paperinformation?paperid=137296) puede haber ocasiones en que no será suficiente ya que el mismo acto de tener código poco descriptivo puede perjudicar enormemente el análisis que hace la IA sobre tu código.

Y aquí es donde los runbooks brillan: aunque el código sea difícil de entender, un runbook bien escrito describe exactamente qué debe pasar y cómo validarlo.

## ¿Qué es un Runbook?

Simple, un documento que prueba un artefacto. Y esto puede ser todo lo que quieras: una UI para realizar el carrito de compras de una tienda, una API para conocer información de un usuario, hasta una cola que tras recibir un evento dispara funciones en otros artefactos de nuestra infraestructura.

Independientemente de lo que pruebes, un runbook tiene tres componentes esenciales:

### 1. Requerimientos

Lo importante es documentar los requerimientos para preparar el entorno. Después de todo debemos reproducir el runbook en condiciones ya que el mínimo dato incorrecto puede romper toda la reproducción del runbook.

Los requerimientos deben estar muy detallados. El objetivo es describir el escenario ideal, un punto de partida para los pasos a reproducir.

### 2. Pasos Detallados

Aquí hay que ser específicos, muy específicos. Desde conectarse a una DB, llamar una API, etc. Todo lo que tengas que hacer, paso a paso.

### 3. Validación

Aquí vamos a responder el cómo validar que lo que hicimos está bien. Describimos qué debemos observar y considerar como OK.

## Runbooks vs Tests

Es importante aclarar que un runbook no reemplaza los tests. Son herramientas complementarias con propósitos distintos:

- **Tests unitarios**: Prueban una parte clave y precisa de tu código con un entorno controlado y no conectado a nada.
- **Tests de integración**: Son más complejos, pueden incluso levantar bases de datos para hacer las pruebas, pero siempre se hacen en un entorno controlado y acotado a una parte específica del proyecto.
- **Runbooks**: Hacen algo más allá: prueban una parte del producto específica y en un ambiente específico. Podemos tener runbooks para el ambiente local (quizás levantando los artefactos con docker compose), un ambiente de desarrollo o staging donde ya tenemos en la infraestructura los productos montados.

¿Y qué probamos? Podemos probar de todo, desde llamadas a APIs hasta UIs como carrito de compras o componentes específicos.

![Persona confundida comparando un libro de runbook con un documento de tests](./assets/confusion-runbook-vs-tests.png)

## Ejemplo Práctico: Lavar la Loza

Si lo piensas bien, lavar la loza no es complicado, lo hacemos todos los días, pero el mero acto requiere un montón de pasos clave, desde ponerse el delantal para no mojarnos, hasta usar jabón para la esponja.

### Requerimientos

- Platos sucios (no es lo mismo platos sucios con espagueti que con sopa)

### Pasos Detallados

1. Tomar el delantal (asumamos todos los pasos del cómo tomarse el delantal)
2. Echar jabón a la esponja
3. Encender el agua
4. Tomar el plato (tomaremos el plato más cercano)
5. Retirar la basura del plato
6. Frotar el plato con la esponja
7. Enjuagar el plato
8. Verificar que no quede suciedad
9. Secar el plato
10. Guardar el plato seco

### Validación

- Tener el plato limpio sin jabón y sin suciedad

## Automatización con IA y Skills

Escribir runbooks manualmente puede ser tedioso. La buena noticia es que podemos apoyarnos en agentes de IA para acelerar este proceso.

Solo necesitas un IDE con agente integrado (Claude, Copilot, Kiro, etc.) o un agente de terminal. A partir de ahí, usaremos **skills**: habilidades reutilizables que extienden las capacidades del agente. Este concepto existe en varios ecosistemas aunque con nombres distintos:

- **VSCode**: Instrucciones / Prompts
- **Kiro**: Steering

Los skills que veremos a continuación te permitirán generar y documentar runbooks de forma estructurada.

## Los Skills de Runbook

### runbook-generator

**URL**: https://github.com/jondotsoy/skills

```bash
npx skills add https://github.com/jondotsoy/skills --skill runbook-generator
```

Te ayudará a generar un runbook en tu directorio de trabajo. Solo debes pedir al agente algo como:

> "Crea un runbook para lavar la loza, el runbook servirá para limpiar los platos cuando estos estén sucios con espagueti..."

En tu prompt detalla lo más posible qué quieres reproducir. El skill generará el runbook, y luego que lo cree puedes editarlo hasta que quede como te guste.

### runbook-executor

**URL**: https://github.com/jondotsoy/skills

```bash
npx skills add https://github.com/jondotsoy/skills --skill runbook-executor
```

Nos ayudará a generar evidencia de las ejecuciones pasadas, porque después de todo, ¿qué sería de un runbook sin evidencia de que funcione?

Esto nos ayudará sobre todo a:

- Demostrar con nuestro equipo que logramos validar rápidamente que en algún momento funcionó
- Entender el estado del arte de nuestro proyecto

![Persona llevando una caja de ideas hacia la puerta de Claude AI](./assets/walk-to-claude.png)

## Consideraciones Importantes

Hay un tema importante que no debo dejar pasar: estos skills **NO TRABAJAN SOLOS**. No es que le pidas al agente algo como "ejecuta el runbook login" y ya. La realidad es que estos skills solo ayudan a generar documentación más completa.

Ahora bien, esto no excluye la posibilidad de que tus habilidades te permitan ejecutar el runbook con tu agente de tal manera que sean tan claros los procesos para ejecutar todos los pasos de manera autónoma. Sin embargo, eso lo puedes hacer creando un skill a tu medida o modificando estos según sea el proyecto.

Además, recomiendo complementar los skills con un archivo `AGENTS.md` en tu proyecto. Este archivo (más documentación en [agents.md](https://agents.md)) permite especificar configuraciones globales para el agente: tono de voz, idioma en que se deben escribir los documentos, convenciones del proyecto, entre otras. Por ejemplo, a mí me gusta incluir instrucciones como "siempre al finalizar de crear el runbook ejecuta `bun fmt` para formatear el documento".

## Conclusión

Cuando llegue alguien nuevo al equipo, cuando tengas que mantener código que no tocaste en meses, o cuando necesites demostrar que algo funcionaba antes de un cambio, los runbooks estarán ahí para respaldarte. Son la memoria viva de cómo funciona tu sistema.

Y con la ayuda de la IA para crearlos y documentar su ejecución, el esfuerzo de mantenerlos se reduce considerablemente. Así que ya no hay excusa: elige un escenario crítico, crea tu primer runbook y ejecútalo. Tu equipo y tu yo del futuro te lo agradecerán.

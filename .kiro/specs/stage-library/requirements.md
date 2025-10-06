---
title: Stage & Scene Animation Library
status: draft
created: 2025-10-05
---

# Stage & Scene Animation Library

## Descripción

Una librería para gestionar secuencias de animación/escenas que se ejecutan en bucle. Permite definir múltiples escenas con duración específica y callbacks de inicio/fin.

## User Stories

### US-1: Crear una escena individual

**Como** desarrollador  
**Quiero** crear una escena con duración y callbacks  
**Para** definir un paso en una secuencia de animación

**Criterios de aceptación:**

- Puedo crear una instancia de `Scene` con configuración de duración, start y stop
- La duración se especifica en milisegundos
- Los callbacks `start()` y `stop()` son opcionales
- La escena ejecuta `start()` al comenzar
- La escena ejecuta `stop()` al finalizar (después de la duración)

### US-2: Crear un stage con múltiples escenas

**Como** desarrollador  
**Quiero** crear un Stage con un array de escenas  
**Para** ejecutar una secuencia completa de animaciones

**Criterios de aceptación:**

- Puedo crear una instancia de `Stage` pasando un array de `Scene`
- El Stage acepta al menos una escena
- El Stage mantiene el orden de las escenas

### US-3: Ejecutar escenas en secuencia con loop

**Como** desarrollador  
**Quiero** que el Stage ejecute las escenas automáticamente en orden  
**Para** crear animaciones continuas sin intervención manual

**Criterios de aceptación:**

- Al crear el Stage, las escenas comienzan a ejecutarse automáticamente
- Cada escena ejecuta su `start()`, espera su duración, ejecuta su `stop()`
- Después de la última escena, el ciclo vuelve a comenzar desde la primera
- El loop continúa indefinidamente

### US-4: Detener el Stage

**Como** desarrollador  
**Quiero** poder detener el Stage con `stage.stop()`  
**Para** finalizar la secuencia de animaciones de forma controlada

**Criterios de aceptación:**

- WHEN llamo a `stage.stop()` THEN el Stage detiene la ejecución inmediatamente
- WHEN el Stage se detiene THEN se ejecuta el método `stop()` de la escena actualmente en curso
- WHEN el Stage se detiene THEN se cancelan todos los timeouts pendientes
- WHEN el Stage se detiene THEN no se inicia la siguiente escena en la secuencia
- WHEN el Stage se detiene THEN el loop no continúa

## Sintaxis Esperada

```typescript
const stage = new Stage([
  new Scene({
    duration: 1000, // 1 seg
    start: () => {
      console.log("run scene 1");
    },
    stop: () => {
      console.log("stop scene 1");
    },
  }),
  new Scene({
    duration: 5000, // 5 seg
    start: () => {
      console.log("run scene 2");
    },
    stop: () => {
      console.log("stop scene 2");
    },
  }),
]);

// Output esperado (loop automático):
// run scene 1
// [espera 1 seg]
// stop scene 1
// run scene 2
// [espera 5 seg]
// stop scene 2
// run scene 1
// [espera 1 seg]
// stop scene 1
// ...

// Detener el Stage:
stage.stop();
// Si se llama durante scene 2, ejecuta:
// stop scene 2
// [fin de la ejecución]
```

## Casos de Uso

1. **Animaciones de texto rotativas**: Mostrar diferentes mensajes en secuencia
2. **Carruseles automáticos**: Cambiar slides con tiempos específicos
3. **Estados de UI temporales**: Mostrar/ocultar elementos en secuencia
4. **Efectos visuales coordinados**: Sincronizar múltiples animaciones

## Consideraciones Técnicas

- Usar `setTimeout` para manejar las duraciones
- Limpiar timeouts al pausar/detener para evitar memory leaks
- TypeScript con tipos estrictos
- Sin dependencias externas
- Compatible con entorno browser (Astro/React)

## Alcance Inicial (MVP)

**Incluido:**

- Clase `Scene` con configuración de duración y callbacks
- Clase `Stage` que ejecuta escenas en loop automático
- Método `stage.stop()` para detener la ejecución

**No incluido (futuras iteraciones):**

- Pausar/reanudar (`pause()`/`resume()`)
- Cambiar escenas manualmente (`next()`/`prev()`)
- Modificar velocidad de reproducción
- Eventos/callbacks a nivel de Stage
- Agregar/remover escenas dinámicamente

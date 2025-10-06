---
title: Stage & Scene Animation Library - Design Document
status: draft
created: 2025-10-05
---

# Stage & Scene Animation Library - Design Document

## Overview

The Stage & Scene Animation Library is a lightweight, TypeScript-based animation sequencing system that enables developers to create looping sequences of timed scenes with lifecycle callbacks. The library provides two core classes: `Scene` for defining individual animation steps, and `Stage` for orchestrating multiple scenes in a continuous loop.

**Key Design Principles:**

- Zero external dependencies
- Browser-compatible (works with Astro/React)
- Type-safe with strict TypeScript
- Memory-efficient with proper cleanup
- Simple, intuitive API

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────┐
│           Stage                     │
│  ┌───────────────────────────────┐  │
│  │  Scene Management             │  │
│  │  - Scene queue                │  │
│  │  - Current scene index        │  │
│  │  - Loop control               │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Execution Engine             │  │
│  │  - Auto-start on creation     │  │
│  │  - Sequential execution       │  │
│  │  - Timeout management         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              │
              │ manages
              ▼
┌─────────────────────────────────────┐
│           Scene                     │
│  ┌───────────────────────────────┐  │
│  │  Configuration                │  │
│  │  - duration: number           │  │
│  │  - start?: () => void         │  │
│  │  - stop?: () => void          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Execution Flow

```
Stage Created
    │
    ▼
Auto-start
    │
    ▼
┌─────────────────┐
│ Execute Scene 1 │
│  - Call start() │
│  - Wait duration│
│  - Call stop()  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Execute Scene 2 │
│  - Call start() │
│  - Wait duration│
│  - Call stop()  │
└────────┬────────┘
         │
         ▼
    Loop back
    to Scene 1
    (infinite)
```

## Components and Interfaces

### Scene Class

**Purpose:** Encapsulates a single animation step with duration and lifecycle callbacks.

**Interface:**

```typescript
interface SceneConfig {
  duration?: number; // Duration in milliseconds (default: 1000)
  start?: () => void; // Optional callback when scene starts
  stop?: () => void; // Optional callback when scene ends
}

class Scene {
  constructor(config?: SceneConfig);

  // Public readonly properties
  readonly duration: number;
  readonly start?: () => void;
  readonly stop?: () => void;
}
```

**Design Decisions:**

- **Fully optional constructor**: Can be called as `new Scene()` with all defaults, maximizing simplicity
- **Default duration**: Duration defaults to 1000ms (1 second) if not specified, simplifying common use cases
- **Immutable configuration**: Scene properties are readonly to prevent accidental modification during execution
- **Optional callbacks**: Both `start` and `stop` are optional to support simple timing-only scenes
- **Simple constructor**: Single config object for clean instantiation
- **No internal state**: Scene is a pure data container; execution state lives in Stage

### Stage Class

**Purpose:** Orchestrates sequential execution of scenes in an infinite loop.

**Interface:**

```typescript
class Stage {
  constructor(scenes?: Scene[]);

  // Public methods
  stop(): void;

  // Private properties
  private scenes: Scene[];
  private currentSceneIndex: number;
  private timeoutId: number | null;
  private isRunning: boolean;
}
```

**Design Decisions:**

- **Optional scenes array**: Can be called as `new Stage()` to create an empty stage (no execution)
- **Auto-start on construction**: Simplifies API by eliminating need for explicit `start()` call when scenes are provided (addresses US-3)
- **Empty stage behavior**: Stage with no scenes does not execute (isRunning remains false)
- **Private execution state**: Encapsulates internal state to prevent external manipulation
- **Single timeout tracking**: Only one timeout active at a time for memory efficiency
- **Index-based scene tracking**: Enables efficient looping without array manipulation

## Data Models

### SceneConfig Type

```typescript
type SceneConfig = {
  duration?: number; // Must be positive integer (default: 1000)
  start?: () => void; // Optional initialization callback
  stop?: () => void; // Optional cleanup callback
};
```

**Validation:**

- Duration defaults to 1000ms if not provided
- If provided, duration must be a positive number (enforced at runtime)
- Callbacks are optional but must be functions if provided

### Internal Stage State

```typescript
// Internal state management (private to Stage)
{
  scenes: Scene[];              // Immutable scene array
  currentSceneIndex: number;    // 0-based index, wraps to 0 after last scene
  timeoutId: number | null;     // Current setTimeout ID for cleanup
  isRunning: boolean;           // Prevents multiple concurrent executions
}
```

## Core Algorithms

### Scene Execution Algorithm

```typescript
private executeScene(index: number): void {
  // 1. Validate running state
  if (!this.isRunning) return;

  // 2. Get current scene
  const scene = this.scenes[index];

  // 3. Execute start callback (if exists)
  scene.start?.();

  // 4. Schedule stop callback and next scene
  this.timeoutId = setTimeout(() => {
    // 4a. Execute stop callback (if exists)
    scene.stop?.();

    // 4b. Calculate next scene index (loop back to 0 after last)
    const nextIndex = (index + 1) % this.scenes.length;

    // 4c. Update current index
    this.currentSceneIndex = nextIndex;

    // 4d. Execute next scene
    this.executeScene(nextIndex);
  }, scene.duration);
}
```

**Key Points:**

- Uses modulo operator for seamless looping
- Checks `isRunning` flag to respect stop() calls
- Stores timeout ID for cleanup
- Recursive execution creates infinite loop

### Stop Algorithm

```typescript
public stop(): void {
  // 1. Set running flag to false
  this.isRunning = false;

  // 2. Execute stop callback of current scene (if scenes exist)
  if (this.scenes.length > 0) {
    const currentScene = this.scenes[this.currentSceneIndex];
    currentScene.stop?.();
  }

  // 3. Clear pending timeout
  if (this.timeoutId !== null) {
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }
}
```

**Key Points:**

- Immediately sets `isRunning` to false to prevent new executions
- Safely handles empty stage (no scenes to stop)
- Calls current scene's stop callback for cleanup
- Clears timeout to prevent memory leaks
- Idempotent (safe to call multiple times)

## Error Handling

### Validation Errors

**Scene Construction:**

- **No config provided**: Use all defaults (duration: 1000ms, no callbacks)
- **Invalid duration**: Throw `TypeError` if duration is provided and not a positive number
- **Invalid callbacks**: Throw `TypeError` if start/stop are provided but not functions

```typescript
constructor(config?: SceneConfig) {
  // Default to empty config if not provided
  const cfg = config ?? {};

  // Default duration to 1000ms if not provided
  const duration = cfg.duration ?? 1000;

  if (typeof duration !== 'number' || duration <= 0) {
    throw new TypeError('Scene duration must be a positive number');
  }

  if (cfg.start !== undefined && typeof cfg.start !== 'function') {
    throw new TypeError('Scene start must be a function');
  }

  if (cfg.stop !== undefined && typeof cfg.stop !== 'function') {
    throw new TypeError('Scene stop must be a function');
  }

  // ... assign properties
}
```

**Stage Construction:**

- **No scenes provided**: Create empty stage that does not execute (valid use case)
- **Empty scenes array**: Create empty stage that does not execute (valid use case)
- **Invalid scenes**: Throw `TypeError` if array contains non-Scene instances

```typescript
constructor(scenes?: Scene[]) {
  // Default to empty array if not provided
  const sceneArray = scenes ?? [];

  // Validate all items are Scene instances
  if (!sceneArray.every(scene => scene instanceof Scene)) {
    throw new TypeError('All items must be Scene instances');
  }

  this.scenes = sceneArray;

  // Only start execution if there are scenes
  if (this.scenes.length > 0) {
    // ... initialize and start
  }
}
```

### Runtime Error Handling

**Callback Errors:**

- Wrap callback executions in try-catch to prevent one scene's error from breaking the loop
- Log errors to console but continue execution

```typescript
private safeExecuteCallback(callback?: () => void, context: string): void {
  if (!callback) return;

  try {
    callback();
  } catch (error) {
    console.error(`Error in ${context}:`, error);
    // Continue execution despite error
  }
}
```

**Design Rationale:**

- Defensive programming prevents library errors from crashing user applications
- Console logging provides debugging visibility
- Continued execution maintains animation flow even if one callback fails

## Testing Strategy

### Unit Tests (Optional)

**Test Framework:**

- Use Bun's built-in test runner (`bun:test`)
- Test files located alongside implementation files with `.spec.ts` extension
- Run tests with `bun test <spec file>`

**Test File Structure:**

```typescript
import { test, describe, expect } from "bun:test";
import { Scene } from "./Scene";
import { Stage } from "./Stage";

describe("Scene", () => {
  test("should create scene with defaults", () => {
    // test implementation
  });
});
```

**Scene Class Tests (`src/lib/stage/Scene.spec.ts`):**

- ✓ Constructor can be called without arguments (`new Scene()`)
- ✓ Constructor accepts valid configuration
- ✓ Constructor uses default duration of 1000ms when not provided
- ✓ Constructor throws on invalid duration
- ✓ Constructor throws on invalid callbacks
- ✓ Properties are readonly
- ✓ Optional callbacks can be omitted

**Stage Class Tests (`src/lib/stage/Stage.spec.ts`):**

- ✓ Constructor can be called without arguments (`new Stage()`)
- ✓ Constructor accepts empty scenes array (no execution)
- ✓ Constructor throws on invalid scene types
- ✓ Empty stage does not execute
- ✓ Auto-starts execution on construction when scenes provided
- ✓ Executes scenes in order
- ✓ Loops back to first scene after last
- ✓ Respects scene durations (timing tests)
- ✓ Calls start callbacks at scene start
- ✓ Calls stop callbacks at scene end
- ✓ stop() method halts execution
- ✓ stop() on empty stage does nothing (safe)
- ✓ stop() calls current scene's stop callback
- ✓ stop() clears pending timeouts
- ✓ stop() is idempotent

### Integration Tests

**End-to-End Scenarios:**

- ✓ Complete loop cycle with multiple scenes
- ✓ Stopping during different scenes
- ✓ Scenes with only start callbacks
- ✓ Scenes with only stop callbacks
- ✓ Scenes with no callbacks
- ✓ Single scene stage (edge case)
- ✓ Empty stage creation and stop (edge case)

### Manual Testing

**Browser Compatibility:**

- Test in Chrome, Firefox, Safari
- Verify setTimeout behavior
- Check memory usage over extended loops
- Validate no memory leaks after stop()

## Implementation Notes

### File Structure

```
src/lib/
  ├── stage/
  │   ├── Scene.ts       # Scene class implementation
  │   ├── Scene.spec.ts  # Scene unit tests (Bun)
  │   ├── Stage.ts       # Stage class implementation
  │   ├── Stage.spec.ts  # Stage unit tests (Bun)
  │   └── index.ts       # Public exports
```

### TypeScript Configuration

- Use strict mode for type safety
- Export types for consumer use
- No `any` types allowed
- Prefer readonly where applicable

### Browser Compatibility

- Use `setTimeout` (universally supported)
- Avoid Node.js-specific APIs
- No DOM dependencies (pure logic)
- Compatible with Astro's SSR and client-side hydration

### Performance Considerations

- **Memory**: Single timeout per Stage instance
- **CPU**: Minimal overhead (just callback execution)
- **Cleanup**: Proper timeout clearing prevents leaks
- **Scalability**: Supports arbitrary number of scenes

## Future Enhancements (Out of Scope)

The following features are explicitly excluded from the MVP but documented for future consideration:

1. **Pause/Resume**: `stage.pause()` and `stage.resume()` methods
2. **Manual Navigation**: `stage.next()`, `stage.prev()`, `stage.goTo(index)`
3. **Playback Speed**: `stage.setSpeed(multiplier)` to speed up/slow down
4. **Stage Events**: Event emitters for scene changes, loop completion
5. **Dynamic Scene Management**: `stage.addScene()`, `stage.removeScene()`
6. **Scene Metadata**: Names, IDs, tags for scene identification
7. **Conditional Scenes**: Skip scenes based on runtime conditions
8. **Nested Stages**: Stages within scenes for complex compositions

## Requirements Traceability

| Requirement | Design Component                    | Implementation Location               |
| ----------- | ----------------------------------- | ------------------------------------- |
| US-1        | Scene class with SceneConfig        | Scene.ts                              |
| US-2        | Stage constructor accepting Scene[] | Stage.ts constructor                  |
| US-3        | Auto-start + executeScene algorithm | Stage.ts constructor + executeScene() |
| US-4        | stop() method with cleanup          | Stage.ts stop()                       |

All acceptance criteria from the requirements document are addressed in this design.

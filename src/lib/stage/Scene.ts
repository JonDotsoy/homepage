/**
 * Configuration options for a Scene
 */
export interface SceneConfig {
  /** Duration in milliseconds (default: 1000) */
  duration?: number;
  /** Optional callback when scene starts */
  start?: () => void;
  /** Optional callback when scene ends */
  stop?: () => void;
}

/**
 * Represents a single animation step with duration and lifecycle callbacks
 */
export class Scene {
  readonly duration: number;
  readonly start?: () => void;
  readonly stop?: () => void;

  constructor(config?: SceneConfig) {
    // Default to empty config if not provided
    const cfg = config ?? {};

    // Default duration to 1000ms if not provided
    const duration = cfg.duration ?? 1000;

    // Validate duration is a positive number (not NaN, not Infinity, not negative/zero)
    if (typeof duration !== "number" || duration <= 0 || !isFinite(duration)) {
      throw new TypeError("Scene duration must be a positive number");
    }

    // Validate start callback if provided
    if (cfg.start !== undefined && typeof cfg.start !== "function") {
      throw new TypeError("Scene start must be a function");
    }

    // Validate stop callback if provided
    if (cfg.stop !== undefined && typeof cfg.stop !== "function") {
      throw new TypeError("Scene stop must be a function");
    }

    // Assign validated properties
    this.duration = duration;
    this.start = cfg.start;
    this.stop = cfg.stop;
  }
}

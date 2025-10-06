import { Scene } from "./Scene";

/**
 * Orchestrates sequential execution of scenes in an infinite loop
 */
export class Stage {
  private scenes: Scene[];
  private currentSceneIndex: number;
  private timeoutId: number | null;
  private isRunning: boolean;

  constructor(scenes?: Scene[]) {
    // Default to empty array if not provided
    const sceneArray = scenes ?? [];

    // Validate all items are Scene instances
    if (!sceneArray.every((scene) => scene instanceof Scene)) {
      throw new TypeError("All items must be Scene instances");
    }

    // Initialize private properties
    this.scenes = sceneArray;
    this.currentSceneIndex = 0;
    this.timeoutId = null;
    this.isRunning = false;

    // Handle empty stage case (no execution)
    // Only start execution if there are scenes
    if (this.scenes.length > 0) {
      this.isRunning = true;
      // Auto-start execution
      this.executeScene(0);
    }
  }

  /**
   * Executes a scene at the specified index
   * @param index - The index of the scene to execute
   */
  private executeScene(index: number): void {
    // Check isRunning flag before execution
    if (!this.isRunning) return;

    // Get current scene
    const scene = this.scenes[index];

    // Execute start callback (if exists) with error handling
    if (scene.start) {
      try {
        scene.start();
      } catch (error) {
        console.error(`Error in scene ${index} start callback:`, error);
      }
    }

    // Schedule stop callback and next scene
    this.timeoutId = setTimeout(() => {
      // Execute stop callback (if exists) with error handling
      if (scene.stop) {
        try {
          scene.stop();
        } catch (error) {
          console.error(`Error in scene ${index} stop callback:`, error);
        }
      }

      // Calculate next scene index using modulo for looping
      const nextIndex = (index + 1) % this.scenes.length;

      // Update current index
      this.currentSceneIndex = nextIndex;

      // Recursively call executeScene for next scene
      this.executeScene(nextIndex);
    }, scene.duration) as unknown as number;
  }

  /**
   * Stops the stage execution and performs cleanup
   * Safe to call multiple times (idempotent)
   */
  public stop(): void {
    // If already stopped, do nothing (idempotent)
    if (!this.isRunning) {
      return;
    }

    // Set isRunning flag to false
    this.isRunning = false;

    // Call stop callback of current scene (if scenes exist) with error handling
    if (this.scenes.length > 0) {
      const currentScene = this.scenes[this.currentSceneIndex];
      if (currentScene.stop) {
        try {
          currentScene.stop();
        } catch (error) {
          console.error(
            `Error in scene ${this.currentSceneIndex} stop callback during stage stop:`,
            error,
          );
        }
      }
    }

    // Clear pending timeout using clearTimeout
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

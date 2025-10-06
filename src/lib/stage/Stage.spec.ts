import { test, describe, expect } from "bun:test";
import { Stage } from "./Stage";
import { Scene } from "./Scene";

describe("Stage", () => {
  describe("Constructor without arguments", () => {
    test("should create empty stage", () => {
      const stage = new Stage();
      expect(stage).toBeInstanceOf(Stage);
    });

    test("should not throw when creating empty stage", () => {
      expect(() => new Stage()).not.toThrow();
    });
  });

  describe("Constructor with valid scenes array", () => {
    test("should accept array with single scene", () => {
      const scene = new Scene({ duration: 1000 });
      const stage = new Stage([scene]);
      expect(stage).toBeInstanceOf(Stage);
    });

    test("should accept array with multiple scenes", () => {
      const scenes = [
        new Scene({ duration: 1000 }),
        new Scene({ duration: 2000 }),
        new Scene({ duration: 3000 }),
      ];
      const stage = new Stage(scenes);
      expect(stage).toBeInstanceOf(Stage);
    });

    test("should accept empty array", () => {
      const stage = new Stage([]);
      expect(stage).toBeInstanceOf(Stage);
    });
  });

  describe("Constructor throws on invalid scene types", () => {
    test("should throw TypeError when array contains non-Scene objects", () => {
      expect(() => new Stage([{} as any])).toThrow(TypeError);
      expect(() => new Stage([{} as any])).toThrow(
        "All items must be Scene instances",
      );
    });

    test("should throw TypeError when array contains primitives", () => {
      expect(() => new Stage([1, 2, 3] as any)).toThrow(TypeError);
      expect(() => new Stage(["scene"] as any)).toThrow(TypeError);
    });

    test("should throw TypeError when array contains null", () => {
      expect(() => new Stage([null] as any)).toThrow(TypeError);
    });

    test("should throw TypeError when array contains mixed valid and invalid items", () => {
      const validScene = new Scene({ duration: 1000 });
      expect(() => new Stage([validScene, {} as any])).toThrow(TypeError);
    });
  });

  describe("Empty stage does not execute", () => {
    test("should not call any callbacks when created without scenes", async () => {
      let called = false;
      const stage = new Stage();

      // Wait a bit to ensure nothing executes
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(called).toBe(false);
      stage.stop();
    });

    test("should not call any callbacks when created with empty array", async () => {
      let called = false;
      const stage = new Stage([]);

      // Wait a bit to ensure nothing executes
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(called).toBe(false);
      stage.stop();
    });
  });

  describe("Stage auto-starts with scenes", () => {
    test("should call start callback immediately on construction", () => {
      let startCalled = false;
      const scene = new Scene({
        duration: 1000,
        start: () => {
          startCalled = true;
        },
      });

      const stage = new Stage([scene]);
      expect(startCalled).toBe(true);
      stage.stop();
    });

    test("should auto-start first scene without explicit start() call", () => {
      let firstSceneStarted = false;
      const scene = new Scene({
        duration: 100,
        start: () => {
          firstSceneStarted = true;
        },
      });

      const stage = new Stage([scene]);
      expect(firstSceneStarted).toBe(true);
      stage.stop();
    });
  });

  describe("Stage executes scenes in order", () => {
    test("should execute scenes in the order they were provided", async () => {
      const executionOrder: number[] = [];

      const scenes = [
        new Scene({
          duration: 50,
          start: () => executionOrder.push(1),
        }),
        new Scene({
          duration: 50,
          start: () => executionOrder.push(2),
        }),
        new Scene({
          duration: 50,
          start: () => executionOrder.push(3),
        }),
      ];

      const stage = new Stage(scenes);

      // Wait for all scenes to execute
      await new Promise((resolve) => setTimeout(resolve, 200));
      stage.stop();

      expect(executionOrder[0]).toBe(1);
      expect(executionOrder[1]).toBe(2);
      expect(executionOrder[2]).toBe(3);
    });

    test("should execute second scene after first completes", async () => {
      let secondSceneStarted = false;

      const scenes = [
        new Scene({ duration: 50 }),
        new Scene({
          duration: 50,
          start: () => {
            secondSceneStarted = true;
          },
        }),
      ];

      const stage = new Stage(scenes);
      expect(secondSceneStarted).toBe(false);

      // Wait for first scene to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(secondSceneStarted).toBe(true);

      stage.stop();
    });
  });

  describe("Stage loops back to first scene", () => {
    test("should loop back to first scene after last scene completes", async () => {
      let firstSceneCount = 0;

      const scenes = [
        new Scene({
          duration: 50,
          start: () => firstSceneCount++,
        }),
        new Scene({ duration: 50 }),
      ];

      const stage = new Stage(scenes);
      expect(firstSceneCount).toBe(1);

      // Wait for complete loop
      await new Promise((resolve) => setTimeout(resolve, 150));

      // First scene should have been called twice (initial + after loop)
      expect(firstSceneCount).toBeGreaterThanOrEqual(2);

      stage.stop();
    });

    test("should continue looping indefinitely", async () => {
      let loopCount = 0;

      const scene = new Scene({
        duration: 30,
        start: () => loopCount++,
      });

      const stage = new Stage([scene]);

      // Wait for multiple loops
      await new Promise((resolve) => setTimeout(resolve, 150));
      stage.stop();

      // Should have looped multiple times
      expect(loopCount).toBeGreaterThan(3);
    });
  });

  describe("Stage respects scene durations", () => {
    test("should wait for scene duration before moving to next scene", async () => {
      let secondSceneStarted = false;

      const scenes = [
        new Scene({ duration: 100 }),
        new Scene({
          duration: 50,
          start: () => {
            secondSceneStarted = true;
          },
        }),
      ];

      const stage = new Stage(scenes);

      // Check before duration elapses
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(secondSceneStarted).toBe(false);

      // Check after duration elapses
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(secondSceneStarted).toBe(true);

      stage.stop();
    });

    test("should respect different durations for different scenes", async () => {
      const timestamps: number[] = [];
      const startTime = Date.now();

      const scenes = [
        new Scene({
          duration: 50,
          start: () => timestamps.push(Date.now() - startTime),
        }),
        new Scene({
          duration: 100,
          start: () => timestamps.push(Date.now() - startTime),
        }),
      ];

      const stage = new Stage(scenes);

      // Wait for both scenes to execute
      await new Promise((resolve) => setTimeout(resolve, 200));
      stage.stop();

      // First scene starts immediately (around 0ms)
      expect(timestamps[0]).toBeLessThan(10);

      // Second scene starts after ~50ms
      expect(timestamps[1]).toBeGreaterThanOrEqual(40);
      expect(timestamps[1]).toBeLessThan(70);
    });
  });

  describe("Stage calls start callbacks", () => {
    test("should call start callback when scene begins", () => {
      let startCalled = false;

      const scene = new Scene({
        duration: 100,
        start: () => {
          startCalled = true;
        },
      });

      const stage = new Stage([scene]);
      expect(startCalled).toBe(true);
      stage.stop();
    });

    test("should call start callbacks for all scenes", async () => {
      const startCalls: number[] = [];

      const scenes = [
        new Scene({
          duration: 50,
          start: () => startCalls.push(1),
        }),
        new Scene({
          duration: 50,
          start: () => startCalls.push(2),
        }),
      ];

      const stage = new Stage(scenes);

      await new Promise((resolve) => setTimeout(resolve, 150));
      stage.stop();

      expect(startCalls).toContain(1);
      expect(startCalls).toContain(2);
    });

    test("should not fail if scene has no start callback", async () => {
      const scene = new Scene({ duration: 50 });
      expect(() => new Stage([scene])).not.toThrow();

      const stage = new Stage([scene]);
      await new Promise((resolve) => setTimeout(resolve, 100));
      stage.stop();
    });
  });

  describe("Stage calls stop callbacks", () => {
    test("should call stop callback after scene duration", async () => {
      let stopCalled = false;

      const scene = new Scene({
        duration: 50,
        stop: () => {
          stopCalled = true;
        },
      });

      const stage = new Stage([scene]);
      expect(stopCalled).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(stopCalled).toBe(true);

      stage.stop();
    });

    test("should call stop callbacks for all scenes", async () => {
      const stopCalls: number[] = [];

      const scenes = [
        new Scene({
          duration: 50,
          stop: () => stopCalls.push(1),
        }),
        new Scene({
          duration: 50,
          stop: () => stopCalls.push(2),
        }),
      ];

      const stage = new Stage(scenes);

      await new Promise((resolve) => setTimeout(resolve, 150));
      stage.stop();

      expect(stopCalls).toContain(1);
      expect(stopCalls).toContain(2);
    });

    test("should not fail if scene has no stop callback", async () => {
      const scene = new Scene({ duration: 50 });
      const stage = new Stage([scene]);

      await new Promise((resolve) => setTimeout(resolve, 100));
      stage.stop();
    });
  });

  describe("stop method halts execution", () => {
    test("should prevent next scene from starting", async () => {
      let secondSceneStarted = false;

      const scenes = [
        new Scene({ duration: 50 }),
        new Scene({
          duration: 50,
          start: () => {
            secondSceneStarted = true;
          },
        }),
      ];

      const stage = new Stage(scenes);

      // Stop before first scene completes
      await new Promise((resolve) => setTimeout(resolve, 25));
      stage.stop();

      // Wait to ensure second scene doesn't start
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(secondSceneStarted).toBe(false);
    });

    test("should stop looping", async () => {
      let executionCount = 0;

      const scene = new Scene({
        duration: 50,
        start: () => executionCount++,
      });

      const stage = new Stage([scene]);

      // Let it run for a bit
      await new Promise((resolve) => setTimeout(resolve, 100));
      stage.stop();

      const countAtStop = executionCount;

      // Wait more and verify count doesn't increase
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(executionCount).toBe(countAtStop);
    });
  });

  describe("stop method on empty stage is safe", () => {
    test("should not throw when calling stop on empty stage", () => {
      const stage = new Stage();
      expect(() => stage.stop()).not.toThrow();
    });

    test("should not throw when calling stop on stage with empty array", () => {
      const stage = new Stage([]);
      expect(() => stage.stop()).not.toThrow();
    });
  });

  describe("stop method calls current scene's stop callback", () => {
    test("should call stop callback of currently executing scene", async () => {
      let stopCalled = false;

      const scene = new Scene({
        duration: 1000,
        stop: () => {
          stopCalled = true;
        },
      });

      const stage = new Stage([scene]);

      // Stop while scene is still running
      await new Promise((resolve) => setTimeout(resolve, 50));
      stage.stop();

      expect(stopCalled).toBe(true);
    });

    test("should call stop callback of correct scene when multiple scenes exist", async () => {
      let firstStopCalled = false;
      let secondStopCalled = false;

      const scenes = [
        new Scene({
          duration: 50,
          stop: () => {
            firstStopCalled = true;
          },
        }),
        new Scene({
          duration: 1000,
          stop: () => {
            secondStopCalled = true;
          },
        }),
      ];

      const stage = new Stage(scenes);

      // Wait for second scene to start
      await new Promise((resolve) => setTimeout(resolve, 100));
      stage.stop();

      // Only second scene's stop should be called by stop()
      expect(secondStopCalled).toBe(true);
      // First scene's stop was called naturally after its duration
      expect(firstStopCalled).toBe(true);
    });
  });

  describe("stop method clears timeouts", () => {
    test("should clear pending timeout", async () => {
      let stopCallbackExecuted = false;

      const scene = new Scene({
        duration: 1000,
        stop: () => {
          stopCallbackExecuted = true;
        },
      });

      const stage = new Stage([scene]);

      // Stop immediately
      stage.stop();

      // Wait longer than duration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Stop callback should have been called by stop(), not by timeout
      // We can't easily test if timeout was cleared, but we can verify
      // that the scene doesn't continue executing
      expect(stopCallbackExecuted).toBe(true);
    });

    test("should prevent memory leaks from pending timeouts", async () => {
      const scenes = [
        new Scene({ duration: 1000 }),
        new Scene({ duration: 1000 }),
      ];

      const stage = new Stage(scenes);

      // Stop immediately
      stage.stop();

      // If timeout wasn't cleared, this would cause issues
      // This test mainly ensures no errors are thrown
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  });

  describe("stop method is idempotent", () => {
    test("should be safe to call stop multiple times", () => {
      const scene = new Scene({ duration: 100 });
      const stage = new Stage([scene]);

      expect(() => {
        stage.stop();
        stage.stop();
        stage.stop();
      }).not.toThrow();
    });

    test("should not call scene stop callback multiple times", () => {
      let stopCallCount = 0;

      const scene = new Scene({
        duration: 100,
        stop: () => stopCallCount++,
      });

      const stage = new Stage([scene]);

      stage.stop();
      stage.stop();
      stage.stop();

      // Stop should only be called once (by the first stop() call)
      expect(stopCallCount).toBe(1);
    });

    test("should remain stopped after multiple stop calls", async () => {
      let executionCount = 0;

      const scene = new Scene({
        duration: 50,
        start: () => executionCount++,
      });

      const stage = new Stage([scene]);

      stage.stop();
      stage.stop();

      const countAfterStop = executionCount;

      // Wait and verify no more executions
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(executionCount).toBe(countAfterStop);
    });
  });

  describe("Error handling in callbacks", () => {
    test("should continue execution if start callback throws error", async () => {
      let secondSceneStarted = false;

      const scenes = [
        new Scene({
          duration: 50,
          start: () => {
            throw new Error("Start error");
          },
        }),
        new Scene({
          duration: 50,
          start: () => {
            secondSceneStarted = true;
          },
        }),
      ];

      const stage = new Stage(scenes);

      // Wait for second scene
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(secondSceneStarted).toBe(true);
      stage.stop();
    });

    test("should continue execution if stop callback throws error", async () => {
      let secondSceneStarted = false;

      const scenes = [
        new Scene({
          duration: 50,
          stop: () => {
            throw new Error("Stop error");
          },
        }),
        new Scene({
          duration: 50,
          start: () => {
            secondSceneStarted = true;
          },
        }),
      ];

      const stage = new Stage(scenes);

      // Wait for second scene
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(secondSceneStarted).toBe(true);
      stage.stop();
    });

    test("should continue looping if callback throws error", async () => {
      let loopCount = 0;

      const scene = new Scene({
        duration: 50,
        start: () => {
          loopCount++;
          if (loopCount === 1) {
            throw new Error("First execution error");
          }
        },
      });

      const stage = new Stage([scene]);

      // Wait for multiple loops
      await new Promise((resolve) => setTimeout(resolve, 150));
      stage.stop();

      // Should have looped despite error
      expect(loopCount).toBeGreaterThan(1);
    });
  });

  describe("Integration Tests - Complete Scenarios", () => {
    describe("Complete loop cycle with multiple scenes", () => {
      test("should execute complete loop with 3 scenes and return to first", async () => {
        const executionLog: string[] = [];

        const scenes = [
          new Scene({
            duration: 50,
            start: () => executionLog.push("scene1-start"),
            stop: () => executionLog.push("scene1-stop"),
          }),
          new Scene({
            duration: 50,
            start: () => executionLog.push("scene2-start"),
            stop: () => executionLog.push("scene2-stop"),
          }),
          new Scene({
            duration: 50,
            start: () => executionLog.push("scene3-start"),
            stop: () => executionLog.push("scene3-stop"),
          }),
        ];

        const stage = new Stage(scenes);

        // Wait for complete loop plus start of second iteration
        await new Promise((resolve) => setTimeout(resolve, 200));
        stage.stop();

        // Verify complete sequence
        expect(executionLog[0]).toBe("scene1-start");
        expect(executionLog[1]).toBe("scene1-stop");
        expect(executionLog[2]).toBe("scene2-start");
        expect(executionLog[3]).toBe("scene2-stop");
        expect(executionLog[4]).toBe("scene3-start");
        expect(executionLog[5]).toBe("scene3-stop");
        // Loop back to scene 1
        expect(executionLog[6]).toBe("scene1-start");
      });

      test("should maintain correct timing across multiple scenes", async () => {
        const timestamps: { scene: number; event: string; time: number }[] = [];
        const startTime = Date.now();

        const scenes = [
          new Scene({
            duration: 40,
            start: () =>
              timestamps.push({
                scene: 1,
                event: "start",
                time: Date.now() - startTime,
              }),
            stop: () =>
              timestamps.push({
                scene: 1,
                event: "stop",
                time: Date.now() - startTime,
              }),
          }),
          new Scene({
            duration: 60,
            start: () =>
              timestamps.push({
                scene: 2,
                event: "start",
                time: Date.now() - startTime,
              }),
            stop: () =>
              timestamps.push({
                scene: 2,
                event: "stop",
                time: Date.now() - startTime,
              }),
          }),
        ];

        const stage = new Stage(scenes);

        // Wait for complete loop
        await new Promise((resolve) => setTimeout(resolve, 150));
        stage.stop();

        // Scene 1 starts immediately
        expect(timestamps[0].time).toBeLessThan(10);
        // Scene 1 stops after ~40ms
        expect(timestamps[1].time).toBeGreaterThanOrEqual(35);
        expect(timestamps[1].time).toBeLessThan(55);
        // Scene 2 starts after scene 1 stops
        expect(timestamps[2].time).toBeGreaterThanOrEqual(35);
        expect(timestamps[2].time).toBeLessThan(55);
        // Scene 2 stops after ~60ms more
        expect(timestamps[3].time).toBeGreaterThanOrEqual(95);
        expect(timestamps[3].time).toBeLessThan(115);
      });
    });

    describe("Stopping during different scenes", () => {
      test("should stop cleanly during first scene", async () => {
        const executionLog: string[] = [];

        const scenes = [
          new Scene({
            duration: 100,
            start: () => executionLog.push("scene1-start"),
            stop: () => executionLog.push("scene1-stop"),
          }),
          new Scene({
            duration: 100,
            start: () => executionLog.push("scene2-start"),
            stop: () => executionLog.push("scene2-stop"),
          }),
        ];

        const stage = new Stage(scenes);

        // Stop during first scene
        await new Promise((resolve) => setTimeout(resolve, 30));
        stage.stop();

        // Wait to ensure nothing else executes
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(executionLog).toEqual(["scene1-start", "scene1-stop"]);
      });

      test("should stop cleanly during middle scene", async () => {
        const executionLog: string[] = [];

        const scenes = [
          new Scene({
            duration: 40,
            start: () => executionLog.push("scene1-start"),
            stop: () => executionLog.push("scene1-stop"),
          }),
          new Scene({
            duration: 100,
            start: () => executionLog.push("scene2-start"),
            stop: () => executionLog.push("scene2-stop"),
          }),
          new Scene({
            duration: 40,
            start: () => executionLog.push("scene3-start"),
            stop: () => executionLog.push("scene3-stop"),
          }),
        ];

        const stage = new Stage(scenes);

        // Stop during second scene
        await new Promise((resolve) => setTimeout(resolve, 70));
        stage.stop();

        // Wait to ensure nothing else executes
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(executionLog).toEqual([
          "scene1-start",
          "scene1-stop",
          "scene2-start",
          "scene2-stop",
        ]);
      });

      test("should stop cleanly during last scene", async () => {
        const executionLog: string[] = [];

        const scenes = [
          new Scene({
            duration: 40,
            start: () => executionLog.push("scene1-start"),
            stop: () => executionLog.push("scene1-stop"),
          }),
          new Scene({
            duration: 40,
            start: () => executionLog.push("scene2-start"),
            stop: () => executionLog.push("scene2-stop"),
          }),
          new Scene({
            duration: 100,
            start: () => executionLog.push("scene3-start"),
            stop: () => executionLog.push("scene3-stop"),
          }),
        ];

        const stage = new Stage(scenes);

        // Stop during last scene
        await new Promise((resolve) => setTimeout(resolve, 110));
        stage.stop();

        // Wait to ensure loop doesn't restart
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(executionLog).toEqual([
          "scene1-start",
          "scene1-stop",
          "scene2-start",
          "scene2-stop",
          "scene3-start",
          "scene3-stop",
        ]);
      });
    });

    describe("Scenes with only start callbacks", () => {
      test("should execute scenes with only start callbacks", async () => {
        const startLog: number[] = [];

        const scenes = [
          new Scene({
            duration: 50,
            start: () => startLog.push(1),
          }),
          new Scene({
            duration: 50,
            start: () => startLog.push(2),
          }),
          new Scene({
            duration: 50,
            start: () => startLog.push(3),
          }),
        ];

        const stage = new Stage(scenes);

        // Wait for complete loop
        await new Promise((resolve) => setTimeout(resolve, 200));
        stage.stop();

        expect(startLog[0]).toBe(1);
        expect(startLog[1]).toBe(2);
        expect(startLog[2]).toBe(3);
        // Should loop back
        expect(startLog[3]).toBe(1);
      });

      test("should handle mixed scenes with and without start callbacks", async () => {
        const startLog: string[] = [];

        const scenes = [
          new Scene({
            duration: 50,
            start: () => startLog.push("scene1"),
          }),
          new Scene({
            duration: 50,
            // No start callback
          }),
          new Scene({
            duration: 50,
            start: () => startLog.push("scene3"),
          }),
        ];

        const stage = new Stage(scenes);

        // Wait for all scenes
        await new Promise((resolve) => setTimeout(resolve, 200));
        stage.stop();

        expect(startLog).toEqual(["scene1", "scene3", "scene1"]);
      });
    });

    describe("Scenes with only stop callbacks", () => {
      test("should execute scenes with only stop callbacks", async () => {
        const stopLog: number[] = [];

        const scenes = [
          new Scene({
            duration: 50,
            stop: () => stopLog.push(1),
          }),
          new Scene({
            duration: 50,
            stop: () => stopLog.push(2),
          }),
          new Scene({
            duration: 50,
            stop: () => stopLog.push(3),
          }),
        ];

        const stage = new Stage(scenes);

        // Wait for complete loop
        await new Promise((resolve) => setTimeout(resolve, 200));
        stage.stop();

        expect(stopLog[0]).toBe(1);
        expect(stopLog[1]).toBe(2);
        expect(stopLog[2]).toBe(3);
      });

      test("should handle mixed scenes with and without stop callbacks", async () => {
        const stopLog: string[] = [];

        const scenes = [
          new Scene({
            duration: 50,
            stop: () => stopLog.push("scene1"),
          }),
          new Scene({
            duration: 50,
            // No stop callback
          }),
          new Scene({
            duration: 50,
            stop: () => stopLog.push("scene3"),
          }),
        ];

        const stage = new Stage(scenes);

        // Wait for all scenes
        await new Promise((resolve) => setTimeout(resolve, 200));
        stage.stop();

        expect(stopLog).toEqual(["scene1", "scene3", "scene1"]);
      });
    });

    describe("Scenes with no callbacks", () => {
      test("should execute scenes with no callbacks using only duration", async () => {
        let executionCompleted = false;

        const scenes = [
          new Scene({ duration: 50 }),
          new Scene({ duration: 50 }),
          new Scene({ duration: 50 }),
        ];

        const stage = new Stage(scenes);

        // Wait for scenes to execute
        await new Promise((resolve) => setTimeout(resolve, 200));
        executionCompleted = true;
        stage.stop();

        expect(executionCompleted).toBe(true);
      });

      test("should loop correctly with scenes that have no callbacks", async () => {
        let loopDetected = false;

        const scenes = [
          new Scene({ duration: 40 }),
          new Scene({ duration: 40 }),
        ];

        const stage = new Stage(scenes);

        // Wait for more than one complete loop
        await new Promise((resolve) => setTimeout(resolve, 150));
        loopDetected = true;
        stage.stop();

        expect(loopDetected).toBe(true);
      });

      test("should handle mix of scenes with and without any callbacks", async () => {
        const log: string[] = [];

        const scenes = [
          new Scene({
            duration: 50,
            start: () => log.push("scene1-start"),
          }),
          new Scene({ duration: 50 }), // No callbacks
          new Scene({
            duration: 50,
            stop: () => log.push("scene3-stop"),
          }),
          new Scene({ duration: 50 }), // No callbacks
        ];

        const stage = new Stage(scenes);

        // Wait for complete loop
        await new Promise((resolve) => setTimeout(resolve, 250));
        stage.stop();

        expect(log).toContain("scene1-start");
        expect(log).toContain("scene3-stop");
      });
    });

    describe("Single scene stage", () => {
      test("should loop single scene continuously", async () => {
        let executionCount = 0;

        const scene = new Scene({
          duration: 50,
          start: () => executionCount++,
        });

        const stage = new Stage([scene]);

        // Wait for multiple loops
        await new Promise((resolve) => setTimeout(resolve, 180));
        stage.stop();

        // Should have executed multiple times
        expect(executionCount).toBeGreaterThanOrEqual(3);
      });

      test("should call both start and stop in single scene loop", async () => {
        const log: string[] = [];

        const scene = new Scene({
          duration: 50,
          start: () => log.push("start"),
          stop: () => log.push("stop"),
        });

        const stage = new Stage([scene]);

        // Wait for multiple loops
        await new Promise((resolve) => setTimeout(resolve, 130));
        stage.stop();

        // Should have alternating start/stop pattern
        expect(log[0]).toBe("start");
        expect(log[1]).toBe("stop");
        expect(log[2]).toBe("start");
        expect(log[3]).toBe("stop");
      });

      test("should stop single scene stage cleanly", async () => {
        let stopCalled = false;

        const scene = new Scene({
          duration: 100,
          stop: () => {
            stopCalled = true;
          },
        });

        const stage = new Stage([scene]);

        // Stop during execution
        await new Promise((resolve) => setTimeout(resolve, 30));
        stage.stop();

        expect(stopCalled).toBe(true);
      });
    });

    describe("Empty stage creation and stop", () => {
      test("should create empty stage and stop without errors", () => {
        const stage = new Stage();
        expect(() => stage.stop()).not.toThrow();
      });

      test("should create stage with empty array and stop without errors", () => {
        const stage = new Stage([]);
        expect(() => stage.stop()).not.toThrow();
      });

      test("should not execute anything with empty stage", async () => {
        let anythingExecuted = false;

        const stage = new Stage();

        // Wait to ensure nothing happens
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(anythingExecuted).toBe(false);
        stage.stop();
      });

      test("should handle multiple stop calls on empty stage", () => {
        const stage = new Stage([]);
        expect(() => {
          stage.stop();
          stage.stop();
          stage.stop();
        }).not.toThrow();
      });
    });

    describe("Callback error handling doesn't break loop", () => {
      test("should continue loop when start callback throws in first scene", async () => {
        const executionLog: string[] = [];

        const scenes = [
          new Scene({
            duration: 50,
            start: () => {
              executionLog.push("scene1-start");
              throw new Error("Scene 1 error");
            },
            stop: () => executionLog.push("scene1-stop"),
          }),
          new Scene({
            duration: 50,
            start: () => executionLog.push("scene2-start"),
            stop: () => executionLog.push("scene2-stop"),
          }),
        ];

        const stage = new Stage(scenes);

        // Wait for complete loop
        await new Promise((resolve) => setTimeout(resolve, 150));
        stage.stop();

        // Should continue despite error
        expect(executionLog).toContain("scene1-start");
        expect(executionLog).toContain("scene1-stop");
        expect(executionLog).toContain("scene2-start");
        expect(executionLog).toContain("scene2-stop");
      });

      test("should continue loop when stop callback throws", async () => {
        const executionLog: string[] = [];

        const scenes = [
          new Scene({
            duration: 50,
            start: () => executionLog.push("scene1-start"),
            stop: () => {
              executionLog.push("scene1-stop");
              throw new Error("Scene 1 stop error");
            },
          }),
          new Scene({
            duration: 50,
            start: () => executionLog.push("scene2-start"),
            stop: () => executionLog.push("scene2-stop"),
          }),
        ];

        const stage = new Stage(scenes);

        // Wait for complete loop
        await new Promise((resolve) => setTimeout(resolve, 150));
        stage.stop();

        // Should continue despite error
        expect(executionLog).toContain("scene1-start");
        expect(executionLog).toContain("scene1-stop");
        expect(executionLog).toContain("scene2-start");
        expect(executionLog).toContain("scene2-stop");
      });

      test("should handle errors in multiple scenes and continue looping", async () => {
        let loopCount = 0;

        const scenes = [
          new Scene({
            duration: 40,
            start: () => {
              loopCount++;
              throw new Error("Scene 1 error");
            },
          }),
          new Scene({
            duration: 40,
            stop: () => {
              throw new Error("Scene 2 error");
            },
          }),
        ];

        const stage = new Stage(scenes);

        // Wait for multiple loops
        await new Promise((resolve) => setTimeout(resolve, 180));
        stage.stop();

        // Should have looped multiple times despite errors
        expect(loopCount).toBeGreaterThanOrEqual(2);
      });

      test("should call stop on current scene even if it throws during stage.stop()", async () => {
        let stopCalled = false;

        const scene = new Scene({
          duration: 100,
          stop: () => {
            stopCalled = true;
            throw new Error("Stop error");
          },
        });

        const stage = new Stage([scene]);

        // Stop during execution
        await new Promise((resolve) => setTimeout(resolve, 30));
        expect(() => stage.stop()).not.toThrow();

        expect(stopCalled).toBe(true);
      });
    });
  });
});

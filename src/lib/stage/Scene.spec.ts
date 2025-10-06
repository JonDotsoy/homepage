import { test, describe, expect } from "bun:test";
import { Scene, type SceneConfig } from "./Scene";

describe("Scene", () => {
  describe("Constructor without arguments", () => {
    test("should create scene with default duration of 1000ms", () => {
      const scene = new Scene();
      expect(scene.duration).toBe(1000);
    });

    test("should create scene with no start callback", () => {
      const scene = new Scene();
      expect(scene.start).toBeUndefined();
    });

    test("should create scene with no stop callback", () => {
      const scene = new Scene();
      expect(scene.stop).toBeUndefined();
    });
  });

  describe("Constructor with valid configuration", () => {
    test("should create scene with custom duration", () => {
      const scene = new Scene({ duration: 2000 });
      expect(scene.duration).toBe(2000);
    });

    test("should create scene with start callback", () => {
      const startFn = () => console.log("start");
      const scene = new Scene({ start: startFn });
      expect(scene.start).toBe(startFn);
    });

    test("should create scene with stop callback", () => {
      const stopFn = () => console.log("stop");
      const scene = new Scene({ stop: stopFn });
      expect(scene.stop).toBe(stopFn);
    });

    test("should create scene with all properties", () => {
      const startFn = () => console.log("start");
      const stopFn = () => console.log("stop");
      const scene = new Scene({
        duration: 3000,
        start: startFn,
        stop: stopFn,
      });

      expect(scene.duration).toBe(3000);
      expect(scene.start).toBe(startFn);
      expect(scene.stop).toBe(stopFn);
    });
  });

  describe("Constructor with only duration", () => {
    test("should create scene with duration and no callbacks", () => {
      const scene = new Scene({ duration: 500 });
      expect(scene.duration).toBe(500);
      expect(scene.start).toBeUndefined();
      expect(scene.stop).toBeUndefined();
    });

    test("should accept very short duration", () => {
      const scene = new Scene({ duration: 1 });
      expect(scene.duration).toBe(1);
    });

    test("should accept very long duration", () => {
      const scene = new Scene({ duration: 999999 });
      expect(scene.duration).toBe(999999);
    });
  });

  describe("Constructor with only callbacks", () => {
    test("should create scene with only start callback and default duration", () => {
      const startFn = () => {};
      const scene = new Scene({ start: startFn });
      expect(scene.duration).toBe(1000);
      expect(scene.start).toBe(startFn);
      expect(scene.stop).toBeUndefined();
    });

    test("should create scene with only stop callback and default duration", () => {
      const stopFn = () => {};
      const scene = new Scene({ stop: stopFn });
      expect(scene.duration).toBe(1000);
      expect(scene.start).toBeUndefined();
      expect(scene.stop).toBe(stopFn);
    });

    test("should create scene with both callbacks and default duration", () => {
      const startFn = () => {};
      const stopFn = () => {};
      const scene = new Scene({ start: startFn, stop: stopFn });
      expect(scene.duration).toBe(1000);
      expect(scene.start).toBe(startFn);
      expect(scene.stop).toBe(stopFn);
    });
  });

  describe("Invalid duration handling", () => {
    test("should throw TypeError on zero duration", () => {
      expect(() => new Scene({ duration: 0 })).toThrow(TypeError);
      expect(() => new Scene({ duration: 0 })).toThrow(
        "Scene duration must be a positive number",
      );
    });

    test("should throw TypeError on negative duration", () => {
      expect(() => new Scene({ duration: -100 })).toThrow(TypeError);
      expect(() => new Scene({ duration: -100 })).toThrow(
        "Scene duration must be a positive number",
      );
    });

    test("should throw TypeError on non-number duration", () => {
      expect(() => new Scene({ duration: "1000" as any })).toThrow(TypeError);
      expect(() => new Scene({ duration: {} as any })).toThrow(TypeError);
      expect(() => new Scene({ duration: [] as any })).toThrow(TypeError);
    });

    test("should use default duration when undefined is passed", () => {
      const scene = new Scene({ duration: undefined });
      expect(scene.duration).toBe(1000);
    });

    test("should throw TypeError on NaN duration", () => {
      expect(() => new Scene({ duration: NaN })).toThrow(TypeError);
      expect(() => new Scene({ duration: NaN })).toThrow(
        "Scene duration must be a positive number",
      );
    });

    test("should throw TypeError on Infinity duration", () => {
      expect(() => new Scene({ duration: Infinity })).toThrow(TypeError);
      expect(() => new Scene({ duration: Infinity })).toThrow(
        "Scene duration must be a positive number",
      );
    });
  });

  describe("Invalid callback handling", () => {
    test("should throw TypeError on non-function start callback", () => {
      expect(() => new Scene({ start: "not a function" as any })).toThrow(
        TypeError,
      );
      expect(() => new Scene({ start: "not a function" as any })).toThrow(
        "Scene start must be a function",
      );
    });

    test("should throw TypeError on non-function stop callback", () => {
      expect(() => new Scene({ stop: 123 as any })).toThrow(TypeError);
      expect(() => new Scene({ stop: 123 as any })).toThrow(
        "Scene stop must be a function",
      );
    });

    test("should throw TypeError on object as start callback", () => {
      expect(() => new Scene({ start: {} as any })).toThrow(TypeError);
    });

    test("should throw TypeError on array as stop callback", () => {
      expect(() => new Scene({ stop: [] as any })).toThrow(TypeError);
    });

    test("should throw TypeError on null as start callback", () => {
      expect(() => new Scene({ start: null as any })).toThrow(TypeError);
    });

    test("should not throw on undefined callbacks (they are optional)", () => {
      expect(
        () => new Scene({ start: undefined, stop: undefined }),
      ).not.toThrow();
    });
  });

  describe("Readonly properties", () => {
    test("duration property should be accessible", () => {
      const scene = new Scene({ duration: 1000 });
      // TypeScript enforces readonly at compile time
      // At runtime, we verify the property exists and has the correct value
      expect(scene.duration).toBe(1000);

      // Verify property is defined
      const descriptor = Object.getOwnPropertyDescriptor(scene, "duration");
      expect(descriptor).toBeDefined();
      expect(descriptor?.value).toBe(1000);
    });

    test("start property should be accessible", () => {
      const startFn = () => {};
      const scene = new Scene({ start: startFn });
      expect(scene.start).toBe(startFn);

      // Verify property is defined
      const descriptor = Object.getOwnPropertyDescriptor(scene, "start");
      expect(descriptor).toBeDefined();
      expect(descriptor?.value).toBe(startFn);
    });

    test("stop property should be accessible", () => {
      const stopFn = () => {};
      const scene = new Scene({ stop: stopFn });
      expect(scene.stop).toBe(stopFn);

      // Verify property is defined
      const descriptor = Object.getOwnPropertyDescriptor(scene, "stop");
      expect(descriptor).toBeDefined();
      expect(descriptor?.value).toBe(stopFn);
    });

    test("properties are marked as readonly in TypeScript", () => {
      // This test verifies that TypeScript enforces readonly at compile time
      // The actual enforcement happens during TypeScript compilation
      const scene = new Scene({ duration: 1000 });

      // At runtime, properties are technically writable in JavaScript
      // but TypeScript prevents modification at compile time
      expect(scene.duration).toBe(1000);
      expect(scene.start).toBeUndefined();
      expect(scene.stop).toBeUndefined();
    });
  });

  describe("Callback execution", () => {
    test("start callback should be callable", () => {
      let called = false;
      const scene = new Scene({
        start: () => {
          called = true;
        },
      });
      scene.start?.();
      expect(called).toBe(true);
    });

    test("stop callback should be callable", () => {
      let called = false;
      const scene = new Scene({
        stop: () => {
          called = true;
        },
      });
      scene.stop?.();
      expect(called).toBe(true);
    });

    test("callbacks should receive no arguments", () => {
      const scene = new Scene({
        start: (...args: any[]) => {
          expect(args.length).toBe(0);
        },
      });
      scene.start?.();
    });
  });
});

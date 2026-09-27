import Service from "./Service.js";
import { generateUUID } from "../../utils/uuid.js";

class TaskHandler {
  constructor() {
    this.handlerID = generateUUID();

    this.running = false;
    this.destroyed = false;

    this._ondata_callbacks = new Set();

    this.events = {
      started: payload => {
        this.running = true;
        this.onstart?.(payload.output);
      },

      info: payload => {
        this.oninfo?.(payload.output);
      },

      output: payload => {
        this.onmessage?.(payload.output);
      },

      error: payload => {
        this.running = false;
        this.onerror?.(payload.output);
      },

      ended: payload => {
        this.running = false;
        this.onended?.(payload.output);
      }
    };

    // Internal event dispatcher
    this._eventHandler = payload => {
      this.events[payload?.status]?.(payload);
    };

    this._ondata_callbacks.add(this._eventHandler);
  }

  onData(callback) {
    if (this.destroyed) {
      throw new Error("Handler has been destroyed");
    }

    if (typeof callback !== "function") {
      throw new TypeError("Handler callback must be a function");
    }

    this._ondata_callbacks.add(callback);

    return () => {
      this.offData(callback);
    };
  }

  offData(callback) {
    this._ondata_callbacks.delete(callback);
  }

  emit(payload) {
    if (this.destroyed) {
      return;
    }

    for (const callback of this._ondata_callbacks) {
      try {
        callback(payload);
      } catch {
        // A listener must not break other listeners.
      }
    }
  }

  clearListeners() {
    for (const callback of this._ondata_callbacks) {
      if (callback !== this._eventHandler) {
        this._ondata_callbacks.delete(callback);
      }
    }
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    this._ondata_callbacks.clear();

    this.events = null;

    this.onstart = null;
    this.oninfo = null;
    this.onmessage = null;
    this.onerror = null;
    this.onended = null;

    this.running = false;
  }
}

class Task {
  constructor(cmd, once, request) {
    this.cmd = cmd;
    this.request = request;
    this.handler = new TaskHandler();

    this.taskID = null;

    this.once = once;
    this.running = false;
    this.completed = false;
    this.destroyed = false;

    this.listeners = new Set();

    // Internal lifecycle listener
    this._internalListener = ({ status }) => {
      if (status === "started") {
        this.running = true;
      }

      if (status === "ended") {
        this.running = false;
        this.completed = true;
      }

      if (status === "error") {
        this.running = false;
      }
    };

    this._addHandlerListener(this._internalListener);
  }

  get handlerID() {
    return this.handler.handlerID;
  }

  // ----------------------------------------
  // Lifecycle
  // ----------------------------------------

  async init({ canSudo = false, outputMode = "send" } = {}) {
    this._assertNotDestroyed();

    if (this.isInitialized()) {
      throw new Error("Task already initialized");
    }

    const { data, error } = await this.request("create", {
      method: "POST",
      body: {
        cmd: this.cmd,
        can_sudo: canSudo,
        output_mode: outputMode
      }
    });

    if (error) {
      throw new Error(error.detail || error.message);
    }

    this.taskID = data.id;

    return data;
  }

  async run() {
    this._assertReady();

    if (this.running) {
      throw new Error("Task already running");
    }

    if (this.once && this.completed) {
      throw new Error("Task (once) already completed");
    }

    const { data, error } = await this.request("run", {
      params: {
        task_id: this.taskID,
        handler_id: this.handlerID
      }
    });

    if (error) {
      throw new Error(error.detail || error.message);
    }

    return data;
  }

  async kill(remove = false) {
    this._assertReady();

    if (!this.running) return;

    const { data, error } = await this.request("kill", {
      params: {
        task_id: this.taskID,
        remove
      }
    });

    if (error) {
      throw new Error(error.detail || error.message);
    }

    this.running = false;

    return data;
  }

  async cleanup() {
    if (this.destroyed) {
      return;
    }
    await this.kill();

    this.destroyed = true;

    this._removeAllListeners();

    this.taskID = null;
    this.running = false;
    this.handler = null;
    this.func = null;
    this.listeners.clear();
  }

  destroy() {
    return this.cleanup();
  }

  // ----------------------------------------
  // Input
  // ----------------------------------------

  send(inputText, force = false) {
    this._assertReady();

    if (!inputText && !force) {
      return;
    }

    return this.request("send", {
      method: "POST",
      body: {
        task_id: this.taskID,
        input_text: inputText
      }
    });
  }

  // ----------------------------------------
  // Information
  // ----------------------------------------

  getInfo() {
    this._assertReady();

    return this.request("info", {
      params: {
        task_id: this.taskID
      }
    });
  }

  getSavedOutput() {
    this._assertReady();

    return this.request("output", {
      params: {
        task_id: this.taskID
      }
    });
  }

  clearSavedOutput() {
    this._assertReady();

    return this.request("clear", {
      params: {
        task_id: this.taskID
      }
    });
  }

  // ----------------------------------------
  // Events
  // ----------------------------------------

  on(callback) {
    this._assertNotDestroyed();

    if (typeof callback !== "function") {
      throw new TypeError("Task callback must be a function");
    }

    return this._addHandlerListener(callback);
  }

  off(callback) {
    if (!callback) {
      return;
    }

    this._removeHandlerListener(callback);
  }

  // ----------------------------------------
  // State
  // ----------------------------------------

  isInitialized() {
    return this.taskID !== null;
  }

  isRunning() {
    return this.running;
  }

  isCompleted() {
    return this.completed;
  }

  isDestroyed() {
    return this.destroyed;
  }

  // ----------------------------------------
  // Listener management
  // ----------------------------------------

  _addHandlerListener(callback) {
    if (!this.handler) {
      return () => {};
    }

    this.listeners.add(callback);

    const cleanup = this.handler.onData(callback);

    // If handler provides its own unsubscribe function,
    // return it while still tracking the callback.
    return () => {
      this._removeHandlerListener(callback);

      if (typeof cleanup === "function") {
        cleanup();
      }
    };
  }

  _removeHandlerListener(callback) {
    this.listeners.delete(callback);

    if (typeof this.handler?.offData === "function") {
      this.handler.offData(callback);
    }
  }

  _removeAllListeners() {
    if (typeof this.handler?.offData === "function") {
      for (const callback of this.listeners) {
        try {
          this.handler.offData(callback);
        } catch {
          // Ignore listener cleanup errors
        }
      }
    }

    this.listeners.clear();
  }

  // ----------------------------------------
  // Validation
  // ----------------------------------------

  _assertNotDestroyed() {
    if (this.destroyed) {
      throw new Error("Task has been destroyed");
    }
  }

  _assertReady() {
    this._assertNotDestroyed();

    if (!this.isInitialized()) {
      throw new Error("Task not initialized. Call 'init' first");
    }
  }
}

export default class Tasker extends Service {
  constructor(app) {
    super(app, "tasker");

    // All currently running tasks
    this.tasks = new Map();

    // On task data
    this.app.on("tasker-data", payload => {
      const { id, data } = payload;

      this.tasks.get(id)?.handler.emit(data);
    });

    // Init tasker
    this.app.on("start", async () => {
      await this.init();
    });
  }

  // Init tasker for app
  init = () => this.fetch("init");

  // Get tasks size
  get size() {
    return this.tasks.size;
  }

  // Create Task
  createTask(cmd, once = true) {
    const task = new Task(cmd, once, this.request);

    this.tasks.set(task.handlerID, task);

    return task;
  }

  // Remove Task
  async removeTask(task) {
    if (!task) {
      return;
    }

    this.tasks.delete(task.handlerID);

    return await task.cleanup();
  }

  // Remove all tasks
  async removeAll() {
    const tasks = [...this.tasks.values()];
    this.tasks.clear();

    await Promise.allSettled(tasks.map(task => task.cleanup()));
  }

  // Run task and clean on ended
  async doTask(cmd, callback, canSudo = true) {
    const task = this.createTask(cmd);

    try {
      await task.init({ canSudo });

      task.on(({ status, output }) => {
        try {
          callback?.({
            status,
            output
          });
        } catch {
          // User callback errors should
          // never break task lifecycle.
        }

        if (status === "ended") {
          void this.removeTask(task);
        }
      });

      await task.run();

      return task;
    } catch (error) {
      await this.removeTask(task);
      throw error;
    }
  }

  // Run task and get output
  // If callback passed runs with both, save and output live callbacks
  // Else only returns saved output in Array after complete
  async runSaveTask(cmd, callback = null, delayCheck = 5000) {
    const task = this.createTask(cmd);

    return new Promise(resolve => {
      let timer = null;
      let finished = false;

      const cleanup = async () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }

        await this.removeTask(task);
      };

      const fail = async error => {
        if (finished) {
          return;
        }

        finished = true;

        await cleanup();

        resolve({
          data: null,
          error: error instanceof Error ? error : new Error(String(error))
        });
      };

      const complete = async () => {
        if (finished) {
          return;
        }

        finished = true;

        try {
          const result = await task.getSavedOutput();

          if (result.error) {
            await cleanup();

            return resolve({
              data: null,
              error: new Error(result.error.detail || result.error.message)
            });
          }

          await cleanup();

          resolve({
            data: result.data || [],
            error: null
          });
        } catch (error) {
          await cleanup();

          resolve({
            data: null,
            error
          });
        }
      };

      const check = async () => {
        if (finished) {
          return;
        }

        try {
          const { data, error } = await task.getInfo();

          if (finished) {
            return;
          }

          if (error) {
            return fail(new Error(error.detail || error.message));
          }

          if (data.completed) {
            if (data.error_text) {
              return fail(new Error(data.error_text));
            }

            return complete();
          }

          timer = setTimeout(check, delayCheck);
        } catch (error) {
          await fail(error);
        }
      };

      const start = async () => {
        try {
          await task.init({
            outputMode: callback ? "*" : "save"
          });

          task.on(async ({ status, output }) => {
            if (finished) {
              return;
            }

            if (callback) {
              try {
                callback({
                  status,
                  output
                });
              } catch {
                // Ignore callback errors
              }
            }

            if (status === "error") {
              return fail(output);
            }

            if (status === "ended") {
              return complete();
            }

            if (timer) {
              clearTimeout(timer);
            }

            timer = setTimeout(check, delayCheck);
          });

          await task.run();

          timer = setTimeout(check, delayCheck);
        } catch (error) {
          await fail(error);
        }
      };

      void start();
    });
  }

  // Run long polling for output by delay and return if ennded
  async runTaskPolling(cmd, delayCheck = 5000) {
    const task = this.createTask(cmd);

    try {
      await task.init({
        outputMode: "save"
      });

      await task.run();

      while (true) {
        const { data, error } = await task.getInfo();

        if (error) {
          throw new Error(error.detail || error.message);
        }

        if (data.completed) {
          const result = await task.getSavedOutput();

          if (result.error) {
            throw new Error(result.error.detail || result.error.message);
          }

          return {
            returncode: data.returncode,
            stdout: result.data || [],
            stderr: data.error_text
          };
        }

        await new Promise(resolve => setTimeout(resolve, delayCheck));
      }
    } finally {
      await this.removeTask(task);
    }
  }

  // Quick run and get { stdout, stderr, returncode }
  quickRun(cmd, { canSudo = false, input = [], timeout = null } = {}) {
    return this.request("quick", {
      method: "POST",
      body: {
        cmd,
        timeout,
        can_sudo: canSudo,
        input_args: input
      }
    });
  }

  // Stop and cleanup all running tasks
  async cleanup() {
    await this.removeAll();
  }
}

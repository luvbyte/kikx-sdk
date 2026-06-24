class AppTask {
  constructor(cmd, handler, func, once = true) {
    this.cmd = cmd;
    this.func = func;
    this.handler = handler;

    this.running = false;
    this.task_result = null;

    this.once = once;
    this.completed = false;

    this.handler.onData(data => {
      if (data.status === "ended") {
        this.running = false;
        this.completed = true;
      }
    });
  }

  async __run() {
    if (this.once && this.completed) throw Error("Task already completed");

    this.task_result = await this.func("tasks.run_task", {
      args: [`${this.cmd}`.trim()],
      options: { handler_id: this.handler.handlerID }
    });

    if (this.task_result?.error) {
      throw new Error(this.task_result.error.detail);
    }

    return this.task_result;
  }

  async run() {
    if (this.running) return;

    this.running = true;

    try {
      return await this.__run();
    } finally {
      if (!this.once) {
        this.running = false;
      }
    }
  }

  async send(input) {
    if (!this.task_result || !input) throw Error("No input or task error");

    await this.func("tasks.send_input", {
      args: [this.task_result.data, input]
    });
  }

  on(callback) {
    this.handler.onData(callback);
  }

  async kill() {
    await this.func("tasks.kill", {
      args: [this.task_result.data]
    });
  }
}

export default class AppTasks {
  constructor(app) {
    if (!app) {
      throw Error("AppTasks must require KikxApp, KikxAppClient");
    }

    this.app = app;
  }

  runFunc = (name, options) => {
    return this.app.func(name, options);
  };

  createTask(cmd, once = true) {
    if (!this.app.func) {
      throw Error("KikxAppClient is required as app to create task");
    }

    const handler = this.app.createHandler();

    if (once) {
      handler.onended = () => {
        this.app.removeHandler(handler.handlerID);
      };
    }

    return new AppTask(cmd, handler, this.runFunc, once);
  }

  async runTask(cmd, callback) {
    const task = this.createTask(cmd);
    task.on(callback);

    return await task.__run();
  }

  async runTaskSync(cmd) {
    const fullData = [];
    let flag = false;

    return new Promise((resolve, reject) => {
      try {
        this.runTask(cmd, data => {
          if (data.status === "started") {
            flag = true;
          } else if (data.status === "ended") {
            resolve(fullData.join("\n").trim());
          } else if (data.status === "output") {
            const output = data.output?.trim?.() || "";
            if (flag && output.length > 0) {
              fullData.push(output);
            }
          } else if (data.status === "error") {
            reject(new Error(data.output || "Unknown error"));
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

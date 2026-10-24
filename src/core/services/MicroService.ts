import Service from "./Service.js";

class Micro {
  name: string;
  manager: MicroService | null;
  destroyed: boolean;

  constructor(name: string, manager: MicroService) {
    this.name = name;
    this.manager = manager;
    this.destroyed = false;
  }

  // -------------------------
  // Start
  // -------------------------

  start() {
    if (this.destroyed) {
      throw new Error(`Micro "${this.name}" has already been destroyed`);
    }

    return this.manager!.start(this.name);
  }

  // -------------------------
  // Output
  // -------------------------

  output() {
    if (this.destroyed) {
      throw new Error(`Micro "${this.name}" has already been destroyed`);
    }

    return this.manager!.output(this.name);
  }

  // -------------------------
  // Send input
  // -------------------------

  send(data: unknown) {
    if (this.destroyed) {
      throw new Error(`Micro "${this.name}" has already been destroyed`);
    }

    return this.manager!.send(this.name, data);
  }

  // -------------------------
  // Stop
  // -------------------------

  async stop() {
    if (this.destroyed) return;

    try {
      return await this.manager!.stop(this.name);
    } finally {
      this.destroyed = true;
    }
  }

  // -------------------------
  // Cleanup
  // -------------------------

  async cleanup() {
    if (this.destroyed) return;

    try {
      await this.stop();
    } finally {
      this.destroyed = true;
      this.manager = null;
    }
  }

  // Alias
  destroy() {
    return this.cleanup();
  }
}

export default class MicroService extends Service {
  instances: Map<string, Micro>;

  constructor(app: ConstructorParameters<typeof Service>[0]) {
    super(app, "micro");

    // name -> Micro instance
    this.instances = new Map();
  }

  // -------------------------
  // App active services
  // -------------------------

  list = () => this.api("list");

  // -------------------------
  // Start
  // -------------------------

  start = async (name: string) => {
    const existing = this.instances.get(name);

    if (existing && !existing.destroyed) {
      return existing;
    }

    const { error } = await this.api("start", {
      method: "GET",
      params: {
        name
      }
    });

    if (error) {
      throw error;
    }

    const micro = new Micro(name, this);

    this.instances.set(name, micro);

    return micro;
  };

  // -------------------------
  // Output
  // -------------------------

  output = (name: string) =>
    this.api("output", {
      params: {
        name
      }
    });

  // -------------------------
  // Send input
  // -------------------------

  send = (name: string, data: unknown) =>
    this.api("send", {
      method: "POST",
      body: {
        name,
        data
      }
    });

  // -------------------------
  // Stop one service
  // -------------------------

  stop = async (name: string) => {
    try {
      return await this.api("stop", {
        params: {
          name
        }
      });
    } finally {
      this.instances.delete(name);
    }
  };

  // -------------------------
  // Stop everything
  // -------------------------

  stopAll = async () => {
    try {
      return await this.api("stop-all");
    } finally {
      this.instances.clear();
    }
  };

  // -------------------------
  // Cleanup
  // -------------------------

  cleanup = async () => {
    const instances = [...this.instances.values()];

    try {
      await Promise.allSettled(instances.map(instance => instance.cleanup()));

      await this.stopAll();
    } finally {
      this.instances.clear();
    }
  };

  // Alias
  destroy = this.cleanup;
}

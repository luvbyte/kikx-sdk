import Service from "./Service.js";

export default class OSService extends Service {
  constructor(app) {
    super(app, "os");
  }
  // Run function in os service
  async func(name, { args = [], options = {} }) {
    return this.fetch("run", "POST", {
      name,
      args,
      options
    });
  }
}

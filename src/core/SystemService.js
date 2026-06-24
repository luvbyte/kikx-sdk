import Service from "./services/Service.js";

export default class SystemService extends Service {
  constructor(app) {
    super(app, "system");
  }
  // /info
  appInfo = () => this.fetch("info/app");
  // Get app names in list
  getAppsList = (extra = false) => this.fetch(`info/apps-list?extra=${extra}`);
  // Sessions
  sessionsInfo = () => this.request("info/sessions");
  // Close Sessions
  closeSession = sessionID =>
    this.request(`info/session/close/${sessionID}`, "POST");
  // notify
  alert = payload => this.fetch("alert", "POST", payload);
  // App function x
  appFunc = (name, config) =>
    this.request("app/func", "POST", { name, config });
  // Close app by itself
  closeApp = () => this.fetch("close-app", "POST");
  // Invoke an action
  invoke = (action, payload = {}) =>
    this.fetch("invoke", "POST", { action, payload });
}

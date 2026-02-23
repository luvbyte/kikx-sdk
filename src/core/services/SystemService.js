import Service from "../Service.js";


export default class SystemService extends Service {
  constructor() {
    super("system");
  }

  info = payload => this.request("info");
  notify = payload => this.request("notify", "POST", payload);
  alert = payload => this.request("alert", "POST", payload);
  sendSignal = signal => this.request(`signal?signal=${signal}`);
  getUserSettings = (setting = null) =>
    this.request(`user-settings?setting=${setting}`);
  setUserSettings = settings =>
    this.request("user-settings", "POST", { settings });
  appFunc = (name, config) =>
    this.request("app/func", "POST", { name, config });
  closeApp = () => this.request("close-app", "POST");
}

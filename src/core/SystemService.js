import Service from "./services/Service.js";
import { generateUUID } from "../utils/uuid.js";

export default class SystemService extends Service {
  constructor(app) {
    super(app, "system");
  }

  // ----------------------------------------
  // Info
  // ----------------------------------------

  kikxInfo = () => this.request("info/kikx");

  appInfo = () => this.request("info/app");

  kikxAppInfo = () => this.request("info/kikx-app");

  getAppsList = (meta = false) =>
    this.request("info/apps-list", {
      params: { meta }
    });

  // ----------------------------------------
  // Sessions
  // ----------------------------------------

  sessionsInfo = () => this.request("info/sessions");

  closeSession = sessionID =>
    this.request("info/session-close", {
      params: {
        session_id: sessionID
      }
    });

  // ----------------------------------------
  // Alerts
  // ----------------------------------------

  _alert = payload =>
    this.request("alert", {
      method: "POST",
      body: payload
    });

  alert = (message, { type = "info", priority = "normal" } = {}) =>
    this._alert({
      message,
      type,
      priority
    });

  // ----------------------------------------
  // App lifecycle
  // ----------------------------------------

  closeApp = () => this.request("close-app");
}

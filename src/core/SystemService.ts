import Service from "./services/Service.js";
import { generateUUID } from "../utils/uuid.js";
import type { KikxApp } from "./KikxApp.js";

export default class SystemService extends Service {
  constructor(app: KikxApp) {
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

  closeSession = (sessionID: string) =>
    this.request("info/session-close", {
      params: {
        session_id: sessionID
      }
    });

  // ----------------------------------------
  // Alerts
  // ----------------------------------------

  _alert = (payload: unknown) =>
    this.request("alert", {
      method: "POST",
      body: payload
    });

  alert = (
    message: string,
    {
      type = "info",
      priority = "normal"
    }: { type?: string; priority?: string } = {}
  ) =>
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

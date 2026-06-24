import { request } from "./Api.js";
import Handler from "./Handler.js";
import SystemService from "./SystemService.js";

import KikxConfig from "./Config.js";

// Singleton state
let instance = null;
let instanceType = null;

// Base App
export class KikxApp {
  constructor(config = {}) {
    this.config = new KikxConfig(config);
    this.system = new SystemService(this);
  }

  async run(callback = null) {
    this.appInfo = await this.fetchAppInfo();

    if (typeof callback === "function") {
      await callback(this.appInfo);
    }
  }

  // Get appID
  getAppID = () => {
    return this.config.getAppID();
  };

  // Get app api url
  getUrl = end => {
    return this.config.getUrl(end);
  };

  // Get app ws url
  getWsUrl = () => {
    return this.config.getWsUrl();
  };

  // Get app info
  fetchAppInfo() {
    return this.system.appInfo();
  }

  // Run app funcx
  func(name, options) {
    return this.system.appFunc(name, options);
  }
}

// Client App
export class KikxAppClient extends KikxApp {
  constructor(config = {}) {
    super(config);

    // App Config
    this.appConfig = {};

    this.ws = null;
    this.eventCallbacks = {};

    this.appEventHandlers = new Map();

    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this._reconnectTimer = null;
    this.maxReconnectAttempts = 13;

    this.on("reconnected", () => {
      this.reconnectAttempts = 0;
    });

    // Event: App-specific handler
    this.on("handler-data", payload => {
      this.appEventHandlers
        .get(payload.id)
        ?._ondata_callbacks.forEach(fn => fn(payload.data));
    });

    // Send event to kikx -> app
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (!this.ws) return;

        try {
          if (document.visibilityState === "visible") {
            this.send({
              event: "app:focus",
              payload: { app_id: this.getAppID() }
            });
          } else if (document.visibilityState === "hidden") {
            this.send({
              event: "app:blur",
              payload: { app_id: this.getAppID() }
            });
          }
        } catch (_) {}
      });
    }

    // if (typeof document !== "undefined") {
    //   document.addEventListener("visibilitychange", () => {
    //     if (this.ws && document.visibilityState === "visible") {
    //       try {
    //         this.send({
    //           event: "app:focus",
    //           payload: { app_id: this.getAppID() }
    //         });
    //       } catch (_) {}
    //     }
    //   });
    // }
  }

  // Create app handler
  createHandler() {
    const handler = new Handler();
    this.appEventHandlers.set(handler.handlerID, handler);
    return handler;
  }

  // Remove app handler
  removeHandler(handlerID) {
    this.appEventHandlers.delete(handlerID);
  }

  // Reconnect
  _forceReconnect(reason = "manual trigger") {
    this._clearReconnectTimer();
    this.reconnectAttempts = 0;
    this._connect();
  }

  // Connect app ws
  _connect() {
    if (this.ws) return;

    const url = `${this.getWsUrl()}/app/${this.getAppID()}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = e => {
      this._clearReconnectTimer();
      this._callEvent("ws:onopen", e);
    };

    this.ws.onmessage = e => {
      try {
        this._callEvent("ws:onmessage", e);

        const message = JSON.parse(e.data);
        const { event, payload } = message;

        if (["connected", "reconnected"].includes(event)) {
          this.appConfig = payload.config;
        }

        if (event) {
          this._callEvent(event, payload);
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    };

    this.ws.onclose = e => {
      this.ws = null;
      this._callEvent("ws:onclose", e);
      this._scheduleReconnect();
    };

    this.ws.onerror = e => {
      this._callEvent("ws:onerror", e);
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    };
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;

    console.log("Schedule Reconecting...");

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Schedule Reconecting failed");
      this._callEvent("ws:reconnect_failed");
      return;
    }

    this.reconnectAttempts += 1;

    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._connect();
    }, this.reconnectDelay);
  }

  _clearReconnectTimer() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  // Add app ws event handler
  on(event, callback) {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(callback);
  }

  // Remove app ws event handler
  off(event, callback) {
    if (!this.eventCallbacks[event]) return;

    this.eventCallbacks[event] = this.eventCallbacks[event].filter(
      fn => fn !== callback
    );
  }

  // Call ws event handler
  _callEvent(event, data = null) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event].forEach(fn => fn(data));
    }
  }

  // Send Json data to app using ws
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // Run and connect ws
  async run(callback = null) {
    if (this.ws && this.ws.readyState < WebSocket.CLOSING) return;

    if (typeof callback === "function") {
      this.on("connected", callback);
    }

    this._connect();
  }
}

// Create Base App
export function createKikxApp(config = null) {
  if (instance) {
    if (instanceType !== "base") {
      throw new Error(
        `KikxApp already created as '${instanceType}', cannot create 'base'.`
      );
    }
    return instance;
  }

  instanceType = "base";
  instance = new KikxApp(config);

  return instance;
}

// Create Client App
export function createKikxClient(config = null) {
  if (instance) {
    if (instanceType !== "client") {
      throw new Error(
        `KikxApp already created as '${instanceType}', cannot create 'client'.`
      );
    }
    return instance;
  }

  instanceType = "client";
  instance = new KikxAppClient(config);

  return instance;
}

// Get Existing Instance
export function getKikxApp() {
  if (!instance) {
    throw new Error(
      "KikxApp not created. Call createKikxApp() or createKikxClient() first."
    );
  }
  return instance;
}

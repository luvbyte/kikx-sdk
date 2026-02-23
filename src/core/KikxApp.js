import { getAppID } from "../utils/app.js";
import { fetchAppConfig } from "./api.js";

import Handler from "./Handler.js";

import SystemService from "./services/SystemService.js";

import { getWsUrl } from "./config.js";

export class KikxApp {
  constructor() {
    this.id = getAppID();

    // Warn if system services not enabled
    this.system = new SystemService();

    // config
    this.config = null;
  }
  async run(callback = null) {
    this.config = await fetchAppConfig(this.id);

    if (callback && typeof callback === "function") {
      await callback();
    }
  }
  func(name, options) {
    return this.system.appFunc(name, options);
  }
}

export class KikxAppClient extends KikxApp {
  constructor() {
    super();

    this.appEventHandlers = new Map();

    this.ws = null;
    this.eventCallbacks = {};

    this.reconnectDelay = 1000; // ms
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 13;
    this._reconnectTimer = null;

    // Signals
    this.on("signal", signal => {
      //
    });

    // Event: App-specific handler
    this.on("handler-data", payload => {
      this.appEventHandlers
        .get(payload.id)
        ?._ondata_callbacks.forEach(fn => fn(payload.data));
    });

    this.on("reconnected", () => {
      this.reconnectAttempts = 0;
    });

    // Handle tab focus in browsers
    document.addEventListener("visibilitychange", () => {
      if (this.ws && document.visibilityState === "visible") {
        try {
          this.send({ event: "app:focus", payload: { app_id: this.id } });
        } catch (_) {}
      }
    });
  }

  createHandler() {
    const handler = new Handler();

    console.log("Handler created: ", handler.handlerID);

    this.appEventHandlers.set(handler.handlerID, handler);
    return handler;
  }

  removeHandler(handlerID) {
    this.appEventHandlers.delete(handlerID);
    console.log("Handler Removed: ", handlerID);
  }

  _forceReconnect(reason = "manual trigger") {
    console.log(reason + " → forcing reconnect...");
    this._clearReconnectTimer();
    this.reconnectAttempts = 0; // reset attempts on resume
    this._connect();
  }

  _connect() {
    if (this.ws) return;

    //  const protocol = location.protocol === "https:" ? "wss" : "ws";
    const url = `${getWsUrl()}/app/${this.id}`;
    // const url = `${protocol}://${location.host}/app/${this.id}`;
    console.log("Connecting to WebSocket:", url);

    this.ws = new WebSocket(url);

    this.ws.onopen = e => {
      console.log("WebSocket connection opened.");
      this._clearReconnectTimer();
      this._callEvent("ws:onopen", e);
    };

    this.ws.onmessage = e => {
      try {
        const message = JSON.parse(e.data);
        if (message.event === "connected") {
          this.config = message.payload.config;
        }
        if (message.event) {
          this._callEvent(message.event, message.payload);
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    };

    this.ws.onclose = e => {
      console.warn("WebSocket connection closed.");
      this.ws = null;
      this._callEvent("ws:onclose", e);
      this._scheduleReconnect();
    };

    this.ws.onerror = e => {
      console.error("WebSocket error:", e);
      this._callEvent("ws:onerror", e);
      if (this.ws) {
        this.ws.close(); // Will trigger onclose
        this.ws = null;
      }
    };
  }

  _scheduleReconnect() {
    console.log("Scheduling reconnect... Attempt:", this.reconnectAttempts);

    if (this._reconnectTimer) {
      console.log("Reconnect timer already set. Skipping.");
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(
        `Max reconnect attempts (${this.maxReconnectAttempts}) reached.`
      );
      this._callEvent("ws:reconnect_failed");
      return;
    }

    this.reconnectAttempts += 1;
    console.log(
      `Reconnect attempt ${this.reconnectAttempts} in ${this.reconnectDelay}ms...`
    );

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

  on(event, callback) {
    this.addEvent(event, callback);
  }

  off(event, callback) {
    if (!this.eventCallbacks[event]) return;
    this.eventCallbacks[event] = this.eventCallbacks[event].filter(
      fn => fn !== callback
    );
  }

  addEvent(event, callback) {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(callback);
  }

  _callEvent(event, data = null) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event].forEach(fn => fn(data));
    }
  }

  send = data => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("Cannot send message. WebSocket not open.");
    }
  };

  async run(callback = null) {
    if (this.ws && this.ws.readyState < WebSocket.CLOSING) return;
    if (typeof callback === "function") {
      this.on("connected", callback);
    }
    this._connect();
  }
}

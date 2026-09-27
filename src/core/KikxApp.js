import KikxConfig from "./Config.js";
import SystemService from "./SystemService.js";
import EventEmitter from "../utils/event.js";

// ---------------------- Singleton state

let instance = null;
let instanceType = null;

// ---------------------- Base App

export class KikxApp {
  constructor(config = {}) {
    this.config = new KikxConfig(config);
    this.system = new SystemService(this);

    // App full info
    this.info = null;
    // Is App visible in ui
    this.isVisisble = true;

    // Events and Messages Handlers
    this._appEvents = new EventEmitter();
    this._messageEvents = new EventEmitter();

    // Message handler
    window.addEventListener("message", ({ data }) => {
      const { event, payload } = data ?? {};
      if (!event) return;

      if (event === "app:focus") {
        this.isVisisble = true;
      } else if (event === "app:blur") {
        this.isVisisble = false;
      }

      this._messageEvents.emit(event, payload);
    });
  }

  // ---------------------- App

  // Get appID
  getAppID = () => this.config.getAppID();

  // Get app api url
  getUrl = end => this.config.getUrl(end);

  // Get app ws url
  getWsUrl = () => this.config.getWsUrl();

  // ---------------------- Message Events

  onMessage(event, callback) {
    return this._messageEvents.on(event, callback);
  }

  offMessage(event, callback) {
    this._messageEvents.off(event, callback);
  }

  onceMessage(event, callback) {
    return this._messageEvents.once(event, callback);
  }

  onFocus(callback) {
    return this.onMessage("app:focus", callback);
  }

  onBlur(callback) {
    return this.onMessage("app:blur", callback);
  }

  // ---------------------- App Events

  on(event, callback) {
    return this._appEvents.on(event, callback);
  }

  once(event, callback) {
    return this._appEvents.once(event, callback);
  }

  off(event, callback) {
    this._appEvents.off(event, callback);
  }

  // ---------------------- Start

  async _run() {
    const { data, error } = await this.system.appInfo();

    if (error) {
      throw new Error(
        "Error fetching app info: " + (error.detail || error.message)
      );
    }

    await this._appEvents.emit("start", data, false);

    this.info = data;
  }

  async run(callback = null) {
    await this._run();

    if (typeof callback === "function") {
      callback(this.info);
    }
  }
}

// ---------------------- Client App

export class KikxAppClient extends KikxApp {
  constructor(config = {}) {
    super(config);

    this.ws = null;

    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this._reconnectTimer = null;
    this.maxReconnectAttempts = 13;

    this.on("reconnected", () => {
      this.reconnectAttempts = 0;
    });

    // visibilitychange
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;

      if (!this.hasSocketState(WebSocket.OPEN)) {
        this._forceReconnect();
      }

      try {
        this.ws.send(JSON.stringify({ event: "app-ping", payload: {} }));
      } catch (_) {}
    });

    this.onMessage("CHECK_WS", () => {
      if (!this.hasSocketState(WebSocket.OPEN)) {
        this._forceReconnect();
      }
    });
  }

  _forceReconnect() {
    this._clearReconnectTimer();
    this.reconnectAttempts = 0;

    if (this.hasSocketState(WebSocket.CONNECTING, WebSocket.OPEN)) {
      this.ws.close();
      return;
    }

    this._connect();
  }

  hasSocketState(...states) {
    return !!this.ws && states.includes(this.ws.readyState);
  }

  // Connect app ws
  _connect() {
    if (this.hasSocketState(WebSocket.CONNECTING, WebSocket.OPEN)) {
      return;
    }

    const url = `${this.getWsUrl()}/app/${this.getAppID()}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = e => {
      this._clearReconnectTimer();
      this._appEvents.emit("ws:open", e);
    };

    this.ws.onmessage = e => {
      let message;

      try {
        message = JSON.parse(e.data);
      } catch (err) {
        console.error("Invalid JSON", err);
        return;
      }

      this._appEvents.emit("ws:onmessage", e);

      const { event, payload } = message;

      if (event) {
        this._appEvents.emit(event, payload);
      }
    };

    this.ws.onclose = e => {
      this.ws = null;
      this._appEvents.emit("ws:onclose", e);
      this._scheduleReconnect();
    };

    this.ws.onerror = e => {
      this._appEvents.emit("ws:onerror", e);

      if (this.hasSocketState(WebSocket.CONNECTING, WebSocket.OPEN)) {
        this.ws.close();
      }
    };
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;

    console.log("WS-Reconnecting...");

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("WS-Reconecting failed!");
      this._appEvents.emit("ws:reconnect_failed");
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

  // Send JSON data to app using ws
  send(data) {
    if (this.hasSocketState(WebSocket.OPEN)) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendEvent(event, payload = null) {
    this.send({ event, payload });
  }

  async run(callback = null) {
    await this._run();

    if (typeof callback === "function") {
      this.once("connected", () => {
        callback(this.info);
      });
    }

    if (this.hasSocketState(WebSocket.CONNECTING, WebSocket.OPEN)) {
      return;
    }

    this._connect();
  }
}

// ---------------------- Create Base App

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

// ---------------------- Create Client App

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

// ---------------------- Get Existing Instance

export function getKikxApp() {
  if (!instance) {
    throw new Error(
      "KikxApp not created. Call createKikxApp() or createKikxClient() first."
    );
  }

  return instance;
}

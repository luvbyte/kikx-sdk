import { generateUUID } from "../utils/uuid.js";

// Event handler
export default class Handler {
  constructor() {
    this.handlerID = generateUUID();
    this.running = false;
    this._ondata_callbacks = new Set();

    this.events = {
      started: payload => {
        this.running = true;
        this.onstart?.(payload.output);
      },
      info: payload => this.oninfo?.(payload.output),
      output: payload => this.onmessage?.(payload.output),
      error: payload => {
        this.running = false;
        this.onerror?.(payload.output);
      },
      ended: payload => {
        this.running = false;
        this.onended?.(payload.output);
      }
    };

    this._ondata_callbacks.add(payload =>
      this.events[payload.status]?.(payload)
    );
  }

  onData(callback) {
    this._ondata_callbacks.add(callback);
  }
}

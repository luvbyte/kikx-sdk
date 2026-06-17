import Service from "./Service.js";

class Task {
  constructor(taskID, wsBaseUrl) {
    this.taskID = taskID;
    this.events = {};

    this._wsBaseUrl = wsBaseUrl;
    this._ws = null;
  }

  _connect() {
    
  }

  _attackWsEvents() {
    if (!this._ws) throw Error("ws not created");

    this._ws.onmessage = e => {
      const data = JSON.parse(e.data);

      // Emiting events
      this.emit(data.event, data.payload);
    };

    this._ws.onclose = e => {
      this._ws = null;
      this._scheduleReconnect();
    };

    this._ws.onerror = e => {
      if (this._ws) {
        this._ws.close();
        this._ws = null;
      }
    };
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._callEvent("ws:reconnect_failed");
      return;
    }

    this.reconnectAttempts += 1;

    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._connect();
    }, this.reconnectDelay);
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  emit(event, payload) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(payload));
    }
  }
}

export default class TaskerService extends Service {
  constructor(app) {
    super(app, "tasker");
  }
  async create(name) {
    const res = await this.request("create", "POST", {
      name
    });

    return new Task(
      res.data.taskID,
      `${this.app.getWsUrl()}/service/${this.serviceName}/ws`
    );
  }
  async start(task) {
    return await this.request(`start?task_id=${task.taskID}`);
  }
  async kill(task) {
    return await this.request(`kill?task_id=${task.taskID}`);
  }
  async send(task, data) {
    return await this.request("send", "POST", { task_id: task.taskID, data });
  }
  async attach(task) {
    // task._wsUrl = `${this.app.getWsUrl()}/service/${this.serviceName}/ws?task_id=${task.taskID}`;
    // this._connect();
  }
  async detach(task) {
    task._ws.close();
    task._ws = null;
  }
}

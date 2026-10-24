import { generateUUID } from "../../utils/uuid.js";

export class File {
  constructor(value, getUrl) {
    this.value = value;
    this.getUrl = getUrl;
  }

  get path() {
    return this.value.path ?? null;
  }

  get uid() {
    return this.value.uid ?? null;
  }

  get name() {
    return this.value.name ?? this.path?.split("/").pop() ?? null;
  }

  get kikxpath() {
    return this.value.kikxpath ?? null;
  }

  get url() {
    if (!this.uid) {
      throw new Error(`File "${this.name}" has no uid`);
    }

    return this.getUrl(`/service/fs/serve/${this.uid}/`);
  }

  async response(options = {}) {
    const response = await fetch(this.url, options);

    if (!response.ok) {
      throw new Error(`Failed to fetch "${this.name}": ${response.status}`);
    }

    return response;
  }

  async stream(options = {}) {
    const response = await this.response(options);

    if (!response.body) {
      throw new Error("Response does not support streaming");
    }

    return response.body;
  }

  async streamTo(callback, options = {}) {
    const response = await this.response(options);

    if (!response.body) {
      throw new Error("Response does not support streaming");
    }

    const reader = response.body.getReader();

    try {
      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        await callback(value);
      }
    } finally {
      reader.releaseLock();
    }
  }

  async blob(options = {}) {
    return (await this.response(options)).blob();
  }

  async text(options = {}) {
    return (await this.response(options)).text();
  }

  async json(options = {}) {
    return (await this.response(options)).json();
  }

  async arrayBuffer(options = {}) {
    return (await this.response(options)).arrayBuffer();
  }

  async read(options = {}) {
    const response = await this.response(options);

    const contentType =
      response.headers.get("content-type")?.toLowerCase() || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    if (
      contentType.startsWith("text/") ||
      contentType.includes("javascript") ||
      contentType.includes("xml")
    ) {
      return response.text();
    }

    return response.blob();
  }

  async info() {
    const response = await fetch(`/service/fs/serve-info/${this.uid}/`);

    if (!response.ok) {
      throw new Error(
        `Failed to get info for "${this.name}": ${response.status}`
      );
    }

    return response.json();
  }
}

export default class Invoker {
  constructor(app) {
    this.app = app;
  }

  _invoke = async (action, payload = {}) => {
    const responseID = generateUUID();

    return new Promise((resolve, reject) => {
      let settled = false;

      const finish = (callback, value) => {
        if (settled) return;

        settled = true;
        callback(value);
      };

      this.app.onceMessage(responseID, ({ data, error }) => {
        if (error != null) {
          const err = new Error(error.message || String(error));

          if (error.code) {
            err.code = error.code;
          }

          finish(reject, err);

          return;
        }

        finish(resolve, data);
      });

      this.app.system
        .request("invoke", {
          method: "POST",
          body: {
            action,
            payload,
            res_id: responseID
          }
        })
        .then(({ error }) => {
          if (error) {
            const err = new Error(
              error.message || error.detail || String(error)
            );

            if (error.code) {
              err.code = error.code;
            }

            finish(reject, err);
          }
        })
        .catch(error => {
          finish(
            reject,
            error instanceof Error ? error : new Error(String(error))
          );
        });
    });
  };

  // Open App
  openApp = (name, { args = [], query = {} } = {}) =>
    this._invoke("openApp", {
      name,
      args,
      query
    });

  // Generic Action
  action = (name, options = {}) =>
    this._invoke("action", {
      name,
      options
    });

  // Share
  share = item => this.action("share", { item });

  // Wallpaper
  setWallpaper = url => this.action("set-wallpaper", { url });

  // Theme
  setTheme = name => this.action("set-theme", { name });

  // File Picker
  filePicker = async ({
    path = "",
    type = "",
    title = "",
    accept = ""
  } = {}) => {
    const result = await this.action("file-picker", {
      path,
      type,
      title,
      accept
    });

    if (!result || result.action !== "select") {
      return null;
    }

    if (type === "directory") {
      return result.value;
    }

    if (type === "files") {
      return result.value.map(value => new File(value, this.app.getUrl));
    }

    return new File(result.value, this.app.getUrl);
  };

  // Ask File
  askFile = ({ path = "", title = "", accept = "" } = {}) =>
    this.filePicker({
      path,
      title,
      accept,
      type: "file"
    });

  // Ask Files
  askFiles = ({ path = "", title = "", accept = "" } = {}) =>
    this.filePicker({
      path,
      title,
      accept,
      type: "files"
    });

  // Ask Directory
  askDir = ({ path = "", title = "" } = {}) =>
    this.filePicker({
      path,
      title,
      type: "directory"
    });
}

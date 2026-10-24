import { generateUUID } from "../../utils/uuid.js";
import type { KikxApp } from "../KikxApp.js";

interface FileData {
  path?: string | null;
  uid?: string | null;
  name?: string | null;
  kikxpath?: string | null;
}

interface FilePickerResult {
  action?: string;
  value?: string | FileData | FileData[];
}

interface RemoteError {
  message?: string;
  detail?: string;
  code?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toError(value: unknown): Error {
  const remoteError: RemoteError = isRecord(value)
    ? {
        message:
          typeof value.message === "string" ? value.message : undefined,
        detail: typeof value.detail === "string" ? value.detail : undefined,
        code: value.code
      }
    : {};
  const error = new Error(
    remoteError.message || remoteError.detail || String(value)
  );
  if (remoteError.code !== undefined) {
    Object.assign(error, { code: remoteError.code });
  }
  return error;
}

export class File {
  constructor(
    private readonly value: FileData,
    private readonly getUrl: (url: string) => string
  ) {}

  get path(): string | null {
    return this.value.path ?? null;
  }

  get uid(): string | null {
    return this.value.uid ?? null;
  }

  get name(): string | null {
    return this.value.name ?? this.path?.split("/").pop() ?? null;
  }

  get kikxpath(): string | null {
    return this.value.kikxpath ?? null;
  }

  get url(): string {
    if (!this.uid) {
      throw new Error(`File "${this.name}" has no uid`);
    }
    return this.getUrl(`/service/fs/serve/${this.uid}/`);
  }

  async response(options: RequestInit = {}): Promise<Response> {
    const response = await fetch(this.url, options);
    if (!response.ok) {
      throw new Error(`Failed to fetch "${this.name}": ${response.status}`);
    }
    return response;
  }

  async stream(options: RequestInit = {}): Promise<ReadableStream<Uint8Array>> {
    const response = await this.response(options);
    if (!response.body) {
      throw new Error("Response does not support streaming");
    }
    return response.body;
  }

  async streamTo(
    callback: (chunk: Uint8Array) => unknown | Promise<unknown>,
    options: RequestInit = {}
  ): Promise<void> {
    const reader = (await this.stream(options)).getReader();
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

  async blob(options: RequestInit = {}): Promise<Blob> {
    return (await this.response(options)).blob();
  }

  async text(options: RequestInit = {}): Promise<string> {
    return (await this.response(options)).text();
  }

  async json(options: RequestInit = {}): Promise<unknown> {
    return (await this.response(options)).json();
  }

  async arrayBuffer(options: RequestInit = {}): Promise<ArrayBuffer> {
    return (await this.response(options)).arrayBuffer();
  }

  async read(options: RequestInit = {}): Promise<unknown> {
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

  async info(): Promise<unknown> {
    if (!this.uid) {
      throw new Error(`File "${this.name}" has no uid`);
    }
    const response = await fetch(
      this.getUrl(`/service/fs/serve-info/${this.uid}/`)
    );
    if (!response.ok) {
      throw new Error(
        `Failed to get info for "${this.name}": ${response.status}`
      );
    }
    return response.json();
  }
}

export default class Invoker {
  app: KikxApp;

  constructor(app: KikxApp) {
    this.app = app;
  }

  // Invoke
  _invoke = (
    action: string,
    payload: Record<string, unknown> = {}
  ): Promise<unknown> => {
    const responseID = generateUUID();

    return new Promise((resolve, reject) => {
      let settled = false;
      const unsubscribe = this.app.onceMessage(responseID, (message: unknown) => {
        if (!isRecord(message)) {
          settled = true;
          reject(new TypeError("Invalid invoke response"));
          return;
        }
        if (message.error != null) {
          settled = true;
          reject(toError(message.error));
          return;
        }
        settled = true;
        resolve(message.data);
      });

      this.app.system
        .request("invoke", {
          method: "POST",
          body: { action, payload, res_id: responseID }
        })
        .then(({ error }) => {
          if (error && !settled) {
            settled = true;
            unsubscribe();
            reject(toError(error));
          }
        })
        .catch((error: unknown) => {
          if (!settled) {
            settled = true;
            unsubscribe();
            reject(toError(error));
          }
        });
    });
  };

  // Open App
  openApp = (
    name: string,
    {
      args = [],
      query = {}
    }: { args?: string[]; query?: Record<string, string> } = {}
  ): Promise<unknown> =>
    this._invoke("openApp", {
      name,
      args,
      query
    });

  // Action
  action = (
    name: string,
    options: Record<string, unknown> = {}
  ): Promise<unknown> =>
    this._invoke("action", { name, options });

  // Share
  share = (item: unknown) => this.action("share", { item });

  // Change ui wallpaper (accepts: url, /files...path)
  setWallpaper = (url: string) => this.action("set-wallpaper", { url });

  // Change app theme in ui
  setTheme = (name: string) => this.action("set-theme", { name });

  filePicker = async ({
    path = "",
    type = "",
    title = "",
    accept = ""
  }: {
    path?: string;
    type?: "file" | "files" | "directory" | "";
    title?: string;
    accept?: string;
  } = {}): Promise<File | File[] | string | null> => {
    const response = await this.action("file-picker", {
      path,
      type,
      title,
      accept
    });

    if (!isRecord(response) || response.action !== "select") {
      return null;
    }

    const result = response as FilePickerResult;
    if (type === "directory") {
      if (typeof result.value !== "string") {
        throw new TypeError("Invalid directory selection response");
      }
      return result.value;
    }
    if (type === "files") {
      if (!Array.isArray(result.value)) {
        throw new TypeError("Invalid file selection response");
      }
      return result.value.map(value => {
        if (!isRecord(value)) {
          throw new TypeError("Invalid file selection response");
        }
        return new File(value as FileData, this.app.getUrl);
      });
    }
    if (!isRecord(result.value)) {
      throw new TypeError("Invalid file selection response");
    }
    return new File(result.value as FileData, this.app.getUrl);
  };

  askFile = (options: {
    path?: string;
    title?: string;
    accept?: string;
  } = {}) => this.filePicker({ ...options, type: "file" });

  askFiles = (options: {
    path?: string;
    title?: string;
    accept?: string;
  } = {}) => this.filePicker({ ...options, type: "files" });

  askDir = (options: { path?: string; title?: string } = {}) =>
    this.filePicker({ ...options, type: "directory" });
}

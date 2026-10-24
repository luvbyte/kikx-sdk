import Service from "./Service.js";
import type { KikxApp } from "../KikxApp.js";

export default class FileSystemService extends Service {
  constructor(app: KikxApp) {
    super(app, "fs");
  }

  // List files
  listFiles = (
    directory: string,
    {
      offset = 0,
      limit = -1,
      sort = "name",
      asc = true,
      filter = "all",
      extensions = "",
      search = "",
      thumbnails = false
    }: {
      offset?: number;
      limit?: number;
      sort?: string;
      asc?: boolean;
      filter?: string;
      extensions?: string;
      search?: string;
      thumbnails?: boolean;
    } = {}
  ) =>
    this.api("list", {
      params: {
        directory,
        offset,
        limit,
        sort,
        asc,
        filter,
        extensions,
        search,
        thumbnails
      }
    });

  // Quick List Files
  quickListFiles = (
    directory: string,
    {
      sort = "name",
      asc = true,
      filter = "all",
      extensions = "",
      search = "",
      hidden = true
    }: {
      sort?: string;
      asc?: boolean;
      filter?: string;
      extensions?: string;
      search?: string;
      hidden?: boolean;
    } = {}
  ) =>
    this.api("list-simple", {
      params: {
        directory,
        sort,
        asc,
        filter,
        extensions,
        search,
        hidden
      }
    });

  // Search files recursively
  searchFiles = (
    directory: string,
    {
      search = "",
      filter = "all",
      extensions = "",
      hidden = true,
      maxResults = 500
    }: {
      search?: string;
      filter?: string;
      extensions?: string;
      hidden?: boolean;
      maxResults?: number;
    } = {}
  ) =>
    this.api("search", {
      params: {
        directory,
        search,
        filter,
        extensions,
        hidden,
        max_results: maxResults
      }
    });

  // Check if path exists
  exists = (path: string) =>
    this.api("exists", {
      params: { path }
    });

  // Get file information
  stat = (path: string) =>
    this.api("stat", {
      params: { path }
    });

  // Create file or update timestamp
  touch = (path: string) =>
    this.api("touch", {
      method: "POST",
      params: { path }
    });

  // Get disk usage
  diskUsage = (path: string) =>
    this.api("disk-usage", {
      params: { path }
    });

  // Get directory tree
  tree = (
    directory: string,
    { depth = 2, hidden = true }: { depth?: number; hidden?: boolean } = {}
  ) =>
    this.api("tree", {
      params: {
        directory,
        depth,
        hidden
      }
    });

  // Get MIME type
  mime = (path: string) =>
    this.api("mime", {
      params: { path }
    });

  // Calculate file hash
  hash = (path: string, algorithm = "sha256") =>
    this.api("hash", {
      params: {
        path,
        algorithm
      }
    });

  // Calculate checksum
  checksum = (path: string, algorithm = "sha256") =>
    this.api("checksum", {
      params: {
        path,
        algorithm
      }
    });

  // Change permissions
  chmod = (path: string, mode: string | number) =>
    this.api("chmod", {
      method: "POST",
      params: {
        path,
        mode
      }
    });

  // Batch filesystem operations
  batch = (operations: unknown[]) =>
    this.api("batch", {
      method: "POST",
      body: operations
    });

  // Move file/directory to trash
  trash = (path: string) =>
    this.api("trash", {
      method: "POST",
      params: { path }
    });

  // Restore from trash
  restore = (trashDirectory: string, trashId: string) =>
    this.api("restore", {
      method: "POST",
      params: {
        trash_directory: trashDirectory,
        trash_id: trashId
      }
    });

  // Compress file/directory
  compress = (source: string, destination: string, format = "zip") =>
    this.api("compress", {
      method: "POST",
      params: {
        source,
        destination,
        format
      }
    });

  // Extract archive
  extract = (archive: string, destination: string) =>
    this.api("extract", {
      method: "POST",
      params: {
        archive,
        destination
      }
    });

  // Watch directory for changes
  watch = async (
    directory: string,
    {
      interval = 1,
      pathType = "virtual",
      onChange = null,
      onError = null,
      signal = null
    }: {
      interval?: number;
      pathType?: string;
      onChange?: ((data: unknown) => void) | null;
      onError?: ((error: unknown) => void) | null;
      signal?: AbortSignal | null;
    } = {}
  ) => {
    const url = this.app.getUrl(`${this.baseURL}/watch`);

    const params = new URLSearchParams({
      directory,
      interval: String(interval),
      path_type: pathType
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "GET",
      headers: {
        "kikx-app-id": String(this.app.getAppID() ?? "")
      },
      signal
    });

    if (!response.ok) {
      let error;

      try {
        error = await response.json();
      } catch {
        error = {
          detail: `Watch failed with status ${response.status}`
        };
      }

      throw new Error(error.detail || error.message || "Watch failed");
    }

    if (!response.body) {
      throw new Error("Streaming is not supported");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    const processEvent = (event: string) => {
      const lines = event.split("\n");

      let eventType = "message";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        }

        if (line.startsWith("data:")) {
          data += line.slice(5).trim();
        }
      }

      if (!data) {
        return;
      }

      try {
        const parsed = JSON.parse(data);

        if (eventType === "change") {
          onChange?.(parsed);
        } else if (eventType === "error") {
          onError?.(parsed);
        }
      } catch (error) {
        onError?.(error);
      }
    };

    const run = async () => {
      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");

        buffer = events.pop() || "";

        for (const event of events) {
          processEvent(event);
        }
      }
    };

    run().catch(error => {
      if (error.name !== "AbortError") {
        onError?.(error);
      }
    });

    return {
      close: () => reader.cancel()
    };
  };

  // Get thumbnail
  thumbnail = (filename: string) =>
    this.api("thumbnail", {
      params: { filename }
    });

  // Read file
  readFile = (filename: string) =>
    this.api("read", {
      params: { filename }
    });

  // Write file
  writeFile = (
    filename: string,
    content: string,
    { mode = "write", ensureDir = false }: { mode?: string; ensureDir?: boolean } = {}
  ) =>
    this.api("write", {
      method: "POST",
      body: {
        filename,
        content,
        mode,
        ensure_dir: ensureDir
      }
    });

  // Append to file
  appendFile = (filename: string, content: string) =>
    this.writeFile(filename, content, { mode: "append" });

  // Delete file
  deleteFile = (filename: string) =>
    this.api("delete", {
      method: "DELETE",
      params: { filename }
    });

  // Upload file
  uploadFile = (file: File, dest: string) => {
    const formData = new FormData();
    formData.append("files", file);

    return this.api("upload", {
      method: "POST",
      body: formData,
      params: { dest }
    });
  };

  // Download file
  downloadFile = (path: string) =>
    this.api("download", {
      params: { path }
    });

  // Upload files
  uploadFiles = (files: File[], dest: string) => {
    const formData = new FormData();

    files.forEach(file => formData.append("files", file));

    return this.api("upload", {
      method: "POST",
      body: formData,
      params: { dest }
    });
  };

  // Create File
  createFile = (filename: string) =>
    this.api("create_file", {
      method: "POST",
      body: { filename }
    });

  // Create directory
  createDirectory = (dirname: string) =>
    this.api("create_directory", {
      method: "POST",
      body: { dirname }
    });

  // Delete directory
  deleteDirectory = (dirname: string) =>
    this.api("delete_directory", {
      method: "DELETE",
      params: { dirname }
    });

  // Delete list
  deleteList = (paths: string[]) =>
    this.api("delete-list", {
      method: "POST",
      body: { paths }
    });

  // Rename
  rename = (source: string, new_name: string) =>
    this.api("rename", {
      method: "POST",
      body: { source, new_name }
    });

  // Info
  info = (path: string) =>
    this.api("info", {
      params: { path }
    });

  // Copy
  copy = (source: string, dest: string) =>
    this.api("copy", {
      method: "POST",
      body: { source, dest }
    });

  // Copy File
  copyFile = (
    source: string,
    dest: string,
    { override = false }: { override?: boolean } = {}
  ) =>
    this.request("copy-file", {
      method: "POST",
      body: { source, dest, override }
    });

  // Move
  move = (source: string, dest: string) =>
    this.api("move", {
      method: "POST",
      body: { source, dest }
    });

  // Expose path for serve files
  expose = (path: string, expires: number | null = null) =>
    this.api("expose", {
      method: "POST",
      body: { path, expires }
    });

  // Expose multiple paths for serving files
  batchExpose = (paths: string[], expires: number | null = null) =>
    this.api("expose-batch", {
      method: "POST",
      body: { paths, expires }
    });

  // Remove Expose
  removeExpose = (uid: string) =>
    this.api("expose", {
      method: "DELETE",
      params: { uid }
    });

  // Clear Expose
  clearExpose = () => this.api("clear-expose");

  // Get file url
  getServeUrl = (uid: string, path = "", absolute = false) => {
    const url = `${this.baseURL}/serve/${uid}/${encodeURIComponent(path)}`;

    return absolute ? this.app.getUrl(url) : url;
  };

  // Get full file url
  getServeAbsUrl = (uid: string, path = "") => this.getServeUrl(uid, path, true);

  // Get serve file
  getServeFile = (uid: string, path = "") =>
    this.api(`serve/${uid}/${encodeURIComponent(path)}`);

  // Get serve file info
  getServeFileInfo = (uid: string, path = "") =>
    this.api(`serve-info/${uid}/${encodeURIComponent(path)}`);

  // Path conversions
  convertPath = (path: string, type = "virtual") =>
    this.api("convert-path", {
      params: {
        path,
        type
      }
    });

  // virtual -> absolute
  toAbsolutePath = (path: string) => this.convertPath(path, "absolute");

  // absolute -> virtual
  toVirtualPath = (path: string) => this.convertPath(path, "virtual");
}

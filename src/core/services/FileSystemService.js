import Service from "./Service.js"

export default class FileSystemService extends Service {
  constructor(app) {
    super(app, "fs");
  }

  listFiles = (directory = "") =>
    this.request(`list?directory=${encodeURIComponent(directory)}`);
  readFile = filename =>
    this.request(`read?filename=${encodeURIComponent(filename)}`);
  writeFile = (filename, content) =>
    this.request("write", "POST", { filename, content });
  uploadFile = file => {
    const formData = new FormData();
    formData.append("file", file);
    return this.request("upload", "POST", formData, false);
  };
  deleteFile = filename =>
    this.request(`delete?filename=${encodeURIComponent(filename)}`, "DELETE");
  createDirectory = dirname =>
    this.request("create_directory", "POST", { dirname });
  deleteDirectory = dirname =>
    this.request(
      `delete_directory?dirname=${encodeURIComponent(dirname)}`,
      "DELETE"
    );
  copy = (source, destination) =>
    this.request("copy", "POST", { source, destination });
  move = (source, destination) =>
    this.request("move", "POST", { source, destination });
}

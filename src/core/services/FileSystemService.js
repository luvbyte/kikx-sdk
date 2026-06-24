import Service from "./Service.js";

export default class FileSystemService extends Service {
  constructor(app) {
    super(app, "fs");
  }
  // Get thumbnail
  thumbnail = filename =>
    this.request(`thumbnail?filename=${encodeURIComponent(filename)}`);
  // List files in directory
  listFiles = directory =>
    this.request(`list?directory=${encodeURIComponent(directory)}`);
  // Read file
  readFile = filename =>
    this.request(`read?filename=${encodeURIComponent(filename)}`);
  // Write file
  writeFile = (filename, content) =>
    this.request("write", "POST", { filename, content });
  // Delete file
  deleteFile = filename =>
    this.request(`delete?filename=${encodeURIComponent(filename)}`, "DELETE");
  // Upload file
  uploadFile = (file, dest) => {
    const formData = new FormData();
    formData.append("files", file);

    return this.request(
      `upload?dest=${encodeURIComponent(dest)}`,
      "POST",
      formData,
      false
    );
  };
  // Upload files
  uploadFiles(files, dest) {
    const formData = new FormData();

    files.forEach(file => {
      formData.append("files", file);
    });

    return this.request(
      `upload?dest=${encodeURIComponent(dest)}`,
      "POST",
      formData,
      false
    );
  }
  // Create directory
  createDirectory = dirname =>
    this.request("create_directory", "POST", { dirname });
  // Delete directory
  deleteDirectory = dirname =>
    this.request(
      `delete_directory?dirname=${encodeURIComponent(dirname)}`,
      "DELETE"
    );
  // Delete list
  deleteList = paths => this.request("delete-list", "POST", { paths });
  // Rename
  rename = (source, new_name) =>
    this.request("rename", "POST", { source, new_name });
  // Info
  info = path => this.request(`info?path=${encodeURIComponent(path)}`);
  // Copy
  copy = (source, dest) => this.request("copy", "POST", { source, dest });
  // Move
  move = (source, dest) => this.request("move", "POST", { source, dest });
}

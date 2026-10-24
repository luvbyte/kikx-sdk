import type { KikxApp } from "../KikxApp.js";

class AppInstaller {
  app: KikxApp;
  appData: (Record<string, unknown> & { temp_id?: string }) | null;
  isGithub: boolean;
  onInstalled: ((installer: AppInstaller) => void) | null;

  constructor(
    app: KikxApp,
    onInstalled: ((installer: AppInstaller) => void) | null = null
  ) {
    this.app = app;
    this.onInstalled = onInstalled;

    this.appData = null;
    this.isGithub = false;
  }

  // ----------------------------------------
  // Info
  // ----------------------------------------

  getTempID = () => this.appData?.temp_id;

  getPreviewUrl = (file: string) =>
    this.app.getUrl(
      `${this.app.system.baseURL}/kpm/preview/${this.getTempID()}/${encodeURIComponent(file)}`
    );

  // ----------------------------------------
  // Prepare local package
  // ----------------------------------------

  prepare = async (file: File) => {
    if (this.appData) {
      return this.appData;
    }

    const formData = new FormData();
    formData.append("file", file);

    const { data, error } = await this.app.system.request("kpm/prepare-local", {
      method: "POST",
      body: formData
    });

    if (error) {
      throw new Error(error.detail || error.message);
    }

    this.appData = data;
    this.isGithub = false;

    return data;
  };

  // from storage path
  storage = async (path: string) => {
    if (this.appData) {
      return this.appData;
    }

    const { data, error } = await this.app.system.request(
      "kpm/prepare-storage",
      {
        method: "POST",
        params: { path }
      }
    );

    if (error) {
      throw new Error(error.detail || error.message);
    }

    this.appData = data;
    this.isGithub = false;

    return data;
  };

  // ----------------------------------------
  // Prepare Github package
  // ----------------------------------------

  github = async (url: string, tag: string | null = null) => {
    if (this.appData) {
      return this.appData;
    }

    const { data, error } = await this.app.system.request(
      "kpm/prepare-github",
      {
        method: "POST",
        params: {
          url,
          tag
        }
      }
    );

    if (error) {
      throw new Error(error.detail || error.message);
    }

    this.appData = data;
    this.isGithub = true;

    return data;
  };

  // ----------------------------------------
  // Install
  // ----------------------------------------

  install = async () => {
    if (!this.appData) {
      throw new Error("No prepared installation session");
    }

    const { data, error } = await this.app.system.request(
      "kpm/confirm-install",
      {
        method: "POST",
        params: {
          temp_id: this.getTempID()
        }
      }
    );

    if (error) {
      throw new Error(error.detail || error.message);
    }

    // Installation succeeded
    this.onInstalled?.(this);

    return data;
  };
}

export default class Kpm {
  app: KikxApp;
  _installers: Map<string, AppInstaller>;

  constructor(app: KikxApp) {
    this.app = app;

    // Named/reusable installers
    this._installers = new Map();
  }

  // ----------------------------------------
  // Create
  // ----------------------------------------

  createInstaller = () => {
    return new AppInstaller(this.app);
  };

  // ----------------------------------------
  // Get installer
  // ----------------------------------------

  getInstaller = (name?: string) => {
    if (!name) {
      return this.createInstaller();
    }

    if (!this._installers.has(name)) {
      const installer = new AppInstaller(this.app, () =>
        this.removeInstaller(name)
      );

      this._installers.set(name, installer);
    }

    return this._installers.get(name)!;
  };

  // ----------------------------------------
  // Remove installer
  // ----------------------------------------

  removeInstaller = (name?: string) => {
    if (!name) {
      return;
    }

    this._installers.delete(name);
  };

  // ----------------------------------------
  // Clear installers
  // ----------------------------------------

  clearInstallers = () => {
    this._installers.clear();
  };

  // ----------------------------------------
  // Installer count
  // ----------------------------------------

  get installerCount() {
    return this._installers.size;
  }

  // ----------------------------------------
  // Installed apps
  // ----------------------------------------

  getInstalledApps = () => this.app.system.request("kpm/installed-apps");

  // ----------------------------------------
  // App info
  // ----------------------------------------

  getAppInfo = (name: string) =>
    this.app.system.request("kpm/app-info", {
      params: { name }
    });

  // ----------------------------------------
  // Uninstall app
  // ----------------------------------------

  uninstallApp = async (name: string, keepData = false) => {
    const { data, error } = await this.app.system.request("kpm/uninstall", {
      params: {
        app_name: name,
        keep_data: keepData
      }
    });

    if (error) {
      throw new Error(error.detail || error.message);
    }

    return data;
  };
}

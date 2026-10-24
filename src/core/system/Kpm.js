class AppInstaller {
  constructor(app, onInstalled = null) {
    this.app = app;
    this.onInstalled = onInstalled;

    this.appData = null;
    this.isGithub = false;
  }

  // ----------------------------------------
  // Info
  // ----------------------------------------

  getTempID = () => this.appData?.temp_id;

  getPreviewUrl = file =>
    this.app.getUrl(
      `${this.app.system.baseURL}/kpm/preview/${this.getTempID()}/${encodeURIComponent(file)}`
    );

  // ----------------------------------------
  // Prepare local package
  // ----------------------------------------

  prepare = async file => {
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

  storage = async path => {
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

  github = async (url, tag = null) => {
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
    if (this.onInstalled) {
      this.onInstalled(this);
    }

    return data;
  };
}

export default class Kpm {
  constructor(app) {
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

  getInstaller = name => {
    if (!name) {
      return this.createInstaller();
    }

    if (!this._installers.has(name)) {
      const installer = new AppInstaller(this.app, () =>
        this.removeInstaller(name)
      );

      this._installers.set(name, installer);
    }

    return this._installers.get(name);
  };

  // ----------------------------------------
  // Remove installer
  // ----------------------------------------

  removeInstaller = name => {
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

  getAppInfo = name =>
    this.app.system.request("kpm/app-info", {
      params: { name }
    });

  // ----------------------------------------
  // Uninstall app
  // ----------------------------------------

  uninstallApp = async (name, keepData = false) => {
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


import Service from "./Service.js";
import type { KikxApp } from "../KikxApp.js";

// Runs functions in os service in backend
export default class OSService extends Service {
  constructor(app: KikxApp) {
    super(app, "os");
  }

  // { data, error } result
  func = (
    name: string,
    {
      args = [],
      options = {}
    }: { args?: unknown[]; options?: Record<string, unknown> } = {}
  ) =>
    this.request("run", {
      method: "POST",
      body: {
        name,
        args,
        options
      }
    });

  // Execute
  run = (
    name: string,
    {
      args = [],
      options = {}
    }: { args?: unknown[]; options?: Record<string, unknown> } = {}
  ) =>
    this.fetch("run", {
      method: "POST",
      body: {
        name,
        args,
        options
      }
    });

  // ---------------------------------------------------------
  // Methods
  // ---------------------------------------------------------

  // Get username
  username = () => this.run("username");

  // Get environment variable
  getenv = (key: string, defaultValue: unknown = null) =>
    this.run("getenv", {
      args: [key, defaultValue] as unknown[]
    });

  // Set environment variable
  setenv = (key: string, value: unknown) =>
    this.run("setenv", {
      args: [key, value] as unknown[]
    });

  // Unset environment variable
  unsetenv = (key: string) =>
    this.run("unsetenv", {
      args: [key] as unknown[]
    });

  // Get complete environment
  environment = () => this.run("environment");

  // Get OS information
  info = () => this.run("info");
}

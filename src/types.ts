export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions
  extends Omit<RequestInit, "body" | "headers"> {
  body?: any;
  params?: Record<string, QueryValue>;
  headers?: HeadersInit;
}

export interface ApiError {
  status: number | null;
  message: string;
  detail?: string;
}

export interface ApiResult<T = any> {
  data: T | null;
  error: ApiError | null;
  contentType?: string;
}

export interface KikxConfigOptions {
  apiUrl?: string;
  wsUrl?: string;
  appID?: string;
}

export type EventCallback<T = unknown> = (
  payload: T
) => void | Promise<void>;

export interface AppInfo {
  options: {
    sudo: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface KikxInfo {
  [key: string]: unknown;
}

export interface AppMessage<T = unknown> {
  event?: string;
  payload?: T;
}

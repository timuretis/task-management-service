/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API. Public: it is compiled into the browser bundle. */
  readonly VITE_API_URL?: string;
}

/// <reference types="vite/client" />

/** Client-side configuration. Declared so `import.meta.env` stays typed rather than `any`. */
interface ImportMetaEnv {
  /** Where the Colyseus server lives. Defaults to the local dev server when unset. */
  readonly VITE_SERVER_URL?: string;
}

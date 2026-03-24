/// <reference types="vite/client" />

declare module '*.wasm?url' {
  const assetUrl: string;
  export default assetUrl;
}

declare module '/wasm/obamify.js' {
  const init: (wasmUrl?: string) => Promise<unknown>;
  export default init;
}

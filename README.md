### KIKX APP SDK

The SDK source is written in TypeScript. Run `pnpm install` and `pnpm build`
to generate the ESM, CommonJS, UMD, and TypeScript declaration files in `dist/`.
Run `pnpm typecheck` to check the source without generating build files.

The package entry points and exported SDK API remain available from the package
root. Browser APIs (`window`, `fetch`, `WebSocket`, and `FormData`) are used by
the SDK at runtime.
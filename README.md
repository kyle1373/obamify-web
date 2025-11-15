[(try it here)](https://obamify.com/)
# obamify
revolutionary new technology that turns any image into obama

![example](example.gif)

# How to use

**Use the ui at the top of the window to control the animation, choose between saved transformations, and generate new ones.** You can change the source image and target image, and choose how they are cropped to a square (tip: if both the images are faces, try making the eyes overlap). You can also change these advanced settings:
| Setting               | Description                                                                                     |
|-----------------------|-------------------------------------------------------------------------------------------------|
| resolution            | How many cells the images will be divided into. Higher resolution will capture more high frequency details. |
| proximity importance  | How much the algorithm changes the original image to make it look like the target image. Increase this if you want a more subtle transformation. |
| algorithm             | The algorithm used to calculate the assignment of each pixel. Optimal will find the mathematically optimal solution, but is extremely slow for high resolutions. |

# Web app (Next.js)

The public website now runs on [Next.js](https://nextjs.org/) and hosts the Rust/WASM build output produced by Trunk. The Rust code still lives in this repository; the Next layer just loads the generated `wasm-bindgen` bundle and handles the rest of the UI shell (metadata, manifest, share helpers, etc.).

## Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [Rust](https://www.rust-lang.org/tools/install) with the `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- [trunk](https://trunkrs.dev) installed via `cargo install --locked trunk`

## Running locally
```bash
npm install
npm run dev
```

The `predev` script syncs the static assets into `public/` and ensures the WASM bundle exists (building it with `trunk` if necessary). The Next.js dev server then starts on <http://localhost:3000>.

## Production build
```bash
npm run build
npm run start   # serves the production build on port 3000
```

`npm run build` automatically copies assets and runs `trunk build --release --dist public/wasm --public-url /wasm/` so the WASM artifacts are available to Next.js during the build and in any hosting platform (e.g., Vercel). The generated files in `public/wasm` are ignored in source control.

## Useful scripts

| Script | Description |
| ------ | ----------- |
| `npm run sync:assets` | Copies everything under `assets/`, `worker.js`, and `sw.js` into `public/` so that Next.js can serve them. Run this if you change anything in `assets/`. |
| `npm run wasm:build` | Manually rebuilds the WASM bundle into `public/wasm`. Handy if you want to refresh the compiled output without running the whole Next build. |
| `npm run wasm:ensure` | Checks whether `public/wasm/obamify.js` and `public/wasm/obamify_bg.wasm` exist, running a release `trunk build` if they do not. |

## Deploying on Railway (Nixpacks)

Railway uses [Nixpacks](https://nixpacks.com/) to detect and build projects. The repo includes a `nixpacks.toml` that ensures the builder image installs Node.js 20, `rustup`, the `wasm32-unknown-unknown` target, and `trunk` before it runs `npm run build`. The relevant phases are:

```toml
[phases.setup]
nixPkgs = ["nodejs_20", "rustup", ...]

[phases.install]
cmds = [
  "rustup toolchain install stable --profile minimal",
  "rustup target add wasm32-unknown-unknown",
  "cargo install --locked trunk",
  "npm ci"
]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start"
```

To deploy:

1. Install the [Railway CLI](https://docs.railway.app/develop/cli) and run `railway login`.
2. Inside this repo run `railway up` (or create a project in the dashboard and connect the GitHub repo). Railway will honor `nixpacks.toml`, run the commands above, and then launch `npm run start`. `next start` automatically binds to the `PORT` Railway provides, so no extra flags are required.
3. The generated WASM artifacts live in `public/wasm` during the build, so the deployed container can serve them directly without extra storage configuration.

# Native installations

Install the latest version in [releases](https://github.com/Spu7Nix/obamify/releases). Unzip and run the .exe file inside!
**Note for macOS users:**
Run `xattr -C <path/to/app.app>` in your terminal to remove the damaged app warning. 

## Building the desktop app from source

1. Install [Rust](https://www.rust-lang.org/tools/install)
2. Run `cargo run --release` in the project folder

## Legacy Trunk workflow (optional)

If you want to run the WASM build without the Next.js shell, you can still use Trunk directly:

1. Install [Rust](https://www.rust-lang.org/tools/install)
2. Install the required target with `rustup target add wasm32-unknown-unknown`
3. Install Trunk with `cargo install --locked trunk`
4. Run `trunk serve --release --open`

# Contributing

Please open an issue or a pull request if you have any suggestions or find any bugs :)

# How it works

magic

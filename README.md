# Edinstvo Glass documentation

The documentation site lives in this repository. The rendering package is maintained separately in `edinstvo-glass`.

## Local preview

```sh
npm ci
npm run dev
```

To preview unreleased package changes, build the adjacent package first and select its source explicitly:

```sh
GLASS_SOURCE=../edinstvo-glass npm run dev
```

The site runs at `http://localhost:4392/docs/`; Russian content is under `/ru/docs/`. `PORT` overrides the local port. The server binds to loopback by default; `HOST` can override that deliberately.

`GLASS_SOURCE` only changes the package source copied into the generated site. It does not publish a package or change the npm dependency. New features are marked as development previews until a matching package is released. Examples show a development-build message when the installed package lacks their API.

## Content and builds

Run `npm run build` to generate the static `dist` folder. English articles are in `content`; new Russian articles can live in `content/ru` with the same name. Existing sequential translations in `content/ru.json` remain supported. `build.mjs` generates local search indexes, `llms.txt` and `llms-full.txt` from the articles.

The header, navigation, article and contents columns retain their existing positions. Styling uses compact Martian Mono type, warm neutral surfaces, thin dividers and subdued selection colors in both themes.

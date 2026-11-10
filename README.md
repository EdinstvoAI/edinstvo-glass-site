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

`GLASS_SOURCE` only changes the package source copied into the generated site. It does not publish a package or change the npm dependency. The public documentation targets 1.1.4; older installations show an update message when an example needs an unavailable API.

## Content and builds

Run `npm run build` to generate the static `dist` folder. English articles are in `content`; new Russian articles can live in `content/ru` with the same name. Existing sequential translations in `content/ru.json` remain supported. `build.mjs` generates local search indexes, `llms.txt` and `llms-full.txt` from the articles.

## Interface and navigation

One header contains the logo, local search and display controls. All sections live in a grouped sidebar; the article and live examples occupy the center, with a contents list on the right. Both themes use neutral colors and compact Martian Mono type. Beige surfaces and a separate category strip were rejected.

`public/router.js` fetches same-language articles without reloading the shell. It preserves the sidebar, header, glass context and browser history. Example code loads before the article fades out for 60 ms and its replacement fades in for 150 ms. No article snapshots, translation or height interpolation are involved. Reduced-motion preferences bypass the fade. `public/demo.js` mounts and disposes each article's examples, observers and animation frames. Language switches use ordinary document navigation.

The sidebar remains beside the article at 680 px, including the normal Codex preview width. Only viewports of 600 px or narrower use a modal drawer. Section headings have stronger weight than page links; a subtle tree rule and indentation establish their relationship.

`public/chrome.js` uses the package's real `attachGlass` renderer for the navigation indicator and header controls. Its source is a local neutral canvas, not a capture of article text. It renders on changes and uses CSS selection styling when WebGL is unavailable.

`public/examples.js` provides six selectable scenes: navigation, controls, card, search, layers and merge. Material and motion controls update the selected surface, backgrounds can be switched, and the HTML example follows those settings. Uploaded images persist across article changes. Nothing is uploaded to a server.

## Verification

`npm test` builds both languages and checks links, API examples, scripts and the complete sidebar. `npm run test:browser` starts an isolated local preview and Chrome profile, then checks seamless navigation, history, stale requests, local search, mobile focus behavior, all six scenes and cleanup after a benchmark. Set `CHROME_BIN` when Chrome is not at the default macOS or Linux location.

Automated checks establish behavior; final visual acceptance remains Makar's decision. Work stays in Dev until an authorized release. The landing page is not part of this site.

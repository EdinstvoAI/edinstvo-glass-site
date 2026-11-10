# Documentation work

- [ ] Redesign the package documentation using Makar's three supplied references and real elements from `@edinstvo/glass`. The editor-like version and oversized rounded article card were rejected.
- [x] Implement the approved structure: one header with search, a complete left navigation tree, article with live examples and a right contents list. Same-language section changes fetch content without reloading the shell. Compact Martian Mono typography remains.
- [x] Verify desktop and mobile behavior: six build checks and 26 isolated Chrome navigation/showcase checks pass. Both themes were inspected visually. These checks do not establish visual acceptance; sidebar revision remains pending below.
- [x] Explain that merged surfaces share the group's material; remove zero-blur override from the merge example.
- [x] Fix double-escaped HTML examples; five documentation build checks pass.
- [ ] Visual acceptance by Makar. Do not mark the design approved based only on automated checks.

Study the supplied references before implementation. Integrate actual package surfaces where they help present the product; keep long-form documentation readable. Do not replace a design pass with palette-only changes or add unrelated functionality. When a visual decision is uncertain, ask one specific question with a recommendation before implementing it.

Use neutral white and gray in light mode and neutral graphite in dark mode. Makar rejected the beige cast; navigation glass must remain untinted.

Work in Dev. Do not publish the landing page.

## Current decision, 10 November 2026

Makar approved one header with search, a complete navigation tree on the left instead of the two-level header/sidebar split, the article and live examples in the center, and a contents list on the right. Selection and controls use the real glass engine; movement is limited to navigation changes and menu disclosure. He additionally requested seamless section changes: fetch and replace article content without reloading the page, preserving navigation, history and live examples. Implementation and verification are in progress. Read `Edinstvo/CLAUDE.md`, `docs/MAKAR.md` and `docs/UI.md` for working conventions; Edinstvo-specific servers, product tasks and build commands do not apply to this repository.

Six adjustable scenes replace the old examples: navigation, controls, card, search, layers and merge. Makar requested more than the initial three, editable examples and removal of development-preview notices for release 1.1.4. The header alignment bug was caused by grid stretch; controls now align centrally. Routing must preload example code before starting a View Transition; waiting for an animation frame inside the transition callback caused a rendering deadlock and must not be restored. Six build checks and 24 isolated Chrome navigation/showcase checks pass. Publication is pending.

## Sidebar decision, 11 November 2026

Makar rejected disclosure groups and the icon-rail proposal. He clarified the problem: section titles and page links are insufficiently distinct, and switching still feels like separate sliding blocks. Preserve the existing navigation hierarchy rather than inventing a third structure.

Inspection of his actual IAB window found a 680 px viewport, which incorrectly triggered the modal sidebar at the old 820 px breakpoint. It covered the beginning of the article and short code samples. The compact sidebar now stays alongside the article at that width; the drawer begins at 600 px. Section titles use stronger type, page links have a tree rule and indentation. Article routing now fades only the content for 60 + 150 ms, avoiding whole-article View Transition snapshots and apparent page movement. The glass selection moves in 180 ms. Six build checks and 26 browser checks pass, including the 680 px overlap regression. The actual browser window was checked after rebuilding. Final visual acceptance remains pending.

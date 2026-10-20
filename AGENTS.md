# Repository Guidelines

## Project Structure & Module Organization

This workspace contains two standalone browser apps:

- `IELTS Vocabulary Studio/`: IELTS topic vocabulary app. `index.html` contains its interface, styles, vocabulary data, and client-side behavior; `README.md` explains how to launch it.
- `App Vocabulary HSK/`: HSK vocabulary app. `index.html` is the interface, while `hsk1-data.js` and `hsk2-data.js` provide the vocabulary datasets.

There is no separate assets, source, or tests directory. Keep changes with the app they belong to, and avoid moving or renaming vocabulary data without updating its script references.

## Build, Test, and Development

No build system or package manager is configured. Open either app's `index.html` in a modern browser, or from PowerShell run `Invoke-Item '.\IELTS Vocabulary Studio\index.html'` (replace the path to open HSK). Changes to HTML, CSS, and JavaScript are picked up on browser refresh. The apps save learning state in browser `localStorage`.

## Coding Style & Naming

Use semantic HTML, responsive CSS, and plain browser JavaScript; avoid adding dependencies or a build step without a clear need. The existing pages use inline styles and scripts, so keep app-specific logic in its own `index.html` and HSK word data in the existing data files. Use descriptive camelCase for JavaScript identifiers, kebab-case for CSS classes, and UTF-8 for text and Chinese characters. Keep vocabulary entries consistent with each app's current data fields.

## Testing Guidelines

No automated test framework or coverage requirement is configured. For changes, manually open the affected app and check its main study flow, navigation, search, saved items, responsive layout, and persistence where relevant. Check the browser console for JavaScript errors.

## Commits and Pull Requests

No Git history or commit convention is available in this workspace. Use short, imperative commit subjects (for example, `Add academic vocabulary topic`). A pull request should explain the user-visible change, list manual checks performed, link any related issue, and include screenshots for substantial visual changes.

## Security & Configuration

Do not put credentials or private data in these client-side files. Imported vocabulary and saved progress remain in the browser; validate and escape any user-provided text before rendering it as HTML. External Google Fonts require an internet connection; system fallbacks should remain usable.

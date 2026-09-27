# Glyphary Web Clipper

Browser extension that saves the readable article on the current page, or the selected text,
as a Markdown note in a [Glyphary](https://glyphary.github.io) vault, or any other file-based markdown second brain.
Extraction runs inside the page with [Defuddle](https://github.com/kepano/defuddle).
The note is written straight into the vault folder you choose,
with the same frontmatter Glyphary's own Clip Web Page command produces.

Chromium browsers only (Chrome, Edge, Brave, Dia): writing into a chosen folder
uses the File System Access API, which Firefox and Safari do not implement.

## Build

```sh
cd browser-extension
npm install
npm run build      # dist/ is the unpacked extension
npm test
npm run package    # glyphary-web-clipper.zip for the store
```

Load `dist/` through `chrome://extensions` with Developer mode on and "Load unpacked".
The first clip asks for the vault folder.
The toolbar button or Alt+Shift+G opens the popup.
"Clip selection" appears when text is selected.

## Categories and tags

A category is a name plus a folder inside the vault.
The popup starts with `Clippings`; "New category..." adds one.
The last-used category is remembered.
Tags typed in the popup are added to the note's `tags` after `clippings`.

The note is written to disk first.
"Open in Glyphary after saving" then hands the tab a `glyphary://open` link;
untick it if you are not using Glyphary or this behavior is not desirable.


## Store listing notes

- Permissions: `activeTab` and `scripting` run the extractor in the tab you
  click on, and only then; `storage` holds the category list.
  There is no background worker and no host access.
- Page content never leaves the browser: it is written to the local folder.
- The vault folder grant is remembered by the browser; the extension re-asks
  only if the browser has dropped it.

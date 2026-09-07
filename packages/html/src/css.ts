// SPDX-License-Identifier: Apache-2.0

/**
 * Minimal, deterministic default stylesheet for HTML publications.
 * Entirely owned by the publishing layer. No remote @import, no scripts,
 * no runtime-generated values.
 */
export const DEFAULT_HTML_CSS = `html {
  line-height: 1.55;
  font-family: serif;
}

body {
  margin: 1em auto;
  padding: 0 1em;
  max-width: 42em;
}

.book-title {
  font-family: sans-serif;
  line-height: 1.25;
  margin: 0 0 0.4em;
}

.authors {
  margin: 0 0 1.5em;
}

nav.toc {
  margin: 0 0 2em;
}

nav.toc ol {
  list-style-type: none;
  padding-left: 0;
}

nav.toc li {
  margin: 0.4em 0;
}

h1, h2, h3, h4, h5, h6 {
  font-family: sans-serif;
  line-height: 1.25;
  margin-top: 1.2em;
  margin-bottom: 0.6em;
}

p {
  margin-top: 0;
  margin-bottom: 0.8em;
}

blockquote {
  margin: 1em 2em;
  font-style: italic;
}

ol, ul {
  margin-top: 0;
  margin-bottom: 1em;
  padding-left: 2em;
}

figure {
  margin: 1.5em 0;
  text-align: center;
}

figcaption {
  font-size: 0.9em;
  margin-top: 0.5em;
  font-style: italic;
}

section {
  margin-bottom: 2em;
}
`;

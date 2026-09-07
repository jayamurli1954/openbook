// SPDX-License-Identifier: Apache-2.0

import type { Book, StructuralSection } from "@openbook/book-model";
import { serializeNavDocument, type NavSectionEntry } from "./nav-serializer.js";
import { serializeOpfDocument } from "./opf-serializer.js";
import type {
  EpubBuildOptions,
  EpubManifestItem,
  EpubPackage,
  EpubPackageFile,
  EpubPackageMetadata,
} from "./types.js";
import { serializeSectionDocument } from "./xhtml-serializer.js";

const DEFAULT_DETERMINISTIC_TIMESTAMP = "2026-01-01T00:00:00Z";

const DEFAULT_CSS = `@charset "UTF-8";

/* OpenBook EPUB 3.3 Default Accessible Stylesheet */
html {
  line-height: 1.55; /* Headroom for Indic / Kannada ascenders and descenders */
  font-family: serif;
}

body {
  margin: 1em;
  padding: 0;
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
  text-align: justify;
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

nav#toc ol {
  list-style-type: none;
  padding-left: 0;
}

nav#toc li {
  margin: 0.5em 0;
}
`;

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`;

/**
 * Derives a deterministic modified timestamp without calling the system clock.
 */
function deriveDeterministicTimestamp(
  book: Readonly<Book>,
  options?: EpubBuildOptions,
): string {
  if (options?.modifiedDate) {
    if (typeof options.modifiedDate === "string") {
      const trimmed = options.modifiedDate.trim();
      if (trimmed) return trimmed;
    } else if (options.modifiedDate instanceof Date) {
      return options.modifiedDate.toISOString().replace(/\.\d{3}Z$/, "Z");
    }
  }

  if (book.metadata.publishedAt && book.metadata.publishedAt.trim()) {
    const pub = book.metadata.publishedAt.trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(pub)) {
      return pub;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(pub)) {
      return `${pub}T00:00:00Z`;
    }
  }

  return DEFAULT_DETERMINISTIC_TIMESTAMP;
}

function padIndex(index: number): string {
  return String(index).padStart(3, "0");
}

interface SectionDescriptor {
  section: StructuralSection;
  id: string; // manifest & spine ID
  href: string; // relative to EPUB/ e.g. "text/ch_001.xhtml"
  packagePath: string; // relative to package root e.g. "EPUB/text/ch_001.xhtml"
}

/**
 * Builds an in-memory, deterministic EPUB 3.3 package from a canonical Book Model.
 *
 * Guarantees:
 * 1. Consumes the Book Model as strictly read-only.
 * 2. Does not mutate the Book or leak EPUB packaging fields back to the caller.
 * 3. Never derives timestamps from the runtime clock (never calls `new Date()`).
 * 4. Yields bit-for-bit deterministic package files across identical inputs.
 * 5. Strictly adheres to EPUB 3.3 navigation and packaging specifications.
 */
export function buildEpubPackage(
  book: Readonly<Book>,
  options?: EpubBuildOptions,
): EpubPackage {
  const language = book.metadata.language || "und";
  const bookTitle = book.metadata.title || "Untitled Book";
  const identifier = book.metadata.identifier || "openbook-publication";
  const modified = deriveDeterministicTimestamp(book, options);

  // 1. Collect all structural sections in deterministic reading order
  const descriptors: SectionDescriptor[] = [];

  const frontMatter = book.frontMatter ?? [];
  frontMatter.forEach((section, index) => {
    const suffix = padIndex(index + 1);
    descriptors.push({
      section,
      id: `sec-front-${suffix}`,
      href: `text/front_${suffix}.xhtml`,
      packagePath: `EPUB/text/front_${suffix}.xhtml`,
    });
  });

  const chapters = book.chapters ?? [];
  chapters.forEach((section, index) => {
    const suffix = padIndex(index + 1);
    descriptors.push({
      section,
      id: `sec-ch-${suffix}`,
      href: `text/ch_${suffix}.xhtml`,
      packagePath: `EPUB/text/ch_${suffix}.xhtml`,
    });
  });

  const backMatter = book.backMatter ?? [];
  backMatter.forEach((section, index) => {
    const suffix = padIndex(index + 1);
    descriptors.push({
      section,
      id: `sec-back-${suffix}`,
      href: `text/back_${suffix}.xhtml`,
      packagePath: `EPUB/text/back_${suffix}.xhtml`,
    });
  });

  // 2. Build manifest items
  const manifest: EpubManifestItem[] = [
    {
      id: "nav",
      href: "nav.xhtml",
      mediaType: "application/xhtml+xml",
      properties: "nav",
    },
    {
      id: "css",
      href: "styles/openbook.css",
      mediaType: "text/css",
    },
  ];

  descriptors.forEach((desc) => {
    manifest.push({
      id: desc.id,
      href: desc.href,
      mediaType: "application/xhtml+xml",
    });
  });

  // 3. Build spine items in reading order
  const spine: string[] = descriptors.map((desc) => desc.id);

  // 4. Build package metadata projection
  const metadata: EpubPackageMetadata = {
    title: bookTitle,
    language,
    identifier,
    modified,
    authors: book.metadata.authors ? [...book.metadata.authors] : [],
    description: book.metadata.description || undefined,
    publisher: book.metadata.publisher || undefined,
    rights: book.metadata.rights || undefined,
  };

  // 5. Generate package files
  const files: EpubPackageFile[] = [];

  // 5.1 mimetype file (must be 20 bytes exact ASCII, no whitespace)
  files.push({
    path: "mimetype",
    mediaType: "text/plain",
    content: "application/epub+zip",
  });

  // 5.2 META-INF/container.xml
  files.push({
    path: "META-INF/container.xml",
    mediaType: "application/xml",
    content: CONTAINER_XML,
  });

  // 5.3 EPUB/package.opf
  const opfContent = serializeOpfDocument({ metadata, manifest, spine });
  files.push({
    path: "EPUB/package.opf",
    mediaType: "application/oebps-package+xml",
    content: opfContent,
  });

  // 5.4 EPUB/nav.xhtml
  const navSections: NavSectionEntry[] = descriptors.map((desc) => ({
    section: desc.section,
    href: desc.href,
  }));
  const navContent = serializeNavDocument({
    language,
    bookTitle,
    sections: navSections,
  });
  files.push({
    path: "EPUB/nav.xhtml",
    mediaType: "application/xhtml+xml",
    content: navContent,
  });

  // 5.5 EPUB/styles/openbook.css
  files.push({
    path: "EPUB/styles/openbook.css",
    mediaType: "text/css",
    content: DEFAULT_CSS,
  });

  // 5.6 Content documents (EPUB/text/*.xhtml)
  descriptors.forEach((desc) => {
    const xhtmlContent = serializeSectionDocument(desc.section, {
      language,
      bookTitle,
    });
    files.push({
      path: desc.packagePath,
      mediaType: "application/xhtml+xml",
      content: xhtmlContent,
    });
  });

  return {
    files,
    metadata,
    manifest,
    spine,
  };
}

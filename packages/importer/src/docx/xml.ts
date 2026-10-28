// SPDX-License-Identifier: Apache-2.0
import { DocxReadError } from "./errors.js";

/**
 * Restricted XML reader for `.docx` parts (ADR-0040 §3).
 *
 * WordprocessingML parts are well-formed XML without DTDs, so this reader:
 * - rejects any `<!DOCTYPE` (no XXE, no entity expansion);
 * - accepts only the five predefined entities and numeric character references;
 * - caps element depth and attributes per element;
 * - decodes UTF-8 or UTF-16 only, failing closed on malformed bytes;
 * - resolves namespaces, because OOXML prefixes are conventional, not fixed.
 */

export const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";

export interface XmlAttribute {
  readonly ns: string;
  readonly local: string;
  readonly value: string;
}

export interface XmlElement {
  readonly ns: string;
  readonly local: string;
  readonly attributes: readonly XmlAttribute[];
  readonly children: readonly XmlNode[];
}

/** Text content is a string; adjacent text and CDATA are merged. */
export type XmlNode = XmlElement | string;

export interface XmlParseLimits {
  readonly maxXmlDepth: number;
  readonly maxXmlAttributes: number;
}

export function getXmlAttribute(element: XmlElement, ns: string, local: string): string | undefined {
  return element.attributes.find((attr) => attr.ns === ns && attr.local === local)?.value;
}

export function xmlChildElements(element: XmlElement, ns?: string, local?: string): XmlElement[] {
  const out: XmlElement[] = [];
  for (const child of element.children) {
    if (typeof child === "string") continue;
    if (ns !== undefined && child.ns !== ns) continue;
    if (local !== undefined && child.local !== local) continue;
    out.push(child);
  }
  return out;
}

export function parseXmlPart(bytes: Uint8Array, limits: XmlParseLimits, part: string): XmlElement {
  return parseXml(decodeXmlBytes(bytes, part), limits, part);
}

export function decodeXmlBytes(bytes: Uint8Array, part: string): string {
  let encoding = "utf-8";
  let start = 0;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    start = 3;
  } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = "utf-16le";
    start = 2;
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = "utf-16be";
    start = 2;
  } else if (bytes[0] === 0x3c && bytes[1] === 0x00) {
    encoding = "utf-16le";
  } else if (bytes[0] === 0x00 && bytes[1] === 0x3c) {
    encoding = "utf-16be";
  }

  let text: string;
  try {
    text = new TextDecoder(encoding, { fatal: true, ignoreBOM: true }).decode(bytes.subarray(start));
  } catch {
    throw invalid(part, "it is not valid UTF-8 or UTF-16 text");
  }

  const declared = /^<\?xml[^>]*?\sencoding\s*=\s*["']([^"']+)["']/.exec(text)?.[1]?.toLowerCase();
  if (declared !== undefined) {
    const family = encoding.startsWith("utf-16") ? /^utf-16(le|be)?$/ : /^utf-8$/;
    if (!family.test(declared)) {
      throw invalid(part, `it declares an unsupported text encoding (${declared})`);
    }
  }
  return text;
}

// Sticky (/y) so names and attributes match in place, without copying text per tag.
const NAME_AT = /[^\s/>=<"'&]+/y;
const ATTRIBUTE_AT = /([^\s/>=<"'&]+)\s*=\s*(["'])/y;

interface OpenElement {
  readonly qname: string;
  readonly ns: string;
  readonly local: string;
  readonly attributes: XmlAttribute[];
  readonly children: XmlNode[];
  readonly scope: Map<string, string>;
}

export function parseXml(text: string, limits: XmlParseLimits, part: string): XmlElement {
  const stack: OpenElement[] = [];
  let root: XmlElement | undefined;
  let pos = 0;
  const length = text.length;

  const rootScope = new Map<string, string>([
    ["xml", XML_NAMESPACE],
    ["xmlns", XMLNS_NAMESPACE],
  ]);

  const appendText = (value: string): void => {
    const top = stack[stack.length - 1];
    if (!top) {
      if (value.trim() !== "") throw invalid(part, "it has text outside its root element");
      return;
    }
    const last = top.children[top.children.length - 1];
    if (typeof last === "string") {
      top.children[top.children.length - 1] = last + value;
    } else if (value !== "") {
      top.children.push(value);
    }
  };

  while (pos < length) {
    const lt = text.indexOf("<", pos);
    if (lt === -1) {
      appendText(decodeEntities(text.slice(pos), part));
      break;
    }
    if (lt > pos) {
      appendText(decodeEntities(text.slice(pos, lt), part));
    }
    pos = lt;

    if (text.startsWith("<?", pos)) {
      const close = text.indexOf("?>", pos + 2);
      if (close === -1) throw invalid(part, "a processing instruction is not closed");
      const target = /^<\?([^\s?]+)/.exec(text.slice(pos, close + 2))?.[1] ?? "";
      if (target.toLowerCase() === "xml" && pos !== 0) {
        throw invalid(part, "its XML declaration is not at the start");
      }
      pos = close + 2;
      continue;
    }
    if (text.startsWith("<!--", pos)) {
      const close = text.indexOf("-->", pos + 4);
      if (close === -1) throw invalid(part, "a comment is not closed");
      pos = close + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", pos)) {
      if (stack.length === 0) throw invalid(part, "it has text outside its root element");
      const close = text.indexOf("]]>", pos + 9);
      if (close === -1) throw invalid(part, "a CDATA section is not closed");
      appendText(text.slice(pos + 9, close));
      pos = close + 3;
      continue;
    }
    if (text.startsWith("<!", pos)) {
      throw new DocxReadError(
        "DOCX_XML_DOCTYPE",
        "This Word file contains a document type declaration, which OpenBook does not allow for safety.",
        part,
      );
    }
    if (text.startsWith("</", pos)) {
      const close = text.indexOf(">", pos + 2);
      if (close === -1) throw invalid(part, "an end tag is not closed");
      const qname = text.slice(pos + 2, close).trim();
      const open = stack.pop();
      if (!open || open.qname !== qname) throw invalid(part, "its tags do not match");
      const element = finish(open);
      pos = close + 1;
      if (stack.length === 0) {
        root = element;
      } else {
        stack[stack.length - 1]!.children.push(element);
      }
      continue;
    }

    // Start tag.
    if (stack.length === 0 && root !== undefined) {
      throw invalid(part, "it has more than one root element");
    }
    pos += 1;
    NAME_AT.lastIndex = pos;
    const nameMatch = NAME_AT.exec(text);
    if (!nameMatch) throw invalid(part, "an element has no name");
    const qname = nameMatch[0];
    pos += qname.length;

    const rawAttributes: Array<{ qname: string; value: string }> = [];
    let selfClosing = false;
    for (;;) {
      while (pos < length && isSpace(text.charCodeAt(pos))) pos += 1;
      if (pos >= length) throw invalid(part, "a start tag is not closed");
      if (text.startsWith("/>", pos)) {
        selfClosing = true;
        pos += 2;
        break;
      }
      if (text[pos] === ">") {
        pos += 1;
        break;
      }
      ATTRIBUTE_AT.lastIndex = pos;
      const attrMatch = ATTRIBUTE_AT.exec(text);
      if (!attrMatch) throw invalid(part, "an attribute is malformed");
      const attrName = attrMatch[1]!;
      const quote = attrMatch[2]!;
      pos += attrMatch[0].length;
      const end = text.indexOf(quote, pos);
      if (end === -1) throw invalid(part, "an attribute value is not closed");
      const rawValue = text.slice(pos, end);
      if (rawValue.includes("<")) throw invalid(part, "an attribute value contains '<'");
      pos = end + 1;
      if (rawAttributes.some((attr) => attr.qname === attrName)) {
        throw invalid(part, "an element repeats an attribute");
      }
      rawAttributes.push({ qname: attrName, value: decodeEntities(rawValue, part) });
      if (rawAttributes.length > limits.maxXmlAttributes) {
        throw new DocxReadError(
          "DOCX_XML_TOO_MANY_ATTRIBUTES",
          "This Word file has an element with far more attributes than any real document.",
          part,
        );
      }
    }

    if (stack.length + 1 > limits.maxXmlDepth) {
      throw new DocxReadError(
        "DOCX_XML_TOO_DEEP",
        "This Word file is nested far more deeply than any real document.",
        part,
      );
    }

    const parentScope = stack[stack.length - 1]?.scope ?? rootScope;
    let scope = parentScope;
    for (const attr of rawAttributes) {
      if (attr.qname === "xmlns" || attr.qname.startsWith("xmlns:")) {
        if (scope === parentScope) scope = new Map(parentScope);
        scope.set(attr.qname === "xmlns" ? "" : attr.qname.slice(6), attr.value);
      }
    }

    const [prefix, local] = splitQName(qname, part);
    const ns = resolvePrefix(scope, prefix, true, part);
    const attributes: XmlAttribute[] = [];
    for (const attr of rawAttributes) {
      if (attr.qname === "xmlns" || attr.qname.startsWith("xmlns:")) continue;
      const [attrPrefix, attrLocal] = splitQName(attr.qname, part);
      attributes.push({ ns: resolvePrefix(scope, attrPrefix, false, part), local: attrLocal, value: attr.value });
    }

    const open: OpenElement = { qname, ns, local, attributes, children: [], scope };
    if (selfClosing) {
      const element = finish(open);
      if (stack.length === 0) {
        root = element;
      } else {
        stack[stack.length - 1]!.children.push(element);
      }
    } else {
      stack.push(open);
    }
  }

  if (stack.length > 0) throw invalid(part, "it ends before all elements are closed");
  if (!root) throw invalid(part, "it has no root element");
  return root;
}

function finish(open: OpenElement): XmlElement {
  return { ns: open.ns, local: open.local, attributes: open.attributes, children: open.children };
}

function splitQName(qname: string, part: string): [string, string] {
  const colon = qname.indexOf(":");
  if (colon === -1) return ["", qname];
  const prefix = qname.slice(0, colon);
  const local = qname.slice(colon + 1);
  if (!prefix || !local || local.includes(":")) throw invalid(part, `the name "${qname}" is malformed`);
  return [prefix, local];
}

function resolvePrefix(scope: Map<string, string>, prefix: string, isElement: boolean, part: string): string {
  if (prefix === "") {
    // Unprefixed attributes are in no namespace; unprefixed elements take the default namespace.
    return isElement ? (scope.get("") ?? "") : "";
  }
  const ns = scope.get(prefix);
  if (ns === undefined) throw invalid(part, `the prefix "${prefix}" is not declared`);
  return ns;
}

const PREDEFINED: Readonly<Record<string, string>> = {
  lt: "<",
  gt: ">",
  amp: "&",
  apos: "'",
  quot: '"',
};

function decodeEntities(raw: string, part: string): string {
  if (!raw.includes("&")) return raw;
  let out = "";
  let pos = 0;
  for (;;) {
    const amp = raw.indexOf("&", pos);
    if (amp === -1) {
      out += raw.slice(pos);
      return out;
    }
    out += raw.slice(pos, amp);
    const semi = raw.indexOf(";", amp + 1);
    if (semi === -1 || semi - amp > 12) {
      throw entityError(part);
    }
    const name = raw.slice(amp + 1, semi);
    const predefined = PREDEFINED[name];
    if (predefined !== undefined) {
      out += predefined;
    } else {
      const match = /^#(?:x([0-9a-fA-F]+)|([0-9]+))$/.exec(name);
      if (!match) throw entityError(part);
      const codePoint = match[1] !== undefined ? parseInt(match[1], 16) : parseInt(match[2]!, 10);
      if (!isXmlChar(codePoint)) throw entityError(part);
      out += String.fromCodePoint(codePoint);
    }
    pos = semi + 1;
  }
}

function isXmlChar(cp: number): boolean {
  return (
    cp === 0x9 ||
    cp === 0xa ||
    cp === 0xd ||
    (cp >= 0x20 && cp <= 0xd7ff) ||
    (cp >= 0xe000 && cp <= 0xfffd) ||
    (cp >= 0x10000 && cp <= 0x10ffff)
  );
}

function isSpace(code: number): boolean {
  return code === 0x20 || code === 0x9 || code === 0xa || code === 0xd;
}

function entityError(part: string): DocxReadError {
  return new DocxReadError(
    "DOCX_XML_ENTITY",
    "This Word file uses a text entity OpenBook does not allow for safety.",
    part,
  );
}

function invalid(part: string, reason: string): DocxReadError {
  return new DocxReadError("DOCX_XML_INVALID", `This Word file is damaged: ${reason}.`, part);
}

// SPDX-License-Identifier: Apache-2.0

export interface SvgSecurityFinding {
  readonly code: string;
  readonly message: string;
}

/**
 * Reject-only SVG security scan (ADR-0017 §2.8 / INV-2).
 * Does not rewrite or sanitize — unsafe constructs fail closed.
 * Deliberately precise; does not claim broad generic XXE protection.
 */
export function findUnsafeSvgConstructs(content: Uint8Array): SvgSecurityFinding[] {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(content);
  const findings: SvgSecurityFinding[] = [];

  if (/<script\b/i.test(text)) {
    findings.push({
      code: "SVG_SCRIPT",
      message: "SVG contains a <script> element and is rejected.",
    });
  }
  if (/<foreignObject\b/i.test(text)) {
    findings.push({
      code: "SVG_FOREIGN_OBJECT",
      message: "SVG contains a <foreignObject> element and is rejected.",
    });
  }
  // Event-handler attributes: onload=, onclick=, etc.
  if (/\son[a-z]+\s*=/i.test(text)) {
    findings.push({
      code: "SVG_EVENT_HANDLER",
      message: "SVG contains event-handler attributes and is rejected.",
    });
  }
  // External resource references (http(s), protocol-relative, data: for active payloads).
  if (
    /\b(?:xlink:)?href\s*=\s*["']\s*(?:https?:|\/\/)/i.test(text) ||
    /\b(?:xlink:)?href\s*=\s*["']\s*javascript:/i.test(text) ||
    /\burl\s*\(\s*["']?\s*(?:https?:|\/\/)/i.test(text)
  ) {
    findings.push({
      code: "SVG_EXTERNAL_REFERENCE",
      message: "SVG contains external resource references and is rejected.",
    });
  }
  if (/<!DOCTYPE\b/i.test(text)) {
    findings.push({
      code: "SVG_DTD",
      message: "SVG declares an XML DTD / DOCTYPE and is rejected.",
    });
  }
  if (/<!ENTITY\b/i.test(text)) {
    findings.push({
      code: "SVG_EXTERNAL_ENTITY",
      message: "SVG declares an XML ENTITY and is rejected.",
    });
  }

  return findings;
}

export function isSvgMediaType(mediaType: string): boolean {
  return mediaType.toLowerCase() === "image/svg+xml";
}

/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0041 Slice 1 — TipTap node for a Book callout (lesson box), display only.
 *
 * Registered so a callout is never dropped while a chapter is edited: TipTap keeps only the
 * node types it knows (the same gap that once turned pictures into text). The box's text is
 * editable inline content; its title is an attribute shown above it. Commands to make and
 * remove boxes and to edit the title come in Slice 3.
 */
import { Node, mergeAttributes } from "@tiptap/core";

export const OpenbookCalloutNode = Node.create({
  name: "openbookCallout",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-title") ?? "",
        renderHTML: (attrs) => ({ "data-title": String(attrs.title ?? "") }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-openbook-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-openbook-callout": "", class: "openbook-callout" }),
      0,
    ];
  },
});

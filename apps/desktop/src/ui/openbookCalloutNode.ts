/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0041 — TipTap node for a Book callout (lesson box).
 *
 * Slice 1 registered it so a callout is never dropped while a chapter is edited: TipTap keeps
 * only the node types it knows (the same gap that once turned pictures into text). Slice 3 adds
 * commands to make a box from a paragraph, turn it back, and change its title. The box's text is
 * editable inline content; its title is an attribute shown above it.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import type { TipTapNodeJSON } from "../domain/editorAdapter";
import { lessonBoxToParagraph } from "../workflow/domain/lessonBoxEditing";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    openbookCallout: {
      /** Turn the paragraph at the cursor into a lesson box with this title. */
      setLessonBox: (title: string) => ReturnType;
      /** Turn the lesson box at the cursor back into a paragraph, keeping its title as bold text. */
      unsetLessonBox: () => ReturnType;
      /** Change the title of the lesson box at the cursor. */
      setLessonBoxTitle: (title: string) => ReturnType;
    };
  }
}

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

  addCommands() {
    return {
      setLessonBox:
        (title) =>
        ({ editor, commands }) =>
          editor.isActive("paragraph") && commands.setNode(this.name, { title }),

      unsetLessonBox:
        () =>
        ({ state, commands }) => {
          const { $from } = state.selection;
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth);
            if (node.type.name !== this.name) continue;
            const from = $from.before(depth);
            const paragraph = lessonBoxToParagraph(node.toJSON() as TipTapNodeJSON);
            return commands.insertContentAt({ from, to: from + node.nodeSize }, paragraph);
          }
          return false;
        },

      setLessonBoxTitle:
        (title) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { title }),
    };
  },

  addKeyboardShortcuts() {
    return {
      // Backspace at the start of an empty box turns it back into a paragraph.
      Backspace: ({ editor }) => {
        const { empty, $from } = editor.state.selection;
        if (!empty || $from.parent.type.name !== this.name || $from.parent.content.size > 0) {
          return false;
        }
        return editor.commands.setNode("paragraph");
      },
    };
  },
});

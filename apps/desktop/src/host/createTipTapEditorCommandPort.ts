// SPDX-License-Identifier: Apache-2.0
/**
 * Bind a live TipTap Editor to the Writing Studio editor command port.
 */
import type { Editor } from "@tiptap/core";
// Brings the lesson-box command types (setLessonBox, unsetLessonBox, setLessonBoxTitle) into scope.
import type {} from "../ui/openbookCalloutNode";
import type {
  WritingStudioEditorCommandPort,
  WritingStudioHeadingLevel,
} from "../workflow/domain/writingStudioToolbarAdapter.js";

export function createTipTapEditorCommandPort(
  editor: Editor,
): WritingStudioEditorCommandPort {
  return {
    toggleBold: () => {
      editor.chain().focus().toggleBold().run();
    },
    toggleItalic: () => {
      editor.chain().focus().toggleItalic().run();
    },
    toggleHeading: (level: WritingStudioHeadingLevel) => {
      editor.chain().focus().toggleHeading({ level }).run();
    },
    toggleBulletList: () => {
      editor.chain().focus().toggleBulletList().run();
    },
    toggleOrderedList: () => {
      editor.chain().focus().toggleOrderedList().run();
    },
    toggleBlockquote: () => {
      editor.chain().focus().toggleBlockquote().run();
    },
    toggleLessonBox: (title: string) => {
      if (editor.isActive("openbookCallout")) {
        return editor.chain().focus().unsetLessonBox().run() ? "unmade" : "refused";
      }
      return editor.chain().focus().setLessonBox(title).run() ? "made" : "refused";
    },
    setLessonBoxTitle: (title: string) => {
      if (!editor.isActive("openbookCallout")) return false;
      // No focus(): the title field keeps the keyboard while the author types.
      return editor.commands.setLessonBoxTitle(title);
    },
    setLink: (href: string) => {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    },
    unsetLink: () => {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    },
    undo: () => {
      editor.chain().focus().undo().run();
    },
    redo: () => {
      editor.chain().focus().redo().run();
    },
  };
}

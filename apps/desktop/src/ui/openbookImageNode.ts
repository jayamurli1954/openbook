/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * TipTap node for a Book image block, so pictures pass through the Write step unchanged.
 * Before this node existed, the editor received pictures as "[image:…]" text and wrote that
 * text back into the Book when a chapter was shown.
 *
 * The node is an atom: it stores the asset id and caption (Semantic Document inlines) as
 * attributes and draws the picture; its content is never edited as text.
 */
import { Node, mergeAttributes } from "@tiptap/core";

export interface OpenbookImageNodeOptions {
  /** Returns a displayable URL for the asset (e.g. a blob: URL), or undefined if unavailable. */
  resolveImageUrl: (assetId: string) => Promise<string | undefined>;
  /** Plain-text description shown as the picture's alt text in the editor. */
  describeImage: (assetId: string) => string;
}

type InlineLike = { type: string; text?: string; children?: InlineLike[] };

function plainText(inlines: unknown): string {
  if (!Array.isArray(inlines)) return "";
  return (inlines as InlineLike[])
    .map((span) => (span.type === "text" ? (span.text ?? "") : plainText(span.children)))
    .join("");
}

export const OpenbookImageNode = Node.create<OpenbookImageNodeOptions>({
  name: "openbookImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      resolveImageUrl: async () => undefined,
      describeImage: () => "",
    };
  },

  addAttributes() {
    return {
      assetId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-asset-id"),
        renderHTML: (attrs) => ({ "data-asset-id": attrs.assetId as string }),
      },
      caption: {
        default: [],
        parseHTML: (element) => {
          try {
            const parsed: unknown = JSON.parse(element.getAttribute("data-caption") ?? "[]");
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs) => ({ "data-caption": JSON.stringify(attrs.caption ?? []) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-openbook-image]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes, { "data-openbook-image": "" })];
  },

  addNodeView() {
    return ({ node }) => {
      const assetId = String(node.attrs.assetId ?? "");
      const figure = document.createElement("figure");
      figure.className = "openbook-image";
      figure.setAttribute("data-openbook-image", "");
      figure.setAttribute("data-asset-id", assetId);
      figure.contentEditable = "false";

      const img = document.createElement("img");
      img.alt = this.options.describeImage(assetId) || "Picture";
      img.draggable = false;
      figure.append(img);

      const caption = plainText(node.attrs.caption);
      if (caption.trim()) {
        const figcaption = document.createElement("figcaption");
        figcaption.textContent = caption;
        figure.append(figcaption);
      }

      let url: string | undefined;
      let destroyed = false;
      void this.options.resolveImageUrl(assetId).then((resolved) => {
        if (destroyed) {
          if (resolved?.startsWith("blob:")) URL.revokeObjectURL(resolved);
          return;
        }
        url = resolved;
        if (resolved) img.src = resolved;
        else figure.classList.add("openbook-image-missing");
      });

      return {
        dom: figure,
        ignoreMutation: () => true,
        destroy: () => {
          destroyed = true;
          if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
        },
      };
    };
  },
});

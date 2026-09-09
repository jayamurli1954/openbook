// SPDX-License-Identifier: Apache-2.0
import type { Book } from "@openbook/book-model";

/** Deep-clone a Book snapshot (INV-2 reference isolation). */
export function cloneBook(book: Book): Book {
  return structuredClone(book);
}

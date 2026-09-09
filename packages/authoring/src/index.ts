// SPDX-License-Identifier: Apache-2.0

export type {
  SessionState,
  AddSectionParams,
  BookSessionOptions,
  IBookSession,
} from "./types.js";
export { BLOCK_TYPES } from "./types.js";
export { BookSession } from "./book-session.js";
export { DeterministicIdFactory } from "./ids.js";
export { cloneBook } from "./clone.js";
export {
  AuthoringError,
  SectionNotFoundError,
  BlockNotFoundError,
  InvalidStructureOperationError,
  DomainValidationError,
} from "./errors.js";
export { isRoleValidForMatter } from "./roles.js";

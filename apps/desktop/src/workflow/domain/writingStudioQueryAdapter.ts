// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0034 Slice 3 — Writing Studio word-count + document-search adapter.
 *
 * Derives counts and find-in-book hits from Book Model text only.
 * TipTap JSON must never be passed through this module.
 */
import type { Book } from "@openbook/book-model";
import {
  normalizeSearchQuery,
  searchBookText,
  wordCountSnapshotForBook,
  type WritingStudioSearchHit,
  type WritingStudioSearchPort,
  type WritingStudioWordCountPort,
  type WritingStudioWordCountSnapshot,
} from "./writingStudioContract.js";

export type WritingStudioSearchOutcome =
  | {
      readonly ok: true;
      readonly query: string;
      readonly hits: readonly WritingStudioSearchHit[];
    }
  | {
      readonly ok: false;
      readonly code: "EMPTY_QUERY";
      readonly message: string;
      readonly hits: readonly [];
    };

/** Injectable Book source — typically DesktopStudioCoordinator.getBook. */
export interface WritingStudioBookSourcePort {
  getBook(): Book;
}

export interface IWritingStudioQueryAdapter
  extends WritingStudioWordCountPort, WritingStudioSearchPort {
  getWordCounts(sectionId?: string): WritingStudioWordCountSnapshot;
  /** Fail-closed empty query; returns structured outcome for UI chrome. */
  searchDocument(rawQuery: string): WritingStudioSearchOutcome;
  /** Contract port shape — empty query yields []. Prefer searchDocument in UI. */
  search(rawQuery: string): readonly WritingStudioSearchHit[];
}

export interface WritingStudioQueryAdapterDeps {
  readonly bookSource: WritingStudioBookSourcePort;
}

export class WritingStudioQueryAdapter implements IWritingStudioQueryAdapter {
  readonly #bookSource: WritingStudioBookSourcePort;

  constructor(deps: WritingStudioQueryAdapterDeps) {
    this.#bookSource = deps.bookSource;
  }

  getWordCounts(sectionId?: string): WritingStudioWordCountSnapshot {
    return wordCountSnapshotForBook(this.#bookSource.getBook(), sectionId);
  }

  searchDocument(rawQuery: string): WritingStudioSearchOutcome {
    const normalized = normalizeSearchQuery(rawQuery);
    if (!normalized.ok) {
      return {
        ok: false,
        code: normalized.code,
        message: normalized.message,
        hits: [],
      };
    }
    const hits = searchBookText(this.#bookSource.getBook(), normalized);
    return { ok: true, query: normalized.query, hits };
  }

  search(rawQuery: string): readonly WritingStudioSearchHit[] {
    const outcome = this.searchDocument(rawQuery);
    return outcome.hits;
  }
}

export function createWritingStudioQueryAdapter(
  deps: WritingStudioQueryAdapterDeps,
): IWritingStudioQueryAdapter {
  return new WritingStudioQueryAdapter(deps);
}

// SPDX-License-Identifier: Apache-2.0
import { randomUUID } from "node:crypto";

export function createId(): string {
  return randomUUID();
}

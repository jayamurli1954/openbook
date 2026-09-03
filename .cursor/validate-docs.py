#!/usr/bin/env python3
"""OpenBook constitution docs validator.

Dependency-free (Python standard library only), so it introduces no
third-party dependency and stays within the OpenBook implementation freeze
(see docs/00-constitution.md and docs/04-foss-strategy.md).

It performs the core "quality gate" for a constitution-only repository:

1. Internal Markdown link integrity
   - every relative link target resolves to an existing file;
   - every "#anchor" (local or cross-file) resolves to a real heading.
2. Freeze guard
   - fails if stack-selecting package manifests or application source trees
     appear, which would violate the DECIDED implementation freeze.

External links (http, https, mailto, tel) are reported but not fetched.

Exit code 0 means the documentation set is internally consistent.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Inline + reference-style markdown links: [text](target) — ignores images? no,
# images use the same target space, so we treat them the same.
LINK_RE = re.compile(r"(?<!\\)\[[^\]]*\]\(([^)]+)\)")
ATX_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
EXTERNAL_SCHEMES = ("http://", "https://", "mailto:", "tel:", "//")

# Freeze guard: files/dirs that would imply a chosen stack or app source tree.
FORBIDDEN_MANIFESTS = (
    "package.json",
    "Cargo.toml",
    "pyproject.toml",
    "go.mod",
    "pom.xml",
    "build.gradle",
    "composer.json",
    "Gemfile",
)
FORBIDDEN_SOURCE_DIRS = ("src", "app", "lib")


def slugify(heading_text: str) -> str:
    """Approximate GitHub's heading-anchor slug algorithm."""
    text = heading_text.strip().lower()
    # Drop inline code backticks and markdown link syntax, keep link text.
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = text.replace("`", "")
    # Remove characters that are not word chars, spaces, or hyphens.
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = text.strip().replace(" ", "-")
    return text


def find_markdown_files() -> list[Path]:
    files = sorted(REPO_ROOT.glob("*.md"))
    files += sorted((REPO_ROOT / "docs").glob("*.md"))
    return [f for f in files if f.is_file()]


def collect_anchors(md_path: Path) -> set[str]:
    anchors: set[str] = set()
    counts: dict[str, int] = {}
    in_code_fence = False
    for line in md_path.read_text(encoding="utf-8").splitlines():
        if line.lstrip().startswith("```"):
            in_code_fence = not in_code_fence
            continue
        if in_code_fence:
            continue
        m = ATX_HEADING_RE.match(line)
        if not m:
            continue
        slug = slugify(m.group(2))
        if not slug:
            continue
        # GitHub appends -1, -2, ... to duplicate slugs.
        if slug in counts:
            counts[slug] += 1
            anchors.add(f"{slug}-{counts[slug]}")
        else:
            counts[slug] = 0
            anchors.add(slug)
    return anchors


def iter_links(md_path: Path):
    in_code_fence = False
    for lineno, line in enumerate(
        md_path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if line.lstrip().startswith("```"):
            in_code_fence = not in_code_fence
            continue
        if in_code_fence:
            continue
        for match in LINK_RE.finditer(line):
            yield lineno, match.group(1).strip()


def check_links(md_files: list[Path], anchors_by_file: dict[Path, set[str]]):
    problems: list[str] = []
    external_count = 0
    checked = 0

    for md in md_files:
        for lineno, target in iter_links(md):
            if not target:
                continue
            if any(target.startswith(scheme) for scheme in EXTERNAL_SCHEMES):
                external_count += 1
                continue

            checked += 1
            rel = f"{md.relative_to(REPO_ROOT)}:{lineno}"

            if target.startswith("#"):
                anchor = target[1:]
                if slugify_anchor(anchor) not in anchors_by_file[md]:
                    problems.append(
                        f"{rel}: broken local anchor '{target}'"
                    )
                continue

            path_part, _, anchor = target.partition("#")
            resolved = (md.parent / path_part).resolve()

            if not resolved.exists():
                problems.append(
                    f"{rel}: broken link target '{target}' "
                    f"(resolved: {relpath(resolved)})"
                )
                continue

            if anchor and resolved.suffix == ".md":
                target_anchors = anchors_by_file.get(resolved)
                if target_anchors is None:
                    target_anchors = collect_anchors(resolved)
                    anchors_by_file[resolved] = target_anchors
                if slugify_anchor(anchor) not in target_anchors:
                    problems.append(
                        f"{rel}: broken cross-file anchor '{target}'"
                    )

    return problems, checked, external_count


def slugify_anchor(anchor: str) -> str:
    # Anchors in links are already slug-ish; normalise consistently.
    return slugify(anchor.replace("-", " "))


def relpath(p: Path) -> str:
    try:
        return str(p.relative_to(REPO_ROOT))
    except ValueError:
        return str(p)


def check_freeze() -> list[str]:
    problems: list[str] = []
    for manifest in FORBIDDEN_MANIFESTS:
        if (REPO_ROOT / manifest).exists():
            problems.append(
                f"freeze violation: stack-selecting manifest '{manifest}' present"
            )
    for src in FORBIDDEN_SOURCE_DIRS:
        if (REPO_ROOT / src).is_dir():
            problems.append(
                f"freeze violation: application source dir '{src}/' present"
            )
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--quiet", action="store_true", help="only print on failure"
    )
    args = parser.parse_args()

    md_files = find_markdown_files()
    if not md_files:
        print("ERROR: no Markdown files found", file=sys.stderr)
        return 1

    anchors_by_file = {md: collect_anchors(md) for md in md_files}

    link_problems, checked, external_count = check_links(md_files, anchors_by_file)
    freeze_problems = check_freeze()
    problems = link_problems + freeze_problems

    if not args.quiet:
        print(f"Scanned {len(md_files)} Markdown files:")
        for md in md_files:
            print(f"  - {md.relative_to(REPO_ROOT)}")
        print(
            f"Checked {checked} internal link(s); "
            f"skipped {external_count} external link(s)."
        )
        print("Freeze guard: no stack manifests or app source trees.")

    if problems:
        print(f"\nFAILED with {len(problems)} problem(s):", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1

    print("\nOK: documentation set is internally consistent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

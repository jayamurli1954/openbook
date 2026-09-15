# DCO 1.1 contribution sign-off

OpenBook uses the Developer Certificate of Origin (DCO) 1.1 as its contribution sign-off mechanism, as accepted by ADR-0024.

Every commit submitted through a pull request must include a `Signed-off-by:` trailer using the contributor's real name and email address.

The simplest way to create a signed-off commit is:

```text
git commit -s -m "Your commit message"
```

For a local commit that already exists, amend it with:

```text
git commit --amend -s --no-edit
```

If multiple submitted commits are missing sign-offs, correct each affected commit before pushing the branch again.

## Important rules

- Do not fabricate a sign-off.
- Do not sign another person's work or sign on another person's behalf.
- The DCO sign-off does not transfer copyright to SanMitra Tech Solutions.
- Contributions remain subject to the Apache-2.0 license and existing contributor-protection policy.

The repository's DCO CI check verifies every commit covered by a pull request and fails when a covered commit lacks a valid sign-off. The check is informationally explicit: it reports the affected commit(s) and the normal Git command used to correct them.

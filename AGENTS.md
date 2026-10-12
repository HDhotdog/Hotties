# Commit and push conventions

- Write every commit message in Conventional Commits format: `<type>[optional scope][!]: <description>`. Use a concise, imperative description that starts with a lowercase letter. Common types include `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, and `chore`.
- Use a scope when it helps identify the affected area, for example `feat(scanner): resume after a successful scan`.
- Mark breaking changes with `!` before the colon and describe them in a `BREAKING CHANGE:` footer when useful or required to explain their impact.
- Push all changes to a feature branch; `main` is protected and must never be used as a push target. If work is currently on `main`, create or switch to a feature branch before pushing.
- After creating commits for requested work, push them to that feature branch unless the user asks to keep them local or a remote, permission, or safety restriction prevents the push. Report any such restriction clearly.
- After pushing requested work, create a pull request via the GitHub CLI (`gh pr create`) unless one already exists for the branch or the user asks not to create one.
- Assign the pull request to its author (`--assignee @me` when creating it with the author's authenticated GitHub account).
- Give the pull request a concise title and a short description summarizing the changes and relevant validation. Report its URL after creation.
- Do not force-push unless the user explicitly instructs it.

Conventional Commits applies to commit messages; it does not define branch-name syntax.

# AI usage log

| Date | Tool / model | What it helped with | What I corrected and why |
| ---- | ------------ | ------------------- | ------------------------ |
| 2026-11-26 | Claude Code (Opus) | API Dockerfile, phase 4 | The build stage copied all of `apps/api/` (configs, migrations, the Dockerfile) though `tsc` needs only `src` and the two tsconfig files. Any unrelated edit invalidated the cache and reran the compile. Narrowed it to two explicit `COPY` lines. |

## Bugs the AI introduced and found itself

These were not corrections by the author (see D37). The AI wrote the code, and a later check by the AI found the
fault. They are listed because they show what tests and CI did not catch.

| Date | Change (PR) | What went wrong | How it was found |
| ---- | ----------- | --------------- | ---------------- |
| 2026-11-28 | OIDC trust policy (#10) | The deploy role trusted the plain `owner/name` repository subject. GitHub now puts the numeric owner and repository IDs in the token, so the first deploy would have been refused. | Live check after the first `terraform apply` (phase 5, task 9). |
| 2026-11-28 | Duplicate HSTS header (#11) | Caddy added a `Strict-Transport-Security` header on the API name, and the API's own helmet header was sent as well, so there were two conflicting ones. | Live header check; the fix was tried locally against a stub upstream. |
| 2026-11-28 | Stale Caddy config (#12) | `compose.prod.yml` mounted the Caddyfile as a single file. A deploy replaces the file, but a single-file mount keeps showing the old one, so config changes never reached production. | Follow-up work on the HSTS fix. Fixed by mounting the folder and reloading Caddy in `deploy.sh`. |

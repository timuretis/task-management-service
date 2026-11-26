# AI usage log

| Date | Tool / model | What it helped with | What I corrected and why |
| ---- | ------------ | ------------------- | ------------------------ |
| 2026-11-26 | Claude Code (Opus) | API Dockerfile, phase 4 | The build stage copied all of `apps/api/` (configs, migrations, the Dockerfile) though `tsc` needs only `src` and the two tsconfig files. Any unrelated edit invalidated the cache and reran the compile. Narrowed it to two explicit `COPY` lines. |

# SHIPSTATE Agent Contract

Read this file completely before changing the repository.

## Identity
SHIPSTATE is a local-first execution control plane. It is not CodeAtlas, GameForge, an IDE, a CI host, or a chat product.

## Non-negotiable invariants
1. Agents cannot create `VERIFIED` or `ACCEPTED` state.
2. Real implementation runs never execute in the user's main working tree.
3. Dependencies are satisfied only by `ACCEPTED` tasks.
4. Verification must persist typed evidence.
5. `.git/**`, `.shipstate/**`, `.env`, and `.env.*` are protected by default.
6. Stale-base acceptance is forbidden.
7. Core lifecycle, policy, verification, acceptance, scheduling, migrations and state integrity are deterministic code, not LLM judgement.
8. Every mutation is persisted and checksum-journaled.
9. The kernel must remain usable with no paid service, cloud account, vector database, telemetry service or hosted database.
10. Provider-specific behavior belongs behind adapters.
11. Reduced sandbox capability must be explicit; never claim isolation that the host cannot provide.
12. Parallelism must never weaken stale-base or path-overlap safeguards.

## 1.0 quality gate
Run `npm run certify` before proposing completion.

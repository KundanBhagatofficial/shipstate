# SHIPSTATE Agent Contract

Read this file completely before changing the repository.

## Product identity

SHIPSTATE is a **local-first AI development execution control plane**. It is not an IDE, CodeAtlas, GameForge, CI host, project manager, or chat product.

Its core job is to determine the next eligible engineering task, compile bounded context, execute implementation in isolation, collect deterministic evidence, and integrate only explicitly accepted verified work.

## Non-negotiable invariants

1. Agent output can never directly create `VERIFIED` or `ACCEPTED` state.
2. Real implementation runs must not mutate the user's main working tree.
3. Dependencies are satisfied only by `ACCEPTED` tasks.
4. Verification must produce persisted evidence.
5. `.git/**`, `.shipstate/**`, `.env`, and `.env.*` remain protected by default.
6. Acceptance must refuse stale-base or dirty-main integration.
7. Model/provider-specific behavior stays behind an adapter.
8. State selection, lifecycle transitions, policy checks, verification and acceptance remain deterministic code, not LLM judgement.
9. Every state mutation is persisted and journaled.
10. The kernel must not require a paid subscription, hosted database, vector database, telemetry service, or cloud account.
11. Keep Node 20+ support.
12. Do not auto-merge candidate work into the main branch without an explicit SHIPSTATE acceptance action.

## Product boundaries

Do not add CodeAtlas architecture visualization/LSM functionality to the kernel. Do not add GameForge reference reconstruction/game-specific stages. Future integrations should feed context or tasks through stable boundaries.

## Quality gate

Before proposing completion run:

```bash
npm run certify
```

A change that weakens an invariant above requires an explicit architecture decision, not an incidental implementation shortcut.

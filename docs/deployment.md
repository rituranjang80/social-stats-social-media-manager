# Deployment

Deployment mechanics are **unchanged** from the source project: use `social-stats-social-media-manager-start` production compose / k8s manifests with `SOURCE_REL` pointing at the build you intend to ship.

For **manager2**:

1. Build and test the refactored tree.
2. Set `SOURCE_REL=../social-stats-social-media-manager2` (or CI artifact path).
3. Run existing `compose-up.ps1 -Mode prod` / documented prod scripts from the start repo.

Do not deploy manager2 until Login and Composer visual/regression checks pass (see [REFACTOR_ROADMAP.md](./REFACTOR_ROADMAP.md) Phase 16).

Environment secrets remain in `.env` files — never commit credentials.

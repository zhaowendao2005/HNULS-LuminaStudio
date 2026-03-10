# OrchestraFlow ReAct Generation System Master Plan

This folder is the handoff entrypoint for the OrchestraFlow ReAct generation system.

## Goal

Upgrade OrchestraFlow from a shared-definition-driven editor plus AI schema copy path into a recoverable generation workspace with:

- persistent generation sessions
- checkpoints and rollback
- phase-based planning and topology preview
- explicit validation and confirm-compile flow
- Grid entry + dedicated generator workspace
- full compatibility with blank workflow creation and the existing AI schema export path

## Delivery Order

1. Shared foundation
2. Utility generation engine
3. Main persistence and compile services
4. IPC and preload contracts
5. Renderer Grid and Generator workspace
6. Tests, lint, and typecheck

## Core Constraints

- `src/Public/ShareTypes/Orchestraflow-types/` stays the single source of truth.
- `title` is display-only; generation references use stable `output_namespace` roots.
- generation session state and runnable workflow state stay separate until confirm.
- utility computes; main owns persistence truth.
- confirm is the only path that writes runnable workflow JSON.

## Key Runtime Objects

- `OFGenerationSession`
- `OFGenerationGraphState`
- `OFGenerationOpLogEntry`
- `OFGenerationCheckpoint`
- `OFGenerationPreview`
- `OFGenerationValidationReport`
- `OFGenerationPhaseModelConfig`

## Reading Order

1. `01-reference-index.md`
2. `03-node-spec-foundation.md`
3. `04-generation-session-contract.md`
4. shared code under `LuminaStudio/src/Public/ShareTypes/Orchestraflow-types/`
5. utility code under `LuminaStudio/src/utility/orchestraflow/generation/`

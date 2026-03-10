# OrchestraFlow ReAct UI and Product Design

## Product Flow

1. Open Grid
2. Start generation session from the generator card
3. Enter prompt and review plan preview
4. Advance through `plan -> wire -> config -> validate`
5. Roll back if needed
6. Confirm compile
7. Open the generated runnable workflow in editor

## Information Architecture

- Grid tabs: `all` and `generation-sessions`
- Generator workspace: three-column layout
- Left column: prompt, session timeline, checkpoints
- Middle column: plan and topology preview
- Right column: summary, model config, op log, validation

## Interaction Rules

- rollback is primary, always visible
- confirm stays disabled until validation passes
- phase status is always visible
- success feedback uses inline banner, not modal

## Visual Direction

- light theme only
- compact panel spacing
- subtle gradient page background only
- color mapping:
  - plan/success: emerald
  - topology: cyan
  - model: indigo
  - warning: amber
  - error: rose

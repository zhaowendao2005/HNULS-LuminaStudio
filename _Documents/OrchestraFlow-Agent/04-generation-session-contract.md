# Generation Session Contract

## Session Truth

Main process persists the full session snapshot. Utility process receives a snapshot, computes the next state, and returns a new snapshot plus op log entries.

## Session Layout

- `session.id`
- `session.status`
- `session.phase`
- `session.prompt`
- `session.graph_state`
- `session.preview`
- `session.validation`
- `session.checkpoints`
- `session.op_log`
- `session.phase_model_config`
- `session.compiled_workflow_id`

## Lifecycle

- create session
- send prompt
- advance phase
- rollback checkpoint
- update per-phase model config
- confirm compile
- delete session

## Confirm Compile

- validation must pass
- session graph compiles to runnable workflow JSON
- compiled workflow writes to the existing workflow directory
- session keeps a reference to the compiled workflow id for editor handoff

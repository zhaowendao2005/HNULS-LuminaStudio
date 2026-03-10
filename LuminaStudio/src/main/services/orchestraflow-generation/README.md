# OrchestraFlow Generation Services

Main owns generation session persistence and confirm-compile orchestration.

- repository: filesystem persistence
- session service: CRUD plus phase updates
- compile service: convert a confirmed session into runnable workflow JSON
- generation service: high-level facade for IPC

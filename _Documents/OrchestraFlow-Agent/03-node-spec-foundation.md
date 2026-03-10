# NodeSpec Foundation

## Principle

`OFNodeDefinition` remains the single authority for node behavior. ReAct generation extends the same definitions instead of creating a parallel descriptor tree.

## Required Metadata

Each node definition may now describe:

- stable output namespace policy
- data ports and control ports
- side effects
- container rules
- system-managed fields

## Stable Namespace

- display `title` may change
- `output_namespace` remains stable for selector roots and generated references
- container internal start nodes also derive stable internal namespaces from the parent node id and node spec

## Ports

- data output and control output are modeled separately
- edges point to stable port ids, not labels
- ifelse branch handles are treated as stable control port ids

## Container Rules

- container start nodes are system managed
- container viewport is system managed
- `start_node_id` is system managed
- generated outputs are system managed

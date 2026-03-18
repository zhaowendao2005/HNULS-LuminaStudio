---
name: indexed-implementation
description: Execute an already-approved implementation plan by using the plan as a scoped index. Read only the indexed sections and directly related files, then start editing immediately without broad investigation or plan restatement.
---

# Indexed Implementation

## Use this skill when
- The user provides a long, detailed implementation plan or construction spec
- The plan already contains file anchors, fixed decisions, scope boundaries, and acceptance criteria
- The task is to implement, not to rediscover architecture
- The biggest failure mode is over-investigation, context waste, or repeating the plan back to the user

## Core rule
Treat the provided plan as an approved construction document, not as a prompt to re-research the repository.

## Required behavior
1. Read only these parts first:
- Context index / anchor map
- Fixed decisions / assumptions
- Your assigned write scope
- Acceptance criteria / tests
- Do-not-couple constraints

2. Then read only:
- The directly referenced files needed for the current change
- Immediate neighboring files only if required to complete wiring

3. After minimal context is established:
- Start editing immediately
- Prefer patch production over narrative explanation
- Keep outputs focused on code changes, validation, and blockers

## Do not
- Do not scan the whole repo “just to understand everything”
- Do not restate the whole plan back to the user
- Do not produce a long architecture summary unless explicitly asked
- Do not expand investigation outside indexed scope without a concrete implementation need
- Do not modify high-conflict shared files if the plan says they are reserved for the main agent

## Investigation budget
Default to the smallest sufficient reading set.

Only expand reading when one of these is true:
- A referenced symbol cannot be resolved
- The local file depends on a nearby adapter, registry, or type
- The plan conflicts with current code
- A test or type error requires tracing one level outward

If expanding, stay on the active dependency path rather than broadening horizontally.

## Output style
Your response should mainly contain:
- What you changed
- Files changed
- Any tests/checks run
- Remaining risks or follow-up items

Avoid reflective narration like:
- “I first studied the architecture...”
- “Here is my understanding of your plan...”
- “I investigated the whole module...”

## Conflict handling
If the repository differs from the plan:
- Report the exact mismatch briefly
- Make the smallest safe adjustment consistent with the plan’s intent
- Escalate only the missing decision, not the entire design

## Multi-agent rule
If this task is part of a worker split:
- Respect write boundaries strictly
- Do not edit files assigned to another worker
- Return completed patches and concrete conclusions only
- Never return “please decide architecture for me” unless the plan is genuinely insufficient

## Success criteria
You succeed when you move from indexed reading to concrete code edits quickly, with minimal context overhead and no redundant rediscovery.

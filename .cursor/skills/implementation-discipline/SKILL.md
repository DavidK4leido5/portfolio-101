---
name: implementation-discipline
description: Enforces minimal, reuse-first implementation in this codebase. Use when implementing features, fixing bugs, refactoring, or adding any application code. Prevents unnecessary files, abstractions, comments, and folder sprawl.
---

# Implementation Discipline

Default stance: **change as little as possible** to satisfy the request.

## Before Writing Code

1. Read nearby files in the same feature area.
2. Identify an existing file, hook, component, shader, or util that can absorb the change.
3. Confirm the target folder already used for that concern.
4. Prefer editing over creating.

## File Rules

**Do not add a new file unless all are true:**

- No existing file owns this responsibility
- Inlining would clearly harm readability or reuse
- The new file fits an existing folder pattern

**When adding is justified:**

- Place it in the folder that already handles that layer (components, hooks, shaders, utils, etc.)
- Do not introduce parallel folders for the same concept

**Never create:**

- One-off helpers for a single call site
- Wrapper files that only re-export
- Duplicate types, constants, or config already defined elsewhere
- Docs, examples, or barrel files the user did not ask for

## Code Rules

- Smallest correct diff wins
- Extend existing functions and components before adding new ones
- Match naming, imports, and patterns already in the file you touch
- No speculative abstractions, feature flags, or "future-proof" layers
- No drive-by refactors outside the task scope

## Comments

- Default: **no comments**
- Add only when logic is non-obvious and cannot be made clear by naming or structure
- Keep comments to one short line; explain *why*, not *what*

## Folder Architecture

- Follow the structure already in the repo; do not reorganize unless asked
- New code belongs in the same layer as similar code (UI with UI, scene logic with scene logic, shaders with shaders)
- If architecture is unclear, mirror the nearest existing feature's layout

## Package Manager

Use **pnpm** for all installs and scripts in this project.

## Pre-Ship Checklist

```
- [ ] Could this live in an existing file instead?
- [ ] Is every new file necessary?
- [ ] Does the change follow current folder layout?
- [ ] Are comments removed or reduced to the minimum?
- [ ] Is unrelated code untouched?
```

## Examples

**Prefer this**

Extend `NeuralCluster.tsx` with the new particle behavior.

**Not this**

Create `useParticleBehavior.ts`, `particleUtils.ts`, and `ParticleBehavior.types.ts` for one feature.

**Prefer this**

Add the uniform to the existing shader file.

**Not this**

Create `shaders/particles/` with three files for a single uniform change.

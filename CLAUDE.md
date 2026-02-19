# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ForgeStudio is a low-code visual page builder for Taro mini-programs (小程序). Users drag-and-drop components in a visual editor, configure data binding and events, then export generated Taro 4.x code.

## Commands

```bash
pnpm dev          # Start all dev servers (editor at http://localhost:5173)
pnpm build        # Build all packages (Turborepo, respects dependency order)
pnpm lint         # Lint all packages
```

No test framework is configured yet.

## Architecture

**Monorepo:** pnpm workspaces + Turborepo. Internal deps use `workspace:*`.

### Data Flow

```
FSP Schema (JSON) → Editor (visual manipulation) → IR (intermediate repr) → Codegen Plugin → Taro code
```

### Packages

- **`packages/protocol`** — FSP (ForgeStudio Protocol) type definitions. The shared schema that all other packages depend on. Defines `ComponentNode`, `FSPSchema`, `DataSourceDef`, action types.
- **`packages/components`** — Component registry with 14 built-in component metadata definitions (Page, View, Text, Image, Button, Input, List, Card, etc.). Registry pattern via `registry.ts`.
- **`packages/editor`** — Visual editor UI. React + Zustand + @dnd-kit. Central state in `store.ts` (Zustand with undo/redo history). Renderer system in `renderer/`, property editors in `setters/`.
- **`packages/codegen-core`** — IR layer + plugin interface. `transformer.ts` converts FSP → IR. `html-renderer.ts` for HTML output. Plugins implement the codegen interface.
- **`packages/codegen-taro`** — Taro 4.x code generation plugin. Maps FSP components/props to Taro equivalents. Templates in `templates/` for scaffold files.
- **`packages/data-binding`** — Expression parser/evaluator. Syntax: `{{dataSource[0].field}}`, `{{$item.field}}`. Supports operators and complex expressions.

### Apps

- **`apps/web`** — Vite 5.4 host app for the editor. Proxies API requests to reqres.in, dummyjson.com, jsonplaceholder.typicode.com.
- **`apps/preview-taro`** — Taro project for testing generated code output.

## Key Patterns

- **Protocol-driven:** All editor state serializes to/from FSP JSON schema. Code generation reads FSP, not editor internals.
- **Plugin architecture:** Code generators are plugins (`codegen-taro` implements the `codegen-core` plugin interface). New target frameworks can be added as new plugins.
- **Centralized state:** Editor uses a single Zustand store (`packages/editor/src/store.ts`) with history tracking for undo/redo.
- **Data binding expressions:** Parsed by `data-binding` package, evaluated at runtime. List components support `$item` and `$index` in loop context.

## TypeScript

Base config in `tsconfig.base.json`: ES2020 target, ESNext modules, bundler resolution, strict mode, react-jsx. Each package extends this.

## Language

Project documentation and UI strings are in Chinese (中文).

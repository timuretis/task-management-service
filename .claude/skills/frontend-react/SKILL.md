---
name: frontend-react
description: Conventions for the React (Vite, TypeScript) app in apps/web of task-management-service - beginner-friendly components, custom hooks for API calls, loading/empty/error states, CSS Modules. Use whenever creating or changing code in apps/web.
---

# Frontend (React) conventions

The author is new to modern React: code must read like a tutorial.

## Structure
- `src/api/` - one small typed `fetch` wrapper; the API base URL comes from `VITE_API_URL`.
- `src/hooks/` - one custom hook per concern: `useTasks` (list + create), `useHealth` (polls `/health`).
  Hooks return `{ data, isLoading, error }` plus actions.
- `src/components/` - small presentational components: `TaskList`, `TaskForm`, `HealthBadge`.
  Each file has a one-line comment saying what it shows.
- Styling: CSS Modules (`Component.module.css`), mobile-first, no UI library.

## Rules
- Function components and hooks only; `useState` + `useEffect`. No global state library
  unless a decision in `docs/DECISIONS.md` says so.
- Every data view handles loading, empty and error states, with a visible message.
- Client-side validation mirrors the API (title required, not just spaces) and shows the
  error next to the field. The server stays the source of truth.
- Add a short comment wherever React behavior is not obvious (effect dependencies,
  cleanup on unmount, disabling the button while submitting).
- Components stay under about 80 lines; extract a child component when they grow.
- Accessible basics: `<label>` for inputs, buttons have text, errors use `role="alert"`.

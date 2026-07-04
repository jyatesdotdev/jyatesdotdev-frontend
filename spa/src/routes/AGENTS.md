# routes/ — route shims

Every file here is a **one-line re-export shim**, e.g.:

```tsx
export { Home as default } from "../components/home";
```

Do not put UI, loaders, or logic in this directory — real components live in
`../components/`. To add a page, follow the checklist in `../AGENTS.md` (shim here,
register in `../routes.ts`, and add static paths to the `prerender()` list in
`react-router.config.ts`).

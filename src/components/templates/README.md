# Templates

Page shells / layout scaffolds with slots via props and children.
Must not fetch route-specific data.

- `AppShell` — root shell: header, body, tab bar, overlays, error toast.
  Owns `geometric.css` (moved import only, content untouched).
- `PlannerTemplate` — banner + main + library sidebar.
- `WorkoutsTemplate` — banner + main + recovery sidebar.
- `JournalTemplate` — banner + journal + stat cards, no sidebar.
- `AuthTemplate` — banner + single centered column.

Dependency direction: templates → organisms → molecules → atoms.

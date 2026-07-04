# Portfolio content

Edit **`portfolio.ts`** only when updating your personal copy, project list, skills, or image URLs.

## Images

Each entry supports two sources (first non-empty wins via `resolveImage`):

| Field | Use |
|-------|-----|
| `cdnUrl` | Full HTTPS URL (Cloudinary, S3, GitHub raw, etc.) |
| `localPath` | File under `assets/` — drop files in the matching subfolder |

Suggested layout:

```
assets/
  avatar.jpg
  about.jpg
  contact.jpg
  projects/
  skills/
  experience/
```

## Scene vs content

- **`src/content/portfolio.ts`** — your data (this folder)
- **`src/data/sections.ts`** — 3D hotspot positions and camera offsets (scene wiring; imports section ids from content)

Do not put 3D coordinates in this folder.

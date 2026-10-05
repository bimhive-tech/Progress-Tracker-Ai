# CAD2BIM Progress Tracker

A dashboard for creating and tracking projects. For each project you can:

- **Fill in project data**: client, location, reference, dates, area, levels, software and output types, plus any custom fields.
- **Use a checklist**: tick steps off, mark them *in progress* with a percentage, drag to reorder, and start from reusable **templates**.
- **Track status**: it updates automatically from the checklist (*Not started → Processing → Completed*). You can also set it by hand (*In review*, *On hold*, …) and switch back to automatic later.
- **Keep a manual activity log**: "Data gathered", "Processed in Blender", "Sent for review"… with a time, details, and who did it.

Every project gets its own generated isometric "massing" thumbnail, so cards and pages always have a picture without any uploads.

There is no login: it's a shared dashboard. If you want a simple password in front of it, see `BASIC_AUTH_PASSWORD` below.

**Stack:** Node 22 · Express · PostgreSQL · React + Vite + Tailwind.

---

## Deploying on Railway

1. **Create a service from this GitHub repo** in the same Railway project as your Postgres database. Railway picks up the `Dockerfile` and `railway.json` automatically.
2. **Add the variables** under the service's **Variables** tab:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference to your Postgres service) |
   | `BASIC_AUTH_PASSWORD` | *optional*: puts the site behind a browser login prompt (user `admin`, or set `BASIC_AUTH_USER`) |
   | `APP_NAME` | *optional*: name in the logo, defaults to `CAD2BIM` |

3. **Generate a domain** under **Settings → Networking**.

Database tables are created automatically on first start. Two starter checklist templates are included: *CAD to BIM — Standard* and *Scan to Model (Blender)*.

---

## Local development

```bash
cp .env.example .env    # then fill in DATABASE_URL
npm install
npm run dev             # API on :8080, web app on http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | API (auto-restarts) + Vite dev server |
| `npm run build` | Type-checks and builds client and server into `dist/` |
| `npm start` | Runs the production build |
| `npm run migrate` | Applies database migrations without starting the server |

### Project layout

```
server/            Express API
  routes/          projects, checklist, activity, templates
  migrations.ts    database schema (applied automatically on start)
  status.ts        automatic status rules
src/               React front end
  pages/           Project Hub, Project, Templates, Activity
  components/      UI building blocks and project page panels
```

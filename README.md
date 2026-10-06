# CAD2BIM Progress Tracker

A dashboard for creating and tracking BIM Hive projects, with two views and portfolio numbers along the top:

- **Overview**: every project with its whole checklist, so you can see at a glance what's done, what's in progress and what's still to do.
- **Projects**: the project list on the left, the selected project (progress, checklist and details) in the middle, and the activity log and checklist templates on the right.

For each project you can:

- **Fill in project data**: client, location, reference, dates, area, levels, software and output types, plus any custom fields.
- **Use a checklist**: tick steps off, mark them *in progress* with a percentage, drag to reorder, and start from reusable **templates**.
- **Track status**: it updates automatically from the checklist (*Not started → Processing → Completed*). You can also set it by hand (*In review*, *On hold*, …) and switch back to automatic later.
- **Keep a manual activity log**: "Data gathered", "Processed in Blender", "Sent for review"… with a time, details, and who did it.

Every project gets its own generated isometric "massing" thumbnail, so the list and the project view always have a picture without any uploads.

Everyone signs in. There are two accounts, set with environment variables: an **admin** account that can change everything, and a **viewer** account that can see everything but can't make changes (the API refuses any change from a viewer, not just the UI).

**Stack:** Node 22 · Express · PostgreSQL · React + Vite + Tailwind.

---

## Deploying on Railway

1. **Create a service from this GitHub repo** in the same Railway project as your Postgres database. Railway picks up the `Dockerfile` and `railway.json` automatically.
2. **Add the variables** under the service's **Variables** tab:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference to your Postgres service) |
   | `TRACKER_ADMIN_PASSWORD` | password for the admin account (username `admin`, or set `TRACKER_ADMIN_USERNAME`) |
   | `TRACKER_VIEWER_PASSWORD` | password for the read-only account (username `viewer`, or set `TRACKER_VIEWER_USERNAME`) |
   | `TRACKER_SESSION_SECRET` | *optional*: any long random string, mixed into the sign-in cookies |
   | `BASIC_AUTH_PASSWORD` | *optional*: an extra browser login prompt in front of everything (user `admin`, or set `BASIC_AUTH_USER`) |
   | `APP_NAME` | *optional*: name shown next to the logo, defaults to `CAD2BIM` |

   An account only works once its password is set. Changing a password signs that account out everywhere. Sign-ins stay valid for 14 days, and repeated wrong passwords are blocked for 15 minutes.

3. **Generate a domain** under **Settings → Networking**.

Database tables are created automatically on first start. Two starter checklist templates are included: *CAD to BIM — Standard* and *Scan to Model (Blender)*.

---

## Local development

```bash
cp .env.example .env    # then fill in DATABASE_URL and the TRACKER_* passwords
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
  auth.ts          sign-in, sessions and the admin/viewer rules
  routes/          projects, checklist, activity, templates
  migrations.ts    database schema (applied automatically on start)
  status.ts        automatic status rules
src/               React front end
  dashboard/       top bar, Overview board, and the Projects view (project list, workspace, activity & templates rail)
  components/      shared UI building blocks, dialogs and the activity list
```

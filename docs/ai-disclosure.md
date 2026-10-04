# AI tool disclosure (working draft)

Codex assisted with the October 2–3 Hackathon implementation: inspecting the challenge and supplied CSV files; selecting a repeatable demo date; drafting the API, PostgreSQL schema, seed importer, Docker Compose configuration, planning validation, four-role React workflow, offline event queue, and these setup documents. The team must review, test, and revise this work before submission.

The React frontend was cloned from TeamDIM's Designathon repository. This draft does not yet establish which parts of that earlier work were AI-assisted. TeamDIM should add its own Designathon and Hackathon contributions, name any other AI tools used, and state which work was completed without AI before submitting this disclosure.

Checks performed: CSV row counts and references, Python syntax compilation, Compose configuration parsing, password/token helper checks, five planner unit checks, API route import, frontend production build and lint, a live PostgreSQL/API four-role smoke walkthrough, browser checks of the dispatcher, loader, driver, and store screens, and a complete Docker Compose build and startup. A second four-role smoke walkthrough passed through the containerized Nginx/API path on port 8080, and the store snapshot was checked for role isolation.

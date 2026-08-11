# apps\web\app\admin\agents\page.tsx

Admin page that lets operators monitor the fleet of automated agents by listing their runs and viewing individual report contents.

- AgentSummary · type · L8-L13 — Describes the per-agent rollup (name, run count, last run time, latest report file) returned by the admin API for the fleet overview list.
- ReportFile · type · L15-L15 — Describes a single agent report file entry (filename, owning agent, size, timestamps) shown in the recent-runs list.
- AgentsPage · function · L17-L151 — Renders the agent fleet dashboard: agent summary cards, a recent-runs list, and a viewer pane for the selected report's content.
- load · function · L27-L40 — Fetches the agent run summary and recent report list in parallel from the admin API and populates the page state.
- openFile · function · L42-L54 — Loads the full text of a chosen agent report file from the admin API into the viewer pane.

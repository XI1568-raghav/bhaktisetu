# scripts\agents\funnel-drop-analyzer.mjs

- median · function · L19-L27 — function median(nums)
- fingerprint · function · L29-L37 — function fingerprint(stage, dropPct)
- createAnalyzer · function · L43-L181 — function createAnalyzer({ ghFetch, writeReport: writeReportFn, upsertLog: upsertLogFn, getFunnel, cronToken, ghToken, ghRepo = process.env.GH_REPO || 'XI1568-raghav/bhaktisetu', dropThreshold = Number.parseFloat(process.env.FUNNEL_DROP_THRESHOLD || '0.70'), } = {})
- alreadyFiled · function · L53-L59 — async function alreadyFiled(fp)
- fileIssue · function · L61-L89 — async function fileIssue(stage, dropPct, yesterday, baseline, fp)
- run · function · L91-L178 — async function run()
- ghFetch · function · L190-L207 — async function ghFetch(path, init = {})
- getFunnel · function · L209-L215 — async function getFunnel()
- main · function · L217-L230 — async function main()

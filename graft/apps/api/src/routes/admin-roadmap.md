# apps\api\src\routes\admin-roadmap.ts

- resolveRoadmapRoot · function · L19-L29 — function resolveRoadmapRoot(): string
- parseFrontmatter · function · L33-L47 — function parseFrontmatter(body: string): Record<string, unknown>
- parseTripwiresYaml · function · L53-L97 — function parseTripwiresYaml(yaml: string): Array<Record<string, unknown>>
- readQueueFromDir · function · L99-L115 — function readQueueFromDir(dir: string, sourceLabel: string): Array<Record<string, unknown>>
- readQueue · function · L117-L122 — function readQueue(root: string): Array<Record<string, unknown>>
- readLastDecisions · function · L124-L151 — function readLastDecisions(root: string, n = 20): Array<{ filename: string; content: string }>
- walkRecursive · function · L134-L142 — walkRecursive = (d: string): string[]
- route · function · L153-L201 — route: FastifyPluginAsync = async (app)

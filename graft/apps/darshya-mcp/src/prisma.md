# apps\darshya-mcp\src\prisma.ts

- getPrisma · function · L11-L17 — Returns a singleton PrismaClient connected via DIRECT_URL, creating it on first use so the MCP server shares one read-only database connection.
- disconnectPrisma · function · L19-L24 — Tears down the shared Prisma connection and clears the singleton so a later getPrisma() call creates a fresh client.

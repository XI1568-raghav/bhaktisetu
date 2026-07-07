// Stub for the `server-only` Next.js package.
// The real package throws when imported on the client to prevent accidental
// bundling of server-only code. Under vitest there is no server/client split,
// so we alias it to this no-op module so server-only modules can be imported.
export {};

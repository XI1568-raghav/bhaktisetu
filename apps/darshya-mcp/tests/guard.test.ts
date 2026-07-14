import { describe, it, expect } from 'vitest';
import { isReadOnlyQuery } from '../src/guard.js';

describe('isReadOnlyQuery', () => {
  const rejected = [
    "DELETE FROM users WHERE id = 'x'",
    'UPDATE users SET blocked = true',
    "INSERT INTO users (id) VALUES ('x')",
    'DROP TABLE donations',
    'TRUNCATE TABLE puja_bookings',
    'ALTER TABLE users ADD COLUMN x int',
    'GRANT ALL ON users TO public',
    'delete from users where 1=1', // case-insensitive
    '  /* sneaky */ DROP TABLE temples', // leading whitespace + comment
    "SELECT '--'; DELETE FROM users", // string-literal line-comment bypass (Bypass 1)
    "SELECT '/*'; DELETE FROM users; SELECT '*/'", // string-literal block-comment bypass (Bypass 1)
    'SELECT * INTO backup_tbl FROM users', // SELECT INTO write (Bypass 2)
    "COPY users FROM '/data.csv'", // COPY bulk-load write (Bypass 2)
    "COMMENT ON TABLE users IS 'hi'", // metadata write
    'REFRESH MATERIALIZED VIEW my_mv', // matview recompute/rewrite
    'REINDEX TABLE users', // index storage rebuild
    'VACUUM users', // table compaction/maintenance write
    'CLUSTER users', // physical table reorder/rewrite
  ];
  for (const sql of rejected) {
    it(`rejects: ${sql.slice(0, 40)}`, () => {
      expect(isReadOnlyQuery(sql)).toBe(false);
    });
  }

  const allowed = [
    'SELECT COUNT(*) FROM users',
    'SELECT * FROM payments WHERE status = $1',
    'WITH t AS (SELECT 1) SELECT * FROM t', // CTE
    'select created_at from users', // lowercase
    '   SELECT 1', // leading whitespace
    "SELECT * FROM user_updates WHERE name = 'O''Brien'", // escaped-quote string + _updates identifier
    'SELECT comment_count FROM posts', // 'comment' substring in identifier must NOT match \bCOMMENT\b
  ];
  for (const sql of allowed) {
    it(`allows: ${sql.slice(0, 40)}`, () => {
      expect(isReadOnlyQuery(sql)).toBe(true);
    });
  }
});

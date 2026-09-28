import "dotenv/config";
import { sql } from "@/db/client";

const requiredTables = ["user", "session", "account", "verification", "posts", "likes"];

async function checkDatabase() {
  if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const missingTables: string[] = [];
  for (const tableName of requiredTables) {
    const tableRows = await sql<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = ${tableName}
    `;
    if (tableRows.length === 0) {
      missingTables.push(tableName);
    }
  }

  if (missingTables.length > 0) {
    throw new Error(`Required tables are missing: ${missingTables.join(", ")}.`);
  }

  await sql`select 1 from "user" limit 1`;
  await sql`select 1 from "session" limit 1`;
  await sql`select 1 from "account" limit 1`;
  await sql`select 1 from "verification" limit 1`;
  await sql`select 1 from "posts" limit 1`;
  await sql`select 1 from "likes" limit 1`;

  const lackingPrivileges: string[] = [];
  for (const tableName of requiredTables) {
    const privilegeRows = await sql<
      {
        can_select: boolean;
        can_insert: boolean;
        can_update: boolean;
        can_delete: boolean;
      }[]
    >`
      select
        has_table_privilege(current_user, ${`public.${tableName}`}, 'select') as can_select,
        has_table_privilege(current_user, ${`public.${tableName}`}, 'insert') as can_insert,
        has_table_privilege(current_user, ${`public.${tableName}`}, 'update') as can_update,
        has_table_privilege(current_user, ${`public.${tableName}`}, 'delete') as can_delete
    `;
    const privilegeRow = privilegeRows[0];
    if (
      !privilegeRow?.can_select ||
      !privilegeRow.can_insert ||
      !privilegeRow.can_update ||
      !privilegeRow.can_delete
    ) {
      lackingPrivileges.push(tableName);
    }
  }

  if (lackingPrivileges.length > 0) {
    throw new Error(`The runtime role lacks required table privileges: ${lackingPrivileges.join(", ")}.`);
  }

  console.log(`Database check passed for ${requiredTables.length} required tables.`);
}

checkDatabase()
  .catch(async () => {
    console.error(
      "Database check failed. Run npm run db:migrate and confirm DATABASE_URL uses a role with access to the application tables.",
    );
    process.exitCode = 1;
  })
  .finally(() => sql.end({ timeout: 1 }).catch(() => undefined));

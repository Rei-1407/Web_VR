const fs = require("fs");
const path = require("path");

require("dotenv").config();

const mysql = require("mysql2/promise");

async function main() {
  const sqlPath = path.resolve(__dirname, "..", "..", "csdl", "ptit.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const host = process.env.DB_HOST || "127.0.0.1";
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const dbName = process.env.DB_NAME || "ptit_edu";
  const reset = process.argv.includes("--reset");

  const connection = await mysql.createConnection({
    host,
    user,
    password,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  try {
    const [rows] = await connection.query("SHOW DATABASES LIKE ?", [dbName]);
    const exists = Array.isArray(rows) && rows.length > 0;

    if (exists && !reset) {
      console.log(
        `ℹ️ Database '${dbName}' already exists. Skipping import. ` +
        `Run again with '--reset' to drop & re-import (WARNING: deletes data).`
      );
      return;
    }

    if (reset) {
      await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
    }

    await connection.query(sql);
    console.log(`✅ Imported database schema/data from ${sqlPath}`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("❌ DB import failed:");
  console.error(err);
  process.exit(1);
});

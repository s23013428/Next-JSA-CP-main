import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const database = process.env.DB_NAME ?? "ticket_jsa";
const connection = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database,
  multipleStatements: true,
});

try {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  await connection.query(schema);
  console.log(`Database ${database} is ready.`);
} finally {
  await connection.end();
}

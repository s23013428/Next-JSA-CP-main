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
  const [constraints] = await connection.query(
    "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = 'bookings' AND CONSTRAINT_NAME = 'fk_bookings_user'",
    [database],
  );
  if (constraints.length === 0) {
    await connection.query("ALTER TABLE bookings ADD CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL");
  }
  console.log(`Database ${database} is ready.`);
} finally {
  await connection.end();
}

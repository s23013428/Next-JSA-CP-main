import "server-only";

import mysql, { type PoolConnection, type ResultSetHeader } from "mysql2/promise";

declare global {
  var jsaDbPool: mysql.Pool | undefined;
}

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME ?? "ticket_jsa",
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    timezone: "+05:30",
    decimalNumbers: true,
  });
}

export const db = global.jsaDbPool ?? createPool();

if (process.env.NODE_ENV !== "production") global.jsaDbPool = db;

export async function transaction<T>(work: (connection: PoolConnection) => Promise<T>) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export type MutationResult = ResultSetHeader;

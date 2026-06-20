import postgres from 'postgres'

let _sql: ReturnType<typeof postgres> | null = null

export function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  if (!_sql) {
    _sql = postgres(url, {
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: { rejectUnauthorized: false },
    })
  }
  return _sql
}

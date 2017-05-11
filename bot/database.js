import promise from 'bluebird'
import pgpConstructor from 'pg-promise'

const connectionString = process.env.DATABASE_URL
const pgp = pgpConstructor({
  promiseLib: promise,
})
const db = pgp(connectionString)

console.log('creating database')

db.one(
  `SELECT EXISTS (
    SELECT 1
    FROM   information_schema.tables
    WHERE  table_name = 'users'
   )`)
.then((res) => {
  console.log(res)

  if (res.exists === false) {
    console.log('creating table')

    return db.query(
      `CREATE TABLE users(id SERIAL PRIMARY KEY,
                          sender_id VARCHAR(40),
                          state INTEGER,
                          closest_tbc VARCHAR(40)
    )`)
  }

  return promise.resolve()
})
.then(() => {
  console.log('db successfully created')
})

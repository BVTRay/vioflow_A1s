const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.bejrwnamnxxdxoqwoxag:Bugu%402025@aws-0-us-west-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    await client.connect();
    const result = await client.query(`SELECT id, client_name, user_type, team_name FROM annotations WHERE client_name IS NOT NULL LIMIT 5`);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}
check();

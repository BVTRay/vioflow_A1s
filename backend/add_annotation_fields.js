const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.bejrwnamnxxdxoqwoxag:Bugu%402025@aws-0-us-west-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function addColumns() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // 检查 user_type 列是否存在
    const checkUserType = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'annotations' AND column_name = 'user_type'
    `);
    
    if (checkUserType.rows.length === 0) {
      console.log('Adding user_type column...');
      await client.query(`
        ALTER TABLE annotations 
        ADD COLUMN user_type VARCHAR(20) DEFAULT 'guest'
      `);
      console.log('user_type column added');
    } else {
      console.log('user_type column already exists');
    }
    
    // 检查 team_name 列是否存在
    const checkTeamName = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'annotations' AND column_name = 'team_name'
    `);
    
    if (checkTeamName.rows.length === 0) {
      console.log('Adding team_name column...');
      await client.query(`
        ALTER TABLE annotations 
        ADD COLUMN team_name VARCHAR(100)
      `);
      console.log('team_name column added');
    } else {
      console.log('team_name column already exists');
    }
    
    // 验证列已添加
    const verify = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'annotations' AND column_name IN ('user_type', 'team_name', 'client_name')
    `);
    console.log('Columns in annotations table:', verify.rows);
    
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

addColumns();

import 'dotenv/config';
import {createHash} from 'node:crypto';
import {getPool,isLocalDatabaseReadOnly,resolveDatabaseConfig} from '../server/db';
if(!isLocalDatabaseReadOnly())throw new Error('Verification requires LOCAL_DATABASE_READ_ONLY=true');
await resolveDatabaseConfig();
const pool=getPool();if(!pool)throw new Error('Database unavailable');
const client=await pool.connect();
try {
  await client.query('BEGIN READ ONLY');
  const mode=await client.query('SHOW transaction_read_only');
  const drawings=await client.query('SELECT * FROM chart_drawings ORDER BY id');
  console.log(JSON.stringify({readOnly:mode.rows[0].transaction_read_only,count:drawings.rowCount,sha256:createHash('sha256').update(JSON.stringify(drawings.rows)).digest('hex')}));
  await client.query('COMMIT');
}finally{client.release();await pool.end();}

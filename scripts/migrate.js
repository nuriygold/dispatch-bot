#!/usr/bin/env node
const { readFileSync } = require('fs');
const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const sql = readFileSync(__dirname + '/schema.sql', 'utf8');
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Migration applied');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

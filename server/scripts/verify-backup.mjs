import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const [file] = process.argv.slice(2);
if (!file) throw new Error('Uso: node server/scripts/verify-backup.mjs <arquivo-json>');
const snapshot=JSON.parse(readFileSync(file,'utf8'));
if (snapshot.version !== 1 || !snapshot.tables) throw new Error('Formato de backup inválido.');
const tables={cards:['id','owner_id','payload'],community_follows:['owner_id','card_id','platform'],moderation_reports:['id','reporter_id','card_id','reason','status','created_at'],hidden_cards:['card_id','moderator_id','created_at']};
const db=new DatabaseSync(':memory:');
try {
  db.exec(readFileSync(new URL('../../database/schema.sql',import.meta.url),'utf8'));
  for (const [table,columns] of Object.entries(tables)) {
    const rows=snapshot.tables[table]; if (!Array.isArray(rows)) throw new Error(`Tabela ausente: ${table}`);
    const insert=db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`);
    for (const row of rows) insert.run(...columns.map(column=>row[column]));
    const count=db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
    if (count !== rows.length) throw new Error(`Contagem inválida: ${table}`);
    console.log(`${table}: ${count} registros validados`);
  }
  console.log('Restauração isolada em memória validada; nenhum banco foi alterado.');
} finally { db.close(); }

import type { FmdbDatabase } from './fmdb-api';
export interface BackupStore { put(key:string,value:string,options?:{expirationTtl?:number}):Promise<void> }
export async function backupCommunity(db:FmdbDatabase, store:BackupStore, now=new Date()) {
  const tables=['cards','community_follows','moderation_reports','hidden_cards'] as const;
  const result=await db.batch(tables.map(table=>db.prepare(`SELECT * FROM ${table}`))) as {results:unknown[]}[];
  const snapshot=JSON.stringify({version:1,createdAt:now.toISOString(),tables:Object.fromEntries(tables.map((table,i)=>[table,result[i].results]))});
  if (new TextEncoder().encode(snapshot).byteLength > 20*1024*1024) throw new Error('Backup excede 20 MB; é necessário migrar para armazenamento de objetos.');
  const key=`daily:${now.toISOString().slice(0,10)}`;
  await store.put(key,snapshot,{expirationTtl:7*24*60*60});
  return key;
}

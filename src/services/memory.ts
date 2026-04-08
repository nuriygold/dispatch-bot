import { pool } from '../db';
import { logger } from '../logger';
import { chatCompletion } from './modelRouter';
import { v4 as uuid } from 'uuid';
import { embedText } from './embeddings';

export async function recordTaskSummary(taskId: string, text: string, relevance: string = 'summary') {
  let embedding: number[] | null = null;
  try {
    embedding = await embedText(text);
  } catch (err) {
    // ignore embedding failure; store text anyway
  }
  await pool.query(
    `INSERT INTO context_embeddings (id, task_id, relevance_type, text_snippet, embedding) VALUES ($1,$2,$3,$4,$5)`,
    [uuid(), taskId, relevance, text, embedding ? embedding : null],
  );
}

export async function nightlySummaries() {
  // Placeholder: pull yesterday's tasks and summarize
  const { rows } = await pool.query(`SELECT id, output FROM task_results WHERE created_at > NOW() - INTERVAL '1 day'`);
  for (const row of rows) {
    const summary = await chatCompletion('extraction', [
      { role: 'system', content: 'Summarize the key learnings in one sentence.' },
      { role: 'user', content: row.output || '' },
    ]);
    const text = summary?.choices?.[0]?.message?.content || '';
    await recordTaskSummary(row.id, text, 'learning');
  }
  logger.info('nightly summaries complete');
}

export async function queryMemory(campaignId: string, q: string) {
  // If pgvector available and embeddings exist, use vector search; else fallback to ilike
  try {
    const queryEmbedding = await embedText(q);
    const { rows } = await pool.query(
      `SELECT text_snippet, relevance_type, created_at
       FROM context_embeddings ce
       JOIN tasks t ON ce.task_id = t.id
       WHERE t.campaign_id = $1 AND ce.embedding IS NOT NULL
       ORDER BY ce.embedding <=> $2
       LIMIT 10`,
      [campaignId, queryEmbedding],
    );
    if (rows.length) return rows;
  } catch (err) {
    // ignore if vector extension unavailable
  }
  const fallback = await pool.query(
    `SELECT text_snippet, relevance_type, created_at FROM context_embeddings ce
     JOIN tasks t ON ce.task_id = t.id
     WHERE t.campaign_id = $1 AND text_snippet ILIKE $2
     ORDER BY ce.created_at DESC LIMIT 10`,
    [campaignId, `%${q}%`],
  );
  return fallback.rows;
}

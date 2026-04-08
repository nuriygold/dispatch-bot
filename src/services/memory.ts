import { pool } from '../db';
import { logger } from '../logger';
import { chatCompletion } from './modelRouter';
import { v4 as uuid } from 'uuid';
import { embedText } from './embeddings';

function toVectorLiteral(embedding: number[] | null): string | null {
  return embedding?.length ? `[${embedding.join(',')}]` : null;
}

export async function recordTaskSummary(taskId: string, text: string, relevance: string = 'summary') {
  let embedding: number[] | null = null;
  try {
    embedding = await embedText(text);
  } catch (_err) {
    // ignore embedding failure; store text anyway
  }
  await pool.query(
    `INSERT INTO context_embeddings (id, task_id, relevance_type, text_snippet, embedding) VALUES ($1,$2,$3,$4,$5)`,
    [uuid(), taskId, relevance, text, toVectorLiteral(embedding)],
  );
}

export async function nightlySummaries() {
  const { rows } = await pool.query<{ task_id: string; output: string | null }>(
    `SELECT tr.task_id, tr.output
     FROM task_results tr
     WHERE tr.created_at > NOW() - INTERVAL '1 day'
       AND tr.output IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM context_embeddings ce
         WHERE ce.task_id = tr.task_id AND ce.relevance_type = 'learning'
       )`,
  );
  for (const row of rows) {
    const summary = await chatCompletion('extraction', [
      { role: 'system', content: 'Summarize the key learnings in one sentence.' },
      { role: 'user', content: row.output || '' },
    ]);
    const text = summary?.choices?.[0]?.message?.content || '';
    await recordTaskSummary(row.task_id, String(text), 'learning');
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
       ORDER BY ce.embedding <=> $2::vector
       LIMIT 10`,
      [campaignId, toVectorLiteral(queryEmbedding)],
    );
    if (rows.length) return rows;
  } catch (_err) {
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

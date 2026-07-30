// 시드 SQL 생성기 — src/data/seed.js의 임시 자산 목록을 supabase/migrations/004_seed.sql로 변환한다.
// 사양서 12장의 실제 규격·자산 목록이 확정되면 src/data/seed.js만 교체하고 이 스크립트를 다시 실행하면 된다.
import { INIT_TYPES, INIT_MEDIA, buildPostings, DEFAULT_REF } from '../src/data/seed.js';

const esc = (s) => (s === null || s === undefined ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const boolLit = (b) => (b ? 'true' : 'false');

const out = [];
out.push('-- 시드 데이터 (scripts/gen-seed-sql.mjs 로 생성) — 사양서 12장 미확정 항목의 임시값');
out.push('');

out.push('insert into media_types (code, label, default_spec, faces, glyph, color, movable, open_ended, sort_order, active) values');
out.push(
  INIT_TYPES.map(
    (t, i) =>
      `  (${esc(t.code)}, ${esc(t.label)}, ${esc(t.spec)}, ${t.faces}, ${esc(t.glyph)}, ${esc(t.color)}, ${boolLit(t.movable)}, ${boolLit(t.openEnded)}, ${i}, true)`
  ).join(',\n') + ';'
);
out.push('');

out.push('insert into media (id, type, name, faces, spec, zone, x, y, active) values');
out.push(
  INIT_MEDIA.map((m) => `  (${esc(m.id)}, ${esc(m.type)}, ${esc(m.name)}, ${m.faces}, ${esc(m.spec || null)}, ${esc(m.zone)}, ${m.x}, ${m.y}, true)`).join(',\n') + ';'
);
out.push('');

const postings = buildPostings(DEFAULT_REF);
out.push('insert into postings (id, media_id, brand, title, start_date, end_date, removed_at, removal_source, origin_url) values');
out.push(
  postings
    .map(
      (p) =>
        `  (gen_random_uuid(), ${esc(p.mediaId)}, ${esc(p.brand)}, ${esc(p.title || null)}, ${esc(p.start)}, ${esc(p.end)}, ${esc(p.removedAt)}, ${esc(p.removalSource)}, ${esc(p.driveUrl)})`
    )
    .join(',\n') + ';'
);

console.log(out.join('\n'));

import React, { useState, useMemo } from 'react';
import { contentOf, days } from '../constants.js';
import { statusOf } from '../lib/status.js';
import { ZONES } from '../data/seed.js';
import StatusChip from './StatusChip.jsx';

const zoneLabel = (z) => ZONES[z]?.label || z;

// 매체 현황 — 담당자·제작처는 노출하지 않는다
export default function StatusPanel({ T, state, postings, media, refDate, onPick }) {
  const [q, setQ] = useState('');
  const [rangeOn, setRangeOn] = useState(false);
  const [from, setFrom] = useState('2025-01-01');
  const [to, setTo] = useState(refDate);
  const mName = (id) => media.find((m) => m.id === id)?.name || '-';

  const rows = state.filter((o) => !q || (o.name + (o.current?.brand || '')).toLowerCase().includes(q.toLowerCase()));

  const historyRows = useMemo(() => {
    if (!rangeOn) return [];
    return postings
      .filter((p) => (p.end || '9999-12-31') >= from && p.start <= to)
      .filter((p) => !q || (contentOf(p) + p.brand + mName(p.mediaId)).toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.start.localeCompare(a.start));
  }, [rangeOn, postings, from, to, q]);

  return (
    <div>
      <div className="toolrow">
        <input className="inp" placeholder="매체명 · 지점 · 업체명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="chk"><input type="checkbox" checked={rangeOn} onChange={(e) => setRangeOn(e.target.checked)} />기간으로 조회</label>
        {rangeOn && (<><input className="inp date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><span className="sub">~</span><input className="inp date" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></>)}
        <span className="count mono">{(rangeOn ? historyRows.length : rows.length)}건</span>
      </div>
      {!rangeOn ? (
        <div className="scroll tall">
          <table>
            <thead><tr><th>매체</th><th>유형</th><th>구역</th><th>업체명</th><th>내용</th><th>상태</th></tr></thead>
            <tbody>
              {rows.map((o) => {
                const p = o.overdue || o.current;
                const t = T[o.type];
                return (
                  <tr key={o.id} onClick={() => onPick(o.id)}>
                    <td><b>{o.name}</b></td>
                    <td><span className="chip" style={{ background: t.color + '1A', color: t.color }}>{t.label}</span></td>
                    <td>{zoneLabel(o.zone)}</td>
                    <td>{p ? p.brand : <span className="sub">—</span>}</td>
                    <td className="sub">{p ? contentOf(p) : '—'}</td>
                    <td>
                      {o.overdue ? <span className="tag over">만료 +{o.overdueDays}일</span>
                        : o.open ? <span className="tag open">미정</span>
                        : o.live ? <span className="tag live">D-{o.dToRemove}</span>
                        : <span className="tag vacant">비어있음</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="scroll tall">
          <table>
            <thead><tr><th>매체</th><th>업체명</th><th>내용</th><th>게시</th><th>철거예정</th><th>실제철거</th><th className="r">기간</th><th>상태</th></tr></thead>
            <tbody>
              {historyRows.map((p) => (
                <tr key={p.id} onClick={() => onPick(p.mediaId)}>
                  <td>{mName(p.mediaId)}</td>
                  <td><b>{p.brand}</b></td>
                  <td className="sub">{contentOf(p)}</td>
                  <td className="mono">{p.start}</td>
                  <td className="mono">{p.end || '미정'}</td>
                  <td className="mono">{p.removedAt || <span className="sub">—</span>}{p.removalSource === 'auto' && <span className="autotag">자동</span>}</td>
                  <td className="r mono">{p.end ? days(p.start, p.end) + '일' : '—'}</td>
                  <td><StatusChip status={statusOf(p, refDate)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

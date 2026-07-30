import React from 'react';
import { ST } from '../constants.js';

export default function StatusChip({ status }) {
  const s = ST[status];
  return <span className="chip" style={{ background: s.soft, color: s.color }}>{s.label}</span>;
}

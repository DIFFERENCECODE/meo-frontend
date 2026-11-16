'use client';

/**
 * Add lab results by dropping in the reports: a folder, or any number of PDFs,
 * photos and text files. Each file is read into proposed rows by the backend
 * (/labs/extract), and the practitioner checks every row before anything is
 * saved. AI proposes, practitioner approves.
 *
 * What the backend decides in code, and this screen only shows:
 *   ok             a record marker in the record's unit, ticked by default
 *   unit_differs   printed in another unit; it can only be ticked once the
 *                  practitioner has entered the value in the record's unit
 *   unknown_marker not one of the record's markers, listed but never saved
 */

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { apiFetch } from '@/app/lib/auth';
import { Btn, Pill, T } from './ui';

const ACCEPT = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.txt', '.csv'];
const MAX_FILES = 40;
const PARALLEL = 3;

type Status = 'ok' | 'unit_differs' | 'unknown_marker';

interface ServerRow {
  biomarker_name: string | null; display_name: string; printed_name: string;
  value: number; unit: string; expected_unit: string | null; status: Status;
}

interface Row extends ServerRow { include: boolean; valueText: string }

interface Report {
  key: string; path: string; file: File;
  state: 'reading' | 'read' | 'failed'; error?: string;
  testDate: string; sourceLab: string; rows: Row[];
}

const accepted = (f: File) => ACCEPT.some((ext) => f.name.toLowerCase().endsWith(ext));
const pathOf = (f: File) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;

/** Every file under whatever was dropped, folders walked recursively. */
async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const entries = Array.from(dt.items || [])
    .map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => !!e);
  if (!entries.length) return Array.from(dt.files);
  const out: File[] = [];
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const f = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      // Keep the folder path so two "results.pdf" files can be told apart.
      out.push(new File([f], f.name, { type: f.type, lastModified: f.lastModified }));
      Object.defineProperty(out[out.length - 1], 'webkitRelativePath', { value: entry.fullPath.replace(/^\//, '') });
      return;
    }
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries hands back the folder in batches; read until it is empty.
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const e of batch) await walk(e);
    }
  };
  for (const e of entries) await walk(e);
  return out;
}

const inputStyle: React.CSSProperties = {
  background: 'var(--mc-input)', border: `1px solid ${T.chipBorder}`, borderRadius: 8,
  color: T.text, fontSize: 13, fontFamily: 'inherit', padding: '6px 8px', minWidth: 0,
};

export function LabUpload({ patientId, onSaved }: { patientId: string; onSaved: () => void }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  // React has no prop for folder picking; the attribute is standard in every
  // current browser even though its name still carries the webkit prefix.
  useEffect(() => { folderRef.current?.setAttribute('webkitdirectory', ''); }, []);

  const patch = (key: string, p: Partial<Report>) =>
    setReports((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const patchRow = (key: string, i: number, p: Partial<Row>) =>
    setReports((rs) => rs.map((r) => (r.key === key ? { ...r, rows: r.rows.map((x, j) => (j === i ? { ...x, ...p } : x)) } : r)));

  const read = async (rep: Report) => {
    const form = new FormData();
    form.append('file', rep.file, rep.file.name);
    try {
      const res = await apiFetch(`/api/patients/${encodeURIComponent(patientId)}/labs/extract`, { method: 'POST', body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        patch(rep.key, { state: 'failed', error: d.detail || `Couldn't read this file (${res.status}).` });
        return;
      }
      const rows: Row[] = (d.results || []).map((r: ServerRow) => ({ ...r, include: r.status === 'ok', valueText: String(r.value) }));
      patch(rep.key, { state: 'read', rows, testDate: d.test_date || '', sourceLab: d.source_lab || '' });
    } catch {
      patch(rep.key, { state: 'failed', error: "Couldn't reach MeO. Check your connection and try again." });
    }
  };

  const add = async (files: File[]) => {
    setError(null);
    setSaved(null);
    const ok = files.filter(accepted);
    setSkipped((n) => n + files.length - ok.length);
    const room = Math.max(0, MAX_FILES - reports.length);
    if (ok.length > room) setError(`Up to ${MAX_FILES} reports at a time. The first ${room} were added.`);
    const fresh: Report[] = ok.slice(0, room).map((file, i) => ({
      key: `${Date.now()}-${i}-${pathOf(file)}`, path: pathOf(file), file,
      state: 'reading', testDate: '', sourceLab: '', rows: [],
    }));
    setReports((rs) => [...rs, ...fresh]);
    // A few at a time: each file is a model call, and a folder can be large.
    const queue = [...fresh];
    await Promise.all(Array.from({ length: PARALLEL }, async () => {
      for (let rep = queue.shift(); rep; rep = queue.shift()) await read(rep);
    }));
  };

  const ready = reports.filter((r) => r.state === 'read');
  const chosen = ready.flatMap((r) => r.rows.filter((x) => x.include && x.biomarker_name).map((x) => ({ r, x })));
  const missingDate = ready.some((r) => !r.testDate && r.rows.some((x) => x.include));
  const badNumber = chosen.some(({ x }) => !Number.isFinite(parseFloat(x.valueText)));
  const reading = reports.some((r) => r.state === 'reading');

  const save = async () => {
    setSaving(true);
    setError(null);
    // One save per test date and lab, the shape POST /labs takes.
    const groups = new Map<string, { test_date: string; source_lab?: string; results: { biomarker_name: string; value: number; unit: string }[] }>();
    for (const { r, x } of chosen) {
      const k = `${r.testDate}|${r.sourceLab.trim()}`;
      if (!groups.has(k)) groups.set(k, { test_date: r.testDate, source_lab: r.sourceLab.trim() || undefined, results: [] });
      groups.get(k)!.results.push({ biomarker_name: x.biomarker_name!, value: parseFloat(x.valueText), unit: x.expected_unit || x.unit });
    }
    try {
      let n = 0;
      for (const body of groups.values()) {
        const res = await apiFetch(`/api/patients/${encodeURIComponent(patientId)}/labs`, { method: 'POST', body: JSON.stringify(body) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.detail || d.error || `The record refused it (${res.status}).`);
        n += d.saved ?? body.results.length;
      }
      setSaved(`Saved ${n} result${n === 1 ? '' : 's'} from ${ready.length} report${ready.length === 1 ? '' : 's'}.`);
      setReports([]);
      setSkipped(0);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saving failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { setReports([]); setSkipped(0); setError(null); };

  const pickers = (
    <>
      <input ref={folderRef} type="file" multiple hidden onChange={(e) => { add(Array.from(e.target.files || [])); e.target.value = ''; }} />
      <input ref={filesRef} type="file" multiple hidden accept={ACCEPT.join(',')} onChange={(e) => { add(Array.from(e.target.files || [])); e.target.value = ''; }} />
    </>
  );

  return (
    <div style={{ marginTop: 12 }}>
      {pickers}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={async (e) => { e.preventDefault(); setDragging(false); add(await filesFromDrop(e.dataTransfer)); }}
        style={{
          border: `1.5px dashed ${dragging ? T.lime : T.chipBorder}`, borderRadius: 14,
          background: dragging ? 'rgba(var(--mc-accent-rgb),0.08)' : T.row,
          padding: reports.length ? '12px 16px' : '22px 16px', textAlign: 'center',
          transition: 'background-color 120ms ease-out, border-color 120ms ease-out',
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>
          {reports.length ? 'Drop more reports here' : 'Drop a folder of lab reports here'}
        </div>
        {!reports.length && (
          <div style={{ fontSize: 12, marginBottom: 12 }}>PDFs, photos or text files. Nothing is saved until you check the values and confirm.</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: reports.length ? 8 : 0 }}>
          <Btn onClick={() => folderRef.current?.click()} style={{ fontSize: 13, padding: '8px 14px' }}>Choose folder</Btn>
          <Btn onClick={() => filesRef.current?.click()} style={{ fontSize: 13, padding: '8px 14px' }}>Choose files</Btn>
        </div>
      </div>

      {saved && <div role="status" style={{ fontSize: 13, fontWeight: 600, color: T.lime, marginTop: 10 }}>{saved}</div>}

      {reports.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {reports.map((rep) => {
            const known = rep.rows.map((x, i) => ({ x, i })).filter(({ x }) => x.status !== 'unknown_marker');
            const unknown = rep.rows.filter((x) => x.status === 'unknown_marker');
            return (
              <div key={rep.key} style={{ background: T.row, border: `1px solid ${T.rowBorder}`, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: rep.state === 'read' ? 10 : 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rep.path}>{rep.path}</div>
                  <div style={{ flex: 1 }} />
                  {rep.state === 'reading' && <Pill size={11}>Reading…</Pill>}
                  {rep.state === 'read' && <Pill size={11} color={known.length ? T.lime : undefined}>{known.length} result{known.length === 1 ? '' : 's'}</Pill>}
                  {rep.state === 'failed' && <Pill size={11} color={T.amber}>Not read</Pill>}
                  <button aria-label={`Remove ${rep.path}`} onClick={() => setReports((rs) => rs.filter((r) => r.key !== rep.key))} className="mc-press"
                    style={{ background: 'transparent', border: 0, color: T.text, cursor: 'pointer', padding: 2, display: 'flex' }}>
                    <X size={15} />
                  </button>
                </div>

                {rep.state === 'failed' && <div style={{ fontSize: 12.5, marginTop: 6 }}>{rep.error}</div>}

                {rep.state === 'read' && (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        Test date
                        <input type="date" value={rep.testDate} onChange={(e) => patch(rep.key, { testDate: e.target.value })}
                          style={{ ...inputStyle, borderColor: !rep.testDate && rep.rows.some((x) => x.include) ? T.amber : T.chipBorder }} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, flex: '1 1 180px' }}>
                        Lab
                        <input value={rep.sourceLab} placeholder="e.g. Medichecks" onChange={(e) => patch(rep.key, { sourceLab: e.target.value })}
                          style={{ ...inputStyle, flex: 1 }} />
                      </label>
                    </div>
                    {!rep.testDate && rep.rows.some((x) => x.include) && (
                      <div style={{ fontSize: 12, color: T.amber, marginBottom: 8 }}>No date was printed on this report. Add the test date to save it.</div>
                    )}

                    {known.length === 0 ? (
                      <div style={{ fontSize: 12.5 }}>No markers the record holds were found in this file.</div>
                    ) : (
                      <div className="mc-scroll-x">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ textAlign: 'left' }}>
                              {['Save', 'Marker', 'Value', 'Unit', ''].map((h) => (
                                <th key={h} style={{ fontSize: 11, fontWeight: 600, padding: '0 10px 6px 0' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {known.map(({ x, i }) => {
                              const differs = x.status === 'unit_differs';
                              // A value printed in another unit can be saved only once it has
                              // been re-entered in the record's unit; until then it stays out.
                              const converted = differs && x.valueText.trim() !== String(x.value);
                              return (
                                <tr key={i} style={{ borderTop: `1px solid ${T.rowBorder}` }}>
                                  <td style={{ padding: '6px 10px 6px 0' }}>
                                    <input type="checkbox" checked={x.include} disabled={differs && !converted}
                                      aria-label={`Save ${x.display_name}`}
                                      onChange={(e) => patchRow(rep.key, i, { include: e.target.checked })}
                                      style={{ accentColor: 'var(--mc-accent)', width: 16, height: 16 }} />
                                  </td>
                                  <td style={{ padding: '6px 10px 6px 0', fontWeight: 600 }} title={x.printed_name !== x.display_name ? `Printed as "${x.printed_name}"` : undefined}>
                                    {x.display_name}
                                  </td>
                                  <td style={{ padding: '6px 10px 6px 0' }}>
                                    <input inputMode="decimal" value={x.valueText} aria-label={`${x.display_name} value`}
                                      onChange={(e) => patchRow(rep.key, i, {
                                        valueText: e.target.value,
                                        include: differs ? e.target.value.trim() !== String(x.value) && x.include : x.include,
                                      })}
                                      style={{ ...inputStyle, width: 84 }} />
                                  </td>
                                  <td style={{ padding: '6px 10px 6px 0', whiteSpace: 'nowrap' }}>{x.expected_unit || x.unit}</td>
                                  <td style={{ padding: '6px 0', fontSize: 12, color: differs ? T.amber : T.text }}>
                                    {differs && (converted
                                      ? `Re-entered from ${x.value} ${x.unit}`
                                      : `Printed as ${x.value} ${x.unit}. Enter it in ${x.expected_unit} to save it.`)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {unknown.length > 0 && (
                      <div style={{ fontSize: 12, marginTop: 8 }}>
                        Not one of the record&apos;s markers, so not saved: {unknown.map((x) => `${x.printed_name} ${x.value} ${x.unit}`.trim()).join(', ')}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {skipped > 0 && <div style={{ fontSize: 12 }}>{skipped} file{skipped === 1 ? ' was' : 's were'} skipped: only PDFs, photos and text files can be read.</div>}
          {error && <div role="alert" style={{ fontSize: 13, color: T.amber }}>{error}</div>}

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <Btn primary onClick={save} disabled={saving || reading || !chosen.length || missingDate || badNumber}>
              {saving ? 'Saving…' : reading ? 'Reading reports…' : `Save ${chosen.length} result${chosen.length === 1 ? '' : 's'}`}
            </Btn>
            <Btn onClick={reset} disabled={saving}>Cancel</Btn>
            {badNumber && <span style={{ fontSize: 12, color: T.amber }}>One of the ticked values isn&apos;t a number.</span>}
          </div>
        </div>
      )}
      {error && reports.length === 0 && <div role="alert" style={{ fontSize: 13, color: T.amber, marginTop: 10 }}>{error}</div>}
    </div>
  );
}

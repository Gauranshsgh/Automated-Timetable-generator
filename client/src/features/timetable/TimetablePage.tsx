import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useTimetableStore } from '../../stores';
import type { DayOfWeek } from '@timetable/types';

export default function TimetablePage() {
  const { versionId } = useParams<{ versionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const gridRef = useRef<HTMLDivElement>(null);
  const { pushEdit } = useTimetableStore();
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [annotationCell, setAnnotationCell] = useState<string | null>(null);
  const [annotationText, setAnnotationText] = useState('');

  // ─── Data Loading ──────────────────────────────────────
  const { data: versionData, isLoading } = useQuery({
    queryKey: ['version', versionId],
    queryFn: () => api.getVersion(versionId!),
    enabled: !!versionId,
  });

  const { data: institutionData } = useQuery({
    queryKey: ['institution', versionData?.data?.institutionId],
    queryFn: () => api.getInstitution(versionData!.data.institutionId),
    enabled: !!versionData?.data?.institutionId,
  });

  const { data: facultyData } = useQuery({
    queryKey: ['faculty', versionData?.data?.institutionId],
    queryFn: () => api.getFaculty(versionData!.data.institutionId),
    enabled: !!versionData?.data?.institutionId,
  });

  const { data: roomData } = useQuery({
    queryKey: ['rooms', versionData?.data?.institutionId],
    queryFn: () => api.getRooms(versionData!.data.institutionId),
    enabled: !!versionData?.data?.institutionId,
  });

  const { data: sectionData } = useQuery({
    queryKey: ['sections', versionData?.data?.institutionId],
    queryFn: () => api.getSections(versionData!.data.institutionId),
    enabled: !!versionData?.data?.institutionId,
  });

  // ─── Mutations ─────────────────────────────────────────
  const toggleLock = useMutation({
    mutationFn: (slotId: string) => api.toggleLock(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['version', versionId] });
      toast.success('Slot lock toggled');
    },
  });

  const publishVersion = useMutation({
    mutationFn: () => api.publishVersion(versionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['version', versionId] });
      toast.success('Version published!');
    },
  });

  const addAnnotation = useMutation({
    mutationFn: ({ cellRef, text }: { cellRef: string; text: string }) =>
      api.addAnnotation(versionId!, cellRef, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['version', versionId] });
      setAnnotationCell(null);
      setAnnotationText('');
      toast.success('Annotation saved');
    },
  });

  // ─── Export Functions ──────────────────────────────────
  const handleExportImage = useCallback(async () => {
    if (!gridRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(gridRef.current, {
      backgroundColor: '#0f1115',
      scale: 2,
    });
    const link = document.createElement('a');
    link.download = `timetable_${versionId?.slice(-6)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Image exported!');
  }, [versionId]);

  const handleExportPDF = useCallback(async () => {
    if (!gridRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const canvas = await html2canvas(gridRef.current, {
      backgroundColor: '#0f1115',
      scale: 2,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('landscape', 'mm', 'a3');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgRatio = canvas.width / canvas.height;
    const pdfWidth = pageWidth - 20;
    const pdfHeight = pdfWidth / imgRatio;

    pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, Math.min(pdfHeight, pageHeight - 20));
    pdf.save(`timetable_${versionId?.slice(-6)}.pdf`);
    toast.success('PDF exported!');
  }, [versionId]);

  // ─── Helpers ───────────────────────────────────────────
  const getFacultyName = (id: string) => {
    const fac = facultyData?.data?.find((f: any) => f._id === id);
    return fac?.code || fac?.name || id;
  };

  const getRoomCode = (id: string) => {
    const room = roomData?.data?.find((r: any) => r._id === id);
    return room?.code || id;
  };

  const getSectionName = (id: string) => {
    const sec = sectionData?.data?.find((s: any) => s._id === id);
    return sec?.name || id;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="font-mono text-sm animate-pulse" style={{ color: 'var(--color-primary)' }}>
          LOADING TIMETABLE DATA...
        </div>
      </div>
    );
  }

  const version = versionData?.data;
  const institution = institutionData?.data;
  const slots: any[] = version?.slots || [];
  const timeBands = institution?.timeBands || [];
  const workingDays: DayOfWeek[] = institution?.workingDays || [];
  const annotations = version?.customAnnotations || [];

  // Group slots by day and timeBandIndex
  const slotGrid = new Map<string, any[]>();
  for (const slot of slots) {
    const key = `${slot.day}-${slot.timeBandIndex}`;
    if (!slotGrid.has(key)) slotGrid.set(key, []);
    slotGrid.get(key)!.push(slot);
  }

  // Calculate grid columns: 1 for day label + time bands
  const colCount = timeBands.length + 1;

  return (
    <div className="animate-fade-in">
      {/* ─── Toolbar ────────────────────────────────────── */}
      <div
        className="flex items-center justify-between mb-4 p-3"
        style={{
          background: 'var(--color-surface-container)',
          border: '1px solid var(--color-outline-variant)',
        }}
      >
        <div className="flex items-center gap-4">
          <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: '10px' }} onClick={() => navigate(-1)}>
            ← BACK
          </button>
          <span className="font-label" style={{ color: 'var(--color-outline)', fontSize: '9px' }}>
            VERSION {versionId?.slice(-6).toUpperCase()} · SCORE: {version?.score}
          </span>
          {version?.isPublished && (
            <span className="font-label px-2 py-0.5" style={{ background: 'rgba(0, 229, 255, 0.15)', color: 'var(--color-primary)', fontSize: '9px' }}>
              PUBLISHED
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: '10px' }} onClick={handleExportImage}>
            ⬇ PNG
          </button>
          <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: '10px' }} onClick={handleExportPDF}>
            ⬇ PDF
          </button>
          {!version?.isPublished && (
            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '10px' }} onClick={() => publishVersion.mutate()}>
              ◈ PUBLISH
            </button>
          )}
        </div>
      </div>

      {/* ─── Timetable Grid ─────────────────────────────── */}
      <div className="overflow-x-auto" style={{ border: '2px solid var(--color-tt-cell-border)' }}>
        <div ref={gridRef} style={{ minWidth: '1200px' }}>
          {/* Title Header */}
          <div
            className="tt-header"
            style={{
              gridColumn: `1 / -1`,
              fontSize: '16px',
              padding: '12px',
              letterSpacing: '0.08em',
            }}
          >
            {institution?.name} {institution?.semester}
          </div>

          {/* Grid Table */}
          <table
            className="w-full"
            style={{
              borderCollapse: 'collapse',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
            }}
          >
            {/* Time Band Headers */}
            <thead>
              <tr>
                <th
                  className="tt-time-header"
                  style={{ width: '80px', minWidth: '80px' }}
                />
                {timeBands.map((tb: any, i: number) => (
                  <th
                    key={i}
                    className={tb.isBreak || tb.isLunch ? 'tt-break' : 'tt-time-header'}
                    style={{
                      minWidth: tb.isBreak ? '40px' : tb.isLunch ? '50px' : '120px',
                      width: tb.isBreak ? '40px' : tb.isLunch ? '50px' : undefined,
                    }}
                  >
                    {tb.isBreak ? 'B\nR\nE\nA\nK' : tb.isLunch ? 'L\nU\nN\nC\nH' : tb.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Day Rows */}
            <tbody>
              {workingDays.map((day) => {
                // Find all sections that have slots on this day
                const daySections = new Set<string>();
                for (const slot of slots) {
                  if (slot.day === day) {
                    daySections.add(slot.sectionId);
                  }
                }
                const sectionList = Array.from(daySections);
                const rowSpan = Math.max(sectionList.length, 1);

                return sectionList.length === 0 ? (
                  <tr key={day}>
                    <td className="tt-day-label">{day}</td>
                    {timeBands.map((tb: any, tbIdx: number) => (
                      <td
                        key={tbIdx}
                        className={tb.isBreak || tb.isLunch ? 'tt-break' : 'tt-cell'}
                        style={tb.isBreak || tb.isLunch ? { writingMode: 'vertical-lr' } : {}}
                      />
                    ))}
                  </tr>
                ) : (
                  sectionList.map((secId, secIdx) => (
                    <tr key={`${day}-${secId}`}>
                      {secIdx === 0 && (
                        <td className="tt-day-label" rowSpan={rowSpan}>
                          {day}
                        </td>
                      )}
                      {timeBands.map((tb: any, tbIdx: number) => {
                        if (tb.isBreak || tb.isLunch) {
                          return secIdx === 0 ? (
                            <td
                              key={tbIdx}
                              className="tt-break"
                              rowSpan={rowSpan}
                              style={{ writingMode: 'vertical-lr', textAlign: 'center', whiteSpace: 'pre-line' }}
                            >
                              {tb.isBreak ? 'B R E A K' : 'L U N C H'}
                            </td>
                          ) : null;
                        }

                        const cellKey = `${day}-${tbIdx}`;
                        const cellSlots = (slotGrid.get(cellKey) || []).filter(
                          (s: any) => s.sectionId === secId
                        );
                        const cellAnnotation = annotations.find(
                          (a: any) => a.cellRef === `${cellKey}-${secId}`
                        );

                        return (
                          <td
                            key={tbIdx}
                            className={`tt-cell ${cellSlots.some((s: any) => s.locked) ? 'locked' : ''}`}
                            onDoubleClick={() => {
                              if (cellSlots.length > 0) {
                                setEditingSlot(cellSlots[0]);
                              }
                            }}
                          >
                            {cellSlots.map((slot: any) => (
                              <div key={slot._id} className="tt-entry flex items-start justify-between group">
                                <span>
                                  {slot.subjectCode} ({slot.type}) - Sec ({getSectionName(slot.sectionId)}) ({getRoomCode(slot.roomId)})
                                </span>
                                <button
                                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 cursor-pointer bg-transparent border-none"
                                  style={{
                                    color: slot.locked ? 'var(--color-primary)' : 'var(--color-outline)',
                                    fontSize: '10px',
                                  }}
                                  title={slot.locked ? 'Unlock' : 'Lock'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLock.mutate(slot._id);
                                  }}
                                >
                                  {slot.locked ? '🔒' : '🔓'}
                                </button>
                              </div>
                            ))}

                            {/* Annotation */}
                            {cellAnnotation && (
                              <div
                                className="font-label mt-1 px-1"
                                style={{
                                  color: 'var(--color-secondary)',
                                  fontSize: '8px',
                                  background: 'rgba(254, 179, 0, 0.1)',
                                  border: '1px solid rgba(254, 179, 0, 0.2)',
                                }}
                              >
                                📝 {cellAnnotation.text}
                              </div>
                            )}

                            {/* Add Note on Hover */}
                            {cellSlots.length > 0 && !cellAnnotation && (
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity font-label cursor-pointer bg-transparent border-none"
                                style={{ color: 'var(--color-outline)', fontSize: '8px' }}
                                onClick={() => {
                                  setAnnotationCell(`${cellKey}-${secId}`);
                                }}
                              >
                                + NOTE
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Annotation Modal ──────────────────────────── */}
      {annotationCell && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setAnnotationCell(null)}
        >
          <div
            className="card w-96 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <span>ADD ANNOTATION</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div>
                <label className="input-label">Note Text</label>
                <input
                  className="input-field"
                  placeholder="Guest Lecture, Exam Prep, etc."
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: '10px' }} onClick={() => setAnnotationCell(null)}>
                  CANCEL
                </button>
                <button
                  className="btn-primary"
                  style={{ padding: '6px 12px', fontSize: '10px' }}
                  onClick={() => addAnnotation.mutate({ cellRef: annotationCell, text: annotationText })}
                  disabled={!annotationText}
                >
                  SAVE NOTE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Slot Edit Modal ──────────────────────────── */}
      {editingSlot && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setEditingSlot(null)}
        >
          <div
            className="card w-96 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <span>EDIT SLOT</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="font-mono text-xs" style={{ color: 'var(--color-on-surface)' }}>
                <strong>{editingSlot.subjectCode}</strong> ({editingSlot.type}) —
                Sec ({getSectionName(editingSlot.sectionId)})
              </div>
              <div className="font-mono text-xs" style={{ color: 'var(--color-outline)' }}>
                Room: {getRoomCode(editingSlot.roomId)} · Faculty: {getFacultyName(editingSlot.facultyId)}
              </div>
              <div className="font-mono text-xs" style={{ color: 'var(--color-outline)' }}>
                {editingSlot.day} — Time Band {editingSlot.timeBandIndex}
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: '10px' }} onClick={() => setEditingSlot(null)}>
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

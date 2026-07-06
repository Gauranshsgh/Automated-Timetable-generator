import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

interface ProgressEvent {
  type?: string;
  message: string;
  percentage: number;
  variationsFound: number;
  currentAction?: string;
  infeasible?: boolean;
}

export default function GenerationPage() {
  const { institutionId } = useParams<{ institutionId: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const { data: versions, refetch: refetchVersions } = useQuery({
    queryKey: ['versions', institutionId],
    queryFn: () => api.getVersions(institutionId),
    enabled: isComplete,
  });

  const deleteVersion = useMutation({
    mutationFn: (id: string) => api.deleteVersion(id),
    onSuccess: () => {
      refetchVersions();
      toast.success('Version deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const startGeneration = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      setIsComplete(false);
      setLogs([]);
      setProgress(null);

      const res = await api.generateTimetable(institutionId!, 50);
      const jobId = res.data.jobId;

      // Connect to SSE for progress updates
      const token = localStorage.getItem('token');
      const eventSource = new EventSource(
        `/api/timetable/generate/${jobId}/progress${token ? `?token=${token}` : ''}`
      );

      eventSource.onmessage = (event) => {
        try {
          const data: ProgressEvent = JSON.parse(event.data);
          setProgress(data);
          if (data.message) {
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${data.message}`]);
          }

          if (data.type === 'complete' || data.type === 'error') {
            eventSource.close();
            setIsComplete(true);
            setIsGenerating(false);
            refetchVersions();

            if (data.infeasible) {
              toast.error('Generation failed — constraints may be unsatisfiable');
            } else {
              toast.success(`Generation complete! ${data.variationsFound} variations found.`);
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        // Generation might still be running; wait for completion via polling
        setTimeout(() => {
          setIsComplete(true);
          setIsGenerating(false);
          refetchVersions();
        }, 2000);
      };
    },
    onError: (err: any) => {
      toast.error(err.message);
      setIsGenerating(false);
    },
  });

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* ─── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl" style={{ color: 'var(--color-on-surface)' }}>
            GENERATION ENGINE
          </h1>
          <p className="font-label mt-1" style={{ color: 'var(--color-outline)' }}>
            MATRIX CONSTRAINT SOLVER — {isGenerating ? 'PROCESSING' : isComplete ? 'COMPLETE' : 'STANDBY'}
          </p>
        </div>
        {!isGenerating && (
          <button
            className="btn-primary"
            onClick={() => startGeneration.mutate()}
          >
            {isComplete ? '◈ RE-GENERATE' : '◈ START GENERATION'}
          </button>
        )}
      </div>

      {/* ─── Progress Display ─────────────────────────── */}
      {(isGenerating || progress) && (
        <div className="card mb-6">
          <div className="card-header">
            <span>GENERATION PROGRESS</span>
            <span className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>
              {progress?.variationsFound || 0} VARIATIONS
            </span>
          </div>
          <div className="p-6">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="font-label" style={{ color: 'var(--color-outline)', fontSize: '10px' }}>
                  {progress?.currentAction || 'Initializing...'}
                </span>
                <span className="font-mono text-sm" style={{ color: 'var(--color-primary)' }}>
                  {progress?.percentage || 0}%
                </span>
              </div>
              <div
                className="h-2 w-full"
                style={{ background: 'var(--color-surface-lowest)', border: '1px solid var(--color-outline-variant)' }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${progress?.percentage || 0}%`,
                    background: 'var(--color-primary)',
                    boxShadow: '0 0 10px rgba(0, 229, 255, 0.5)',
                  }}
                />
              </div>
            </div>

            {/* Live Log */}
            <div>
              <label className="input-label mb-2">SYSTEM LOG</label>
              <div
                ref={logRef}
                className="font-mono text-xs p-3"
                style={{
                  background: 'var(--color-surface-lowest)',
                  border: '1px solid var(--color-outline-variant)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                {logs.length === 0 ? (
                  <div style={{ color: 'var(--color-outline)' }}>Waiting for engine output...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="py-0.5">{log}</div>
                  ))
                )}
                {isGenerating && (
                  <div className="animate-pulse" style={{ color: 'var(--color-primary)' }}>▌</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Variation Picker ─────────────────────────── */}
      {isComplete && versions?.data && versions.data.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span>GENERATED VARIATIONS ({versions.data.length})</span>
            <span className="font-label" style={{ color: 'var(--color-outline)', fontSize: '9px' }}>
              SELECT A VERSION TO EDIT
            </span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {versions.data.map((ver: any, i: number) => (
                <div
                  key={ver._id}
                  className="p-4 cursor-pointer transition-all"
                  style={{
                    background: 'var(--color-surface-lowest)',
                    border: `2px solid ${i === 0 ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
                  }}
                  onClick={() => navigate(`/timetable/${ver._id}`)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-headline" style={{ color: 'var(--color-on-surface)' }}>
                      VARIATION #{i + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <div
                        className="font-mono text-lg font-bold px-3 py-1"
                        style={{
                          color: 'var(--color-primary)',
                          border: '1px solid var(--color-primary-container)',
                          background: 'rgba(0, 229, 255, 0.05)',
                        }}
                      >
                        {ver.score}
                      </div>
                      <button
                        className="btn-danger"
                        style={{ padding: '6px', fontSize: '10px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this variation permanently?')) {
                            deleteVersion.mutate(ver._id);
                          }
                        }}
                        title="Delete Variation"
                        disabled={deleteVersion.isPending}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="font-mono text-xs" style={{ color: 'var(--color-outline)' }}>
                    Generated: {new Date(ver.generatedAt).toLocaleTimeString()}
                  </div>
                  {i === 0 && (
                    <div className="mt-2 font-label" style={{ color: 'var(--color-primary)', fontSize: '9px' }}>
                      ★ HIGHEST SCORE — RECOMMENDED
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

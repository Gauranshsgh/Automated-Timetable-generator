import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: institutions, isLoading: instLoading } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.getInstitutions(),
  });

  const { data: versions } = useQuery({
    queryKey: ['versions'],
    queryFn: () => api.getVersions(),
  });

  const queryClient = useQueryClient();
  const deleteVersion = useMutation({
    mutationFn: (id: string) => api.deleteVersion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] });
      toast.success('Version deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* ─── Page Header ──────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl" style={{ color: 'var(--color-on-surface)' }}>
            COMMAND CENTER
          </h1>
          <p className="font-label mt-1" style={{ color: 'var(--color-outline)' }}>
            SYSTEM STATUS OVERVIEW
          </p>
        </div>
        <Link to="/wizard" className="btn-primary no-underline">
          + NEW TIMETABLE
        </Link>
      </div>

      {/* ─── Stats Row ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="PROGRAMS"
          value={institutions?.data?.length || 0}
          icon="◈"
        />
        <StatCard
          label="GENERATED VERSIONS"
          value={versions?.data?.length || 0}
          icon="◆"
        />
        <StatCard
          label="PUBLISHED"
          value={versions?.data?.filter((v: any) => v.isPublished).length || 0}
          icon="✓"
        />
      </div>

      {/* ─── Programs List ────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span>REGISTERED PROGRAMS</span>
          <span className="font-label" style={{ color: 'var(--color-outline)', fontSize: '9px' }}>
            MODULE PRG-01
          </span>
        </div>

        <div className="p-4">
          {instLoading ? (
            <div className="text-center py-8 font-mono text-sm" style={{ color: 'var(--color-outline)' }}>
              LOADING DATA...
            </div>
          ) : institutions?.data?.length === 0 ? (
            <div className="text-center py-12">
              <div className="font-mono text-sm mb-4" style={{ color: 'var(--color-outline)' }}>
                NO PROGRAMS REGISTERED
              </div>
              <Link to="/wizard" className="btn-ghost no-underline" style={{ fontSize: '12px' }}>
                INITIALIZE FIRST PROGRAM →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {institutions?.data?.map((inst: any) => (
                <div
                  key={inst._id}
                  className="flex items-center justify-between p-4 transition-colors cursor-pointer"
                  style={{
                    background: 'var(--color-surface-lowest)',
                    border: '1px solid var(--color-outline-variant)',
                  }}
                  onClick={() => navigate(`/wizard/${inst._id}`)}
                >
                  <div>
                    <div className="font-headline text-base" style={{ color: 'var(--color-on-surface)' }}>
                      {inst.name}
                    </div>
                    <div className="font-mono text-xs mt-1" style={{ color: 'var(--color-outline)' }}>
                      {inst.semester} · {inst.batch} · {inst.workingDays?.length} DAYS
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-ghost"
                      style={{ padding: '6px 12px', fontSize: '10px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/generate/${inst._id}`);
                      }}
                    >
                      GENERATE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Recent Versions ──────────────────────────── */}
      {versions?.data && versions.data.length > 0 && (
        <div className="card mt-6">
          <div className="card-header">
            <span>RECENT TIMETABLE VERSIONS</span>
            <span className="font-label" style={{ color: 'var(--color-outline)', fontSize: '9px' }}>
              MODULE VER-01
            </span>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {versions.data.slice(0, 10).map((ver: any) => (
              <div
                key={ver._id}
                className="flex items-center justify-between p-3 transition-colors cursor-pointer"
                style={{
                  background: 'var(--color-surface-lowest)',
                  border: '1px solid var(--color-outline-variant)',
                }}
                onClick={() => navigate(`/timetable/${ver._id}`)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="font-mono text-lg font-bold w-12 h-12 flex items-center justify-center"
                    style={{
                      color: 'var(--color-primary)',
                      border: '2px solid var(--color-primary-container)',
                      background: 'rgba(0, 229, 255, 0.05)',
                    }}
                  >
                    {ver.score}
                  </div>
                  <div>
                    <div className="font-mono text-xs" style={{ color: 'var(--color-on-surface)' }}>
                      VERSION {ver._id.slice(-6).toUpperCase()}
                    </div>
                    <div className="font-label mt-1" style={{ color: 'var(--color-outline)', fontSize: '9px' }}>
                      {new Date(ver.generatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {ver.isPublished && (
                    <span
                      className="font-label px-2 py-1"
                      style={{
                        background: 'rgba(0, 229, 255, 0.15)',
                        color: 'var(--color-primary)',
                        fontSize: '9px',
                      }}
                    >
                      PUBLISHED
                    </span>
                  )}
                  <span
                    className="font-label"
                    style={{ color: 'var(--color-primary)', fontSize: '10px', marginRight: '8px' }}
                  >
                    VIEW →
                  </span>
                  <button
                    className="btn-danger"
                    style={{ padding: '6px', fontSize: '10px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteVersion.mutate(ver._id);
                    }}
                    title="Delete Variation"
                    disabled={deleteVersion.isPending}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div
      className="card p-5"
      style={{ borderTopColor: 'var(--color-primary)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-label mb-2" style={{ color: 'var(--color-outline)', fontSize: '10px' }}>
            {label}
          </div>
          <div className="font-display text-4xl" style={{ color: 'var(--color-on-surface)' }}>
            {value}
          </div>
        </div>
        <div
          className="text-3xl"
          style={{ color: 'var(--color-primary)', opacity: 0.3 }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

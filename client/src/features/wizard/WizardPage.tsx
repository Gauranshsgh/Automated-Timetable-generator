import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useWizardStore } from '../../stores';
import { DayOfWeek, SubjectType, RoomType } from '@timetable/types';

const STEPS = [
  'PROGRAM SETUP',
  'SECTIONS',
  'ROOMS',
  'FACULTY',
  'SUBJECTS & LOAD',
  'CONSTRAINTS',
  'REVIEW & GENERATE',
];

export default function WizardPage() {
  const { institutionId: paramId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentStep, setStep, institutionId, setInstitutionId } = useWizardStore();

  useEffect(() => {
    if (paramId) setInstitutionId(paramId);
  }, [paramId]);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* ─── Wizard Header ──────────────────────────────── */}
      <div className="mb-6">
        <h1 className="font-display text-2xl" style={{ color: 'var(--color-on-surface)' }}>
          TIMETABLE CONFIGURATION WIZARD
        </h1>
        <p className="font-label mt-1" style={{ color: 'var(--color-outline)' }}>
          STEP {currentStep + 1} OF {STEPS.length} — {STEPS[currentStep]}
        </p>
      </div>

      {/* ─── Progress Bar ─────────────────────────────── */}
      <div className="wizard-progress mb-8">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`wizard-step ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
            title={step}
          />
        ))}
      </div>

      {/* ─── Step Content ─────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span>{STEPS[currentStep]}</span>
          <span className="font-label" style={{ color: 'var(--color-outline)', fontSize: '9px' }}>
            WIZ-{String(currentStep + 1).padStart(2, '0')}
          </span>
        </div>

        <div className="p-6">
          {currentStep === 0 && <ProgramStep />}
          {currentStep === 1 && <SectionsStep />}
          {currentStep === 2 && <RoomsStep />}
          {currentStep === 3 && <FacultyStep />}
          {currentStep === 4 && <SubjectsStep />}
          {currentStep === 5 && <ConstraintsStep />}
          {currentStep === 6 && <ReviewStep />}
        </div>

        {/* ─── Navigation ───────────────────────────────── */}
        <div
          className="flex justify-between p-4"
          style={{ borderTop: '1px solid var(--color-outline-variant)' }}
        >
          <button
            className="btn-ghost"
            onClick={() => setStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
          >
            ← PREVIOUS
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              className="btn-primary"
              onClick={() => setStep(currentStep + 1)}
              disabled={currentStep === 0 && !institutionId}
            >
              NEXT STEP →
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={() => {
                if (institutionId) navigate(`/generate/${institutionId}`);
              }}
              disabled={!institutionId}
            >
              ◈ GENERATE TIMETABLE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Program Setup ──────────────────────────────────

function ProgramStep() {
  const { institutionId, setInstitutionId } = useWizardStore();
  const [name, setName] = useState('');
  const [batch, setBatch] = useState('');
  const [semester, setSemester] = useState('');
  const [days, setDays] = useState<DayOfWeek[]>([
    DayOfWeek.MON, DayOfWeek.TUE, DayOfWeek.WED, DayOfWeek.THU, DayOfWeek.FRI,
  ]);

  const defaultTimeBands = [
    { label: '08:50-09:50', startTime: '08:50', endTime: '09:50', order: 0, isBreak: false, isLunch: false },
    { label: '09:50-10:50', startTime: '09:50', endTime: '10:50', order: 1, isBreak: false, isLunch: false },
    { label: '10:50-11:00', startTime: '10:50', endTime: '11:00', order: 2, isBreak: true, isLunch: false },
    { label: '11:00-12:00', startTime: '11:00', endTime: '12:00', order: 3, isBreak: false, isLunch: false },
    { label: '12:00-1:00', startTime: '12:00', endTime: '13:00', order: 4, isBreak: false, isLunch: false },
    { label: '1:00-2:30', startTime: '13:00', endTime: '14:30', order: 5, isBreak: false, isLunch: true },
    { label: '2:30-3:30', startTime: '14:30', endTime: '15:30', order: 6, isBreak: false, isLunch: false },
    { label: '3:30-4:30', startTime: '15:30', endTime: '16:30', order: 7, isBreak: false, isLunch: false },
    { label: '4:30-5:30', startTime: '16:30', endTime: '17:30', order: 8, isBreak: false, isLunch: false },
    { label: '5:30-6:30', startTime: '17:30', endTime: '18:30', order: 9, isBreak: false, isLunch: false },
  ];
  const [timeBands, setTimeBands] = useState(defaultTimeBands);

  // Load existing institution data
  const { data: institution } = useQuery({
    queryKey: ['institution', institutionId],
    queryFn: () => api.getInstitution(institutionId!),
    enabled: !!institutionId,
  });

  useEffect(() => {
    if (institution?.data) {
      setName(institution.data.name);
      setBatch(institution.data.batch);
      setSemester(institution.data.semester);
      setDays(institution.data.workingDays);
      setTimeBands(institution.data.timeBands);
    }
  }, [institution]);

  const mutation = useMutation({
    mutationFn: async () => {
      const data = { name, batch, semester, workingDays: days, timeBands };
      if (institutionId) {
        return api.updateInstitution(institutionId, data);
      }
      return api.createInstitution(data);
    },
    onSuccess: (res: any) => {
      const id = res.data._id;
      setInstitutionId(id);
      toast.success(institutionId ? 'Program updated' : 'Program created');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleDay = (day: DayOfWeek) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const toggleTimeBandAttr = (index: number, attr: 'isBreak' | 'isLunch') => {
    setTimeBands(prev => prev.map((tb, i) => i === index ? { ...tb, [attr]: !tb[attr] } : tb));
  };

  const updateTimeBandLabel = (index: number, label: string) => {
    setTimeBands(prev => prev.map((tb, i) => i === index ? { ...tb, label } : tb));
  };

  const addTimeBand = () => {
    setTimeBands(prev => [
      ...prev,
      { label: 'New Time Band', startTime: '00:00', endTime: '00:00', order: prev.length, isBreak: false, isLunch: false }
    ]);
  };

  const removeTimeBand = (index: number) => {
    setTimeBands(prev => prev.filter((_, i) => i !== index).map((tb, i) => ({ ...tb, order: i })));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="input-label">Program Name</label>
          <input
            className="input-field"
            placeholder="B.Tech. (IT) and B.Tech. (IT-BI)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="input-label">Batch</label>
          <input
            className="input-field"
            placeholder="2024-2028"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="input-label">Semester</label>
        <input
          className="input-field"
          placeholder="4th Semester"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
        />
      </div>

      <div>
        <label className="input-label">Working Days</label>
        <div className="flex gap-2 mt-2">
          {Object.values(DayOfWeek).map((day) => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className="px-4 py-2 font-mono text-xs transition-all"
              style={{
                border: `2px solid ${days.includes(day) ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
                background: days.includes(day) ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                color: days.includes(day) ? 'var(--color-primary)' : 'var(--color-outline)',
                cursor: 'pointer',
              }}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-end">
          <label className="input-label mb-0">Time Bands ({timeBands.length}) — Edit Times, Breaks & Lunches</label>
          <button className="btn-ghost" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={addTimeBand}>
            + ADD BAND
          </button>
        </div>
        <div className="flex flex-col gap-1 mt-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {timeBands.map((tb, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2 font-mono text-xs transition-colors"
              style={{
                background: tb.isBreak || tb.isLunch ? 'var(--color-tt-break-bg)' : 'var(--color-surface-lowest)',
                border: '1px solid var(--color-outline-variant)',
              }}
            >
              <span style={{ color: 'var(--color-outline)', width: '24px' }}>{i + 1}</span>
              <input 
                className="input-field" 
                style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }} 
                value={tb.label} 
                onChange={(e) => updateTimeBandLabel(i, e.target.value)} 
              />
              <label className="flex items-center gap-1 cursor-pointer font-label" style={{ fontSize: '9px', color: tb.isBreak ? 'var(--color-secondary)' : 'var(--color-outline)' }}>
                <input type="checkbox" checked={tb.isBreak} onChange={() => toggleTimeBandAttr(i, 'isBreak')} />
                BREAK
              </label>
              <label className="flex items-center gap-1 cursor-pointer font-label ml-2" style={{ fontSize: '9px', color: tb.isLunch ? 'var(--color-secondary)' : 'var(--color-outline)' }}>
                <input type="checkbox" checked={tb.isLunch} onChange={() => toggleTimeBandAttr(i, 'isLunch')} />
                LUNCH
              </label>
              <button 
                className="btn-danger p-1 ml-2" 
                style={{ padding: '2px 6px', fontSize: '10px', minWidth: '24px' }} 
                onClick={() => removeTimeBand(i)}
                title="Remove Time Band"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        className="btn-primary self-start"
        onClick={() => mutation.mutate()}
        disabled={!name || !batch || !semester || mutation.isPending}
      >
        {mutation.isPending ? 'SAVING...' : institutionId ? 'UPDATE PROGRAM' : 'SAVE PROGRAM'}
      </button>
    </div>
  );
}

// ─── Step 2: Sections ───────────────────────────────────────

function SectionsStep() {
  const { institutionId } = useWizardStore();
  const [name, setName] = useState('');
  const [studentCount, setStudentCount] = useState(60);

  const queryClient = useQueryClient();

  const { data: sections } = useQuery({
    queryKey: ['sections', institutionId],
    queryFn: () => api.getSections(institutionId!),
    enabled: !!institutionId,
  });

  const addSection = useMutation({
    mutationFn: () => api.createSection({ name, studentCount, institutionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setName('');
      toast.success('Section added');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!institutionId) return <div className="font-mono text-sm" style={{ color: 'var(--color-outline)' }}>Complete Step 1 first</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="input-label">Section Name (e.g. A, B, IT-BI)</label>
          <input className="input-field" placeholder="A" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="input-label">Student Count</label>
          <input className="input-field" type="number" value={studentCount} onChange={e => setStudentCount(Number(e.target.value))} />
        </div>
      </div>
      <button className="btn-primary self-start" onClick={() => addSection.mutate()} disabled={!name || addSection.isPending}>
        + ADD SECTION
      </button>

      {sections?.data && sections.data.length > 0 && (
        <div className="mt-4">
          <label className="input-label">REGISTERED SECTIONS ({sections.data.length})</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {sections.data.map((s: any) => (
              <div key={s._id} className="p-3 font-mono text-xs" style={{ background: 'var(--color-surface-lowest)', border: '1px solid var(--color-outline-variant)' }}>
                <div style={{ color: 'var(--color-on-surface)' }}>Section {s.name}</div>
                <div style={{ color: 'var(--color-outline)' }}>{s.studentCount} students</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Rooms ──────────────────────────────────────────
function RoomsStep() {
  const { institutionId } = useWizardStore();
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState(60);
  const [type, setType] = useState<RoomType>(RoomType.CLASSROOM);

  const queryClient = useQueryClient();

  const { data: rooms } = useQuery({
    queryKey: ['rooms', institutionId],
    queryFn: () => api.getRooms(institutionId!),
    enabled: !!institutionId,
  });

  const addRoom = useMutation({
    mutationFn: () => api.createRoom({ code, capacity, type, institutionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setCode('');
      toast.success('Room added');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!institutionId) return <div className="font-mono text-sm" style={{ color: 'var(--color-outline)' }}>Complete Step 1 first</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="input-label">Room Code</label>
          <input className="input-field" placeholder="CC3-5106" value={code} onChange={e => setCode(e.target.value)} />
        </div>
        <div>
          <label className="input-label">Capacity</label>
          <input className="input-field" type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))} />
        </div>
        <div>
          <label className="input-label">Type</label>
          <select className="input-field" value={type} onChange={e => setType(e.target.value as RoomType)}>
            {Object.values(RoomType).map(t => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>
      <button className="btn-primary self-start" onClick={() => addRoom.mutate()} disabled={!code || addRoom.isPending}>
        + ADD ROOM
      </button>

      {rooms?.data && rooms.data.length > 0 && (
        <div className="mt-4">
          <label className="input-label">REGISTERED ROOMS ({rooms.data.length})</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {rooms.data.map((r: any) => (
              <div key={r._id} className="p-3 font-mono text-xs" style={{ background: 'var(--color-surface-lowest)', border: '1px solid var(--color-outline-variant)' }}>
                <div style={{ color: 'var(--color-on-surface)' }}>{r.code}</div>
                <div style={{ color: 'var(--color-outline)' }}>{r.type} · {r.capacity} seats</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Faculty ─────────────────────────────────────────

function FacultyStep() {
  const { institutionId } = useWizardStore();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [subjectCodes, setSubjectCodes] = useState('');
  const [maxLoad, setMaxLoad] = useState(20);

  const queryClient = useQueryClient();

  const { data: faculty } = useQuery({
    queryKey: ['faculty', institutionId],
    queryFn: () => api.getFaculty(institutionId!),
    enabled: !!institutionId,
  });

  const addFaculty = useMutation({
    mutationFn: () => api.createFaculty({
      name, code,
      subjectCodes: subjectCodes.split(',').map(s => s.trim()).filter(Boolean),
      maxLoadPerWeek: maxLoad,
      institutionId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      setName(''); setCode(''); setSubjectCodes('');
      toast.success('Faculty added');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!institutionId) return <div className="font-mono text-sm" style={{ color: 'var(--color-outline)' }}>Complete Step 1 first</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="input-label">Faculty Name</label>
          <input className="input-field" placeholder="Dr. Arun Kumar" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="input-label">Faculty Code</label>
          <input className="input-field" placeholder="FAC01" value={code} onChange={e => setCode(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="input-label">Subject Codes (comma-separated)</label>
          <input className="input-field" placeholder="DAA, DBMS" value={subjectCodes} onChange={e => setSubjectCodes(e.target.value)} />
        </div>
        <div>
          <label className="input-label">Max Load / Week (hours)</label>
          <input className="input-field" type="number" value={maxLoad} onChange={e => setMaxLoad(Number(e.target.value))} />
        </div>
      </div>
      <button className="btn-primary self-start" onClick={() => addFaculty.mutate()} disabled={!name || !code || addFaculty.isPending}>
        + ADD FACULTY
      </button>

      {faculty?.data && faculty.data.length > 0 && (
        <div className="mt-4">
          <label className="input-label">REGISTERED FACULTY ({faculty.data.length})</label>
          <div className="flex flex-col gap-2 mt-2">
            {faculty.data.map((f: any) => (
              <div key={f._id} className="flex items-center justify-between p-3" style={{ background: 'var(--color-surface-lowest)', border: '1px solid var(--color-outline-variant)' }}>
                <div>
                  <span className="font-mono text-xs" style={{ color: 'var(--color-on-surface)' }}>{f.name}</span>
                  <span className="font-label ml-3" style={{ color: 'var(--color-outline)', fontSize: '9px' }}>{f.code}</span>
                </div>
                <span className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>{f.subjectCodes.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Subjects ────────────────────────────────────────

function SubjectsStep() {
  const { institutionId } = useWizardStore();
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [types, setTypes] = useState<SubjectType[]>([SubjectType.LECTURE]);
  const [hoursL, setHoursL] = useState(3);
  const [hoursP, setHoursP] = useState(0);
  const [hoursT, setHoursT] = useState(0);

  const queryClient = useQueryClient();

  const { data: subjects } = useQuery({
    queryKey: ['subjects', institutionId],
    queryFn: () => api.getSubjects(institutionId!),
    enabled: !!institutionId,
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', institutionId],
    queryFn: () => api.getSections(institutionId!),
    enabled: !!institutionId,
  });

  const addSubject = useMutation({
    mutationFn: () => {
      const weeklyHours = [];
      if (hoursL > 0) weeklyHours.push({ type: SubjectType.LECTURE, hours: hoursL });
      if (hoursP > 0) weeklyHours.push({ type: SubjectType.PRACTICAL, hours: hoursP });
      if (hoursT > 0) weeklyHours.push({ type: SubjectType.TUTORIAL, hours: hoursT });
      return api.createSubject({
        code, fullName, types, weeklyHours,
        sectionIds: sections?.data?.map((s: any) => s._id) || [],
        institutionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setCode(''); setFullName('');
      toast.success('Subject added');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!institutionId) return <div className="font-mono text-sm" style={{ color: 'var(--color-outline)' }}>Complete Step 1 first</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="input-label">Subject Code</label>
          <input className="input-field" placeholder="DAA" value={code} onChange={e => setCode(e.target.value)} />
        </div>
        <div>
          <label className="input-label">Full Name</label>
          <input className="input-field" placeholder="Design and Analysis of Algorithms" value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="input-label">Lecture Hours/Week</label>
          <input className="input-field" type="number" value={hoursL} onChange={e => setHoursL(Number(e.target.value))} />
        </div>
        <div>
          <label className="input-label">Practical Hours/Week</label>
          <input className="input-field" type="number" value={hoursP} onChange={e => setHoursP(Number(e.target.value))} />
        </div>
        <div>
          <label className="input-label">Tutorial Hours/Week</label>
          <input className="input-field" type="number" value={hoursT} onChange={e => setHoursT(Number(e.target.value))} />
        </div>
      </div>
      <button className="btn-primary self-start" onClick={() => addSubject.mutate()} disabled={!code || !fullName || addSubject.isPending}>
        + ADD SUBJECT
      </button>

      {subjects?.data && subjects.data.length > 0 && (
        <div className="mt-4">
          <label className="input-label">REGISTERED SUBJECTS ({subjects.data.length})</label>
          <div className="flex flex-col gap-2 mt-2">
            {subjects.data.map((s: any) => (
              <div key={s._id} className="flex items-center justify-between p-3" style={{ background: 'var(--color-surface-lowest)', border: '1px solid var(--color-outline-variant)' }}>
                <div>
                  <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-primary)' }}>{s.code}</span>
                  <span className="font-mono text-xs ml-3" style={{ color: 'var(--color-on-surface)' }}>{s.fullName}</span>
                </div>
                <span className="font-label" style={{ color: 'var(--color-outline)', fontSize: '9px' }}>
                  {s.weeklyHours?.map((w: any) => `${w.type}:${w.hours}h`).join(' · ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Constraints ─────────────────────────────────────

function ConstraintsStep() {
  const { institutionId } = useWizardStore();

  if (!institutionId) return <div className="font-mono text-sm" style={{ color: 'var(--color-outline)' }}>Complete Step 1 first</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="p-6 text-center" style={{ background: 'var(--color-surface-lowest)', border: '1px dashed var(--color-outline-variant)' }}>
        <div className="font-headline text-lg mb-2" style={{ color: 'var(--color-on-surface)' }}>
          ADVANCED CONSTRAINTS
        </div>
        <div className="font-mono text-xs" style={{ color: 'var(--color-outline)' }}>
          Optional rules: max lectures/day, no back-to-back labs, fixed slots, preferred time bands.
          <br />These can be configured after initial generation for fine-tuning.
        </div>
        <div className="mt-4 font-label" style={{ color: 'var(--color-primary)', fontSize: '10px' }}>
          SKIP TO PROCEED WITH DEFAULT CONSTRAINTS →
        </div>
      </div>
    </div>
  );
}

// ─── Step 6: Review ──────────────────────────────────────────

function ReviewStep() {
  const { institutionId } = useWizardStore();

  const { data: institution } = useQuery({
    queryKey: ['institution', institutionId],
    queryFn: () => api.getInstitution(institutionId!),
    enabled: !!institutionId,
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms', institutionId],
    queryFn: () => api.getRooms(institutionId!),
    enabled: !!institutionId,
  });

  const { data: faculty } = useQuery({
    queryKey: ['faculty', institutionId],
    queryFn: () => api.getFaculty(institutionId!),
    enabled: !!institutionId,
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects', institutionId],
    queryFn: () => api.getSubjects(institutionId!),
    enabled: !!institutionId,
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', institutionId],
    queryFn: () => api.getSections(institutionId!),
    enabled: !!institutionId,
  });

  if (!institutionId) return <div className="font-mono text-sm" style={{ color: 'var(--color-outline)' }}>Complete all steps first</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="font-headline text-lg" style={{ color: 'var(--color-on-surface)' }}>
        CONFIGURATION SUMMARY
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="PROGRAM" value={institution?.data?.name || '—'} />
        <SummaryCard label="ROOMS" value={String(rooms?.data?.length || 0)} />
        <SummaryCard label="FACULTY" value={String(faculty?.data?.length || 0)} />
        <SummaryCard label="SUBJECTS" value={String(subjects?.data?.length || 0)} />
      </div>

      <div className="p-4" style={{ background: 'rgba(0, 229, 255, 0.05)', border: '1px solid var(--color-primary-container)' }}>
        <div className="font-label mb-2" style={{ color: 'var(--color-primary)', fontSize: '10px' }}>
          ◈ READY FOR GENERATION
        </div>
        <div className="font-mono text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
          Click "GENERATE TIMETABLE" to start the matrix-based constraint solver.
          The engine will produce 50+ conflict-free variations with quality scores.
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3" style={{ background: 'var(--color-surface-lowest)', border: '1px solid var(--color-outline-variant)' }}>
      <div className="font-label mb-1" style={{ color: 'var(--color-outline)', fontSize: '9px' }}>{label}</div>
      <div className="font-mono text-sm" style={{ color: 'var(--color-on-surface)' }}>{value}</div>
    </div>
  );
}

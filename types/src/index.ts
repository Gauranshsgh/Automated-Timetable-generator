// ============================================================
// Automated Timetable Generator — Shared Type Definitions
// ============================================================

// ─── Enums ───────────────────────────────────────────────────

export enum DayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
}

export enum SubjectType {
  LECTURE = 'L',
  PRACTICAL = 'P',
  TUTORIAL = 'T',
}

export enum RoomType {
  CLASSROOM = 'classroom',
  LAB = 'lab',
  LECTURE_THEATRE = 'lecture-theatre',
}

export enum ConstraintType {
  FACULTY_UNAVAILABLE = 'faculty_unavailable',
  ROOM_UNAVAILABLE = 'room_unavailable',
  NO_CLASH_SECTION = 'no_clash_section',
  MAX_DAILY_LOAD = 'max_daily_load',
  FIXED_SLOT = 'fixed_slot',
  PREFERRED_SLOT = 'preferred_slot',
  NO_BACK_TO_BACK_LABS = 'no_back_to_back_labs',
}

export enum UserRole {
  ADMIN = 'admin',
  COORDINATOR = 'coordinator',
  VIEWER = 'viewer',
}

// ─── Time Band ───────────────────────────────────────────────

export interface ITimeBand {
  _id?: string;
  label: string;        // e.g., "08:50-09:50"
  startTime: string;    // "08:50"
  endTime: string;      // "09:50"
  order: number;        // display order
  isBreak: boolean;     // non-allocatable break
  isLunch: boolean;     // non-allocatable lunch
}

// ─── Institution / Program ───────────────────────────────────

export interface IInstitution {
  _id?: string;
  name: string;             // "B.Tech. (IT) and B.Tech. (IT-BI)"
  batch: string;            // "2024-2028"
  semester: string;         // "4th Semester"
  workingDays: DayOfWeek[];
  timeBands: ITimeBand[];
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Faculty ─────────────────────────────────────────────────

export interface IFacultyUnavailableSlot {
  day: DayOfWeek;
  timeBandIndex: number;
}

export interface IFaculty {
  _id?: string;
  name: string;
  code: string;                        // e.g., "FAC01"
  subjectCodes: string[];              // subject codes they can teach
  maxLoadPerWeek: number;              // max teaching hours/week
  unavailableSlots: IFacultyUnavailableSlot[];
  institutionId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Subject ─────────────────────────────────────────────────

export interface IWeeklyHours {
  type: SubjectType;
  hours: number;
}

export interface ISubject {
  _id?: string;
  code: string;              // "DAA", "DBMS", etc.
  fullName: string;          // "Design and Analysis of Algorithms"
  types: SubjectType[];      // [L, P] or [L, P, T]
  weeklyHours: IWeeklyHours[];
  sectionIds: string[];      // which sections need this subject
  institutionId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Section ─────────────────────────────────────────────────

export interface ISection {
  _id?: string;
  name: string;              // "A", "B", "C", "IT-BI"
  batchGrouping?: string;    // e.g., "IT-BI combined"
  studentCount: number;
  institutionId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Room ────────────────────────────────────────────────────

export interface IRoom {
  _id?: string;
  code: string;              // "CC3-5106"
  capacity: number;
  type: RoomType;
  institutionId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Constraint ──────────────────────────────────────────────

export interface IConstraintPayload {
  // faculty_unavailable
  facultyId?: string;
  day?: DayOfWeek;
  timeBandIndex?: number;

  // room_unavailable
  roomId?: string;

  // max_daily_load
  sectionId?: string;
  maxLectures?: number;

  // fixed_slot / preferred_slot
  subjectCode?: string;
  subjectType?: SubjectType;
  // sectionId above
  // day above
  // timeBandIndex above

  // no_back_to_back_labs
  // sectionId above

  // Generic extensibility
  [key: string]: unknown;
}

export interface IConstraint {
  _id?: string;
  type: ConstraintType;
  payload: IConstraintPayload;
  institutionId: string;
  priority: number;          // higher = more important
  isSoft: boolean;           // soft constraints can be relaxed
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Timetable Slot (atomic unit) ────────────────────────────

export interface ITimetableSlot {
  _id?: string;
  day: DayOfWeek;
  timeBandIndex: number;     // index into institution.timeBands
  subjectCode: string;
  type: SubjectType;         // L, P, T
  sectionId: string;
  facultyId: string;
  roomId: string;
  locked: boolean;
  isManualOverride: boolean;
  timetableVersionId: string;
}

// ─── Custom Annotation ──────────────────────────────────────

export interface ICustomAnnotation {
  _id?: string;
  cellRef: string;           // "MON-0-secA" (day-timeBandIndex-sectionId)
  text: string;
}

// ─── Timetable Version ──────────────────────────────────────

export interface ITimetableVersion {
  _id?: string;
  institutionId: string;
  slots: ITimetableSlot[] | string[];
  score: number;
  generatedAt: Date;
  isPublished: boolean;
  customAnnotations: ICustomAnnotation[];
  parentVersionId?: string;  // for undo/version history
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── User / Auth ─────────────────────────────────────────────

export interface IUser {
  _id?: string;
  email: string;
  passwordHash?: string;     // never sent to client
  name: string;
  role: UserRole;
  institutionId?: string;
  facultyId?: string;        // if role=viewer and they are a faculty member
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── API Request / Response Types ────────────────────────────

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  institutionId?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: Omit<IUser, 'passwordHash'>;
}

export interface GenerateRequest {
  institutionId: string;
  variationCount?: number;   // default 50
  maxIterations?: number;    // max backtracking iterations
}

export interface GenerateProgressEvent {
  type: 'progress' | 'variation_found' | 'complete' | 'error';
  message: string;
  percentage: number;
  variationsFound: number;
  totalTarget: number;
  currentAction?: string;
}

export interface SlotUpdateRequest {
  subjectCode?: string;
  type?: SubjectType;
  sectionId?: string;
  facultyId?: string;
  roomId?: string;
  locked?: boolean;
}

export interface SlotSwapRequest {
  slotIdA: string;
  slotIdB: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: {
    type: 'faculty' | 'room' | 'section';
    description: string;
    existingSlotId: string;
  }[];
}

export interface AnnotationRequest {
  cellRef: string;
  text: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export interface VariationSummary {
  _id: string;
  score: number;
  gapCount: number;
  loadBalanceScore: number;
  totalSlots: number;
  generatedAt: Date;
}

// ─── API Envelope ────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

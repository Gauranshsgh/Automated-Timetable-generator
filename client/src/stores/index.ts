import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: {
    _id: string;
    email: string;
    name: string;
    role: string;
    institutionId?: string;
  } | null;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string, user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, refreshToken, user) => {
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        set({ token, user, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    { name: 'auth-store' }
  )
);

interface WizardState {
  currentStep: number;
  institutionId: string | null;
  setStep: (step: number) => void;
  setInstitutionId: (id: string) => void;
  reset: () => void;
}

export const useWizardStore = create<WizardState>()((set) => ({
  currentStep: 0,
  institutionId: null,
  setStep: (step) => set({ currentStep: step }),
  setInstitutionId: (id) => set({ institutionId: id }),
  reset: () => set({ currentStep: 0, institutionId: null }),
}));

interface TimetableEdit {
  slotId: string;
  before: any;
  after: any;
}

interface TimetableState {
  activeVersionId: string | null;
  editHistory: TimetableEdit[];
  redoStack: TimetableEdit[];
  setActiveVersion: (id: string) => void;
  pushEdit: (edit: TimetableEdit) => void;
  undo: () => TimetableEdit | null;
  redo: () => TimetableEdit | null;
  clearHistory: () => void;
}

export const useTimetableStore = create<TimetableState>()((set, get) => ({
  activeVersionId: null,
  editHistory: [],
  redoStack: [],
  setActiveVersion: (id) => set({ activeVersionId: id, editHistory: [], redoStack: [] }),
  pushEdit: (edit) =>
    set((state) => ({
      editHistory: [...state.editHistory, edit],
      redoStack: [],
    })),
  undo: () => {
    const { editHistory } = get();
    if (editHistory.length === 0) return null;
    const last = editHistory[editHistory.length - 1];
    set((state) => ({
      editHistory: state.editHistory.slice(0, -1),
      redoStack: [...state.redoStack, last],
    }));
    return last;
  },
  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return null;
    const last = redoStack[redoStack.length - 1];
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      editHistory: [...state.editHistory, last],
    }));
    return last;
  },
  clearHistory: () => set({ editHistory: [], redoStack: [] }),
}));

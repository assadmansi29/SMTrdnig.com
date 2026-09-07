import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
  Award,
  AlertCircle,
  Users,
  Plus,
  Minus,
  Edit,
  Check,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import { UserAvatar } from './UserAvatar';
import { CoachingStudent, TrainingMilestone } from '../types';

interface StudentCoachingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMasterDesk?: () => void;
  onOpenAuth?: () => void;
}

interface Milestone {
  id: string;
  courseName: string;
  completedLessons: number;
  totalLessons: number;
}

const DEFAULT_MILESTONES: Milestone[] = [
  {
    id: 'm1',
    courseName: 'Phase 1: Institutional Market Structure & Order Flow Foundations',
    completedLessons: 6,
    totalLessons: 8,
  },
  {
    id: 'm2',
    courseName: 'Phase 2: Liquidity Sweeps, Fair Value Gaps (FVG) & Premium/Discount Arrays',
    completedLessons: 4,
    totalLessons: 6,
  },
  {
    id: 'm3',
    courseName: 'Phase 3: CME Futures Volume Profile & Institutional COT Positioning',
    completedLessons: 2,
    totalLessons: 5,
  },
  {
    id: 'm4',
    courseName: 'Phase 4: Risk Architecture, Capital Preservation & High-Frequency Journaling',
    completedLessons: 3,
    totalLessons: 4,
  },
  {
    id: 'm5',
    courseName: 'Phase 5: Prop Firm 100K/200K Challenge Evaluation & Live Desk Certification',
    completedLessons: 1,
    totalLessons: 3,
  },
];

export const StudentCoachingModal: React.FC<StudentCoachingModalProps> = ({
  isOpen,
  onClose,
  onOpenMasterDesk,
  onOpenAuth,
}) => {
  const { user, token } = useAuth();
  const { t } = useTranslation();

  const isSuperAdmin = user?.role === 'super_admin' || user?.username === 'abuasad2299' || user?.email?.toLowerCase() === 'am29multibrand@gmail.com';
  const isStaff = isSuperAdmin || user?.role === 'admin' || user?.role === 'coach' || user?.role === 'employee';

  // Active view: 'coach' for mentors/staff, 'student' for syllabus/milestones
  const [viewMode, setViewMode] = useState<'student' | 'coach'>(isStaff ? 'coach' : 'student');

  // Student view state
  const [loading, setLoading] = useState(false);
  const [assignedCoach, setAssignedCoach] = useState<any>(null);
  const [trainingStatus, setTrainingStatus] = useState<string>('active_training');
  const [milestones, setMilestones] = useState<Milestone[]>(DEFAULT_MILESTONES);
  const [coachingNotes, setCoachingNotes] = useState<string>('');

  // Submit request / session state
  const [requestType, setRequestType] = useState<'1-on-1 Review' | 'Homework Review' | 'Prop Challenge Review'>('1-on-1 Review');
  const [topic, setTopic] = useState('');
  const [chartUrl, setChartUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Coach staff view state
  const [coachingStudents, setCoachingStudents] = useState<CoachingStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentForNote, setSelectedStudentForNote] = useState<CoachingStudent | null>(null);
  const [studentNoteDraft, setStudentNoteDraft] = useState('');
  const [studentStatusDraft, setStudentStatusDraft] = useState<string>('active_training');
  const [savingNote, setSavingNote] = useState(false);
  const [noteStatus, setNoteStatus] = useState<string | null>(null);

  // Sync viewMode on open
  useEffect(() => {
    if (isOpen) {
      if (isStaff) {
        setViewMode('coach');
      } else {
        setViewMode('student');
      }
    }
  }, [isOpen, isStaff]);

  // Fetch student coaching progress
  useEffect(() => {
    if (!isOpen || !token) return;

    let isMounted = true;
    setLoading(true);

    fetch('/api/user/coaching-progress', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.success) {
          if (data.assignedCoach) {
            setAssignedCoach(data.assignedCoach);
          } else {
            setAssignedCoach({
              fullName: 'Abu Asad Almansi',
              username: 'abuasad2299',
              specialty: 'Chief Quantitative & Institutional SMC Mentor',
              avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            });
          }
          if (data.trainingStatus) setTrainingStatus(data.trainingStatus);
          if (data.coachingNotes) setCoachingNotes(data.coachingNotes);
          if (data.trainingProgress && Array.isArray(data.trainingProgress) && data.trainingProgress.length > 0) {
            setMilestones(data.trainingProgress);
          }
        }
      })
      .catch(() => {
        // Fallback to defaults
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, token]);

  // Fetch coach roster if isStaff
  const fetchCoachingStudents = async () => {
    if (!token || !isStaff) return;
    setLoadingStudents(true);
    try {
      const res = await fetch('/api/admin/coaching-students', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.students)) {
          setCoachingStudents(data.students);
        }
      }
    } catch (err) {
      console.error('Failed to fetch coaching students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (isOpen && isStaff) {
      fetchCoachingStudents();
    }
  }, [isOpen, isStaff, token]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Coach action: Update milestone lesson count
  const handleUpdateMilestone = async (studentId: string, milestoneIndex: number, completedLessons: number) => {
    const student = coachingStudents.find(s => s.id === studentId);
    if (!student) return;

    const updatedMilestones = [...student.trainingProgress];
    if (updatedMilestones[milestoneIndex]) {
      updatedMilestones[milestoneIndex].completedLessons = completedLessons;
      if (completedLessons >= updatedMilestones[milestoneIndex].totalLessons) {
        updatedMilestones[milestoneIndex].status = 'completed';
      } else {
        updatedMilestones[milestoneIndex].status = 'in_progress';
      }
    }

    try {
      const res = await fetch(`/api/admin/coaching-students/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          trainingProgress: updatedMilestones,
        }),
      });
      if (res.ok) {
        setCoachingStudents(prev =>
          prev.map(s => s.id === studentId ? { ...s, trainingProgress: updatedMilestones } : s)
        );
      }
    } catch (err) {
      console.error('Failed to update student milestone:', err);
    }
  };

  // Coach action: Save note and status
  const handleSaveStudentNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForNote) return;

    setSavingNote(true);
    setNoteStatus(null);
    try {
      const res = await fetch(`/api/admin/coaching-students/${selectedStudentForNote.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          coachNotes: studentNoteDraft,
          trainingStatus: studentStatusDraft,
        }),
      });
      if (res.ok) {
        setNoteStatus('Coaching feedback saved successfully!');
        setCoachingStudents(prev =>
          prev.map(s =>
            s.id === selectedStudentForNote.id
              ? { ...s, coachingNotes: studentNoteDraft, trainingStatus: studentStatusDraft as any }
              : s
          )
        );
        setTimeout(() => {
          setSelectedStudentForNote(null);
          setNoteStatus(null);
        }, 1200);
      } else {
        const d = await res.json();
        setNoteStatus(`Error: ${d.error || 'Failed to save notes'}`);
      }
    } catch (err: any) {
      setNoteStatus(`Error: ${err.message}`);
    } finally {
      setSavingNote(false);
    }
  };

  // Student action: Submit review request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      if (onOpenAuth) {
        onClose();
        onOpenAuth();
      }
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/user/coaching-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestType,
          topic: topic.trim() || `${requestType} Request`,
          notes: notes.trim(),
          chartUrl: chartUrl.trim()
        })
      });
      if (res.ok) {
        setSubmitSuccess(true);
        setTopic('');
        setNotes('');
        setChartUrl('');
        setTimeout(() => setSubmitSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Failed to submit coaching request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const totalLessons = milestones.reduce((sum, m) => sum + m.totalLessons, 0);
  const completedLessons = milestones.reduce((sum, m) => sum + m.completedLessons, 0);
  const overallPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return createPortal(
    <div
      id="modal-coaching-desk"
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#090D17] border-t sm:border border-slate-700/90 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black overflow-hidden text-slate-100 flex flex-col max-h-[92vh] relative animate-in slide-in-from-bottom-8 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden mt-2.5 mb-1" />

        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 bg-[#0C1220] border-b border-slate-800 flex items-center justify-between gap-3 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2 rtl:pr-0 rtl:pl-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 p-[1px] shadow-md shadow-emerald-500/10 shrink-0">
              <div className="w-full h-full bg-[#0E1526] rounded-[11px] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight truncate">
                  SMTrading <span className="text-emerald-400">Coaching Desk</span>
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono-num font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Institutional Mentorship</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Student curriculum milestones, order flow progress, mentor notes & 1-on-1 reviews
              </p>
            </div>
          </div>

          {/* Right Actions: View Switcher / Admin Portal / Close */}
          <div className="flex items-center gap-2 shrink-0">
            {isStaff && onOpenMasterDesk && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMasterDesk();
                }}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title="Open Full Master Administration Suite"
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Suite</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="min-w-[42px] min-h-[42px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Close Coaching Desk"
              aria-label="Close Coaching Desk"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Staff Mode Switcher Tabs (Only for staff / coaches / am29multibrand) */}
        {isStaff && (
          <div className="bg-[#080C14] px-4 sm:px-6 py-2.5 border-b border-slate-800/90 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('coach')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'coach'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Master Coach Roster</span>
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 rounded text-[10px] font-mono">
                  {coachingStudents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('student')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'student'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Student Syllabus View</span>
              </button>
            </div>

            <button
              type="button"
              onClick={fetchCoachingStudents}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
              title="Refresh Roster"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStudents ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ==================================================== */}
          {/* STAFF / COACH ROSTER VIEW                            */}
          {/* ==================================================== */}
          {isStaff && viewMode === 'coach' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-emerald-950/30 via-[#0C1220] to-[#0A0E1A] p-4 rounded-2xl border border-emerald-500/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-sm">Master Coach & Student Progress Desk</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                      STAFF PRIVILEGE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Grade students, update completed lessons in the 5 SMC phases, and write direct 1-on-1 feedback notes.
                  </p>
                </div>
              </div>

              {/* Students Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coachingStudents.length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-slate-500 bg-[#0C1220] border border-slate-800 rounded-2xl">
                    {loadingStudents ? 'Loading student roster...' : 'No students currently enrolled in the coaching roster.'}
                  </div>
                ) : (
                  coachingStudents.map((student) => (
                    <div key={student.id} className="p-4 bg-[#0C1220] border border-slate-800 rounded-2xl space-y-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar user={{ username: student.username, fullName: student.fullName, avatarUrl: student.avatarUrl } as any} size="sm" />
                          <div>
                            <span className="font-bold text-white text-xs block">{student.fullName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">@{student.username}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          student.trainingStatus === 'graduated'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : student.trainingStatus === 'active_training'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {student.trainingStatus.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Milestone Progress List */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3 text-emerald-400" />
                          <span>Curriculum Milestones</span>
                        </span>
                        {student.trainingProgress?.map((m, idx) => {
                          const pct = Math.round((m.completedLessons / m.totalLessons) * 100);
                          return (
                            <div key={m.id || idx} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/70 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-200 truncate pr-2">{m.courseName}</span>
                                <span className="font-mono text-emerald-400 font-bold shrink-0">{m.completedLessons}/{m.totalLessons} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="flex items-center justify-between text-[10px] pt-0.5">
                                <span className="text-slate-400">Lesson Progress</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMilestone(student.id, idx, Math.max(0, m.completedLessons - 1))}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold cursor-pointer transition-colors"
                                    title="Decrement lesson"
                                  >
                                    -
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMilestone(student.id, idx, Math.min(m.totalLessons, m.completedLessons + 1))}
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold cursor-pointer transition-colors"
                                    title="Add completed lesson"
                                  >
                                    +1 Lesson
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Coach Notes & Action */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]" title={student.coachingNotes || 'No review notes yet.'}>
                          {student.coachingNotes ? `Note: ${student.coachingNotes}` : 'No review notes yet.'}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentForNote(student);
                            setStudentNoteDraft(student.coachingNotes || '');
                            setStudentStatusDraft(student.trainingStatus);
                          }}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit Notes & Status</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* STUDENT SYLLABUS & MILESTONES VIEW                   */}
          {/* ==================================================== */}
          {(!isStaff || viewMode === 'student') && (
            <div className="space-y-6">
              {/* Guest / Not logged in banner */}
              {!user && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0E1526] to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white text-sm">Join the Elite SMC Mentorship Program</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Log in to track your individualized curriculum, receive 1-on-1 chart reviews by Abu Asad Almansi, and earn institutional certification.
                    </p>
                  </div>
                  {onOpenAuth && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAuth();
                      }}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shrink-0 shadow-md shadow-emerald-500/20"
                    >
                      Sign In / Enroll Now
                    </button>
                  )}
                </div>
              )}

              {/* Student Status & Assigned Coach Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Overall Progress Box */}
                <div className="p-4 rounded-2xl bg-[#0C1220] border border-slate-800/80 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Curriculum Progress</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{completedLessons}/{totalLessons} Lessons</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className="text-3xl font-black text-white font-mono-num">{overallPercentage}%</span>
                      <span className="text-xs text-emerald-400 font-semibold">Institutional Mastery</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${overallPercentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Training Status</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {trainingStatus.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Assigned Coach Box */}
                <div className="p-4 rounded-2xl bg-[#0C1220] border border-slate-800/80 flex flex-col justify-between space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Senior Mentor</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Direct Line
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-amber-500/30 border border-emerald-500/40 p-0.5 shrink-0">
                      <div className="w-full h-full rounded-[14px] bg-slate-900 overflow-hidden flex items-center justify-center">
                        <UserAvatar
                          user={assignedCoach ? { fullName: assignedCoach.fullName, username: assignedCoach.username, avatarUrl: assignedCoach.avatarUrl } as any : { fullName: 'Abu Asad Almansi', username: 'abuasad2299' } as any}
                          size="md"
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate">
                        {assignedCoach?.fullName || 'Abu Asad Almansi'}
                      </h4>
                      <p className="text-xs text-emerald-400/90 font-medium truncate">
                        {assignedCoach?.specialty || 'Chief Quantitative & Institutional SMC Mentor'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        Order Flow Footprint, CME Futures & Prop Firm Certification
                      </p>
                    </div>
                  </div>

                  {/* Mentor Notes / Feedback */}
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Mentor Review Note:</span>
                    </div>
                    <p className="text-slate-300 italic text-[11px] leading-relaxed">
                      "{coachingNotes || 'Excellent progress on structural liquidity sweeps. Focus next on CME futures volume profiles before scheduling your live desk mock evaluation.'}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Curriculum Milestones List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span>SMC Institutional Curriculum Milestones</span>
                  </h3>
                  <span className="text-xs text-slate-400">Step-by-step institutional mastery</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {milestones.map((m, idx) => {
                    const pct = Math.round((m.completedLessons / m.totalLessons) * 100);
                    const isComplete = m.completedLessons >= m.totalLessons;

                    return (
                      <div
                        key={m.id || idx}
                        className="p-3.5 bg-[#0C1220] border border-slate-800/90 rounded-xl hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isComplete ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {isComplete ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold font-mono">{idx + 1}</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-200 block">{m.courseName}</span>
                            <div className="flex items-center gap-3 mt-1.5">
                              <div className="w-36 bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
                                <div
                                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-mono text-emerald-400 font-bold">{m.completedLessons}/{m.totalLessons} lessons ({pct}%)</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isComplete ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {isComplete ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Request 1-on-1 Review or Submit Trade Homework */}
              <div className="p-4 sm:p-5 bg-[#0C1220] border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <span>Request 1-on-1 Review or Submit Setup</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Submit a trade journal entry, order flow homework, or request a live 1-on-1 Zoom coaching session.
                    </p>
                  </div>
                </div>

                {submitSuccess && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Your coaching review request has been submitted to your mentor. You will receive review notes shortly.</span>
                  </div>
                )}

                <form onSubmit={handleSubmitRequest} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['1-on-1 Review', 'Homework Review', 'Prop Challenge Review'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setRequestType(type)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                          requestType === type
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-xs'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                        Topic / Currency Pair
                      </label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Gold XAUUSD FVG mitigation, CME ES order flow"
                        className="w-full bg-[#080C14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                        TradingView / Chart Screenshot Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={chartUrl}
                        onChange={(e) => setChartUrl(e.target.value)}
                        placeholder="https://www.tradingview.com/x/..."
                        className="w-full bg-[#080C14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                      Notes & Questions for Your Mentor
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Explain your trade thesis, entry reason, risk parameters, or questions on liquidity sweeps..."
                      className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Submitting to Mentor...' : 'Submit to Coaching Desk'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>

        {/* Coach Inline Note Editor Modal */}
        {selectedStudentForNote && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <div className="bg-[#0C1220] border border-slate-700 rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Edit className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-sm">
                    Coaching Feedback for {selectedStudentForNote.fullName}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedStudentForNote(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {noteStatus && (
                <div className={`p-2.5 rounded-xl text-xs ${noteStatus.startsWith('Error') ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}`}>
                  {noteStatus}
                </div>
              )}

              <form onSubmit={handleSaveStudentNote} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                    Student Training Status
                  </label>
                  <select
                    value={studentStatusDraft}
                    onChange={(e) => setStudentStatusDraft(e.target.value)}
                    className="w-full bg-[#080C14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="active_training">Active Training</option>
                    <option value="mentorship_pending">Mentorship Pending</option>
                    <option value="graduated">Graduated / Certified</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                    Coach Review Notes & Recommendations
                  </label>
                  <textarea
                    rows={4}
                    value={studentNoteDraft}
                    onChange={(e) => setStudentNoteDraft(e.target.value)}
                    placeholder="Enter student review notes, chart analysis feedback, or recommendations..."
                    className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentForNote(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingNote}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{savingNote ? 'Saving...' : 'Save Coaching Feedback'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};

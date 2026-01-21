import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Home, 
  BarChart2, 
  Settings as SettingsIcon, 
  Plus, 
  List, 
  Bell, 
  Moon, 
  Sun,
  Trash2,
  Edit2,
  CheckCircle,
  TrendingUp,
  Award,
  Download,
  Upload,
  FileText,
  AlertTriangle,
  ChevronLeft,
  Filter,
  Calendar,
  Tag,
  PauseCircle,
  Briefcase,
  Palette,
  Zap,
  GraduationCap,
  RefreshCw,
  Archive,
  MoreVertical,
  Lock
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, LineChart, Line
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Habit, 
  HabitLog, 
  Notification, 
  ViewState, 
  Theme, 
  COLORS, 
  ICONS,
  HabitUnit,
  HabitCategory,
  CATEGORIES,
  Badge
} from './types';
import { 
  formatDateKey, 
  getDayName, 
  calculateStreak, 
  getWeeklyProgress, 
  getRandomQuote,
  getCompletionPercentage,
  checkBadges,
  getGoals,
  getWeeklyStatus,
  countActiveDaysInMonth
} from './utils';
import Confetti from './components/Confetti';
import ProgressModal from './components/ProgressModal';

// --- Icons Map ---
const ICON_MAP: Record<string, any> = {
  target: CheckCircle,
  book: List,
  activity: TrendingUp,
  droplet: Award, 
  moon: Moon,
  dumbbell: BarChart2,
  music: Bell,
  heart: Award,
  brain: SettingsIcon,
  coffee: Sun,
  briefcase: Briefcase,
  palette: Palette,
  zap: Zap,
  education: GraduationCap
};

const CATEGORY_COLORS: Record<string, string> = {
  'Sağlık': 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  'Kariyer': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  'Maneviyat': 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  'Sanat': 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  'Eğitim': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
  'Diğer': 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
};

const App: React.FC = () => {
  // --- State ---
  const [theme, setTheme] = useState<Theme>('dark');
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Stats View State
  const [statsTab, setStatsTab] = useState<'summary' | 'detailed' | 'history'>('summary');
  const [detailSubTab, setDetailSubTab] = useState<'time' | 'habit' | 'compare' | 'category'>('time');
  const [statsFilter, setStatsFilter] = useState<string>('all');
  const statsRef = useRef<HTMLDivElement>(null);

  // Gamification
  const [badges, setBadges] = useState<Badge[]>([]);

  // Modals & Editing
  const [activeHabitForProgress, setActiveHabitForProgress] = useState<Habit | null>(null);
  const [progressDate, setProgressDate] = useState<string>(formatDateKey(new Date()));
  const [habitToEdit, setHabitToEdit] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    desc: string;
    goal: number;
    customWeeklyGoal?: number;
    customMonthlyGoal?: number;
    unit: HabitUnit;
    category: HabitCategory;
    days: number[];
    color: string;
    icon: string;
  }>({
    title: '',
    desc: '',
    goal: 1,
    unit: 'sayfa',
    category: 'Diğer',
    days: [1, 2, 3, 4, 5],
    color: COLORS[0],
    icon: 'target'
  });

  // --- Effects ---
  useEffect(() => {
    const savedHabits = localStorage.getItem('g_habits');
    const savedLogs = localStorage.getItem('g_logs');
    const savedNotifs = localStorage.getItem('g_notifs');
    const savedTheme = localStorage.getItem('g_theme') as Theme;

    if (savedHabits) setHabits(JSON.parse(savedHabits));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('g_habits', JSON.stringify(habits));
    localStorage.setItem('g_logs', JSON.stringify(logs));
    localStorage.setItem('g_notifs', JSON.stringify(notifications));
    localStorage.setItem('g_theme', theme);
    
    // Check badges
    const currentBadges = checkBadges(habits, logs);
    currentBadges.forEach(b => {
        if (b.unlocked && !badges.find(old => old.id === b.id)?.unlocked) {
            triggerNotification('achievement', 'Rozet Kazanıldı!', `${b.title} rozetini kazandın!`);
        }
    });
    setBadges(currentBadges);

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [habits, logs, notifications, theme]);

  // --- Actions ---

  const triggerNotification = (type: Notification['type'], title: string, msg: string) => {
    const date = formatDateKey(new Date());
    setNotifications(prev => [{
      id: Date.now().toString(),
      type,
      title,
      msg,
      date,
      read: false
    }, ...prev]);
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const getLog = (hid: string, date: string) => logs.find(l => l.hid === hid && l.date === date);

  const updateProgress = (hid: string, newVal: number, dateStr: string, status: 'done' | 'skip' | 'fail' = 'done') => {
    const habit = habits.find(h => h.id === hid);
    
    setLogs(prev => {
      const existing = prev.find(l => l.hid === hid && l.date === dateStr);
      const logData: HabitLog = { 
          id: existing ? existing.id : Date.now().toString(), 
          hid, 
          date: dateStr, 
          val: newVal, 
          status,
          // CRITICAL: Save current habit goal as snapshot to preserve history even if goal changes later
          targetSnapshot: existing?.targetSnapshot || habit?.goal || 0
      };

      if (existing) {
        return prev.map(l => l.hid === hid && l.date === dateStr ? logData : l);
      }
      return [...prev, logData];
    });

    const isToday = dateStr === formatDateKey(new Date());
    if (isToday && status === 'done' && habit && newVal >= habit.goal) {
      triggerConfetti();
    }
    
    if (habit && isToday) checkRisk(habit, newVal);
  };

  const deleteLog = (logId: string) => {
      if(window.confirm('Bu kaydı silmek istediğine emin misin?')) {
          setLogs(prev => prev.filter(l => l.id !== logId));
      }
  };

  const checkRisk = (habit: Habit, todayVal: number) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (habit.days.includes(yesterday.getDay())) {
        const yLog = getLog(habit.id, formatDateKey(yesterday));
        const yVal = yLog ? yLog.val : 0;
        const yTarget = yLog?.targetSnapshot ?? habit.goal;
        
        if (todayVal < habit.goal && yVal < yTarget) {
            const existingRisk = notifications.find(n => n.type === 'risk' && n.date === formatDateKey(today));
            if (!existingRisk) {
                triggerNotification('risk', 'Dikkat!', `${habit.title} hedefinin 2 gündür altındasın.`);
            }
        }
    }
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
  };

  const saveHabit = () => {
    if (!formData.title) return;
    
    if (habitToEdit) {
      // Logic for editing: Don't change creation date, don't allow changing category/unit easily if consistent data needed
      setHabits(prev => prev.map(h => h.id === habitToEdit ? { 
          ...h, 
          ...formData, 
          // Preserve critical fields
          unit: h.unit, 
          category: h.category,
          id: h.id 
      } : h));
    } else {
      const newHabit: Habit = {
        id: Date.now().toString(),
        ...formData,
        created: new Date().toISOString(),
        active: true
      };
      setHabits(prev => [...prev, newHabit]);
    }
    setView(ViewState.DASHBOARD);
    setHabitToEdit(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      desc: '',
      goal: 1,
      customWeeklyGoal: undefined,
      customMonthlyGoal: undefined,
      unit: 'sayfa',
      category: 'Diğer',
      days: [1, 2, 3, 4, 5],
      color: COLORS[0],
      icon: 'target'
    });
  };

  const deleteHabit = (id: string) => {
    if (window.confirm('Bu alışkanlığı silmek (arşivlemek) istediğine emin misin?')) {
      setHabits(prev => prev.map(h => h.id === id ? { ...h, archived: true, active: false } : h));
    }
  };

  const handleEditClick = (h: Habit) => {
    setHabitToEdit(h.id);
    setFormData({
      title: h.title,
      desc: h.desc || '',
      goal: h.goal,
      customWeeklyGoal: h.customWeeklyGoal,
      customMonthlyGoal: h.customMonthlyGoal,
      unit: h.unit,
      category: h.category,
      days: h.days,
      color: h.color,
      icon: h.icon
    });
    setView(ViewState.ADD_HABIT);
  };

  const handleOpenProgress = (h: Habit, dateStr: string = formatDateKey(new Date())) => {
      setProgressDate(dateStr);
      setActiveHabitForProgress(h);
  };

  const generatePDF = async () => {
    const input = statsRef.current;
    if (input) {
      try {
        const originalStyle = input.style.cssText;
        input.style.width = '800px'; 
        
        const canvas = await html2canvas(input, {
          scale: 2,
          backgroundColor: theme === 'dark' ? '#0f0f1a' : '#fffbf5',
          useCORS: true
        });
        
        input.style.cssText = originalStyle;

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text("Gayret - Istatistik Raporu", 10, 15);
        pdf.setFontSize(10);
        pdf.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 10, 22);

        pdf.addImage(imgData, 'PNG', 0, 30, pdfWidth, Math.min(imgHeight, 250));
        pdf.save(`gayret_rapor_${formatDateKey(new Date())}.pdf`);
      } catch (err) {
        console.error(err);
        alert("PDF oluşturulamadı.");
      }
    }
  };

  // --- Views ---

  const renderDashboard = () => {
    const today = new Date();
    const dateKey = formatDateKey(today);
    const dayOfWeek = today.getDay();
    
    const activeHabits = habits.filter(h => !h.archived);
    // Include habits that are scheduled OR have a log (bonus record)
    const displayHabits = activeHabits.filter(h => h.active && (h.days.includes(dayOfWeek) || getLog(h.id, dateKey)));

    const weeklyProgress = getWeeklyProgress(activeHabits, logs);
    
    return (
      <div className="p-5 pb-24 animate-fade-in">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
            <div>
                 <div className="text-xl font-bold font-sans text-slate-800 dark:text-white">
                    {today.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                    {today.getHours() < 12 ? 'Günaydın!' : today.getHours() < 18 ? 'İyi günler!' : 'İyi akşamlar!'}
                </div>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-primary p-1">
                <div className="w-full h-full rounded-full bg-surface-light dark:bg-white/10 flex items-center justify-center text-xs font-bold text-primary">
                    %{weeklyProgress}
                </div>
            </div>
        </div>

        {/* Motivation Card */}
        <div className="relative p-5 mb-6 bg-surface-light dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>
          <p className="text-center italic text-slate-600 dark:text-slate-300 font-serif text-lg">"{getRandomQuote()}"</p>
        </div>

        {/* Today's Habits */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <CheckCircle size={20} className="text-primary" /> Bugünkü Hedefler
          </h2>
          <button onClick={() => setView(ViewState.STATS)} className="text-sm text-primary font-medium">Raporlar</button>
        </div>

        <div className="flex flex-col gap-3">
          {displayHabits.length === 0 ? (
            <div className="text-center py-12 bg-surface-light dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 border-dashed">
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">Boş Gün</h3>
              <p className="text-slate-500 dark:text-slate-500 mb-4">Bugün planlı bir alışkanlık yok.</p>
              <button onClick={() => setView(ViewState.ADD_HABIT)} className="px-6 py-2 bg-primary text-white rounded-lg font-medium">Alışkanlık Ekle</button>
            </div>
          ) : (
            displayHabits.map(h => {
              const log = getLog(h.id, dateKey);
              const currentVal = log ? log.val : 0;
              const isSkipped = log?.status === 'skip';
              const dailyTarget = log?.targetSnapshot ?? h.goal;
              const { isWeeklyMet } = getWeeklyStatus(h, logs);
              const isRecovered = !isSkipped && currentVal < dailyTarget && isWeeklyMet;
              const pct = getCompletionPercentage(h, currentVal, dailyTarget);
              const isDone = pct >= 100 || isSkipped || isRecovered;
              const IconComp = ICON_MAP[h.icon] || ICON_MAP['target'];

              return (
                <div 
                  key={h.id}
                  onClick={() => handleOpenProgress(h)}
                  className={`relative p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-surface-light dark:bg-white/5 cursor-pointer transition-all active:scale-[0.98] overflow-hidden ${isDone ? 'opacity-80' : ''}`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <IconComp size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800 dark:text-white">{h.title}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${CATEGORY_COLORS[h.category]}`}>{h.category}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {isSkipped ? (
                             <span className="flex items-center gap-1 text-slate-400 font-medium"><PauseCircle size={12}/> Mola Verildi</span>
                        ) : isRecovered ? (
                             <span className="flex items-center gap-1 text-emerald-500 font-medium"><RefreshCw size={12}/> Haftalık Hedefle Kurtarıldı</span>
                        ) : (
                            <><span className="font-medium text-primary">{currentVal}</span> / {dailyTarget} {h.unit}</>
                        )}
                      </div>
                    </div>
                    {isDone && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSkipped ? 'bg-slate-400' : isRecovered ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                        {isSkipped ? <PauseCircle size={16} className="text-white"/> : <CheckCircle size={16} className="text-white" />}
                      </div>
                    )}
                  </div>
                  
                  {!isSkipped && (
                    <div className="absolute bottom-0 left-0 h-1 bg-slate-100 dark:bg-white/5 w-full">
                        <div 
                        className="h-full transition-all duration-500" 
                        style={{ width: `${pct}%`, backgroundColor: h.color }}
                        ></div>
                    </div>
                  )}
                  
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: h.color }}></div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderStats = () => {
    const activeHabits = habits.filter(h => !h.archived);
    const today = new Date();
    
    // --- Sub Renderers ---

    const renderSummary = () => {
        let totalWeight = 0;
        let weightedSum = 0;
        
        activeHabits.forEach(h => {
             const { weekly } = getGoals(h);
             const { totalVal } = getWeeklyStatus(h, logs);
             const wPct = weekly > 0 ? Math.min(100, (totalVal / weekly) * 100) : 0;
             weightedSum += wPct;
             totalWeight += 1;
        });
        const overallScore = totalWeight === 0 ? 0 : Math.round(weightedSum / totalWeight);

        const heatmapDays = Array.from({length: 30}, (_, i) => {
            const d = new Date();
            d.setDate(today.getDate() - (29 - i));
            return { date: d, key: formatDateKey(d) };
        });

        return (
            <div className="space-y-6 animate-slide-up">
                 {/* Score Card */}
                 <div className="bg-surface-light dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
                     <div>
                         <div className="text-sm text-slate-500 mb-1">Genel Başarı Skoru</div>
                         <div className="text-4xl font-bold text-primary">{overallScore}</div>
                     </div>
                     <div className="w-16 h-16">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={[{value: overallScore}, {value: 100-overallScore}]} innerRadius={20} outerRadius={30} dataKey="value" stroke="none">
                                    <Cell fill={COLORS[0]} />
                                    <Cell fill="#334155" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                     </div>
                 </div>

                 {/* Weekly Summary */}
                 <div className="bg-surface-light dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10">
                     <h3 className="font-bold text-slate-800 dark:text-white mb-4">Haftalık Bakış</h3>
                     <div className="grid grid-cols-7 gap-1">
                         {Array.from({length: 7}).map((_, i) => {
                             const d = new Date();
                             const currentDay = d.getDay(); 
                             const diff = d.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
                             d.setDate(diff + i);
                             const k = formatDateKey(d);
                             const isFuture = d > new Date();

                             let dayScore = 0;
                             let activeCount = 0;
                             
                             activeHabits.forEach(h => {
                                 if(h.days.includes(d.getDay()) && new Date(h.created) <= d) {
                                     activeCount++;
                                     const l = getLog(h.id, k);
                                     const target = l?.targetSnapshot ?? h.goal;
                                     if(l && (l.val >= target || l.status === 'skip')) dayScore++;
                                 }
                             });
                             
                             let bgClass = 'bg-slate-100 dark:bg-slate-800';
                             if (!isFuture && activeCount > 0) {
                                 const ratio = dayScore / activeCount;
                                 if (ratio === 1) bgClass = 'bg-emerald-500';
                                 else if (ratio > 0.5) bgClass = 'bg-emerald-500/60';
                                 else if (ratio > 0) bgClass = 'bg-emerald-500/30';
                                 else bgClass = 'bg-red-500/30';
                             }

                             return (
                                 <div key={i} className="flex flex-col items-center gap-1">
                                     <div className={`w-full aspect-square rounded-md ${bgClass}`}></div>
                                     <span className="text-[10px] text-slate-400">{getDayName(d.getDay())[0]}</span>
                                 </div>
                             )
                         })}
                     </div>
                 </div>

                 {/* Heatmap */}
                 <div className="bg-surface-light dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4">Aylık Isı Haritası</h3>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                        {heatmapDays.map((day, i) => {
                             let intensity = 0; 
                             let totalPct = 0;
                             let count = 0;
                             activeHabits.forEach(h => {
                                 if (h.days.includes(day.date.getDay()) && new Date(h.created) <= day.date) {
                                     count++;
                                     const log = getLog(h.id, day.key);
                                     const target = log?.targetSnapshot ?? h.goal;
                                     if(log?.status === 'skip') totalPct += 100;
                                     else if (log) totalPct += Math.min(100, (log.val / target) * 100);
                                 }
                             });
                             
                             if (count > 0) {
                                 const avg = totalPct / count;
                                 if (avg === 0) intensity = 0;
                                 else if (avg < 40) intensity = 1;
                                 else if (avg < 70) intensity = 2;
                                 else if (avg < 90) intensity = 3;
                                 else intensity = 4;
                             } else {
                                 intensity = -1;
                             }

                             const colors = {
                                 '-1': 'bg-slate-100 dark:bg-white/5',
                                 '0': 'bg-slate-200 dark:bg-slate-700',
                                 '1': 'bg-orange-200 dark:bg-orange-900',
                                 '2': 'bg-orange-300 dark:bg-orange-700',
                                 '3': 'bg-orange-400 dark:bg-orange-600',
                                 '4': 'bg-orange-500 dark:bg-orange-500'
                             };

                             return (
                                 <div 
                                    key={i} 
                                    className={`w-8 h-8 rounded-md ${colors[String(intensity) as keyof typeof colors]}`}
                                    title={day.key}
                                 />
                             );
                        })}
                    </div>
                 </div>
            </div>
        );
    };

    const renderDetailed = () => {
        return (
            <div className="space-y-6 animate-slide-up">
                <div className="flex p-1 bg-surface-light dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 overflow-x-auto">
                    {[
                        {id: 'time', label: 'Zaman'},
                        {id: 'habit', label: 'Alışkanlık'},
                        {id: 'compare', label: 'Kıyasla'},
                        {id: 'category', label: 'Kategori'}
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setDetailSubTab(t.id as any)}
                            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                                detailSubTab === t.id 
                                ? 'bg-white dark:bg-surface-dark shadow text-primary' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {detailSubTab === 'time' && (
                    <div className="bg-surface-light dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Son 7 Günlük Performans</h3>
                         <div className="h-64">
                             <ResponsiveContainer width="100%" height="100%">
                                 <AreaChart data={Array.from({length: 7}).map((_, i) => {
                                     const d = new Date();
                                     d.setDate(today.getDate() - (6-i));
                                     const k = formatDateKey(d);
                                     let total = 0;
                                     let count = 0;
                                     activeHabits.forEach(h => {
                                         if(h.days.includes(d.getDay()) && new Date(h.created) <= d) {
                                             count++;
                                             const l = getLog(h.id, k);
                                             const target = l?.targetSnapshot ?? h.goal;
                                             if(l) total += Math.min(100, (l.val/target)*100);
                                         }
                                     });
                                     return { name: getDayName(d.getDay()), val: count > 0 ? Math.round(total/count) : 0 };
                                 })}>
                                     <defs>
                                         <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                                             <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                                             <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                         </linearGradient>
                                     </defs>
                                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                     <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                     <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                     <Area type="monotone" dataKey="val" stroke="#f97316" fillOpacity={1} fill="url(#colorPerf)" />
                                 </AreaChart>
                             </ResponsiveContainer>
                         </div>
                    </div>
                )}

                {detailSubTab === 'habit' && (
                    <div className="bg-surface-light dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10">
                        <div className="mb-4">
                            <select 
                                className="w-full bg-slate-100 dark:bg-surface-dark p-2 rounded-lg border-none focus:ring-1 focus:ring-primary text-sm"
                                onChange={(e) => setStatsFilter(e.target.value)}
                                value={statsFilter}
                            >
                                <option value="all">Bir Alışkanlık Seçin</option>
                                {activeHabits.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}
                            </select>
                        </div>
                        {statsFilter !== 'all' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-100 dark:bg-surface-dark rounded-xl">
                                    <div className="text-xs text-slate-500">Mevcut Seri</div>
                                    <div className="text-xl font-bold text-primary">
                                        {calculateStreak(habits.find(h=>h.id===statsFilter)!, logs)} Gün
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-100 dark:bg-surface-dark rounded-xl">
                                    <div className="text-xs text-slate-500">Bu Ayki Hedef</div>
                                    <div className="text-xl font-bold text-slate-800 dark:text-white">
                                        {getGoals(habits.find(h=>h.id===statsFilter)!).monthly}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-10">Analiz için yukarıdan bir alışkanlık seçin.</p>
                        )}
                    </div>
                )}

                {detailSubTab === 'compare' && (
                    <div className="bg-surface-light dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Radar Analizi</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={activeHabits.map(h => {
                                    const { weekly } = getGoals(h);
                                    const { totalVal } = getWeeklyStatus(h, logs);
                                    return {
                                        subject: h.title.substring(0, 10),
                                        A: weekly > 0 ? Math.min(100, (totalVal / weekly) * 100) : 0,
                                        fullMark: 100
                                    }
                                })}>
                                    <PolarGrid stroke="#334155" opacity={0.3} />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Haftalık Başarı" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {detailSubTab === 'category' && (
                    <div className="bg-surface-light dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Kategori Dağılımı</h3>
                        <div className="space-y-4">
                            {CATEGORIES.map(cat => {
                                const catHabits = activeHabits.filter(h => h.category === cat);
                                if (catHabits.length === 0) return null;
                                
                                let totalPct = 0;
                                catHabits.forEach(h => {
                                    const { weekly } = getGoals(h);
                                    const { totalVal } = getWeeklyStatus(h, logs);
                                    if(weekly > 0) totalPct += Math.min(100, (totalVal/weekly)*100);
                                });
                                const avg = Math.round(totalPct / catHabits.length);

                                return (
                                    <div key={cat}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{cat}</span>
                                            <span className="text-slate-500">%{avg}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary" style={{width: `${avg}%`}}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                 )}
            </div>
        );
    };

    const renderHistory = () => (
        <div className="space-y-4 animate-slide-up">
            <div className="flex justify-between items-center bg-surface-light dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                 <h3 className="font-bold text-slate-800 dark:text-white">Kayıt Geçmişi</h3>
                 <button className="text-xs text-primary font-medium" onClick={() => {
                     const headers = ["Date", "Habit", "Value", "TargetSnapshot", "Status"];
                     const rows = logs.map(l => {
                         const h = habits.find(x => x.id === l.hid);
                         return [l.date, h?.title || 'Deleted', l.val, l.targetSnapshot || 'N/A', l.status || 'done'].join(",");
                     });
                     const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
                     const encodedUri = encodeURI(csvContent);
                     const link = document.createElement("a");
                     link.setAttribute("href", encodedUri);
                     link.setAttribute("download", "gayret_logs.csv");
                     document.body.appendChild(link);
                     link.click();
                 }}>CSV İndir</button>
            </div>
            
            <div className="bg-surface-light dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-white/5 text-slate-500">
                        <tr>
                            <th className="p-3 font-medium">Tarih</th>
                            <th className="p-3 font-medium">Alışkanlık</th>
                            <th className="p-3 font-medium text-right">Değer</th>
                            <th className="p-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {logs.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50).map(log => {
                            const h = habits.find(x => x.id === log.hid);
                            return (
                                <tr 
                                    key={log.id} 
                                    onClick={() => h && handleOpenProgress(h, log.date)}
                                    className="hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <td className="p-3 text-slate-500">{log.date}</td>
                                    <td className="p-3 font-medium text-slate-800 dark:text-white">{h?.title || 'Silinmiş'}</td>
                                    <td className="p-3 text-right text-primary">
                                        {log.val} {h?.unit}
                                        <span className="block text-[10px] text-slate-400">Hedef: {log.targetSnapshot}</span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
      <div className="p-5 pb-24 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView(ViewState.DASHBOARD)} className="p-2 bg-surface-light dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            <ChevronLeft size={20} className="text-slate-700 dark:text-slate-300" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Raporlar</h1>
        </div>

        <div className="flex p-1 bg-surface-light dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 mb-6">
            <button onClick={() => setStatsTab('summary')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${statsTab === 'summary' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-slate-500'}`}>Özet</button>
            <button onClick={() => setStatsTab('detailed')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${statsTab === 'detailed' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-slate-500'}`}>Detaylı</button>
            <button onClick={() => setStatsTab('history')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${statsTab === 'history' ? 'bg-white dark:bg-surface-dark shadow text-primary' : 'text-slate-500'}`}>Geçmiş</button>
        </div>
        
        <div ref={statsRef} className="bg-bg-light dark:bg-bg-dark">
           {statsTab === 'summary' && renderSummary()}
           {statsTab === 'detailed' && renderDetailed()}
           {statsTab === 'history' && renderHistory()}
        </div>

        <div className="mt-6 flex justify-center">
             <button onClick={generatePDF} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                 <Download size={16} /> PDF Olarak İndir
             </button>
        </div>
      </div>
    );
  };

    const renderHabitList = () => {
        const activeHabits = habits.filter(h => !h.archived);
        return (
          <div className="p-5 pb-24 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setView(ViewState.DASHBOARD)} className="p-2 bg-surface-light dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                <ChevronLeft size={20} className="text-slate-700 dark:text-slate-300" />
              </button>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Alışkanlıklarım</h1>
            </div>
    
            {activeHabits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-400">
                  <List size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Listen Boş</h3>
                <button 
                  onClick={() => { resetForm(); setView(ViewState.ADD_HABIT); }} 
                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-colors"
                >
                  Hemen Başla
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {activeHabits.map(h => {
                  const IconComp = ICON_MAP[h.icon] || ICON_MAP['target'];
                  return (
                    <div key={h.id} className="p-4 bg-surface-light dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300" style={{ color: h.color }}>
                        <IconComp size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-800 dark:text-white truncate">{h.title}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[h.category]}`}>{h.category}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>{h.goal} {h.unit}/gün</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(h); }} className="p-2 text-slate-400 hover:text-blue-500"><Edit2 size={18} /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteHabit(h.id); }} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/10">
               <div className="flex items-center justify-between mb-4">
                   <h3 className="font-bold text-slate-800 dark:text-white">Arşivlenenler</h3>
               </div>
               {habits.some(h => h.archived) && (
                   <div className="space-y-2 opacity-60">
                       {habits.filter(h => h.archived).map(h => (
                           <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-white/5">
                               <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{h.title}</span>
                               <button 
                                   onClick={() => setHabits(prev => prev.map(x => x.id === h.id ? {...x, archived: false, active: true} : x))}
                                   className="text-xs text-primary font-medium hover:underline"
                               >
                                   Geri Al
                               </button>
                           </div>
                       ))}
                   </div>
               )}
            </div>
          </div>
        );
      };

    const renderAddHabit = () => (
        <div className="p-5 pb-24 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView(ViewState.DASHBOARD)} className="p-2 bg-surface-light dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
              <ChevronLeft size={20} className="text-slate-700 dark:text-slate-300" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{habitToEdit ? 'Düzenle' : 'Yeni Alışkanlık'}</h1>
          </div>
    
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2">Başlık</label>
              <input 
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Örn: Kitap Okuma"
                className="w-full p-4 rounded-xl bg-surface-light dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
    
            <div>
                <label className="block text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                    Kategori {habitToEdit && <Lock size={12} className="text-primary"/>}
                </label>
                <div className={`flex flex-wrap gap-2 ${habitToEdit ? 'opacity-50 pointer-events-none' : ''}`}>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFormData({...formData, category: cat})}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                formData.category === cat 
                                ? 'bg-primary text-white' 
                                : 'bg-surface-light dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/10'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
    
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2">Açıklama</label>
              <textarea 
                value={formData.desc}
                onChange={e => setFormData({...formData, desc: e.target.value})}
                placeholder="Açıklama giriniz..."
                rows={2}
                className="w-full p-4 rounded-xl bg-surface-light dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>
    
            <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Hedefler</label>
                <div className="bg-surface-light dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">GÜNLÜK</span>
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                value={formData.goal}
                                onChange={e => setFormData({...formData, goal: Number(e.target.value)})}
                                className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-surface-dark border-none focus:ring-1 focus:ring-primary text-slate-800 dark:text-white"
                            />
                            <div className="relative">
                                <select 
                                    value={formData.unit}
                                    disabled={!!habitToEdit}
                                    onChange={e => setFormData({...formData, unit: e.target.value as HabitUnit})}
                                    className={`w-24 p-3 rounded-xl bg-slate-50 dark:bg-surface-dark border-none text-slate-800 dark:text-white text-sm appearance-none ${habitToEdit ? 'opacity-70' : ''}`}
                                >
                                    <option value="sayfa">Sayfa</option>
                                    <option value="dakika">Dk</option>
                                    <option value="adet">Adet</option>
                                    <option value="kez">Kez</option>
                                </select>
                                {habitToEdit && <Lock size={12} className="absolute right-2 top-4 text-slate-400 pointer-events-none"/>}
                            </div>
                        </div>
                    </div>
    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">HAFTALIK</span>
                                {formData.customWeeklyGoal === undefined && <span className="text-[10px] text-primary italic">Oto</span>}
                            </div>
                            <input 
                                type="number" 
                                placeholder={`Auto: ${formData.goal * formData.days.length}`}
                                value={formData.customWeeklyGoal || ''}
                                onChange={e => setFormData({...formData, customWeeklyGoal: e.target.value ? Number(e.target.value) : undefined})}
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-surface-dark border-none focus:ring-1 focus:ring-primary text-slate-800 dark:text-white placeholder:text-slate-400"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                 <span className="text-xs font-bold text-slate-700 dark:text-slate-300">AYLIK</span>
                                 {formData.customMonthlyGoal === undefined && <span className="text-[10px] text-primary italic">Oto</span>}
                            </div>
                            <input 
                                type="number" 
                                placeholder="Auto"
                                value={formData.customMonthlyGoal || ''}
                                onChange={e => setFormData({...formData, customMonthlyGoal: e.target.value ? Number(e.target.value) : undefined})}
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-surface-dark border-none focus:ring-1 focus:ring-primary text-slate-800 dark:text-white placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Günler</label>
                <div className="flex justify-between gap-1">
                    {[1,2,3,4,5,6,0].map(d => (
                        <button
                            key={d}
                            onClick={() => {
                                const days = formData.days.includes(d) 
                                    ? formData.days.filter(x => x !== d)
                                    : [...formData.days, d];
                                setFormData({...formData, days});
                            }}
                            className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${
                                formData.days.includes(d) 
                                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                : 'bg-surface-light dark:bg-white/5 text-slate-400 border border-slate-200 dark:border-white/10'
                            }`}
                        >
                            {getDayName(d)}
                        </button>
                    ))}
                </div>
            </div>
    
            <div>
                <label className="block text-sm font-medium text-slate-500 mb-2">Görünüm</label>
                <div className="flex gap-2 mb-2">
                    {COLORS.slice(0,5).map(c => (
                        <button
                            key={c}
                            onClick={() => setFormData({...formData, color: c})}
                            className={`flex-1 h-8 rounded-lg transition-transform ${formData.color === c ? 'scale-110 ring-2 ring-offset-1 ring-slate-300 dark:ring-slate-600' : ''}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
                 <div className="grid grid-cols-5 gap-2">
                    {ICONS.slice(0,5).map(i => {
                        const IconComp = ICON_MAP[i] || ICON_MAP['target'];
                        return (
                            <button
                                key={i}
                                onClick={() => setFormData({...formData, icon: i})}
                                className={`h-10 rounded-lg flex items-center justify-center transition-all ${
                                    formData.icon === i 
                                    ? 'bg-primary text-white' 
                                    : 'bg-surface-light dark:bg-white/5 text-slate-400 border border-slate-200 dark:border-white/10'
                                }`}
                            >
                                <IconComp size={20} />
                            </button>
                        );
                    })}
                </div>
            </div>
    
            <button 
                onClick={saveHabit}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all transform active:scale-[0.99] mt-4"
            >
                {habitToEdit ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      );

    const renderNotifications = () => (
        <div className="p-5 pb-24 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setView(ViewState.DASHBOARD)} className="p-2 bg-surface-light dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <ChevronLeft size={20} className="text-slate-700 dark:text-slate-300" />
                </button>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Bildirimler</h1>
            </div>
            
            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <Bell size={48} className="mb-4 opacity-20" />
                    <p>Henüz bildirim yok.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map(n => (
                        <div key={n.id} className={`p-4 rounded-2xl border ${n.read ? 'bg-surface-light dark:bg-white/5 border-slate-200 dark:border-white/10' : 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20'}`}>
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-slate-800 dark:text-white">{n.title}</h3>
                                <span className="text-[10px] text-slate-400">{n.date}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{n.msg}</p>
                        </div>
                    ))}
                    <button 
                        onClick={() => setNotifications([])}
                        className="w-full py-3 mt-4 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                        Tümünü Temizle
                    </button>
                </div>
            )}
        </div>
    );

    const renderSettings = () => (
        <div className="p-5 pb-24 animate-slide-up">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Ayarlar</h1>
            
            <div className="space-y-6">
                <div className="bg-surface-light dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                                {theme === 'dark' ? <Moon size={20}/> : <Sun size={20}/>}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 dark:text-white">Görünüm</div>
                                <div className="text-xs text-slate-500">Koyu / Açık Mod</div>
                            </div>
                        </div>
                        <button onClick={toggleTheme} className="px-4 py-2 bg-slate-100 dark:bg-white/10 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                            Değiştir
                        </button>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                                <Award size={20}/>
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 dark:text-white">Kazanılan Rozetler</div>
                                <div className="text-xs text-slate-500">{badges.filter(b => b.unlocked).length} / {badges.length}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-surface-light dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 p-4">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4">Veri Yönetimi</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => {
                                const data = { habits, logs, notifications, theme };
                                const blob = new Blob([JSON.stringify(data)], {type: "application/json"});
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `gayret_backup_${formatDateKey(new Date())}.json`;
                                a.click();
                            }}
                            className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-white/5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <Download size={24} className="text-primary"/>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Yedekle</span>
                        </button>
                        <label className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-white/5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer">
                            <Upload size={24} className="text-blue-500"/>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Geri Yükle</span>
                            <input type="file" className="hidden" accept=".json" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                    try {
                                        const data = JSON.parse(ev.target?.result as string);
                                        if (data.habits) setHabits(data.habits);
                                        if (data.logs) setLogs(data.logs);
                                        if (data.notifications) setNotifications(data.notifications);
                                        if (data.theme) setTheme(data.theme);
                                        alert('Veriler başarıyla yüklendi!');
                                    } catch (err) {
                                        alert('Geçersiz dosya formatı.');
                                    }
                                };
                                reader.readAsText(file);
                            }}/>
                        </label>
                    </div>
                    <button 
                        onClick={() => {
                            if(window.confirm('Tüm verilerin silinecek. Emin misin?')) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                        className="w-full mt-4 py-3 text-sm text-red-500 border border-red-200 dark:border-red-900/30 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                    >
                        Tüm Verileri Sıfırla
                    </button>
                </div>
                
                <div className="text-center text-xs text-slate-400">
                    v1.0.0 • Gayret Alışkanlık Takip
                </div>
            </div>
        </div>
    );

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark font-sans text-slate-800 dark:text-slate-200">
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-bg-light/80 dark:bg-bg-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 z-40 flex items-center justify-between px-5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView(ViewState.DASHBOARD)}>
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-black font-arabic text-2xl font-bold shadow-lg shadow-orange-500/20">
            ح
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500">
            Gayret
          </span>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => setView(ViewState.NOTIFICATIONS)}
            className="w-10 h-10 rounded-xl bg-surface-light dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 relative"
          >
            <Bell size={20} />
            {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          <button 
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-surface-light dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 max-w-md mx-auto min-h-screen">
        {view === ViewState.DASHBOARD && renderDashboard()}
        {view === ViewState.HABITS && renderHabitList()}
        {view === ViewState.ADD_HABIT && renderAddHabit()}
        {view === ViewState.STATS && renderStats()}
        {view === ViewState.NOTIFICATIONS && renderNotifications()}
        {view === ViewState.SETTINGS && renderSettings()}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface-light dark:bg-surface-dark border-t border-slate-200 dark:border-white/10 pb-safe z-40">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
            {[
                { id: ViewState.DASHBOARD, icon: Home, label: 'Ana Sayfa' },
                { id: ViewState.HABITS, icon: List, label: 'Listem' },
                { id: ViewState.ADD_HABIT, icon: Plus, label: 'Ekle', isFab: true },
                { id: ViewState.STATS, icon: BarChart2, label: 'Raporlar' },
                { id: ViewState.SETTINGS, icon: SettingsIcon, label: 'Ayarlar' },
            ].map(item => {
                const isActive = view === item.id;
                if (item.isFab) {
                    return (
                        <button 
                            key={item.id}
                            onClick={() => { resetForm(); setView(item.id as ViewState); }}
                            className="relative -top-5"
                        >
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/40">
                                <Plus size={28} />
                            </div>
                        </button>
                    );
                }
                return (
                    <button 
                        key={item.id}
                        onClick={() => setView(item.id as ViewState)}
                        className={`flex flex-col items-center gap-1 p-2 ${isActive ? 'text-primary' : 'text-slate-400'}`}
                    >
                        <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                );
            })}
        </div>
      </nav>

      {/* Progress Modal */}
      <ProgressModal 
        habit={activeHabitForProgress}
        currentVal={activeHabitForProgress ? (getLog(activeHabitForProgress.id, progressDate)?.val || 0) : 0}
        onClose={() => setActiveHabitForProgress(null)}
        onSave={(val, status) => {
            if(activeHabitForProgress) {
                updateProgress(activeHabitForProgress.id, val, progressDate, status);
                setActiveHabitForProgress(null);
            }
        }}
      />
    </div>
  );
};

export default App;
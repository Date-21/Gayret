import { Habit, HabitLog, Badge } from './types';

export const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getDayName = (dayIndex: number): string => {
  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  return days[dayIndex];
};

// Calculate active days in a month, considering the habit creation date (Pro-rating)
export const countActiveDaysInMonth = (year: number, month: number, activeDays: number[], createdStr: string): number => {
  const createdDate = new Date(createdStr);
  const startOfMonth = new Date(year, month, 1);
  
  // If habit was created after the start of this month, start counting from creation date
  let date = createdDate > startOfMonth ? new Date(createdDate) : new Date(startOfMonth);
  // Ensure we don't start before the requested month if creation was years ago (logic above handles it but safety check)
  if (date < startOfMonth) date = new Date(startOfMonth);

  let count = 0;
  while (date.getMonth() === month && date.getFullYear() === year) {
    if (activeDays.includes(date.getDay())) {
      count++;
    }
    date.setDate(date.getDate() + 1);
  }
  return count;
};

// Dynamic Goal Calculations with Pro-rating
export const getGoals = (habit: Habit, date: Date = new Date()) => {
  const daily = habit.goal;
  
  // Weekly: If custom is set use it, otherwise daily * active days per week
  const weekly = habit.customWeeklyGoal ?? (daily * habit.days.length);

  // Monthly: Check effective active days based on creation date
  const effectiveDays = countActiveDaysInMonth(date.getFullYear(), date.getMonth(), habit.days, habit.created);
  const monthly = habit.customMonthlyGoal ?? (daily * effectiveDays);

  return { daily, weekly, monthly };
};

export const calculateStreak = (habit: Habit, logs: HabitLog[]): number => {
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = formatDateKey(d);
    
    // Only check if habit existed on this day
    if (new Date(habit.created) > d && i > 0) break; // Habit didn't exist yet

    if (habit.days.includes(d.getDay())) {
      const log = logs.find(l => l.hid === habit.id && l.date === dateKey);
      
      if (log) {
        // Use snapshot goal if available, else current goal
        const target = log.targetSnapshot ?? habit.goal;

        if (log.status === 'skip' || log.status === 'recovered') {
          continue; // Maintain streak
        } else if (log.val >= target) {
          streak++;
        } else if (i === 0) {
          continue; // Today not finished
        } else {
          break; // Broken
        }
      } else if (i === 0) {
         continue;
      } else {
        break; // Missing log
      }
    }
  }
  return streak;
};

export const getCompletionPercentage = (habit: Habit, val: number, snapshotTarget?: number): number => {
  const target = snapshotTarget ?? habit.goal;
  if (target === 0) return 0;
  return Math.min(100, Math.round((val / target) * 100));
};

// Advanced Weekly Progress with Compensation Logic & Bonus Days
export const getWeeklyStatus = (habit: Habit, logs: HabitLog[], refDate: Date = new Date()) => {
  const day = refDate.getDay();
  const diff = refDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(refDate);
  monday.setDate(diff);
  monday.setHours(0,0,0,0);

  let totalVal = 0;
  let activeDaysCount = 0;
  let successDays = 0;

  // Calculate week totals
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const k = formatDateKey(d);
    
    // Check if habit is active this day AND habit existed
    const habitExisted = new Date(habit.created) <= d;
    
    if (habit.days.includes(d.getDay()) && habitExisted) {
        activeDaysCount++;
    }

    const log = logs.find(l => l.hid === habit.id && l.date === k);
    if (log) {
        totalVal += log.val; // Add value regardless of active day (Bonus logic)
        
        // Success check uses snapshot
        const target = log.targetSnapshot ?? habit.goal;
        if ((log.val >= target || log.status === 'skip') && habit.days.includes(d.getDay())) {
            successDays++;
        }
    }
  }

  // Determine weekly goal. If custom goal exists, use it. 
  // Else, use daily * activeDaysCount (this handles pro-rating for new habits mid-week)
  const weeklyGoal = habit.customWeeklyGoal ?? (habit.goal * activeDaysCount);
  
  // Avoid division by zero for brand new habits with no active days yet this week
  const isWeeklyMet = weeklyGoal > 0 && totalVal >= weeklyGoal;

  return { totalVal, weeklyGoal, isWeeklyMet, successDays, activeDaysCount };
};

export const getWeeklyProgress = (habits: Habit[], logs: HabitLog[]): number => {
  let totalHabitPercent = 0;
  let count = 0;
  
  habits.filter(h => h.active && !h.archived).forEach(h => {
      const { isWeeklyMet, totalVal, weeklyGoal } = getWeeklyStatus(h, logs);
      if (weeklyGoal > 0) {
        const pct = Math.min(100, (totalVal / weeklyGoal) * 100);
        totalHabitPercent += pct;
        count++;
      }
  });

  return count === 0 ? 0 : Math.round(totalHabitPercent / count);
};

export const motivationalQuotes = [
  "Yeni bir güne hoş geldin!",
  "Bugün kendini aştın!",
  "Harika gidiyorsun!",
  "Her usta çırak başlar!",
  "Yeni gün yeni fırsat!",
  "İstikrar başarının anahtarıdır.",
  "Küçük adımlar, büyük zaferler."
];

export const getRandomQuote = () => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

// Gamification System
export const BADGE_DEFINITIONS: Omit<Badge, 'unlocked'>[] = [
  {
    id: 'b_first_step',
    title: 'İlk Adım',
    desc: 'İlk alışkanlığını tamamladın.',
    icon: '🌱',
    condition: (h, l) => l.some(log => log.val > 0)
  },
  {
    id: 'b_week_streak',
    title: 'Haftalık Seri',
    desc: 'Bir alışkanlıkta 7 günlük seri yaptın.',
    icon: '🔥',
    condition: (h, l) => h.some(habit => calculateStreak(habit, l) >= 7)
  },
  {
    id: 'b_month_streak',
    title: 'İstikrar Abidesi',
    desc: 'Bir alışkanlıkta 30 günlük seri yaptın.',
    icon: '👑',
    condition: (h, l) => h.some(habit => calculateStreak(habit, l) >= 30)
  },
  {
    id: 'b_early_bird',
    title: 'Erkenci Kuş',
    desc: 'Toplam 10 kayıt girdin.',
    icon: '🌅',
    condition: (h, l) => l.length >= 10
  },
  {
    id: 'b_collector',
    title: 'Koleksiyoncu',
    desc: '5 farklı alışkanlık oluşturdun.',
    icon: '🎒',
    condition: (h, l) => h.filter(x => !x.archived).length >= 5
  }
];

export const checkBadges = (habits: Habit[], logs: HabitLog[]): Badge[] => {
  return BADGE_DEFINITIONS.map(def => ({
    ...def,
    unlocked: def.condition(habits, logs)
  }));
};

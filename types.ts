export type HabitUnit = 'sayfa' | 'dakika' | 'adet' | 'kez';

export type HabitCategory = 'Sağlık' | 'Kariyer' | 'Maneviyat' | 'Sanat' | 'Eğitim' | 'Diğer';

export interface Habit {
  id: string;
  title: string;
  desc?: string;
  goal: number; // Current Daily goal
  customWeeklyGoal?: number; // Manual override
  customMonthlyGoal?: number; // Manual override
  unit: HabitUnit;
  category: HabitCategory;
  days: number[]; // 0-6, 0 is Sunday
  color: string;
  icon: string;
  created: string; // ISO String
  active: boolean;
  archived?: boolean; // For soft delete
}

export interface HabitLog {
  id: string;
  hid: string;
  date: string; // YYYY-MM-DD
  val: number;
  targetSnapshot?: number; // The goal value AT THE TIME of logging. Preserves history.
  status?: 'done' | 'skip' | 'fail' | 'recovered'; // recovered = failed daily but saved by weekly
}

export interface Notification {
  id: string;
  type: 'daily' | 'system' | 'achievement' | 'risk';
  title: string;
  msg: string;
  date: string;
  read: boolean;
}

export interface Badge {
  id: string;
  title: string;
  desc: string;
  icon: string;
  condition: (habits: Habit[], logs: HabitLog[]) => boolean;
  unlocked: boolean;
}

export enum ViewState {
  DASHBOARD = 'dashboard',
  HABITS = 'habits',
  ADD_HABIT = 'add',
  STATS = 'stats',
  SETTINGS = 'settings',
  NOTIFICATIONS = 'notif'
}

export type Theme = 'dark' | 'light';

export const COLORS = ['#f97316', '#fbbf24', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];
export const ICONS = ['target', 'book', 'activity', 'droplet', 'moon', 'dumbbell', 'music', 'heart', 'brain', 'coffee', 'briefcase', 'palette', 'zap'];
export const CATEGORIES: HabitCategory[] = ['Sağlık', 'Kariyer', 'Maneviyat', 'Sanat', 'Eğitim', 'Diğer'];

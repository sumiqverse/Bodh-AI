'use client';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  streakDays: number;
  avatarBg: string;
  isCurrentUser?: boolean;
}

export interface RealLeaderboardItem {
  rank: number;
  student_id: string;
  name: string;
  xp: number;
  streak_days: number;
  avatar_bg?: string;
  is_current_user?: boolean;
}

export interface RealLeaderboardData {
  all_rankings?: RealLeaderboardItem[];
  current_user_row?: RealLeaderboardItem | null;
  activity_dates?: string[];
  max_streak?: number;
}

export function useStudentGamification(options?: {
  studentId?: string;
  studentName?: string;
  realLeaderboardData?: RealLeaderboardData | null;
}) {
  const data = options?.realLeaderboardData;
  const row = data?.current_user_row;
  const xp = row?.xp ?? 0;
  const levelTitle =
    xp >= 3500
      ? 'Master'
      : xp >= 2000
        ? 'Scholar'
        : xp >= 1000
          ? 'Trainee'
          : xp >= 500
            ? 'Explorer'
            : 'Novice';
  const ranking: LeaderboardEntry[] = (data?.all_rankings ?? []).map((item) => ({
    rank: item.rank,
    name: item.name,
    xp: item.xp,
    streakDays: item.streak_days,
    avatarBg: item.avatar_bg ?? 'bg-surface-yellow',
    isCurrentUser: item.is_current_user || item.student_id === options?.studentId,
  }));
  const currentUserRow = ranking.find((item) => item.isCurrentUser);
  const indiaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [year, month, day] = indiaDate.split('-').map(Number);
  const attemptedDays = (data?.activity_dates ?? [])
    .filter((date) => date.startsWith(indiaDate.slice(0, 7)))
    .map((date) => Number(date.slice(8, 10)));
  return {
    xp,
    levelTitle,
    streakDays: row?.streak_days ?? 0,
    maxStreak: data?.max_streak ?? 0,
    rank: currentUserRow?.rank ?? 0,
    attemptedDays,
    todayDate: day ?? 1,
    currentMonthName: new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1, 1)).toLocaleString(
      'en-US',
      { month: 'long', timeZone: 'UTC' },
    ),
    topThree: ranking.slice(0, 3),
    listLearners: ranking.slice(3, 6),
    currentUserRow,
  };
}

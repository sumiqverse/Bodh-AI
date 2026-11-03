import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStudentGamification } from '@/hooks/useStudentGamification';

describe('useStudentGamification', () => {
  it('does not invent progress or classmates when no data is available', () => {
    const { result } = renderHook(() => useStudentGamification({ studentId: 's1' }));
    expect(result.current.xp).toBe(0);
    expect(result.current.rank).toBe(0);
    expect(result.current.topThree).toEqual([]);
    expect(result.current.attemptedDays).toEqual([]);
  });

  it('uses the server ranking and never substitutes local XP or fake peers', () => {
    localStorage.setItem('bodhai_gamification_s1', JSON.stringify({ xp: 9000 }));
    const row = {
      rank: 1,
      student_id: 's1',
      name: 'Student',
      xp: 15,
      streak_days: 1,
      is_current_user: true,
    };
    const { result } = renderHook(() =>
      useStudentGamification({
        studentId: 's1',
        realLeaderboardData: { all_rankings: [row], current_user_row: row, max_streak: 3 },
      }),
    );
    expect(result.current.xp).toBe(15);
    expect(result.current.rank).toBe(1);
    expect(result.current.topThree).toHaveLength(1);
    expect(result.current.maxStreak).toBe(3);
  });
});

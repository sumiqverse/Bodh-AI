import { describe, expect, it, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import middleware from '../middleware';
import {
  getUserDashboardPath,
  syncSessionCookies,
  setAuthSession,
  clearAuthSession,
  getCurrentUser,
  getAuthToken,
} from '../lib/api-client';

describe('Authenticated User Dashboard Redirect Middleware', () => {
  it('redirects logged-in teacher visiting landing page /en to /en/classes', () => {
    const req = new NextRequest('http://localhost:3000/en', {
      headers: {
        cookie: 'bodhai_logged_in=true; bodhai_user_role=teacher',
      },
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/en/classes');
  });

  it('redirects logged-in student visiting landing page /en to /en/student', () => {
    const req = new NextRequest('http://localhost:3000/en', {
      headers: {
        cookie: 'bodhai_logged_in=true; bodhai_user_role=student',
      },
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/en/student');
  });

  it('redirects logged-in admin visiting landing page /en to /en/admin/stats', () => {
    const req = new NextRequest('http://localhost:3000/en', {
      headers: {
        cookie: 'bodhai_logged_in=true; bodhai_user_role=admin',
      },
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/en/admin/stats');
  });

  it('redirects logged-in teacher visiting /en/login to /en/classes', () => {
    const req = new NextRequest('http://localhost:3000/en/login', {
      headers: {
        cookie: 'bodhai_logged_in=true; bodhai_user_role=teacher',
      },
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/en/classes');
  });

  it('redirects logged-in student visiting /hi/signup to /hi/student', () => {
    const req = new NextRequest('http://localhost:3000/hi/signup', {
      headers: {
        cookie: 'bodhai_logged_in=true; bodhai_user_role=student',
      },
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/hi/student');
  });

  it('does NOT redirect unauthenticated visitor on landing page', () => {
    const req = new NextRequest('http://localhost:3000/en');
    const res = middleware(req);

    // No redirect location
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows logged-in user to bypass redirect when ?public=true is supplied', () => {
    const req = new NextRequest('http://localhost:3000/en?public=true', {
      headers: {
        cookie: 'bodhai_logged_in=true; bodhai_user_role=teacher',
      },
    });
    const res = middleware(req);

    expect(res.headers.get('location')).toBeNull();
  });
});

describe('User Dashboard Helpers & Session Cookies Sync', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = '';
  });

  it('returns appropriate dashboard paths for different roles', () => {
    expect(getUserDashboardPath(null)).toBe('/profile');
    expect(
      getUserDashboardPath({
        id: '1',
        email: 't@s.edu',
        role: 'teacher',
        full_name: 'Teacher',
        preferred_language: 'en',
        is_minor: false,
        created_at: '',
      }),
    ).toBe('/classes');
    expect(
      getUserDashboardPath({
        id: '2',
        role: 'student',
        full_name: 'Student',
        preferred_language: 'hi',
        is_minor: true,
        created_at: '',
      }),
    ).toBe('/student');
    expect(
      getUserDashboardPath({
        id: '3',
        role: 'admin',
        full_name: 'Admin',
        preferred_language: 'en',
        is_minor: false,
        created_at: '',
      }),
    ).toBe('/admin/stats');
  });

  it('syncs session cookies when setAuthSession is called', () => {
    const user = {
      id: 'tchr-1',
      email: 'pooja@school.edu',
      role: 'teacher',
      full_name: 'Pooja',
      preferred_language: 'en',
      is_minor: false,
      created_at: '',
    };
    setAuthSession('test-token-123', user);

    expect(getCurrentUser()).toEqual(user);
    expect(getAuthToken()).toBe('test-token-123');
    expect(document.cookie).toContain('bodhai_logged_in=true');
    expect(document.cookie).toContain('bodhai_user_role=teacher');

    clearAuthSession();
    expect(getCurrentUser()).toBeNull();
    expect(getAuthToken()).toBeNull();

    // Direct syncSessionCookies call
    syncSessionCookies('token-direct', user);
    expect(document.cookie).toContain('bodhai_logged_in=true');
    syncSessionCookies(null, null);
    expect(document.cookie).not.toContain('bodhai_logged_in=true');
  });
});

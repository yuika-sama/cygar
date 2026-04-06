import { useEffect, useState } from 'react';
import baseApi from '../services/baseApi';

interface AppUser {
  email?: string;
  display_name?: string | null;
}

export function useAuth() {
  const hasToken = Boolean(localStorage.getItem('token'));
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(hasToken);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    baseApi
      .get('/me')
      .then((res) => {
        setUser(res.data || {});
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { user, loading };
}

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  display_id?: string;
  first_name?: string;
  last_name?: string;
  storage_used?: number;
  storage_quota?: number;
}

export interface CustomApp {
  id: string;
  title: string;
  url: string;
  logo_url?: string;
  logo_emoji?: string;
  is_active: boolean;
  created_at: string;
}

export function useAdminData() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [apps, setApps] = useState<CustomApp[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    // Fetch all users from user_profiles (RLS now allows admin to see all)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, username, email, is_admin, display_id, first_name, last_name');

    if (!profiles) { setLoading(false); return; }

    // Fetch storage quotas
    const { data: quotas } = await supabase
      .from('user_storage_quotas')
      .select('user_id, quota_bytes');

    const quotaMap: Record<string, number> = {};
    quotas?.forEach(q => { quotaMap[q.user_id] = q.quota_bytes; });

    const enriched: AdminUser[] = profiles.map(p => ({
      id: p.id,
      username: p.username || p.email?.split('@')[0] || 'Unknown',
      email: p.email,
      is_admin: p.is_admin || false,
      display_id: p.display_id,
      first_name: p.first_name,
      last_name: p.last_name,
      storage_used: 0,
      storage_quota: quotaMap[p.id] || 104857600,
    }));

    setUsers(enriched);
    setLoading(false);
  }, []);

  const loadApps = useCallback(async () => {
    const { data } = await supabase
      .from('custom_apps')
      .select('*')
      .order('created_at', { ascending: false });
    setApps((data as CustomApp[]) || []);
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    // Delete from user_profiles (cascades from auth)
    await supabase.from('user_profiles').delete().eq('id', userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  const toggleAdmin = useCallback(async (userId: string, isAdmin: boolean) => {
    await supabase.from('user_profiles').update({ is_admin: isAdmin }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: isAdmin } : u));
  }, []);

  const setStorageQuota = useCallback(async (userId: string, mb: number) => {
    const bytes = Math.round(mb * 1048576);
    await supabase.from('user_storage_quotas').upsert({
      user_id: userId,
      quota_bytes: bytes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, storage_quota: bytes } : u));
  }, []);

  const addCustomApp = useCallback(async (app: Omit<CustomApp, 'id' | 'created_at' | 'is_active'>) => {
    const { data } = await supabase.from('custom_apps').insert({ ...app, is_active: true }).select().single();
    if (data) setApps(prev => [data as CustomApp, ...prev]);
  }, []);

  const updateCustomApp = useCallback(async (id: string, updates: Partial<CustomApp>) => {
    await supabase.from('custom_apps').update(updates).eq('id', id);
    setApps(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteCustomApp = useCallback(async (id: string) => {
    await supabase.from('custom_apps').delete().eq('id', id);
    setApps(prev => prev.filter(a => a.id !== id));
  }, []);

  const toggleAppActive = useCallback(async (id: string, isActive: boolean) => {
    await supabase.from('custom_apps').update({ is_active: isActive }).eq('id', id);
    setApps(prev => prev.map(a => a.id === id ? { ...a, is_active: isActive } : a));
  }, []);

  return {
    users, apps, loading,
    loadUsers, loadApps,
    deleteUser, toggleAdmin, setStorageQuota,
    addCustomApp, updateCustomApp, deleteCustomApp, toggleAppActive,
  };
}

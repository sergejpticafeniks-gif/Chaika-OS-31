import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DesktopFile } from '@/types';

export function useDesktopFiles() {
  const { user } = useAuth();
  const [files, setFiles] = useState<DesktopFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('desktop_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (data) setFiles(data);
  }, [user]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const uploadFile = useCallback(async (file: File, posX = 200, posY = 100) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || '';
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('desktop-files')
        .upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('desktop-files').getPublicUrl(path);

      const fileType = getFileType(file.name, file.type);

      const { data, error: dbErr } = await supabase.from('desktop_files').insert({
        user_id: user.id,
        name: file.name,
        original_name: file.name,
        file_url: urlData.publicUrl,
        file_type: fileType,
        file_size: file.size,
        pos_x: posX,
        pos_y: posY,
      }).select().single();
      if (dbErr) throw dbErr;
      if (data) setFiles(prev => [...prev, data]);
    } finally {
      setUploading(false);
    }
  }, [user]);

  const moveFile = useCallback(async (id: string, posX: number, posY: number) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, pos_x: posX, pos_y: posY } : f));
    await supabase.from('desktop_files').update({ pos_x: posX, pos_y: posY }).eq('id', id);
  }, []);

  const renameFile = useCallback(async (id: string, newName: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    await supabase.from('desktop_files').update({ name: newName }).eq('id', id);
  }, []);

  const deleteFile = useCallback(async (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    await supabase.from('desktop_files').delete().eq('id', id);
  }, []);

  return { files, uploading, uploadFile, moveFile, renameFile, deleteFile, loadFiles };
}

function getFileType(name: string, mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['txt', 'md', 'log', 'csv'].includes(ext)) return 'text';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
  return 'file';
}

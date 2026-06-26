import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { OrderProject, DbOrderProject, SiteListItem } from '../types';
import { dbToOrderProject, orderProjectToDb } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<OrderProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── 初回ロード ──
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('order_projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch projects:', fetchError);
        setError('プロジェクトの読み込みに失敗しました');
        setLoading(false);
        return;
      }

      setProjects((data as DbOrderProject[]).map(dbToOrderProject));
      setLoading(false);
    };

    fetchProjects();
  }, []);

  // ── Realtime サブスクリプション ──
  useEffect(() => {
    const channel = supabase
      .channel('order_projects_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_projects' },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT': {
              const newProject = dbToOrderProject(payload.new as DbOrderProject);
              setProjects(prev => {
                if (prev.some(p => p.id === newProject.id)) return prev;
                return [newProject, ...prev];
              });
              break;
            }
            case 'UPDATE': {
              const updated = dbToOrderProject(payload.new as DbOrderProject);
              setProjects(prev =>
                prev.map(p => (p.id === updated.id ? updated : p))
              );
              break;
            }
            case 'DELETE': {
              const deletedId = (payload.old as { id: string }).id;
              setProjects(prev => prev.filter(p => p.id !== deletedId));
              break;
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── CRUD操作 ──

  const addProject = useCallback(async (project: OrderProject) => {
    const dbRow = orderProjectToDb(project);
    const { error: insertError } = await supabase
      .from('order_projects')
      .insert(dbRow);

    if (insertError) {
      console.error('Failed to add project:', insertError);
      throw new Error('プロジェクトの追加に失敗しました');
    }
    // Realtimeで自動反映されるためsetProjectsは不要
  }, []);

  const updateProject = useCallback(async (project: OrderProject) => {
    const dbRow = orderProjectToDb(project);
    const { error: updateError } = await supabase
      .from('order_projects')
      .update(dbRow)
      .eq('id', project.id);

    if (updateError) {
      console.error('Failed to update project:', updateError);
      throw new Error('プロジェクトの更新に失敗しました');
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    const { error: deleteError } = await supabase
      .from('order_projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      console.error('Failed to delete project:', deleteError);
      throw new Error('プロジェクトの削除に失敗しました');
    }
  }, []);

  const importFromSiteList = useCallback(async (items: SiteListItem[]) => {
    const now = new Date().toISOString();
    const dbRows: DbOrderProject[] = items.map((item) => ({
      id: `P-${item.id}`,
      project_name: item.projectName,
      client_name: item.clientName,
      site_address: item.siteAddress,
      estimated_amount: item.estimatedAmount,
      order_amount: null,
      status: '見込み',
      assignee: item.assignee,
      start_date: item.startDate,
      end_date: item.endDate,
      imported_from_site_list: true,
      site_list_id: item.id,
      budget_registered: false,
      budget_registered_at: null,
      notes: '',
      created_at: now,
      updated_at: now,
    }));

    const { error: upsertError } = await supabase
      .from('order_projects')
      .upsert(dbRows, { onConflict: 'id' });

    if (upsertError) {
      console.error('Failed to import from site list:', upsertError);
      throw new Error('現場リストからの取り込みに失敗しました');
    }
  }, []);

  return {
    projects,
    loading,
    error,
    addProject,
    updateProject,
    deleteProject,
    importFromSiteList,
  };
}

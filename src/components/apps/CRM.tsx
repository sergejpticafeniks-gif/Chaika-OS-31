import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Contact {
  id: string;
  display_id?: string;
  full_name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: string;
  notes?: string;
  created_at: string;
}

interface Deal {
  id: string;
  contact_id: string;
  owner_id?: string;
  title: string;
  amount: number;
  stage: string;
  due_date?: string;
  notes?: string;
  created_at: string;
}

interface Task {
  id: string;
  contact_id?: string;
  deal_id?: string;
  title: string;
  description?: string;
  due_date?: string;
  is_done: boolean;
}

type CrmTab = 'contacts' | 'deals' | 'tasks' | 'kanban';

const DEAL_STAGES = ['new', 'negotiation', 'proposal', 'won', 'lost'];
const STAGE_LABELS: Record<string, string> = {
  new: 'Новая', negotiation: 'Переговоры', proposal: 'Предложение', won: 'Закрыта ✓', lost: 'Провалена',
};
const STAGE_COLORS: Record<string, string> = {
  new: '#3b82f6', negotiation: '#f59e0b', proposal: '#8b5cf6', won: '#22c55e', lost: '#ef4444',
};
const STATUS_LABELS: Record<string, string> = {
  lead: 'Лид', client: 'Клиент', partner: 'Партнёр', inactive: 'Неактивен',
};

export default function CRM() {
  const { user } = useAuth();
  const [tab, setTab] = useState<CrmTab>('contacts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [search, setSearch] = useState('');

  const [newContact, setNewContact] = useState({ full_name: '', email: '', phone: '', company: '', status: 'lead', notes: '' });
  const [newDeal, setNewDeal] = useState({ contact_id: '', title: '', amount: '', stage: 'new', due_date: '', notes: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '', contact_id: '', deal_id: '' });

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_contacts').select('*').order('created_at', { ascending: false });
    setContacts((data as Contact[]) || []);
    setLoading(false);
  }, []);

  const loadDeals = useCallback(async () => {
    const { data } = await supabase.from('crm_deals').select('*').order('created_at', { ascending: false });
    setDeals((data as Deal[]) || []);
  }, []);

  const loadTasks = useCallback(async () => {
    const { data } = await supabase.from('crm_tasks').select('*').order('due_date', { ascending: true });
    setTasks((data as Task[]) || []);
  }, []);

  useEffect(() => { loadContacts(); loadDeals(); loadTasks(); }, []);

  const addContact = async () => {
    if (!newContact.full_name.trim() || !user) return;
    const { data } = await supabase.from('crm_contacts').insert({
      ...newContact, user_id: user.id,
    }).select().single();
    if (data) setContacts(p => [data as Contact, ...p]);
    setNewContact({ full_name: '', email: '', phone: '', company: '', status: 'lead', notes: '' });
    setShowAddContact(false);
  };

  const deleteContact = async (id: string) => {
    await supabase.from('crm_contacts').delete().eq('id', id);
    setContacts(p => p.filter(c => c.id !== id));
    if (selectedContact?.id === id) setSelectedContact(null);
  };

  const addDeal = async () => {
    if (!newDeal.title.trim() || !user) return;
    const { data } = await supabase.from('crm_deals').insert({
      contact_id: newDeal.contact_id || null,
      owner_id: user.id,
      title: newDeal.title.trim(),
      amount: parseFloat(newDeal.amount) || 0,
      stage: newDeal.stage,
      due_date: newDeal.due_date || null,
      notes: newDeal.notes || null,
    }).select().single();
    if (data) setDeals(p => [data as Deal, ...p]);
    setNewDeal({ contact_id: '', title: '', amount: '', stage: 'new', due_date: '', notes: '' });
    setShowAddDeal(false);
  };

  const moveDeal = async (dealId: string, stage: string) => {
    await supabase.from('crm_deals').update({ stage }).eq('id', dealId);
    setDeals(p => p.map(d => d.id === dealId ? { ...d, stage } : d));
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    const { data } = await supabase.from('crm_tasks').insert({
      title: newTask.title.trim(),
      description: newTask.description || null,
      due_date: newTask.due_date || null,
      contact_id: newTask.contact_id || null,
      deal_id: newTask.deal_id || null,
      assigned_to: user?.id || null,
      is_done: false,
    }).select().single();
    if (data) setTasks(p => [...p, data as Task]);
    setNewTask({ title: '', description: '', due_date: '', contact_id: '', deal_id: '' });
    setShowAddTask(false);
  };

  const toggleTask = async (id: string, is_done: boolean) => {
    await supabase.from('crm_tasks').update({ is_done }).eq('id', id);
    setTasks(p => p.map(t => t.id === id ? { ...t, is_done } : t));
  };

  const filteredContacts = contacts.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase())
  );

  const S = {
    tab: (active: boolean): React.CSSProperties => ({
      padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400,
      borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
      background: 'none', color: active ? '#1d4ed8' : '#64748b', transition: 'all 0.15s',
    }),
    input: { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'Segoe UI, sans-serif' },
    btn: (bg: string, color = '#fff'): React.CSSProperties => ({ padding: '8px 18px', background: bg, color, border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }),
  };

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column', background: '#f8fafc', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="7" r="3.5" fill="#fff"/><path d="M2 17c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="#fff" opacity="0.8"/><circle cx="15" cy="8" r="2.5" fill="#fff" opacity="0.6"/><path d="M13 16c0-2.2 1.3-4 3-4" stroke="#fff" strokeWidth="1.2" opacity="0.6"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>CRM-система Кострома</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{contacts.length} контактов · {deals.length} сделок · {tasks.filter(t => !t.is_done).length} задач</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAddContact(true)} style={S.btn('rgba(255,255,255,0.15)')}>+ Контакт</button>
          <button onClick={() => setShowAddDeal(true)} style={S.btn('rgba(255,255,255,0.15)')}>+ Сделка</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexShrink: 0 }}>
        {(['contacts', 'deals', 'kanban', 'tasks'] as CrmTab[]).map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'contacts' ? '👥 Контакты' : t === 'deals' ? '💼 Сделки' : t === 'kanban' ? '📊 Канбан' : '✓ Задачи'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Contacts */}
        {tab === 'contacts' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* List */}
            <div style={{ width: 320, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} style={S.input} placeholder="🔍 Поиск контактов..." />
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Загрузка...</div> : filteredContacts.map(c => (
                  <div key={c.id} onClick={() => setSelectedContact(c)} style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: selectedContact?.id === c.id ? '#eff6ff' : 'none', display: 'flex', gap: 10, alignItems: 'center' }}
                    onMouseEnter={e => { if (selectedContact?.id !== c.id) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (selectedContact?.id !== c.id) e.currentTarget.style.background = 'none'; }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                      {c.full_name[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.full_name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.company || c.email || ''}</div>
                    </div>
                    <span style={{ fontSize: 10, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 8, fontWeight: 600, flexShrink: 0 }}>{STATUS_LABELS[c.status] || c.status}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: 12, borderTop: '1px solid #e2e8f0' }}>
                <button onClick={() => setShowAddContact(true)} style={{ ...S.btn('#3b82f6'), width: '100%' }}>+ Добавить контакт</button>
              </div>
            </div>

            {/* Contact detail */}
            {selectedContact ? (
              <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', fontWeight: 700 }}>
                    {selectedContact.full_name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{selectedContact.full_name}</div>
                    {selectedContact.display_id && <div style={{ fontSize: 12, color: '#3b82f6', fontFamily: 'monospace' }}>{selectedContact.display_id}</div>}
                    <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 10px', borderRadius: 10, fontWeight: 600 }}>{STATUS_LABELS[selectedContact.status]}</span>
                  </div>
                  <button onClick={() => deleteContact(selectedContact.id)} style={S.btn('#fee2e2', '#dc2626')}>🗑 Удалить</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  {[
                    { label: 'Email', value: selectedContact.email },
                    { label: 'Телефон', value: selectedContact.phone },
                    { label: 'Компания', value: selectedContact.company },
                    { label: 'Дата добавления', value: new Date(selectedContact.created_at).toLocaleDateString('ru-RU') },
                  ].map(({ label, value }) => value ? (
                    <div key={label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px' }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                      <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{value}</div>
                    </div>
                  ) : null)}
                </div>
                {selectedContact.notes && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>ЗАМЕТКИ</div>
                    <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.6 }}>{selectedContact.notes}</div>
                  </div>
                )}
                {/* Deals for contact */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>💼 Сделки</div>
                  {deals.filter(d => d.contact_id === selectedContact.id).map(d => (
                    <div key={d.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{d.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{d.amount.toLocaleString('ru-RU')} ₽</div>
                      </div>
                      <span style={{ fontSize: 11, background: STAGE_COLORS[d.stage] + '22', color: STAGE_COLORS[d.stage], padding: '3px 10px', borderRadius: 8, fontWeight: 600 }}>{STAGE_LABELS[d.stage]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>👥</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Выберите контакт</div>
              </div>
            )}
          </div>
        )}

        {/* Deals list */}
        {tab === 'deals' && (
          <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Все сделки ({deals.length})</div>
              <button onClick={() => setShowAddDeal(true)} style={S.btn('#3b82f6')}>+ Новая сделка</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {deals.map(d => {
                const contact = contacts.find(c => c.id === d.contact_id);
                return (
                  <div key={d.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{d.title}</div>
                      {contact && <div style={{ fontSize: 12, color: '#64748b' }}>👤 {contact.full_name}</div>}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{d.amount.toLocaleString('ru-RU')} ₽</div>
                    <select value={d.stage} onChange={e => moveDeal(d.id, e.target.value)} style={{ padding: '6px 10px', border: `1px solid ${STAGE_COLORS[d.stage]}`, borderRadius: 8, background: STAGE_COLORS[d.stage] + '15', color: STAGE_COLORS[d.stage], fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                      {DEAL_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                    </select>
                  </div>
                );
              })}
              {deals.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}><div style={{ fontSize: 48, marginBottom: 12 }}>💼</div>Нет сделок</div>}
            </div>
          </div>
        )}

        {/* Kanban */}
        {tab === 'kanban' && (
          <div style={{ flex: 1, overflowX: 'auto', display: 'flex', gap: 12, padding: 16 }}>
            {DEAL_STAGES.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage);
              const total = stageDeals.reduce((s, d) => s + d.amount, 0);
              return (
                <div key={stage} style={{ minWidth: 220, flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ padding: '8px 12px', background: STAGE_COLORS[stage], borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{STAGE_LABELS[stage]}</span>
                    <span style={{ opacity: 0.8, fontSize: 11 }}>{stageDeals.length}</span>
                  </div>
                  {total > 0 && <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: -4 }}>{total.toLocaleString('ru-RU')} ₽</div>}
                  {stageDeals.map(d => {
                    const contact = contacts.find(c => c.id === d.contact_id);
                    return (
                      <div key={d.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{d.title}</div>
                        {contact && <div style={{ fontSize: 11, color: '#94a3b8' }}>👤 {contact.full_name}</div>}
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginTop: 6 }}>{d.amount.toLocaleString('ru-RU')} ₽</div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                          {DEAL_STAGES.filter(s => s !== stage).map(s => (
                            <button key={s} onClick={() => moveDeal(d.id, s)} style={{ fontSize: 9, padding: '2px 6px', background: STAGE_COLORS[s] + '20', color: STAGE_COLORS[s], border: `1px solid ${STAGE_COLORS[s]}40`, borderRadius: 4, cursor: 'pointer' }}>
                              → {STAGE_LABELS[s].slice(0, 6)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Tasks */}
        {tab === 'tasks' && (
          <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Задачи ({tasks.filter(t => !t.is_done).length} активных)</div>
              <button onClick={() => setShowAddTask(true)} style={S.btn('#3b82f6')}>+ Задача</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tasks.map(t => (
                <div key={t.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: t.is_done ? 0.6 : 1 }}>
                  <input type="checkbox" checked={t.is_done} onChange={e => toggleTask(t.id, e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#22c55e' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', textDecoration: t.is_done ? 'line-through' : 'none' }}>{t.title}</div>
                    {t.description && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{t.description}</div>}
                  </div>
                  {t.due_date && <div style={{ fontSize: 11, color: '#64748b' }}>📅 {new Date(t.due_date).toLocaleDateString('ru-RU')}</div>}
                </div>
              ))}
              {tasks.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}><div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>Нет задач</div>}
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAddContact(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>👤 Новый контакт</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={newContact.full_name} onChange={e => setNewContact(p => ({ ...p, full_name: e.target.value }))} style={S.input} placeholder="Имя и фамилия *" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} style={S.input} placeholder="Email" />
                <input value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} style={S.input} placeholder="Телефон" />
              </div>
              <input value={newContact.company} onChange={e => setNewContact(p => ({ ...p, company: e.target.value }))} style={S.input} placeholder="Компания" />
              <select value={newContact.status} onChange={e => setNewContact(p => ({ ...p, status: e.target.value }))} style={S.input}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <textarea value={newContact.notes} onChange={e => setNewContact(p => ({ ...p, notes: e.target.value }))} style={{ ...S.input, height: 80, resize: 'none' }} placeholder="Заметки" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={addContact} style={{ ...S.btn('#3b82f6'), flex: 1 }}>✓ Добавить</button>
              <button onClick={() => setShowAddContact(false)} style={S.btn('#f1f5f9', '#64748b')}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deal Modal */}
      {showAddDeal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAddDeal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>💼 Новая сделка</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={newDeal.title} onChange={e => setNewDeal(p => ({ ...p, title: e.target.value }))} style={S.input} placeholder="Название сделки *" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input type="number" value={newDeal.amount} onChange={e => setNewDeal(p => ({ ...p, amount: e.target.value }))} style={S.input} placeholder="Сумма, ₽" />
                <input type="date" value={newDeal.due_date} onChange={e => setNewDeal(p => ({ ...p, due_date: e.target.value }))} style={S.input} />
              </div>
              <select value={newDeal.stage} onChange={e => setNewDeal(p => ({ ...p, stage: e.target.value }))} style={S.input}>
                {DEAL_STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
              <select value={newDeal.contact_id} onChange={e => setNewDeal(p => ({ ...p, contact_id: e.target.value }))} style={S.input}>
                <option value="">— Без контакта —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={addDeal} style={{ ...S.btn('#3b82f6'), flex: 1 }}>✓ Создать</button>
              <button onClick={() => setShowAddDeal(false)} style={S.btn('#f1f5f9', '#64748b')}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAddTask(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>✓ Новая задача</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} style={S.input} placeholder="Название задачи *" />
              <textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} style={{ ...S.input, height: 60, resize: 'none' }} placeholder="Описание" />
              <input type="datetime-local" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} style={S.input} />
              <select value={newTask.contact_id} onChange={e => setNewTask(p => ({ ...p, contact_id: e.target.value }))} style={S.input}>
                <option value="">— Без контакта —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={addTask} style={{ ...S.btn('#22c55e'), flex: 1 }}>✓ Добавить задачу</button>
              <button onClick={() => setShowAddTask(false)} style={S.btn('#f1f5f9', '#64748b')}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

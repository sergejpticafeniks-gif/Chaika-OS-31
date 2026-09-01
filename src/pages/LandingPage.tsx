import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const APPS_LIST = [
  // ── Связь ──
  { icon: '🕊️', name: 'Чайка Мессенджер',    section: 'Связь',       desc: 'Telegram-подобный мессенджер: каналы, группы, голосовые, реакции, магазин, музыка, браузерные уведомления' },
  // ── Офис ──
  { icon: '📄', name: 'Чайка.DOC',            section: 'Офис',        desc: 'Офисный пакет нового поколения: текстовый редактор, таблицы, счета и AI-ассистент в одном месте' },
  { icon: '📄', name: 'Word',                  section: 'Офис',        desc: 'Текстовый процессор с форматированием, списками и сохранением на диск' },
  { icon: '📊', name: 'Excel',                 section: 'Офис',        desc: 'Таблицы, формулы, диаграммы, экспорт данных' },
  // ── Разработка ──
  { icon: '⌨️', name: 'Чайка BJS',            section: 'Разработка',  desc: 'Облачная среда разработки с AI-наставником, подсветкой синтаксиса, тестированием, ASIC-инструментами и командной работой' },
  { icon: '🔲', name: 'Чайка.BIN',            section: 'Разработка',  desc: 'Платформа моделирования ASIC и x86-процессоров: RTL-симуляция, временные диаграммы, отладчик в браузере' },
  { icon: '🔌', name: 'КонструкторПлат',      section: 'Разработка',  desc: 'AI-PCB редактор: 12-слойная трассировка, ASIC Designer, компоненты от Arduino до ламп EL34, 3D-просмотр' },
  { icon: '⚙️', name: 'INI.framework',        section: 'Разработка',  desc: 'Конфигурационная платформа с криптографией, версионностью и высокой производительностью на базе INI-файлов' },
  { icon: '💻', name: 'Конструктор приложений',section: 'Разработка', desc: 'IDE для визуального и кодового создания приложений (Администраторы)' },
  // ── Наука ──
  { icon: '🌀', name: 'Чайк.АДТ',            section: 'Наука',       desc: '3D-симулятор аэродинамической трубы: обтекание тел, коэффициент Cd, цветовая карта давления, регулировка потока' },
  { icon: '🧬', name: 'Чайка.BioLab',         section: 'Наука',       desc: 'Цифровая лаборатория: биореактор-симулятор, химическая база знаний, AI-аналитик, инструменты командной работы' },
  { icon: '📐', name: 'RubiCAD',              section: 'Наука',       desc: 'Полноценный аналог AutoCAD в браузере: 2D-чертёж, 3D-моделирование, AI-генератор чертежей по ГОСТ' },
  // ── Интернет ──
  { icon: '📈', name: 'Я-Россия: Аналитика', section: 'Интернет',    desc: 'Живые счётчики ВВП, ЗВР, ключевой ставки; сравнение прогнозов МВФ и МЭР; карта зарплат 40 регионов' },
  { icon: '🇷🇺', name: 'Я-Россия',            section: 'Интернет',    desc: 'Информационный портал: рыночные индексы, новости, города России' },
  { icon: '🔺', name: 'Треугольник',          section: 'Интернет',    desc: 'Соцсеть для визуальных историй: фото, видео, короткие публикации. Регистрация за 30 секунд' },
  { icon: '🗣️', name: 'Общественное мнение', section: 'Интернет',    desc: 'Официальная платформа обращений граждан РФ: подача, статус («Не решено»/«В работе»/«Решено»), защита ПД' },
  { icon: '🔵', name: 'ВКонтакте',            section: 'Интернет',    desc: 'Социальная сеть ВКонтакте' },
  { icon: '🟠', name: 'Одноклассники',        section: 'Интернет',    desc: 'Социальная сеть Одноклассники' },
  { icon: '💬', name: 'Мессенджер Макс',      section: 'Интернет',    desc: 'Мессенджер от Mail.ru Group' },
  { icon: '📧', name: 'Почта Mail.ru',        section: 'Интернет',    desc: 'Почтовый сервис Mail.ru' },
  { icon: '📺', name: 'Rutube',               section: 'Интернет',    desc: 'Российский видеохостинг Rutube' },
  { icon: '🔴', name: 'Яндекс',              section: 'Интернет',    desc: 'Яндекс — главный портал и поиск' },
  { icon: '🏛️', name: 'Госуслуги',           section: 'Интернет',    desc: 'Портал государственных услуг РФ' },
  // ── Медиа ──
  { icon: '▶',  name: 'Тумба',               section: 'Медиа',       desc: 'Видеохостинг: каталог, реакции на карточках, история просмотров, загрузка видео, интеграция с Чайка Мессенджером' },
  { icon: '📌', name: 'Кнопочки',            section: 'Медиа',       desc: 'Доска вдохновения: сохраняйте, организуйте и открывайте красивые изображения со всего мира' },
  { icon: '📻', name: 'Ригонда',             section: 'Медиа',       desc: 'Советский музыкальный проигрыватель MP3 с плейлистом' },
  // ── Бизнес ──
  { icon: '🛒', name: 'МаркетПлюс',          section: 'Бизнес',      desc: 'Онлайн-маркетплейс: тысячи товаров от проверенных продавцов, быстрая доставка по всей России' },
  { icon: '👥', name: 'CRM-система',          section: 'Бизнес',      desc: 'Управление контактами, сделками и задачами в стиле 1С-Битрикс' },
  // ── Игры ──
  { icon: '🎮', name: 'Наследие Вагнер',     section: 'Игры',        desc: 'Тактический FPS: три класса бойцов (Пехота/Тяжёлый/Снайпер), волновые атаки, реалистичная атмосфера 2022 года' },
  { icon: '♠',  name: 'Косынка',             section: 'Игры',        desc: 'Классический пасьянс Косынка с зелёным столом' },
  // ── Система ──
  { icon: '📁', name: 'Проводник',           section: 'Система',     desc: 'Файловая система с папками, drag-and-drop, поиском и просмотром изображений в Paint' },
  { icon: '🎨', name: 'Paint',               section: 'Система',     desc: 'Графический редактор с просмотром изображений с рабочего стола' },
  { icon: '📝', name: 'Блокнот',             section: 'Система',     desc: 'Быстрый текстовый редактор' },
  { icon: '🧮', name: 'Калькулятор',         section: 'Система',     desc: 'Стандартный и инженерный режимы' },
  { icon: '🌐', name: 'Браузер',             section: 'Система',     desc: 'Встроенный браузер (открывает сайты в реальном браузере пользователя)' },
  { icon: '⚙️', name: 'Персонализация',      section: 'Система',     desc: 'Темы оформления, обои (звёздное небо, космос), цвета окон, настройки ОС' },
  { icon: '🛡️', name: 'Администрирование',  section: 'Система',     desc: 'Управление пользователями, квотами хранилища, иконками, каналами, приложениями и меню' },
  { icon: '🤖', name: 'AI-помощник',         section: 'Система',     desc: 'Встроенный AI (Gemini): ответы на вопросы, анализ данных, помощь в работе, голосовой ввод (Shift+F1)' },
];

const SECTIONS = ['Связь','Офис','Разработка','Наука','Интернет','Медиа','Бизнес','Игры','Система'];

export default function LandingPage() {
  const navigate = useNavigate();
  const [hoveredApp, setHoveredApp] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const filteredApps = activeSection ? APPS_LIST.filter(a => a.section === activeSection) : APPS_LIST;

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
      background: '#050d1a',
      minHeight: '100vh',
      color: '#fff',
      overflowY: 'auto',
      overflowX: 'hidden',
      height: '100%',
      position: 'relative',
    }}>

      {/* ── HEADER ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(5,13,26,0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 32px', display: 'flex', alignItems: 'center', height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ width: 32, height: 22, borderRadius: 3, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.3)' }}>
            <div style={{ height: '33.3%', background: '#fff' }} />
            <div style={{ height: '33.3%', background: '#1565c0' }} />
            <div style={{ height: '33.3%', background: '#dc2626' }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1, background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Чайка ОС
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginLeft: 4 }}>v31</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginRight: 8 }}>152-ФЗ ✓</span>
          <button onClick={() => navigate('/')}
            style={{ padding: '7px 22px', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Войти →
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{
        background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 40%, #0f172a 100%)',
        padding: '80px 32px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(59,130,246,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(167,139,250,0.1) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(#fff 0deg 120deg, #1565c0 120deg 240deg, #dc2626 240deg 360deg)', boxShadow: '0 0 40px rgba(59,130,246,0.5)' }} />
          <div style={{ position: 'absolute', inset: 5, borderRadius: '50%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>🕊️</div>
        </div>
        <h1 style={{ fontSize: 'clamp(36px,5vw,72px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, background: 'linear-gradient(135deg, #fff 0%, #93c5fd 50%, #c4b5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Чайка ОС
        </h1>
        <p style={{ fontSize: 'clamp(16px,2vw,22px)', color: 'rgba(255,255,255,0.65)', maxWidth: 680, margin: '0 auto 14px', lineHeight: 1.7 }}>
          Первая российская облачная операционная система прямо в браузере — 50+ приложений: мессенджер, офис, разработка, наука, игры и AI-помощник
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 36, letterSpacing: 1 }}>
          Соответствует 152-ФЗ · Данные хранятся в России · Версия 31 · 2026
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/')}
            style={{ padding: '14px 36px', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 32px rgba(59,130,246,0.4)' }}>
            🖥️ Запустить Чайку ОС
          </button>
          <button onClick={() => { const el = document.getElementById('apps-section'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
            style={{ padding: '14px 32px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff', fontSize: 16, cursor: 'pointer' }}>
            📋 Все приложения
          </button>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '40px 32px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 20, textAlign: 'center' }}>
          {[
            { num: '50+', label: 'Приложений' },
            { num: 'AI', label: 'Встроенный помощник' },
            { num: '152-ФЗ', label: 'Соответствие' },
            { num: 'v31', label: 'Актуальная версия' },
            { num: '9', label: 'Категорий' },
            { num: '100%', label: 'В браузере' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 28, fontWeight: 900, background: 'linear-gradient(135deg,#60a5fa,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.num}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '60px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 40, background: 'linear-gradient(90deg,#60a5fa,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Всё что нужно — в одном месте
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {[
            { icon: '🔐', title: 'Безопасность', text: '152-ФЗ, OTP-авторизация по email, шифрование данных TLS/HTTPS, хранение в России' },
            { icon: '🤖', title: 'AI Gemini 3', text: 'Умный помощник отвечает на вопросы, помогает с кодом, анализирует данные, голосовой ввод' },
            { icon: '⌨️', title: 'Облачная разработка', text: 'Чайка BJS — полная IDE с AI, Чайка.BIN — ASIC/x86, КонструкторПлат — PCB-редактор' },
            { icon: '🧬', title: 'Наука и инженерия', text: 'BioLab-симулятор, аэродинамическая труба Чайк.АДТ, RubiCAD по ГОСТ' },
            { icon: '📡', title: 'Мессенджер Чайка', text: 'Каналы, группы, голосовые сообщения, реакции, магазин, музыкальная библиотека' },
            { icon: '☁️', title: 'Облачный диск', text: 'Личное хранилище с папками, drag-and-drop на рабочий стол и мгновенным доступом' },
          ].map((f, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '22px 20px' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── APPS ── */}
      <section id="apps-section" style={{ padding: '60px 32px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 8, color: '#fff' }}>
            50+ приложений
          </h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 28 }}>
            Офис · Разработка · Наука · Мессенджер · Социальные сети · Игры · Сервисы · AI
          </p>

          {/* Section filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
            <button onClick={() => setActiveSection(null)}
              style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: !activeSection ? '#3b82f6' : 'rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              Все
            </button>
            {SECTIONS.map(s => (
              <button key={s} onClick={() => setActiveSection(s === activeSection ? null : s)}
                style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: activeSection === s ? '#7c3aed' : 'rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                {s}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {filteredApps.map((app, i) => (
              <div key={i}
                onMouseEnter={() => setHoveredApp(i)}
                onMouseLeave={() => setHoveredApp(null)}
                style={{
                  background: hoveredApp === i ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                  border: hoveredApp === i ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12, padding: '14px 14px', cursor: 'default',
                  transition: 'all 0.15s', display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                <span style={{ fontSize: 26, flexShrink: 0, lineHeight: 1.2 }}>{app.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: hoveredApp === i ? '#93c5fd' : '#fff' }}>{app.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{app.desc}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 9, background: 'rgba(124,58,237,0.3)', color: '#c4b5fd', borderRadius: 20, padding: '2px 8px', fontWeight: 700, letterSpacing: 0.5 }}>{app.section.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEW IN v31 ── */}
      <section style={{ padding: '60px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 8, color: '#fff' }}>
          🆕 Новое в Чайка ОС v31
        </h2>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 14, marginBottom: 36 }}>14 новых приложений и улучшений</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {[
            { icon: '⌨️', title: 'Чайка BJS', desc: 'Облачная IDE с AI-наставником, поддержкой ASIC и командной работой' },
            { icon: '🔲', title: 'Чайка.BIN', desc: 'Моделирование ASIC/x86: RTL-симуляция, временные диаграммы, отладка' },
            { icon: '🔌', title: 'КонструкторПлат', desc: 'AI-PCB редактор с 12-слойной трассировкой и 3D-просмотром' },
            { icon: '🌀', title: 'Чайк.АДТ', desc: '3D-симулятор аэродинамической трубы для образования и инженерии' },
            { icon: '🧬', title: 'Чайка.BioLab', desc: 'Цифровая лаборатория: биореактор, химическая БД, AI-аналитик' },
            { icon: '📐', title: 'RubiCAD', desc: 'AutoCAD в браузере: 2D/3D, AI-генератор чертежей по ГОСТ' },
            { icon: '📈', title: 'Я-Россия: Аналитика', desc: 'Живые счётчики ВВП, ЗВР, прогнозы МВФ, карта зарплат 40 регионов' },
            { icon: '🔺', title: 'Треугольник', desc: 'Соцсеть для визуальных историй — аналог Instagram без лишнего шума' },
            { icon: '🗣️', title: 'Общественное мнение', desc: 'Платформа обращений граждан с отслеживанием статуса в реальном времени' },
            { icon: '🎮', title: 'Наследие Вагнер', desc: 'Тактический FPS в браузере: 3 класса бойцов, волны врагов, AK-74/ПКМ/СВД' },
            { icon: '🛒', title: 'МаркетПлюс', desc: 'Маркетплейс с доставкой по России — тысячи проверенных товаров' },
            { icon: '📌', title: 'Кнопочки', desc: 'Доска вдохновения: сохраняйте красивые изображения в тематические коллекции' },
            { icon: '⚙️', title: 'INI.framework', desc: 'Конфигурационная платформа с криптографией и версионностью' },
            { icon: '📋', title: 'Чайка.DOC', desc: 'Офисный пакет с AI: текст, таблицы, счета — всё в одном окне' },
          ].map((item, i) => (
            <div key={i} style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: '16px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 30, flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#c4b5fd', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMPLIANCE ── */}
      <section style={{ padding: '60px 32px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 20, color: '#fff' }}>
            🇷🇺 Соответствие российскому законодательству
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              { label: '152-ФЗ',          desc: 'Защита персональных данных' },
              { label: 'Хранение в РФ',   desc: 'Данные не покидают Россию' },
              { label: 'OTP-верификация', desc: 'Подтверждение по email' },
              { label: 'HTTPS/TLS',       desc: 'Шифрование всех соединений' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(21,101,192,0.15)', border: '1px solid rgba(21,101,192,0.35)', borderRadius: 12, padding: '16px 14px' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#60a5fa', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '60px 32px 80px', textAlign: 'center', background: 'linear-gradient(160deg, #0f172a, #1e3a5f, #0f172a)' }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, marginBottom: 16, color: '#fff' }}>Начните прямо сейчас</h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', marginBottom: 32 }}>Бесплатная регистрация. Никаких загрузок.</p>
        <button onClick={() => navigate('/')}
          style={{ padding: '16px 48px', background: 'linear-gradient(135deg,#7c3aed,#1565c0)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 18, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 40px rgba(59,130,246,0.4)', letterSpacing: 0.5 }}>
          🕊️ Войти в Чайка ОС v31
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>© 2026 Чайка ОС v31 · Все права защищены</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>152-ФЗ · Технология INI.framework · Сделано в России 🇷🇺 · <a href="/special" style={{ color: '#a78bfa', textDecoration: 'none' }}>Специальные возможности API</a></span>
      </footer>
    </div>
  );
}

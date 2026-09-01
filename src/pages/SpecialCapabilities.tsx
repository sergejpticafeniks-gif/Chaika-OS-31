import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── API Category Config ───────────────────────────────────────
const CATEGORIES = [
  { id: 'all',           label: 'Все',               icon: '⚡', color: '#7c3aed' },
  { id: 'auth',          label: 'Авторизация',        icon: '🔐', color: '#1565c0' },
  { id: 'user',          label: 'Пользователь',       icon: '👤', color: '#0891b2' },
  { id: 'desktop',       label: 'Рабочий стол',       icon: '🖥️', color: '#7c3aed' },
  { id: 'window',        label: 'Окна',               icon: '🪟', color: '#6d28d9' },
  { id: 'filesystem',    label: 'Файловая система',   icon: '📁', color: '#b45309' },
  { id: 'storage',       label: 'Хранилище',          icon: '☁️', color: '#0369a1' },
  { id: 'messenger',     label: 'Мессенджер',         icon: '🕊️', color: '#7c3aed' },
  { id: 'notifications', label: 'Уведомления',        icon: '🔔', color: '#d97706' },
  { id: 'database',      label: 'База данных',        icon: '🗄️', color: '#065f46' },
  { id: 'apps',          label: 'Приложения',         icon: '📦', color: '#9333ea' },
  { id: 'system',        label: 'Система',            icon: '⚙️', color: '#374151' },
  { id: 'ini',           label: 'INI-конфиг',         icon: '📋', color: '#1e3a5f' },
  { id: 'hardware',      label: 'Железо/GPIO',        icon: '🔌', color: '#1d4ed8' },
  { id: 'ai',            label: 'AI-ассистент',       icon: '🤖', color: '#6d28d9' },
  { id: 'crm',           label: 'CRM',                icon: '👥', color: '#065f46' },
  { id: 'media',         label: 'Медиа',              icon: '▶️', color: '#dc2626' },
  { id: 'settings',      label: 'Настройки',          icon: '🎛️', color: '#374151' },
  { id: 'index',         label: 'Индексы',            icon: '📈', color: '#1565c0' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: '#22c55e', POST: '#3b82f6', PUT: '#f59e0b', DELETE: '#ef4444', WS: '#8b5cf6',
};

interface ApiFunc {
  id: string; category: string; name: string; method: string; path: string;
  description?: string; params?: any; returns?: any; example?: any;
}

// ─── API Functions data (abbreviated, loaded from JSON in real impl) ────────
const API_FUNCTIONS: ApiFunc[] = [
  { id: 'auth.sendOtp',       category: 'auth',          method: 'POST',   path: '/auth/otp/send',          name: 'Отправить OTP-код',              description: 'Отправляет одноразовый пароль на email для входа или регистрации' },
  { id: 'auth.verifyOtp',     category: 'auth',          method: 'POST',   path: '/auth/otp/verify',        name: 'Подтвердить OTP-код',            description: 'Проверяет OTP и возвращает JWT-токен сессии' },
  { id: 'auth.login',         category: 'auth',          method: 'POST',   path: '/auth/login',             name: 'Вход по паролю',                 description: 'Авторизация по email и паролю, возвращает access_token' },
  { id: 'auth.register',      category: 'auth',          method: 'POST',   path: '/auth/register',          name: 'Регистрация',                    description: 'Создаёт новый аккаунт Чайка ОС с доступом ко всей экосистеме' },
  { id: 'auth.logout',        category: 'auth',          method: 'POST',   path: '/auth/logout',            name: 'Выход из системы',               description: 'Завершает сессию и инвалидирует токены' },
  { id: 'auth.refreshToken',  category: 'auth',          method: 'POST',   path: '/auth/refresh',           name: 'Обновить токен',                 description: 'Выдаёт новый access_token по refresh_token' },
  { id: 'auth.getSession',    category: 'auth',          method: 'GET',    path: '/auth/session',           name: 'Получить сессию',                description: 'Возвращает текущую активную сессию' },
  { id: 'auth.changePassword',category: 'auth',          method: 'PUT',    path: '/auth/password',          name: 'Изменить пароль',                description: 'Изменяет пароль текущего пользователя' },
  { id: 'auth.resetPassword', category: 'auth',          method: 'POST',   path: '/auth/password/reset',   name: 'Сброс пароля',                   description: 'Инициирует сброс пароля через email' },
  { id: 'auth.checkAdmin',    category: 'auth',          method: 'GET',    path: '/auth/is-admin',          name: 'Проверить права',                description: 'Проверяет является ли пользователь администратором ОС' },
  { id: 'user.getProfile',    category: 'user',          method: 'GET',    path: '/user/profile',           name: 'Получить профиль',               description: 'Возвращает профиль текущего авторизованного пользователя' },
  { id: 'user.updateProfile', category: 'user',          method: 'PUT',    path: '/user/profile',           name: 'Обновить профиль',               description: 'Обновляет данные профиля (имя, username, город)' },
  { id: 'user.getById',       category: 'user',          method: 'GET',    path: '/user/{id}',              name: 'Найти по ID',                    description: 'Публичный профиль пользователя по UUID или display_id' },
  { id: 'user.search',        category: 'user',          method: 'GET',    path: '/user/search',            name: 'Поиск пользователей',            description: 'Поиск по username или display_id' },
  { id: 'user.getQuota',      category: 'user',          method: 'GET',    path: '/user/storage-quota',     name: 'Квота хранилища',                description: 'Лимит и использование облачного хранилища' },
  { id: 'desktop.openApp',    category: 'desktop',       method: 'POST',   path: '/desktop/app/open',       name: 'Открыть приложение',             description: 'Открывает окно любого приложения на рабочем столе пользователя' },
  { id: 'desktop.getIcons',   category: 'desktop',       method: 'GET',    path: '/desktop/icons',          name: 'Иконки рабочего стола',          description: 'Список иконок на рабочем столе' },
  { id: 'desktop.setWallpaper',category:'desktop',       method: 'PUT',    path: '/desktop/wallpaper',      name: 'Сменить обои',                   description: 'Устанавливает новые обои (ID или custom URL)' },
  { id: 'desktop.getTheme',   category: 'desktop',       method: 'GET',    path: '/desktop/theme',          name: 'Получить тему',                  description: 'Текущие настройки темы оформления' },
  { id: 'desktop.setTheme',   category: 'desktop',       method: 'PUT',    path: '/desktop/theme',          name: 'Установить тему',                description: 'Применяет тему оформления' },
  { id: 'desktop.event',      category: 'desktop',       method: 'POST',   path: '/desktop/event',          name: 'Событие ОС',                     description: 'Публикует событие для компонентов ОС через dispatchEvent' },
  { id: 'desktop.toast',      category: 'desktop',       method: 'POST',   path: '/desktop/toast',          name: 'Тост-уведомление',               description: 'Показывает всплывающее уведомление на рабочем столе' },
  { id: 'window.list',        category: 'window',        method: 'GET',    path: '/window/list',            name: 'Список окон',                    description: 'Все открытые окна на рабочем столе' },
  { id: 'window.close',       category: 'window',        method: 'DELETE', path: '/window/{id}',            name: 'Закрыть окно',                   description: 'Закрывает окно по ID' },
  { id: 'window.minimize',    category: 'window',        method: 'PUT',    path: '/window/{id}/minimize',   name: 'Свернуть окно' },
  { id: 'window.maximize',    category: 'window',        method: 'PUT',    path: '/window/{id}/maximize',   name: 'Развернуть окно' },
  { id: 'window.focus',       category: 'window',        method: 'PUT',    path: '/window/{id}/focus',      name: 'Активировать окно' },
  { id: 'window.setPosition', category: 'window',        method: 'PUT',    path: '/window/{id}/position',  name: 'Переместить окно',               description: 'Устанавливает координаты окна на экране' },
  { id: 'window.setSize',     category: 'window',        method: 'PUT',    path: '/window/{id}/size',       name: 'Изменить размер' },
  { id: 'window.getActive',   category: 'window',        method: 'GET',    path: '/window/active',          name: 'Активное окно',                  description: 'Возвращает текущее активное окно' },
  { id: 'fs.list',            category: 'filesystem',    method: 'GET',    path: '/fs/files',               name: 'Список файлов',                  description: 'Файлы рабочего стола пользователя' },
  { id: 'fs.upload',          category: 'filesystem',    method: 'POST',   path: '/fs/upload',              name: 'Загрузить файл',                 description: 'Загружает файл и создаёт иконку на рабочем столе' },
  { id: 'fs.delete',          category: 'filesystem',    method: 'DELETE', path: '/fs/files/{id}',          name: 'Удалить файл' },
  { id: 'fs.rename',          category: 'filesystem',    method: 'PUT',    path: '/fs/files/{id}/rename',   name: 'Переименовать файл' },
  { id: 'fs.move',            category: 'filesystem',    method: 'PUT',    path: '/fs/files/{id}/move',     name: 'Переместить файл' },
  { id: 'fs.createFolder',    category: 'filesystem',    method: 'POST',   path: '/fs/folders',             name: 'Создать папку' },
  { id: 'fs.listFolders',     category: 'filesystem',    method: 'GET',    path: '/fs/folders',             name: 'Список папок' },
  { id: 'fs.deleteFolder',    category: 'filesystem',    method: 'DELETE', path: '/fs/folders/{id}',        name: 'Удалить папку' },
  { id: 'fs.fileUrl',         category: 'filesystem',    method: 'GET',    path: '/fs/files/{id}/url',      name: 'URL файла',                      description: 'Публичная ссылка для скачивания' },
  { id: 'st.upload',          category: 'storage',       method: 'POST',   path: '/storage/upload',         name: 'Загрузить в хранилище',          description: 'Загружает файл в бакет Supabase Storage' },
  { id: 'st.download',        category: 'storage',       method: 'GET',    path: '/storage/download',       name: 'Скачать из хранилища' },
  { id: 'st.delete',          category: 'storage',       method: 'DELETE', path: '/storage/delete',         name: 'Удалить из хранилища' },
  { id: 'st.url',             category: 'storage',       method: 'GET',    path: '/storage/url',            name: 'Публичный URL' },
  { id: 'st.list',            category: 'storage',       method: 'GET',    path: '/storage/list',           name: 'Файлы бакета' },
  { id: 'msg.convos',         category: 'messenger',     method: 'GET',    path: '/messenger/conversations',name: 'Список диалогов',                description: 'Все личные диалоги пользователя' },
  { id: 'msg.messages',       category: 'messenger',     method: 'GET',    path: '/messenger/conversations/{id}/messages', name: 'Сообщения диалога' },
  { id: 'msg.send',           category: 'messenger',     method: 'POST',   path: '/messenger/conversations/{id}/messages', name: 'Отправить сообщение', description: 'Отправляет текст, голосовое или изображение' },
  { id: 'msg.newConvo',       category: 'messenger',     method: 'POST',   path: '/messenger/conversations', name: 'Создать диалог' },
  { id: 'msg.groups',         category: 'messenger',     method: 'GET',    path: '/messenger/groups',       name: 'Список групп' },
  { id: 'msg.createGroup',    category: 'messenger',     method: 'POST',   path: '/messenger/groups',       name: 'Создать группу' },
  { id: 'msg.channels',       category: 'messenger',     method: 'GET',    path: '/messenger/channels',     name: 'Список каналов' },
  { id: 'msg.posts',          category: 'messenger',     method: 'GET',    path: '/messenger/channels/{id}/posts', name: 'Посты канала' },
  { id: 'msg.voice',          category: 'messenger',     method: 'POST',   path: '/messenger/conversations/{id}/voice', name: 'Отправить голосовое', description: 'Загружает аудио и создаёт голосовое сообщение' },
  { id: 'msg.react',          category: 'messenger',     method: 'POST',   path: '/messenger/messages/{id}/reaction', name: 'Реакция на сообщение' },
  { id: 'msg.share',          category: 'messenger',     method: 'POST',   path: '/messenger/share',        name: 'Поделиться в чат',               description: 'Вставляет текст в активный открытый чат' },
  { id: 'msg.unread',         category: 'messenger',     method: 'GET',    path: '/messenger/unread',       name: 'Непрочитанные' },
  { id: 'ntf.list',           category: 'notifications', method: 'GET',    path: '/notifications',          name: 'Список уведомлений' },
  { id: 'ntf.send',           category: 'notifications', method: 'POST',   path: '/notifications',          name: 'Отправить уведомление',          description: 'Создаёт системное уведомление в трее ОС' },
  { id: 'ntf.read',           category: 'notifications', method: 'PUT',    path: '/notifications/{id}/read',name: 'Прочитать' },
  { id: 'ntf.readAll',        category: 'notifications', method: 'PUT',    path: '/notifications/read-all', name: 'Прочитать все' },
  { id: 'ntf.delete',         category: 'notifications', method: 'DELETE', path: '/notifications/{id}',     name: 'Удалить' },
  { id: 'ntf.browser',        category: 'notifications', method: 'POST',   path: '/notifications/browser/request', name: 'Браузерные уведомления', description: 'Запрашивает разрешение на push-уведомления' },
  { id: 'db.select',          category: 'database',      method: 'GET',    path: '/db/{table}',             name: 'SELECT',                         description: 'Выборка данных из разрешённых таблиц с фильтрами' },
  { id: 'db.insert',          category: 'database',      method: 'POST',   path: '/db/{table}',             name: 'INSERT',                         description: 'Вставка строк в таблицу' },
  { id: 'db.update',          category: 'database',      method: 'PUT',    path: '/db/{table}/{id}',        name: 'UPDATE' },
  { id: 'db.delete',          category: 'database',      method: 'DELETE', path: '/db/{table}/{id}',        name: 'DELETE' },
  { id: 'db.rpc',             category: 'database',      method: 'POST',   path: '/db/rpc/{function}',      name: 'RPC-функция',                    description: 'Вызов хранимых PostgreSQL-процедур' },
  { id: 'db.realtime',        category: 'database',      method: 'WS',     path: '/db/realtime/{table}',    name: 'Realtime WebSocket',             description: 'Подписка на изменения таблицы (INSERT/UPDATE/DELETE)' },
  { id: 'apps.register',      category: 'apps',          method: 'POST',   path: '/apps/register',          name: 'Зарегистрировать приложение',    description: 'Добавляет внешнее приложение в реестр Чайка ОС' },
  { id: 'apps.list',          category: 'apps',          method: 'GET',    path: '/apps',                   name: 'Список приложений' },
  { id: 'apps.get',           category: 'apps',          method: 'GET',    path: '/apps/{id}',              name: 'Информация о приложении' },
  { id: 'apps.launch',        category: 'apps',          method: 'POST',   path: '/apps/{id}/launch',       name: 'Запустить приложение',           description: 'Открывает окно приложения на рабочем столе пользователя' },
  { id: 'apps.unregister',    category: 'apps',          method: 'DELETE', path: '/apps/{id}',              name: 'Удалить приложение' },
  { id: 'apps.updateIcon',    category: 'apps',          method: 'PUT',    path: '/apps/{id}/icon',         name: 'Сменить иконку' },
  { id: 'apps.permissions',   category: 'apps',          method: 'GET',    path: '/apps/{id}/permissions',  name: 'Разрешения приложения' },
  { id: 'apps.reqPermission', category: 'apps',          method: 'POST',   path: '/apps/{id}/permissions/request', name: 'Запросить разрешение', description: 'Запрашивает у пользователя дополнительные права' },
  { id: 'apps.addStartMenu',  category: 'apps',          method: 'POST',   path: '/apps/{id}/start-menu',   name: 'В Меню Пуск' },
  { id: 'apps.addDesktop',    category: 'apps',          method: 'POST',   path: '/apps/{id}/desktop-icon', name: 'На рабочий стол' },
  { id: 'sys.info',           category: 'system',        method: 'GET',    path: '/system/info',            name: 'Информация о системе',           description: 'Версия ОС, статус HASP, количество приложений' },
  { id: 'sys.logs',           category: 'system',        method: 'GET',    path: '/system/logs',            name: 'Системные логи' },
  { id: 'sys.haspCheck',      category: 'system',        method: 'POST',   path: '/system/hasp/check',      name: 'Проверить HASP',                 description: 'Проверяет аппаратный ключ защиты Sentinel' },
  { id: 'sys.haspStatus',     category: 'system',        method: 'GET',    path: '/system/hasp/status',     name: 'Статус HASP' },
  { id: 'sys.broadcast',      category: 'system',        method: 'POST',   path: '/system/events/broadcast',name: 'Системное событие' },
  { id: 'sys.startMenu',      category: 'system',        method: 'GET',    path: '/system/start-menu',      name: 'Структура Меню Пуск' },
  { id: 'sys.reload',         category: 'system',        method: 'POST',   path: '/system/desktop/reload',  name: 'Обновить рабочий стол' },
  { id: 'ini.parse',          category: 'ini',           method: 'POST',   path: '/ini/parse',              name: 'Парсить INI',                    description: 'Преобразует INI-строку в JSON с секциями и ключами' },
  { id: 'ini.serialize',      category: 'ini',           method: 'POST',   path: '/ini/serialize',          name: 'Сериализовать INI',              description: 'JSON-секции → INI-строка' },
  { id: 'ini.save',           category: 'ini',           method: 'POST',   path: '/ini/configs',            name: 'Сохранить конфигурацию',         description: 'Облачное сохранение INI с именем устройства' },
  { id: 'ini.list',           category: 'ini',           method: 'GET',    path: '/ini/configs',            name: 'Список конфигураций' },
  { id: 'ini.load',           category: 'ini',           method: 'GET',    path: '/ini/configs/{id}',       name: 'Загрузить конфигурацию' },
  { id: 'ini.delete',         category: 'ini',           method: 'DELETE', path: '/ini/configs/{id}',       name: 'Удалить конфигурацию' },
  { id: 'ini.validate',       category: 'ini',           method: 'POST',   path: '/ini/validate',           name: 'Валидировать INI' },
  { id: 'hw.gpioRead',        category: 'hardware',      method: 'GET',    path: '/hardware/gpio/{pin}',    name: 'Читать GPIO пин' },
  { id: 'hw.gpioWrite',       category: 'hardware',      method: 'PUT',    path: '/hardware/gpio/{pin}',    name: 'Записать GPIO пин' },
  { id: 'hw.gpioMode',        category: 'hardware',      method: 'PUT',    path: '/hardware/gpio/{pin}/mode', name: 'Режим GPIO пина' },
  { id: 'hw.serialSend',      category: 'hardware',      method: 'POST',   path: '/hardware/serial/send',   name: 'Отправить в Serial',             description: 'Команда через Serial/UART порт устройства' },
  { id: 'hw.serialConnect',   category: 'hardware',      method: 'POST',   path: '/hardware/serial/connect',name: 'Подключить Serial' },
  { id: 'hw.remoteConnect',   category: 'hardware',      method: 'POST',   path: '/hardware/remote/connect',name: 'Удалённое подключение',          description: 'P25-туннель по Device ID с шифрованием AES-256' },
  { id: 'hw.remoteCommand',   category: 'hardware',      method: 'POST',   path: '/hardware/remote/{sid}/command', name: 'Команда удалённому', description: 'Выполняет команду на удалённом устройстве' },
  { id: 'hw.hasp',            category: 'hardware',      method: 'POST',   path: '/hardware/hasp/check',    name: 'Проверить HASP-ключ',            description: 'WebUSB + INI-конфиг проверка Sentinel HASP' },
  { id: 'ai.chat',            category: 'ai',            method: 'POST',   path: '/ai/chat',                name: 'Чат с AI',                       description: 'Диалог с Gemini 3 — ответы, анализ, советы' },
  { id: 'ai.analyze',         category: 'ai',            method: 'POST',   path: '/ai/analyze',             name: 'Анализ данных' },
  { id: 'ai.code',            category: 'ai',            method: 'POST',   path: '/ai/code',                name: 'Генерация кода',                 description: 'Генерирует код на любом языке по описанию' },
  { id: 'ai.speech',          category: 'ai',            method: 'POST',   path: '/ai/speech-to-text',      name: 'Речь в текст' },
  { id: 'ai.translate',       category: 'ai',            method: 'POST',   path: '/ai/translate',           name: 'Перевод' },
  { id: 'ai.summarize',       category: 'ai',            method: 'POST',   path: '/ai/summarize',           name: 'Суммаризация' },
  { id: 'crm.contacts',       category: 'crm',           method: 'GET',    path: '/crm/contacts',           name: 'Список контактов' },
  { id: 'crm.addContact',     category: 'crm',           method: 'POST',   path: '/crm/contacts',           name: 'Создать контакт' },
  { id: 'crm.deals',          category: 'crm',           method: 'GET',    path: '/crm/deals',              name: 'Список сделок' },
  { id: 'crm.addDeal',        category: 'crm',           method: 'POST',   path: '/crm/deals',              name: 'Создать сделку' },
  { id: 'crm.tasks',          category: 'crm',           method: 'GET',    path: '/crm/tasks',              name: 'Список задач' },
  { id: 'crm.addTask',        category: 'crm',           method: 'POST',   path: '/crm/tasks',              name: 'Создать задачу' },
  { id: 'med.videos',         category: 'media',         method: 'GET',    path: '/media/videos',           name: 'Видео (Тумба)',                  description: 'Каталог видео с фильтрами и поиском' },
  { id: 'med.upload',         category: 'media',         method: 'POST',   path: '/media/videos',           name: 'Загрузить видео' },
  { id: 'med.react',          category: 'media',         method: 'POST',   path: '/media/videos/{id}/react',name: 'Реакция на видео' },
  { id: 'med.share',          category: 'media',         method: 'POST',   path: '/media/videos/{id}/share',name: 'Поделиться видео' },
  { id: 'cfg.get',            category: 'settings',      method: 'GET',    path: '/settings/{key}',         name: 'Получить настройку' },
  { id: 'cfg.set',            category: 'settings',      method: 'PUT',    path: '/settings/{key}',         name: 'Установить настройку' },
  { id: 'cfg.getAll',         category: 'settings',      method: 'GET',    path: '/settings',               name: 'Все настройки' },
  { id: 'cfg.reset',          category: 'settings',      method: 'POST',   path: '/settings/reset',         name: 'Сбросить настройки' },
  { id: 'idx.values',         category: 'index',         method: 'GET',    path: '/index/values',           name: 'Значения индексов',              description: 'Актуальные экономические индексы Я-Россия' },
  { id: 'idx.news',           category: 'index',         method: 'GET',    path: '/index/news',             name: 'Новости по индексам' },
  { id: 'idx.market',         category: 'index',         method: 'GET',    path: '/index/market',           name: 'Рыночные индексы' },
];

// ─── Example App Code ─────────────────────────────────────────
const EXAMPLE_APP_CODE = `<!-- manifest.json — регистрация в Чайка ОС -->
{
  "name": "hello-chaika",
  "title": "Привет, Чайка!",
  "version": "1.0.0",
  "url": "https://my-app.example.com",
  "logo_emoji": "👋",
  "description": "Моё первое приложение для Чайка ОС",
  "section": "Разработка",
  "permissions": [
    "user:id",
    "user:profile",
    "desktop:notifications",
    "messenger:send"
  ],
  "min_width": 400,
  "min_height": 300
}`;

const EXAMPLE_INIT_CODE = `// Инициализация SDK Чайка ОС
// Токен передаётся при открытии приложения через URL
const token = new URLSearchParams(window.location.search).get('token');

// Инициализация клиента
const sdk = new ChaikaOS({ token, baseUrl: 'https://api.chaika-os.ru/v1' });

// 1. Получить профиль пользователя
const { data: profile } = await sdk.user.getProfile();
console.log('Пользователь:', profile.username, '| ID:', profile.id);

// 2. Открыть мессенджер и поделиться текстом
window.dispatchEvent(new CustomEvent('chaika-open-app', {
  detail: {
    appId: 'messenger',
    shareText: 'Привет из моего приложения! 👋'
  }
}));

// 3. Отправить уведомление в трей ОС
await sdk.notifications.send({
  user_id: profile.id,
  type: 'app',
  title: '👋 Привет, Чайка!',
  body: \`Добро пожаловать, \${profile.username}!\`
});

// 4. Сохранить INI-конфиг в облако
await sdk.ini.save({
  device_name: 'МойАрдуино',
  ini_content: '[device]\\nname=test\\nport=COM3'
});

// 5. Проверить HASP-ключ
const hasp = await sdk.hardware.hasp.check({ slot: 1, vendor_code: '0x1234' });
if (!hasp.found) {
  console.warn('HASP-ключ не найден — защита снижена');
}`;

const EXAMPLE_IFRAME_CODE = `<!-- Встраивание приложения в ОС через WebApp -->
<!-- Ваш сайт/приложение открывается в окне ОС как iframe -->

<!-- В Чайка ОС ваше приложение регистрируется через API: -->
POST https://api.chaika-os.ru/v1/apps/register
{
  "title": "Моё приложение",
  "url": "https://my-app.example.com",
  "logo_emoji": "🚀",
  "section": "Разработка",
  "permissions": ["user:id", "user:profile"]
}

<!-- После регистрации приложение появляется в Меню Пуск -->
<!-- Пользователь открывает его двойным кликом -->
<!-- URL получает параметр ?token=<JWT> для авторизации -->`;

export default function SpecialCapabilities() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [activeTab, setActiveTab] = useState<'api' | 'example' | 'events' | 'permissions' | 'sdk'>('api');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = API_FUNCTIONS.filter(fn => {
    const matchCat = activeCategory === 'all' || fn.category === activeCategory;
    const q = searchQ.toLowerCase();
    const matchSearch = !q || fn.name.toLowerCase().includes(q) || fn.path.toLowerCase().includes(q) || (fn.description || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const EVENTS = [
    { name: 'chaika-open-app',               detail: '{ appId, shareText? }',    desc: 'Открыть приложение по appId, опционально с текстом для вставки в чат' },
    { name: 'chaika-messenger-notification', detail: '{ title, body, chatId }',   desc: 'Уведомление от Мессенджера для трея ОС' },
    { name: 'chaika-sysconfig-tab',          detail: '{ tab }',                   desc: 'Переключить вкладку Системного конфигуратора (gpio/hasp/ini-raw/...)' },
    { name: 'icon-overrides-updated',        detail: '{}',                        desc: 'Иконки приложений были обновлены администратором' },
    { name: 'chaika-hasp-status',            detail: '{ status: found|not_found }', desc: 'Изменился статус HASP-ключа в системе' },
  ];

  const PERMISSIONS = [
    { perm: 'desktop:open_app',    desc: 'Открывать приложения на рабочем столе' },
    { perm: 'desktop:set_wallpaper',desc: 'Изменять обои рабочего стола' },
    { perm: 'desktop:notifications',desc: 'Показывать уведомления в трее' },
    { perm: 'filesystem:read',     desc: 'Читать файлы пользователя' },
    { perm: 'filesystem:write',    desc: 'Создавать и изменять файлы' },
    { perm: 'filesystem:delete',   desc: 'Удалять файлы' },
    { perm: 'storage:upload',      desc: 'Загружать файлы в облачное хранилище' },
    { perm: 'storage:download',    desc: 'Скачивать файлы из хранилища' },
    { perm: 'messenger:read',      desc: 'Читать сообщения мессенджера' },
    { perm: 'messenger:send',      desc: 'Отправлять сообщения' },
    { perm: 'messenger:channels',  desc: 'Управлять каналами' },
    { perm: 'database:read',       desc: 'SELECT-запросы к разрешённым таблицам' },
    { perm: 'database:write',      desc: 'INSERT/UPDATE/DELETE к пользовательским таблицам' },
    { perm: 'user:id',             desc: 'Получить UUID пользователя' },
    { perm: 'user:profile',        desc: 'Читать публичный профиль' },
    { perm: 'system:logs',         desc: 'Просматривать системные логи' },
    { perm: 'system:hasp',         desc: 'Проверять HASP-ключ' },
    { perm: 'hardware:gpio',       desc: 'Управлять GPIO-пинами устройств' },
    { perm: 'hardware:serial',     desc: 'Отправлять команды через Serial/UART' },
    { perm: 'hardware:remote',     desc: 'Удалённое управление устройствами по P25' },
    { perm: 'ini:read',            desc: 'Читать INI-конфигурации' },
    { perm: 'ini:write',           desc: 'Сохранять INI-конфигурации' },
    { perm: 'ai:chat',             desc: 'Отправлять запросы AI-ассистенту' },
    { perm: 'ai:generate',         desc: 'Генерировать контент через AI' },
    { perm: 'crm:read',            desc: 'Читать CRM-данные' },
    { perm: 'crm:write',           desc: 'Создавать и изменять CRM-записи' },
    { perm: 'media:read',          desc: 'Читать медиаконтент (Тумба)' },
    { perm: 'media:upload',        desc: 'Загружать медиаконтент' },
  ];

  const catCfg = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif", background: '#050d1a', color: '#fff', overflowY: 'auto', overflowX: 'hidden', minHeight: '100vh', height: '100%' }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,13,26,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 32px', display: 'flex', alignItems: 'center', height: 56, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/about')}>
          <span style={{ fontSize: 18, fontWeight: 800, background: 'linear-gradient(90deg,#60a5fa,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Чайка ОС</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>v31</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>›</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#a78bfa' }}>Специальные возможности API</span>
        <div style={{ flex: 1 }} />
        <a href="/api/chaika-os-api.json" target="_blank" style={{ padding: '7px 16px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 8, color: '#a78bfa', fontSize: 12, textDecoration: 'none', fontWeight: 700 }}>
          📥 Скачать JSON-схему
        </a>
        <button onClick={() => navigate('/')} style={{ padding: '7px 20px', background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Войти в ОС →
        </button>
      </header>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(160deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)', padding: '60px 32px 50px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 40%,rgba(124,58,237,0.15) 0%,transparent 60%), radial-gradient(circle at 70% 60%,rgba(59,130,246,0.1) 0%,transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 20, padding: '5px 16px', fontSize: 12, color: '#c4b5fd', marginBottom: 20, fontWeight: 700 }}>
            ⚡ Чайка ОС API v1.0
          </div>
          <h1 style={{ fontSize: 'clamp(28px,4vw,56px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16, background: 'linear-gradient(135deg,#fff 0%,#c4b5fd 50%,#93c5fd 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Специальные возможности
          </h1>
          <p style={{ fontSize: 'clamp(14px,2vw,18px)', color: 'rgba(255,255,255,0.6)', maxWidth: 680, margin: '0 auto 12px', lineHeight: 1.7 }}>
            Полный программный интерфейс Чайка ОС — регистрируйте приложения, управляйте окнами, файловой системой, мессенджером, железом и AI-ассистентом
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 32 }}>
            {API_FUNCTIONS.length}+ функций · REST API · WebSocket · Системные события · JWT-авторизация
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {(['api', 'example', 'events', 'permissions', 'sdk'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '10px 22px', background: activeTab === t ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'rgba(255,255,255,0.07)', border: activeTab === t ? 'none' : '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t === 'api' ? '⚡ Справочник API' : t === 'example' ? '📋 Пример приложения' : t === 'events' ? '📡 События ОС' : t === 'permissions' ? '🔑 Разрешения' : '📦 SDK'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <div style={{ padding: '20px 32px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 16, textAlign: 'center' }}>
          {[
            { n: `${API_FUNCTIONS.length}+`, l: 'API-функций' },
            { n: `${CATEGORIES.length - 1}`, l: 'Категорий' },
            { n: 'JWT', l: 'Авторизация' },
            { n: 'REST', l: 'Протокол' },
            { n: 'WS', l: 'Realtime' },
            { n: 'MIT', l: 'Лицензия' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 22, fontWeight: 900, background: 'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.n}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 32px 80px' }}>

        {/* ── API Tab ── */}
        {activeTab === 'api' && (
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            {/* Category sidebar */}
            <div style={{ width: 200, flexShrink: 0, position: 'sticky', top: 72 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' }}>Категории</div>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: activeCategory === cat.id ? `${cat.color}25` : 'none', border: activeCategory === cat.id ? `1px solid ${cat.color}60` : '1px solid transparent', borderRadius: 9, color: activeCategory === cat.id ? '#fff' : 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer', marginBottom: 3, fontFamily: 'inherit', fontWeight: activeCategory === cat.id ? 700 : 400, display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.12s' }}>
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {activeCategory === cat.id && cat.id !== 'all' && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{API_FUNCTIONS.filter(f => f.category === cat.id).length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Main content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Search */}
              <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
                  <span style={{ color: '#94a3b8', fontSize: 14 }}>🔍</span>
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Поиск по функциям и путям..." style={{ flex: 1, border: 'none', outline: 'none', background: 'none', color: '#fff', fontSize: 13, padding: '10px 0', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                  {filtered.length} функций
                </div>
              </div>

              {/* Category title */}
              {catCfg && catCfg.id !== 'all' && (
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${catCfg.color}25`, border: `1px solid ${catCfg.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{catCfg.icon}</div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{catCfg.label}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{filtered.length} функций в этой категории</div>
                  </div>
                </div>
              )}

              {/* Function list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map(fn => (
                  <div key={fn.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start', transition: 'border-color 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
                    <span style={{ minWidth: 50, padding: '3px 8px', background: (METHOD_COLORS[fn.method] || '#555') + '20', border: `1px solid ${METHOD_COLORS[fn.method] || '#555'}60`, borderRadius: 6, fontSize: 10, fontWeight: 800, color: METHOD_COLORS[fn.method] || '#aaa', textAlign: 'center', flexShrink: 0, letterSpacing: 0.5, fontFamily: 'Consolas, monospace', marginTop: 2 }}>{fn.method}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{fn.name}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Consolas, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fn.path}</span>
                      </div>
                      {fn.description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{fn.description}</div>}
                    </div>
                    <button onClick={() => copy(`${fn.method} https://api.chaika-os.ru/v1${fn.path}`, fn.id)} style={{ padding: '4px 10px', background: copiedId === fn.id ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)', border: copiedId === fn.id ? '1px solid #22c55e60' : '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: copiedId === fn.id ? '#86efac' : 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.15s', flexShrink: 0 }}>
                      {copiedId === fn.id ? '✓ Скопировано' : '📋 Копировать'}
                    </button>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                    <div>Нет функций по запросу «{searchQ}»</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Example App Tab ── */}
        {activeTab === 'example' && (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: '#fff' }}>📋 Пример создания приложения</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 32, lineHeight: 1.6 }}>
              Любой веб-сайт или SPA может стать приложением Чайка ОС. Достаточно зарегистрировать его через API — и оно появится в Меню Пуск всех пользователей.
            </p>

            {/* Step 1 */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>1</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Создайте манифест приложения</div>
              </div>
              <div style={{ background: '#0f172a', borderRadius: 14, padding: '18px 20px', fontFamily: 'Consolas, monospace', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, position: 'relative', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => copy(EXAMPLE_APP_CODE, 'manifest')} style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', background: copiedId === 'manifest' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)', border: copiedId === 'manifest' ? '1px solid #22c55e60' : '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: copiedId === 'manifest' ? '#86efac' : 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copiedId === 'manifest' ? '✓' : '📋'}
                </button>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{EXAMPLE_APP_CODE}</pre>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1565c0,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>2</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Зарегистрируйте приложение через API</div>
              </div>
              <div style={{ background: '#0f172a', borderRadius: 14, padding: '18px 20px', fontFamily: 'Consolas, monospace', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, position: 'relative', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => copy(EXAMPLE_IFRAME_CODE, 'iframe')} style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', background: copiedId === 'iframe' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)', border: copiedId === 'iframe' ? '1px solid #22c55e60' : '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: copiedId === 'iframe' ? '#86efac' : 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copiedId === 'iframe' ? '✓' : '📋'}
                </button>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{EXAMPLE_IFRAME_CODE}</pre>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#065f46,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>3</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Используйте SDK в приложении</div>
              </div>
              <div style={{ background: '#0f172a', borderRadius: 14, padding: '18px 20px', fontFamily: 'Consolas, monospace', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, position: 'relative', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={() => copy(EXAMPLE_INIT_CODE, 'init')} style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', background: copiedId === 'init' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)', border: copiedId === 'init' ? '1px solid #22c55e60' : '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: copiedId === 'init' ? '#86efac' : 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copiedId === 'init' ? '✓' : '📋'}
                </button>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{EXAMPLE_INIT_CODE}</pre>
              </div>
            </div>

            {/* Integration cards */}
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#fff', marginTop: 36 }}>🔗 Интеграции через системные события</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
              {[
                { title: 'Открыть Мессенджер', code: `window.dispatchEvent(new CustomEvent('chaika-open-app', { detail: { appId: 'messenger' } }))`, desc: 'Открывает окно Чайка Мессенджера' },
                { title: 'Поделиться текстом', code: `window.dispatchEvent(new CustomEvent('chaika-open-app', { detail: { appId: 'messenger', shareText: 'Текст для вставки' } }))`, desc: 'Открывает мессенджер с предзаполненным текстом' },
                { title: 'Переключить вкладку', code: `window.dispatchEvent(new CustomEvent('chaika-sysconfig-tab', { detail: { tab: 'hasp' } }))`, desc: 'Открывает HASP-вкладку Системного конфигуратора' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 16px', overflow: 'hidden' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#c4b5fd', marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 10 }}>{item.desc}</div>
                  <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 12px', fontFamily: 'Consolas, monospace', fontSize: 11, color: '#86efac', lineHeight: 1.6, cursor: 'pointer', wordBreak: 'break-all' }} onClick={() => copy(item.code, `event_${i}`)}>
                    {copiedId === `event_${i}` ? '✓ Скопировано' : item.code}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Events Tab ── */}
        {activeTab === 'events' && (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: '#fff' }}>📡 Системные события ОС</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 32, lineHeight: 1.6 }}>
              Компоненты Чайка ОС взаимодействуют через кастомные события <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>window.dispatchEvent</code>. Ваше приложение может подписываться и отправлять эти события.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {EVENTS.map((ev, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                    <span style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 800, color: '#c4b5fd', flexShrink: 0, fontFamily: 'Consolas, monospace' }}>event</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Consolas, monospace', marginBottom: 4 }}>{ev.name}</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{ev.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Detail</div>
                      <div style={{ background: '#0f172a', borderRadius: 8, padding: '8px 12px', fontFamily: 'Consolas, monospace', fontSize: 12, color: '#93c5fd' }}>{ev.detail}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Пример</div>
                      <div onClick={() => copy(`window.dispatchEvent(new CustomEvent('${ev.name}', { detail: ${ev.detail} }))`, `ev_${i}`)} style={{ background: '#0f172a', borderRadius: 8, padding: '8px 12px', fontFamily: 'Consolas, monospace', fontSize: 11, color: '#86efac', cursor: 'pointer', wordBreak: 'break-all', lineHeight: 1.6 }}>
                        {copiedId === `ev_${i}` ? '✓ Скопировано' : `dispatchEvent(new CustomEvent('${ev.name}', ...))`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SDK Tab ── */}
        {activeTab === 'sdk' && (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: '#fff' }}>📦 Chaika OS SDK</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 32, lineHeight: 1.6 }}>
              Клиентский TypeScript/JavaScript SDK для всех категорий API. Файл: <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>src/lib/chaika-sdk.ts</code>
            </p>
            {[
              {
                title: 'Установка и инициализация',
                code: `import ChaikaOS, { chaikaSDK } from '@/lib/chaika-sdk';

// Без токена (публичный доступ)
const status = await chaikaSDK.status();

// С JWT-токеном (full access)
const sdk = new ChaikaOS({ 
  token: '<JWT>',
  appId: 'com.myapp.chaika'
});`
              },
              {
                title: 'Авторизация',
                code: `// Отправить OTP
await sdk.auth.sendOtp('user@example.com');

// Войти по паролю
const { access_token, user } = await sdk.auth.login('user@example.com', 'password');
sdk.setToken(access_token);
console.log('User:', user.username);`
              },
              {
                title: 'Профиль и настройки',
                code: `const profile = await sdk.user.getProfile();
console.log(profile.username, profile.email);

// Обновить
await sdk.user.updateProfile({ username: 'new_name', weather_city: 'Санкт-Петербург' });

// Квота хранилища
const { quota_bytes, used_bytes } = await sdk.user.getStorageQuota();`
              },
              {
                title: 'Рабочий стол и окна',
                code: `// Открыть приложение
await sdk.desktop.openApp('messenger');

// Событие ОС (без HTTP)
sdk.desktop.dispatchEvent('chaika-open-app', { appId: 'tumba' });

// Тост-уведомление
await sdk.desktop.showToast('Привет!', 'Добро пожаловать в Чайка ОС');

// Список окон
const { windows } = await sdk.window.list();`
              },
              {
                title: 'Мессенджер',
                code: `// Получить диалоги
const { conversations } = await sdk.messenger.getConversations();

// Отправить сообщение
await sdk.messenger.sendMessage(convId, 'Привет!');

// Поделиться в чат (через событие ОС)
await sdk.messenger.shareToChat('Ссылка на сайт: https://example.com');`
              },
              {
                title: 'AI-ассистент (Gemini 3)',
                code: `// Чат
const { response } = await sdk.ai.chat('Что такое ГП? Объясни простым языком.');
console.log(response);

// Генерация кода
const { code } = await sdk.ai.generateCode(
  'Напиши функцию сортировки пузырьком',
  'typescript'
);

// Перевод
const { translated } = await sdk.ai.translate('Hello World', 'ru');`
              },
              {
                title: 'HASP и железо',
                code: `// Проверить HASP-ключ
const hasp = await sdk.hardware.hasp.check(1, '0x1234');
if (!hasp.found) {
  console.warn('Ключ не найден');
}

// GPIO
await sdk.hardware.gpio.write(13, 1); // D13 HIGH
const { value } = await sdk.hardware.gpio.read(4);

// Удалённое устройство
const { session_id } = await sdk.hardware.remote.connect('CHK-A1B2C3');
await sdk.hardware.remote.command(session_id, 'STATUS');`
              },
            ].map((item, i) => (
              <div key={i} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#c4b5fd', marginBottom: 10 }}>{i + 1}. {item.title}</div>
                <div style={{ background: '#0f172a', borderRadius: 12, padding: '16px 18px', fontFamily: 'Consolas, monospace', fontSize: 12, color: '#e2e8f0', lineHeight: 1.8, position: 'relative', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}
                  onClick={() => { navigator.clipboard.writeText(item.code); }}>
                  <button style={{ position: 'absolute', top: 10, right: 10, padding: '3px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: 'rgba(255,255,255,0.4)', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>📋</button>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.code}</pre>
                </div>
              </div>
            ))}
            <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: '16px 20px', marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd', marginBottom: 6 }}>📌 Импорт SDK</div>
              <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px', fontFamily: 'Consolas, monospace', fontSize: 12, color: '#86efac' }}>{`import ChaikaOS, { chaikaSDK } from '@/lib/chaika-sdk';`}</div>
            </div>
          </div>
        )}

        {/* ── Permissions Tab ── */}
        {activeTab === 'permissions' && (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: '#fff' }}>🔑 Разрешения приложений</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 32, lineHeight: 1.6 }}>
              При регистрации приложения укажите требуемые разрешения в поле <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>permissions</code>. Пользователь увидит диалог подтверждения при первом запуске.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
              {PERMISSIONS.map((p, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: 'Consolas, monospace', fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>{p.perm}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 32, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: '20px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#c4b5fd', marginBottom: 10 }}>Пример: указание разрешений в манифесте</div>
              <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px', fontFamily: 'Consolas, monospace', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`{\n  "permissions": [\n    "user:id",\n    "user:profile",\n    "desktop:notifications",\n    "filesystem:read",\n    "messenger:send",\n    "ai:chat"\n  ]\n}`}</pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>© 2026 Чайка ОС v31 · API Documentation</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="/api/chaika-os-api.json" target="_blank" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>JSON Schema</a>
          <button onClick={() => navigate('/about')} style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>О проекте</button>
          <button onClick={() => navigate('/')} style={{ fontSize: 12, color: '#a78bfa', background: 'none', border: 'none', cursor: 'pointer' }}>Войти в ОС →</button>
        </div>
      </footer>
    </div>
  );
}

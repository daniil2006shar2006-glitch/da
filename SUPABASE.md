# Настройка базы данных Supabase

1. **Создайте проект** на [supabase.com](https://supabase.com) (Sign in → New project).

2. **Создайте таблицы.** В проекте откройте **SQL Editor** → **New query**, вставьте содержимое файла `supabase-schema.sql` и нажмите **Run**.

3. **Укажите ключи.** В разделе **Project Settings** → **API** скопируйте:
   - **Project URL**
   - **anon public** (ключ)

4. **Подключите к приложению.** Откройте файл `supabase-config.js` и вставьте:
   - `url`: ваш Project URL
   - `anonKey`: ваш anon public key

Пример:
```js
window.ldprSupabaseConfig = {
  url: 'https://xxxxxxxx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

После этого данные будут сохраняться в Supabase. Если `url` и `anonKey` оставить пустыми, приложение продолжит работать только с localStorage на ПК.

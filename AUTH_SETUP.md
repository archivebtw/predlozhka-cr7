# Настройка входа через Google и Яндекс ID

Код сайта уже использует Supabase Auth. Секреты OAuth не должны попадать в `config.js` или GitHub.

## Общие адреса

- Сайт: `https://archivebtw.github.io/predlozhka-cr7/`
- Callback Supabase: `https://ncqqilfkgdvnkgsiheok.supabase.co/auth/v1/callback`
- UserInfo для Яндекса: `https://ncqqilfkgdvnkgsiheok.supabase.co/functions/v1/yandex-userinfo`

В Supabase Dashboard откройте **Authentication → URL Configuration**:

- Site URL: `https://archivebtw.github.io/predlozhka-cr7/`
- Redirect URLs: `https://archivebtw.github.io/predlozhka-cr7/**`

## Google

1. В Google Auth Platform создайте OAuth Client типа **Web application**.
2. Добавьте origin `https://archivebtw.github.io`.
3. Добавьте redirect URI `https://ncqqilfkgdvnkgsiheok.supabase.co/auth/v1/callback`.
4. В Supabase откройте **Authentication → Sign In / Providers → Google**.
5. Вставьте Google Client ID и Client Secret, затем включите провайдер.

## Яндекс ID

1. В Яндекс OAuth создайте приложение типа **Для входа пользователей**.
2. Укажите redirect URI `https://ncqqilfkgdvnkgsiheok.supabase.co/auth/v1/callback`.
3. Разрешите права `login:info`, `login:email` и `login:avatar`.
4. Скопируйте Client ID и Client Secret.
5. В Supabase откройте **Authentication → Sign In / Providers → Custom Providers → New Provider**.
6. Выберите ручную настройку OAuth2 и заполните:
   - Identifier: `custom:yandex`
   - Authorization URL: `https://oauth.yandex.com/authorize`
   - Token URL: `https://oauth.yandex.com/token`
   - UserInfo URL: `https://ncqqilfkgdvnkgsiheok.supabase.co/functions/v1/yandex-userinfo`
   - Scopes: `login:info login:email login:avatar`
   - PKCE: включён
7. Вставьте Client ID и Client Secret, создайте и включите провайдер.

Функция `yandex-userinfo` нужна для безопасного преобразования стандартного заголовка `Bearer` от Supabase в формат `OAuth`, который требует API Яндекс ID.

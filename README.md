# ПРЕДЛОЖКА ТАНКЗОРА — модульная версия

Проект разделён на независимые HTML, CSS, JavaScript и Supabase-файлы. На главном экране используется симметричная композиция из шести декоративных игровых портретов: по три слева и справа.

## Важно перед загрузкой

В архиве нет рабочего `config.js`, потому что в нём находятся данные именно вашего проекта Supabase.
Скопируйте **текущий рабочий `config.js` из вашего GitHub-репозитория** в корень этой папки.
Не заменяйте его содержимым `config.example.js`.

## Структура

```text
index.html                         публичный сайт
admin.html                         админ-панель
config.js                          ваш текущий рабочий файл — добавьте вручную
config.example.js                  безопасный шаблон
assets/images/twitch-logo.webp     логотип
assets/css/public/                 стили публичного сайта
assets/css/admin/                  стили админки
assets/js/public/                  логика публичного сайта
assets/js/admin/                   логика админки
supabase/                          SQL и Edge Function для резервной копии
```

## Где что редактировать

### Публичный дизайн
- `assets/css/public/header-hero.css` — шапка и главный экран.
- `assets/css/public/catalog.css` — каталог и карточки игр.
- `assets/css/public/modal.css` — окно подробностей игры.
- `assets/css/public/twitch-theme.css` — Twitch-оформление и финальные визуальные переопределения.
- `assets/css/public/responsive.css` — мобильная версия.
- `assets/css/public/side-portraits.css` — расположение и 3D-эффект боковых портретов.

### Публичная логика
- `assets/js/public/release-utils.js` — даты релиза, сортировка, кооператив.
- `assets/js/public/hero.js` — главный баннер и мини-блоки.
- `assets/js/public/catalog.js` — карточки и секции каталога.
- `assets/js/public/modal-effects.js` — модальное окно, появление и 3D-эффект.
- `assets/js/public/ticker.js` — бесконечная лента.
- `assets/js/public/side-portraits.js` — загрузка и интерактивный наклон шести боковых портретов.
- `assets/js/public/app.js` — Supabase, Realtime и обработчики запуска.

### Админка
- `assets/css/admin/forms.css` — форма публикации.
- `assets/css/admin/game-list.css` — список добавленных игр.
- `assets/js/admin/steam-import.js` — автоматическое получение данных Steam.
- `assets/js/admin/game-form.js` — создание, редактирование и удаление.
- `assets/js/admin/auth.js` — проверка администратора и сессия.
- `assets/js/admin/app.js` — обработчики интерфейса.

## Что не изменено

- структура таблиц Supabase;
- RLS-политики;
- авторизация;
- CRUD;
- Realtime;
- название `window.CR7_CONFIG`;
- каналы Realtime;
- существующие записи игр.


## Боковые игровые портреты

Файлы находятся в `assets/images/tankzor-games/`:

- `tankzor-witcher.png`
- `tankzor-mafia-2.png`
- `tankzor-last-of-us.png`
- `tankzor-cyberpunk.png`
- `tankzor-rdr-2.png`
- `tankzor-warzone.png`

Портрет Elden Ring удалён, чтобы слева и справа было одинаковое количество карточек.

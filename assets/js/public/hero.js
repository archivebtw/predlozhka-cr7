diff --git a/assets/js/public/hero.js b/assets/js/public/hero.js
index 8989fe3b0f0df59a127208e9ff249a6b3f57a6bd..c089764087dd291d3739e4e6331540a3ae3750b5 100644
--- a/assets/js/public/hero.js
+++ b/assets/js/public/hero.js
@@ -100,43 +100,25 @@ function setConnection(status, text) {
         elements.nextCountdown.textContent = 'Нет игр';
         elements.nextCoop.hidden = true;
         return;
       }
 
       const cover = safeExternalUrl(featured.cover_url);
       if (cover) elements.nextRelease.style.setProperty('--next-cover', `url("${cover.replace(/"/g, '%22')}")`);
       else elements.nextRelease.style.removeProperty('--next-cover');
       elements.nextRelease.dataset.gameId = String(featured.id);
       elements.nextRelease.removeAttribute('aria-disabled');
       elements.nextRelease.tabIndex = 0;
 
       const meta = getReleaseMeta(featured);
       elements.nextLabel.textContent = nearest ? 'БЛИЖАЙШИЙ РЕЛИЗ' : 'НОВАЯ В ПРЕДЛОЖКЕ';
       elements.nextTitle.textContent = featured.title;
       elements.nextDateText.textContent = nearest
         ? `Запланированная дата: ${meta.line}`
         : meta.group === 'released'
           ? `Уже доступна · ${meta.line}`
           : meta.line;
       elements.nextCountdown.textContent = nearest ? meta.countdown : (meta.group === 'released' ? 'Можно играть' : 'Дата уточняется');
       const nextCoopLabel = coopLabel(featured);
       elements.nextCoop.hidden = !nextCoopLabel;
       elements.nextCoop.textContent = nextCoopLabel ? `👥 ${nextCoopLabel}` : '';
     }
-
-    const groupInfo = {
-      upcoming: {
-        kicker: 'В ПЕРВОЙ ЛИНИИ',
-        title: 'Ближайшие релизы',
-        description: 'Игры, которые ещё готовятся к выходу. Чем ближе дата, тем выше карточка.'
-      },
-      released: {
-        kicker: 'УЖЕ ДОСТУПНЫ',
-        title: 'Уже можно играть',
-        description: 'Релизы, которые уже появились в Steam и готовы для будущего стрима.'
-      },
-      unknown: {
-        kicker: 'ЖДЁМ АНОНС',
-        title: 'Дата пока неизвестна',
-        description: 'Steam ещё не указал точный день выхода или дата находится на уточнении.'
-      }
-    };

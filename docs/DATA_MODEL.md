# Modelo de datos inicial

Los tipos viven en `src/domain/models.ts`. `Participant` identifica a una persona con el mínimo de datos. `AlbumElement` es una aportación individual y conserva presencia, consentimiento, moderación y representación por separado. `AlbumPage` describe una página sin incrustar todos sus elementos. `ElementLayout` guarda la presentación usando valores relativos.

Propuesta Firestore futura: `participants/{participantId}`, `elements/{elementId}`, `pages/{pageId}`, y `pages/{pageId}/layouts/{elementId}`. Así, el contenido histórico, la página y la composición pueden evolucionar independientemente. La colección `elements` referencia `participantId` y `pageId`; los layouts pueden cambiar sin modificar el elemento original.

Solo los elementos `APPROVED` con consentimiento público podrán llegar a consultas públicas. Un cambio entre `FULL_CONTENT` y `PLACEHOLDER` conserva el mismo `elementId`.

`communityStickers/{stickerId}` conserva metadata, propietario, referencia R2 y moderación; el archivo original vive una sola vez bajo `stickers/{stickerId}.<ext>`. Todo envío nace como `PENDING` con `publicApproved: false`. La aprobación administrativa sincroniza `status: APPROVED` y `publicApproved: true`, que es la única consulta expuesta a la biblioteca pública.

## Libreta digital

`features/album/domain/types.ts` define `AlbumDocument`, 100 `ScrapbookPage` y `AlbumElement`. Cada hoja usa `paperType: GRID | LINED` y un arreglo de elementos. El layout se guarda como `x`, `y`, `width` y `height` normalizados entre 0 y 1, más rotación, capa, bloqueo y visibilidad. `clampLayout` asegura que un elemento nunca exceda el área de la hoja durante edición o restauración.

Las imágenes futuras se representan por `MediaMetadata`: dimensiones originales y de visualización, MIME, tamaño de archivo, ruta de Storage y URL de descarga. El límite de carga previsto es 5 MB; el pipeline y las reglas se implementarán al conectar Firebase Storage.

Cada `AlbumElement` incluye `author.participantId`, nombre y edad opcionales, además de `visibility: PUBLIC | PRIVATE`. Administración, el rol especial y el propietario pueden inspeccionar el contenido privado; para el público normal se conserva la presencia real del elemento como silueta desenfocada.

Cada cara admite como máximo cuatro elementos visibles (`MAX_ELEMENTS_PER_PAGE`). `contentRevealed` mantiene compatibilidad con el modelo anterior. Las reacciones nuevas se almacenan de forma independiente en `elementReactions/{elementId_userId}` para evitar reescribir toda la página y sólo pueden crearse o eliminarse por la cuenta Google autenticada correspondiente. Cada reacción incluye `displayName`, una instantánea del nombre público usada para listar a quienes dieron me gusta; los registros antiguos sin ese campo se presentan como `Anónimo`. El autor se reconoce mediante el UID autenticado o, en el prototipo local, mediante un identificador estable guardado en el navegador. Los cambios de posición, tamaño, rotación, capa, cara y eliminación verifican esa propiedad antes de persistirse.

El catálogo musical admite `album: DELUSION | TRES | TDBN | HOSHI | SINGLES | COLLABORATIONS` (y `OTHER` únicamente como valor heredado). La portada versionada en `images/tracks/` conserva la clasificación automática histórica de los cuatro álbumes; `SINGLES` y `COLLABORATIONS` se asignan explícitamente desde el editor y cada track conserva su propia portada. En la selección pública, ambas colecciones generan un mosaico con hasta cuatro portadas, priorizando los tracks con `createdAt` más reciente. Los elementos `SETLIST` se mantienen por compatibilidad, pero su `content` identifica el Top 3 elegido y `setlist` conserva exactamente tres canciones. El Top 3 de HOSHI filtra sólo ese álbum y el catálogo completo se presenta agrupado por álbum o colección.

## Noticias

`NewsItem` conserva estado editorial (`draft`, `published`, `archived`), visibilidad adicional, orden, slug estable, fechas de creación/actualización/publicación, una fecha editorial opcional (`displayDate`), autor de publicación, imágenes ordenadas, enlaces sociales y un enlace externo editorial opcional (`externalUrl` + `externalLabel`). `displayDate` controla únicamente la fecha mostrada al público; `publishedAt` mantiene la auditoría de la publicación real. `news` permanece restringida a administración y `publishedNews` es la proyección pública. Cada `NewsImage` distingue `github`, `firebase` o `r2`; las cargas nuevas usan `objectKey` interno y URL pública de R2. Los registros antiguos conservan su proveedor sin migración.

Las fotografías de `AlbumElement` extienden `MediaMetadata` con `provider: 'local' | 'r2'` y `objectKey`. El binario vive exclusivamente en R2; Firestore o el repositorio local sólo conservan la referencia, MIME, peso y dimensiones. El token privado que permite leer una foto no forma parte del modelo persistido compartido.

`SetlistTrack` puede conservar `coverObjectKey` junto a `coverUrl`. `album` es la clasificación autoritativa para portadas R2 con nombres internos UUID; la inferencia histórica por `Hoshi.jpg`, `tres.jpg`, `tdbn.jpg` o `delusion.jpg` se mantiene únicamente como compatibilidad.

`newsSlugs/{slug}` reserva cada URL mediante `newsId` y `createdAt` dentro de la misma transacción del borrador o publicación. La reserva evita rutas duplicadas y se conserva tras un borrado lógico para no reasignar silenciosamente una URL que ya pudo compartirse.

La distribución se modela separadamente mediante `WhatsAppSubscriber`, `NewsDelivery` y `NewsPublishedEvent`. El consentimiento explícito y la relación con `contributionId` forman parte del dominio; publicar contenido no equivale a enviarlo.

El contrato `AlbumRepository` separa lectura/escritura de la UI. La implementación presente es local; una futura `FirestoreAlbumRepository` deberá persistir páginas, layouts y metadatos de media bajo reglas de usuario autenticado y administración.

## Cola de aportaciones

`contributions/{contributionId}` conserva `participantId`, `author`, `type`, `pageNumber`, `visibility: PUBLIC | PRIVATE`, contenido opcional, referencia R2 opcional, estado (`PENDING | APPROVED | REJECTED`) y marcas de creación/revisión. El identificador de una aportación fotográfica coincide con el UUID de `photos/<uuid>.<ext>` para que el Worker pueda resolver su estado sin realizar consultas abiertas. El propietario puede crear y consultar únicamente su documento; administración y el rol especial pueden consultarlo, pero sólo administración puede cambiar el estado.

`approvedMedia/{contributionId}` es una proyección mínima con `objectKey`, `visibility` y `approvedAt`. No contiene autor, edad, texto ni decisiones internas. Se crea en la misma transacción que publica la aportación en la página y permite que el bucket R2 siga privado mientras el Worker sirve imágenes aprobadas conforme a su visibilidad.

## Sticker Library

`CommunitySticker` es el activo reutilizable y conserva título, autor opcional, descripción, referencia del archivo, MIME, peso, dimensiones originales, nombre de descarga seguro, visibilidad (`PUBLIC | SPECIAL_ONLY | PRIVATE`) y moderación (`PENDING | APPROVED | REJECTED`). La consulta pública devuelve únicamente `PUBLIC + APPROVED`.

Una colocación en la libreta no duplica el archivo. `AlbumElement` de tipo `STICKER` guarda `stickerId`; su `id`, `pageId` y `layout` existente forman la instancia. El layout normalizado conserva `x`, `y`, `width`, `height`, `rotation`, `zIndex`, `locked` y `hidden`, y `clampLayout` la mantiene dentro de la hoja.

La persistencia futura puede usar `stickers/{stickerId}` para metadata en Firestore y una ruta generada en Storage para el activo. La referencia de cada instancia apunta al mismo `stickerId`, aunque el sticker se reutilice en varias páginas.

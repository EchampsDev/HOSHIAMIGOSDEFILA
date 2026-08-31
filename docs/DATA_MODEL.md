# Modelo de datos inicial

Los tipos viven en `src/domain/models.ts`. `Participant` identifica a una persona con el mínimo de datos. `AlbumElement` es una aportación individual y conserva presencia, consentimiento, moderación y representación por separado. `AlbumPage` describe una página sin incrustar todos sus elementos. `ElementLayout` guarda la presentación usando valores relativos.

Propuesta Firestore futura: `participants/{participantId}`, `elements/{elementId}`, `pages/{pageId}`, y `pages/{pageId}/layouts/{elementId}`. Así, el contenido histórico, la página y la composición pueden evolucionar independientemente. La colección `elements` referencia `participantId` y `pageId`; los layouts pueden cambiar sin modificar el elemento original.

Solo los elementos `APPROVED` con consentimiento público podrán llegar a consultas públicas. Un cambio entre `FULL_CONTENT` y `PLACEHOLDER` conserva el mismo `elementId`.

## Libreta digital

`features/album/domain/types.ts` define `AlbumDocument`, 100 `ScrapbookPage` y `AlbumElement`. Cada hoja usa `paperType: GRID | LINED` y un arreglo de elementos. El layout se guarda como `x`, `y`, `width` y `height` normalizados entre 0 y 1, más rotación, capa, bloqueo y visibilidad. `clampLayout` asegura que un elemento nunca exceda el área de la hoja durante edición o restauración.

Las imágenes futuras se representan por `MediaMetadata`: dimensiones originales y de visualización, MIME, tamaño de archivo, ruta de Storage y URL de descarga. El límite de carga previsto es 5 MB; el pipeline y las reglas se implementarán al conectar Firebase Storage.

Cada `AlbumElement` incluye `author.participantId`, que será emitido por el futuro flujo de acceso QR. Nombre y edad son opcionales y se almacenan junto al elemento sólo si la persona los proporciona. Así, cada foto o recuerdo físico/digital puede vincularse posteriormente al mismo autor en Firestore.

El catálogo musical admite `album: DELUSION | TRES | TDBN | HOSHI` (y `OTHER` únicamente como valor heredado). La portada versionada en `images/tracks/` es la fuente de clasificación prioritaria: `delusion.jpg`, `tres.jpg`, `tdbn.jpg` y `Hoshi.jpg` asignan automáticamente su álbum. Los elementos `SETLIST` se mantienen por compatibilidad, pero su `content` identifica el Top 3 elegido y `setlist` conserva exactamente tres canciones. El Top 3 de HOSHI filtra sólo esa portada y el catálogo completo se presenta agrupado por los cuatro álbumes.

## Noticias

`NewsItem` conserva estado editorial (`draft`, `published`, `archived`), visibilidad adicional, orden, slug estable, fechas de creación/actualización/publicación, una fecha editorial opcional (`displayDate`), autor de publicación, imágenes ordenadas, enlaces sociales y un enlace externo editorial opcional (`externalUrl` + `externalLabel`). `displayDate` controla únicamente la fecha mostrada al público; `publishedAt` mantiene la auditoría de la publicación real. `news` permanece restringida a administración y `publishedNews` es la proyección pública. Cada `NewsImage` admite `provider` y `storagePath` opcionales para distinguir recursos versionados en GitHub de una futura migración a Firebase Storage sin cambiar el contrato visual.

`newsSlugs/{slug}` reserva cada URL mediante `newsId` y `createdAt` dentro de la misma transacción del borrador o publicación. La reserva evita rutas duplicadas y se conserva tras un borrado lógico para no reasignar silenciosamente una URL que ya pudo compartirse.

La distribución se modela separadamente mediante `WhatsAppSubscriber`, `NewsDelivery` y `NewsPublishedEvent`. El consentimiento explícito y la relación con `contributionId` forman parte del dominio; publicar contenido no equivale a enviarlo.

El contrato `AlbumRepository` separa lectura/escritura de la UI. La implementación presente es local; una futura `FirestoreAlbumRepository` deberá persistir páginas, layouts y metadatos de media bajo reglas de usuario autenticado y administración.

# Modelo de datos inicial

Los tipos viven en `src/domain/models.ts`. `Participant` identifica a una persona con el mínimo de datos. `AlbumElement` es una aportación individual y conserva presencia, consentimiento, moderación y representación por separado. `AlbumPage` describe una página sin incrustar todos sus elementos. `ElementLayout` guarda la presentación usando valores relativos.

Propuesta Firestore futura: `participants/{participantId}`, `elements/{elementId}`, `pages/{pageId}`, y `pages/{pageId}/layouts/{elementId}`. Así, el contenido histórico, la página y la composición pueden evolucionar independientemente. La colección `elements` referencia `participantId` y `pageId`; los layouts pueden cambiar sin modificar el elemento original.

Solo los elementos `APPROVED` con consentimiento público podrán llegar a consultas públicas. Un cambio entre `FULL_CONTENT` y `PLACEHOLDER` conserva el mismo `elementId`.

## Libreta digital

`features/album/domain/types.ts` define `AlbumDocument`, 100 `ScrapbookPage` y `AlbumElement`. Cada hoja usa `paperType: GRID | LINED` y un arreglo de elementos. El layout se guarda como `x`, `y`, `width` y `height` normalizados entre 0 y 1, más rotación, capa, bloqueo y visibilidad. `clampLayout` asegura que un elemento nunca exceda el área de la hoja durante edición o restauración.

Las imágenes futuras se representan por `MediaMetadata`: dimensiones originales y de visualización, MIME, tamaño de archivo, ruta de Storage y URL de descarga. El límite de carga previsto es 5 MB; el pipeline y las reglas se implementarán al conectar Firebase Storage.

Cada `AlbumElement` incluye `author.participantId`, que será emitido por el futuro flujo de acceso QR. Nombre y edad son opcionales y se almacenan junto al elemento sólo si la persona los proporciona. Así, cada foto o recuerdo físico/digital puede vincularse posteriormente al mismo autor en Firestore.

## Noticias

`NewsItem` conserva estado editorial (`draft`, `published`, `archived`), visibilidad adicional, orden, slug estable, fechas de creación/actualización/publicación, autor de publicación, imágenes ordenadas y enlaces sociales. `news` permanece restringida a administración y `publishedNews` es la proyección pública. Cada `NewsImage` admite `provider` y `storagePath` opcionales para distinguir recursos versionados en GitHub de una futura migración a Firebase Storage sin cambiar el contrato visual.

`newsSlugs/{slug}` reserva cada URL mediante `newsId` y `createdAt` dentro de la misma transacción del borrador o publicación. La reserva evita rutas duplicadas y se conserva tras un borrado lógico para no reasignar silenciosamente una URL que ya pudo compartirse.

La distribución se modela separadamente mediante `WhatsAppSubscriber`, `NewsDelivery` y `NewsPublishedEvent`. El consentimiento explícito y la relación con `contributionId` forman parte del dominio; publicar contenido no equivale a enviarlo.

El contrato `AlbumRepository` separa lectura/escritura de la UI. La implementación presente es local; una futura `FirestoreAlbumRepository` deberá persistir páginas, layouts y metadatos de media bajo reglas de usuario autenticado y administración.

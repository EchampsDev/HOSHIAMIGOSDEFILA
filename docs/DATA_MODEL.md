# Modelo de datos inicial

Los tipos viven en `src/domain/models.ts`. `Participant` identifica a una persona con el mínimo de datos. `AlbumElement` es una aportación individual y conserva presencia, consentimiento, moderación y representación por separado. `AlbumPage` describe una página sin incrustar todos sus elementos. `ElementLayout` guarda la presentación usando valores relativos.

Propuesta Firestore futura: `participants/{participantId}`, `elements/{elementId}`, `pages/{pageId}`, y `pages/{pageId}/layouts/{elementId}`. Así, el contenido histórico, la página y la composición pueden evolucionar independientemente. La colección `elements` referencia `participantId` y `pageId`; los layouts pueden cambiar sin modificar el elemento original.

Solo los elementos `APPROVED` con consentimiento público podrán llegar a consultas públicas. Un cambio entre `FULL_CONTENT` y `PLACEHOLDER` conserva el mismo `elementId`.

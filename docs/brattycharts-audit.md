# Brattycharts: auditoría y límite inicial

## Arquitectura encontrada

- React 19, TypeScript y Vite.
- React Router con rutas declaradas en `src/app/routes.tsx`.
- Autenticación Google compartida mediante Firebase Auth.
- Roles actuales: `ADMIN`, `USER`, `CONSTELLATION_CONTRIBUTOR`, `GUEST` y `SPECIAL`.
- Firestore protegido con denegación por defecto y reglas por colección.
- Firebase Storage para activos editoriales existentes y R2 para aportaciones/stickers.
- Features separadas para libreta, aportaciones, moderación, noticias, stickers y acceso.

## Límite del módulo

Brattycharts vive bajo `/brattycharts` y no lee ni escribe colecciones de la libreta. La primera fase sólo crea rutas y navegación contextual. Los futuros repositorios del módulo deberán permanecer bajo `src/features/brattycharts` y sus reglas no podrán conceder permisos sobre colecciones globales.

## Riesgos que deben controlarse

1. Los futuros roles editoriales no pueden heredar permisos administrativos globales.
2. El chrome contextual debe conservar el comportamiento de todas las rutas existentes.
3. Las noticias actuales no deben migrarse ni duplicarse para crear el esquema editorial nuevo.
4. Toda colección nueva debe declarar Rules e índices antes de habilitar escrituras.
5. Los activos multimedia deben pasar por repositorios, no por llamadas Firebase directas desde componentes.

## Reutilización segura prevista

- Sesión Google y perfil base de cuenta.
- Patrones visuales del `AppChrome`, drawer y tarjetas de noticias.
- Carrusel y utilidades de fechas como referencia o abstracción compatible.
- Repositorios como frontera entre UI, Firestore y proveedores de archivos.

## Apariencia del landing (Fases 4–5)

- `brattychartsSettings/landing`: configuración pública de slideshow y video.
- `brattychartsBackgrounds/{id}`: metadatos públicos de cada fondo; máximo 20 IDs coordinados transaccionalmente desde settings.
- `brattycharts/backgrounds/*`: imágenes en Firebase Storage, máximo 15 MB y sólo JPG, PNG o WebP.
- `brattycharts/video/current`: video reemplazable, máximo 100 MB; la duración máxima de cinco minutos se valida antes de subir.
- La selección de imágenes se conserva cuando el video se activa o desactiva.
- Si no hay selección o un medio falla, el landing conserva el fallback local de ladrillos en blanco y negro.

# Experiencia aislada para Bratty

## Rutas

- `/para-bratty`: enlace aislado pensado para el código QR. No aparece en la navegación pública.
- El panel genera el QR directamente en el navegador y permite descargarlo como PNG; el enlace no se envía a servicios externos.
- `/dev/bratty-experience`: panel administrativo para activar la invitación y publicar la sorpresa.
- `/album`: muestra el video antes de la libreta sólo cuando `surpriseActive` está activo y existe un video válido.

## Acceso y datos

La cuenta de Bratty debe iniciar sesión con Google una vez y administración debe asignarle el rol `SPECIAL`. Sólo ese rol o una cuenta administradora pueden escribir el video actual.

- `siteConfig/brattyExperience`: conserva `invitationActive` y `surpriseActive`; sólo administración puede modificarlo.
- `brattySubmissions/current`: conserva metadatos, autor, mensaje y URL del video.
- `bratty-surprise/current/video`: objeto de Firebase Storage, máximo 300 MB y limitado a MP4, MOV o WebM.

Los componentes consumen hooks y repositorios; no realizan llamadas directas a Firebase. Para habilitar la función en producción deben publicarse `firestore.rules` y `storage.rules` junto con la aplicación.

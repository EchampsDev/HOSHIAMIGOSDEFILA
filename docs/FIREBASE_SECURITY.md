# Seguridad de Firebase

La app pública no recibe permisos administrativos. Las reglas de Firestore solo muestran elementos y comentarios `APPROVED`; las contribuciones y comentarios nuevos nacen en `PENDING` y requieren autenticación.

Un administrador se identifica con un documento `admins/{uid}` creado desde un entorno confiable (Firebase Console o Admin SDK). Un cliente autenticado sólo puede leer el documento cuyo ID coincide con su propio UID; no puede listar, crear, editar ni eliminar roles. Así la interfaz puede comprobar su propio acceso sin exponer la lista de administradores ni permitir que alguien se otorgue privilegios.

Storage permanece cerrado salvo la referencia de la constelación. Esa ruta permite lectura pública y únicamente escritura de administradores autenticados; además limita la carga a imágenes de 10 MB. Las contribuciones públicas no tienen permiso de carga.

## Edición y sincronización en tiempo real

- `siteConfig/constellation` guarda la silueta publicada: puntos, conexiones y posición de la referencia. El landing la observa en tiempo real.
- `siteConfig/participationAccess` guarda si la captura de recuerdos está abierta. Sólo administración puede modificarlo; la página `/contribute` lo observa en tiempo real para que el mismo estado llegue a todos los dispositivos.
- `pages/{pageId}` guarda cada hoja de la libreta. La libreta observa la colección en tiempo real y conserva sus 100 hojas aunque aún no se hayan creado documentos para todas.
- Firebase Hosting sirve la aplicación; Firestore guarda y distribuye estos cambios.
- La imagen de referencia se guarda en Storage bajo `constellation/`. El editor la carga y Firestore publica su URL junto con la silueta.

Los editores usan Google Sign-In. Después de iniciar sesión por primera vez, crea desde la consola de Firestore el documento vacío `admins/{uid}` para esa cuenta. El UID aparece en Firebase Authentication. Las reglas bloquean cualquier escritura hasta que exista ese documento; ni la web pública ni el cliente pueden crearlo por sí mismos.

Los valores `VITE_FIREBASE_*` pertenecen a la configuración pública de la app web. En desarrollo viven en `.env.local`, que no se versiona. Para el build de Hosting deben configurarse también en el entorno de GitHub Actions antes de publicar la integración.

## Centro de trabajo y archivos de coordenadas

`/workspace` reúne el enlace público y los accesos a los editores locales, junto con los pasos para preparar otra computadora. Los navegadores no pueden instalar ni ejecutar el servidor local por seguridad.

El editor de silueta importa los archivos de puntos con el formato de seis columnas `ID | X_px | Y_px | X_norm | Y_norm | brillo_0_255` y su propio formato portable de cuatro columnas. Puede exportar un `.txt` que conserva los puntos, las conexiones y la posición de la referencia.

## Despliegue

El flujo `.github/workflows/firebase-hosting-merge.yml` publica Firebase Hosting después de cada cambio en `main`. Requiere el secreto de GitHub `FIREBASE_SERVICE_ACCOUNT_BRATTYPOLITAN_EXPERIENCE`; el JSON de esa cuenta no se guarda ni se versiona en este repositorio.

El despliegue de Hosting no publica automáticamente `firestore.rules`. Cada vez que cambien las reglas, publícalas desde un entorno autenticado con `firebase deploy --only firestore:rules --project brattypolitan-experience` antes de probar altas de usuarios o permisos.

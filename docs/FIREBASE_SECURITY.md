# Seguridad de Firebase

La app pública no recibe permisos administrativos. Las reglas de Firestore solo muestran elementos y comentarios `APPROVED`; las contribuciones y comentarios nuevos nacen en `PENDING` y requieren autenticación.

Un administrador se identifica con un documento `admins/{uid}` creado desde un entorno confiable (Firebase Console o Admin SDK). Los clientes web no pueden crear ni leer esta colección, por lo que no pueden otorgarse privilegios por sí mismos.

Storage permanece cerrado hasta implementar M2: la validación de tamaño, tipo de archivo y consentimiento se hará antes de permitir cargas. No subir reglas permisivas para desbloquear prototipos.

## Despliegue

El flujo `.github/workflows/firebase-hosting-merge.yml` publica Firebase Hosting después de cada cambio en `main`. Requiere el secreto de GitHub `FIREBASE_SERVICE_ACCOUNT_BRATTYPOLITAN_EXPERIENCE`; el JSON de esa cuenta no se guarda ni se versiona en este repositorio.

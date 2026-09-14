# Worker de media R2

API aislada para fotografías, stickers comunitarios y media editorial. No sustituye Firebase Hosting, Firestore ni Firebase Authentication.

## Recursos

- Bucket privado: `brattypolitan-media`
- Binding R2: `MEDIA_BUCKET`
- Variable: `FIREBASE_PROJECT_ID=brattypolitan-experience`
- Orígenes admitidos: `ALLOWED_ORIGINS`

## Despliegue manual

Desde esta carpeta, despliega el Worker y define `VITE_R2_MEDIA_API_URL` en el entorno de compilación de la aplicación con su URL estable. El Worker valida los ID tokens de Firebase y consulta Firestore mediante sus reglas actuales; no recibe ni almacena claves de Firebase. Ninguno de estos pasos está conectado al workflow de Firebase Hosting.

## Contratos

- `POST /v1/photos`: acepta una foto cuando la participación está abierta; admite identidad anónima limitada o token Firebase.
- `POST /v1/stickers`: requiere una sesión Firebase; guarda PNG/WEBP privados de máximo 5 MB y 1300 × 1800 px.
- `POST /v1/setlist-covers`: requiere token Firebase y rol administrador; acepta los cuatro álbumes, `SINGLES` y `COLLABORATIONS`.
- `GET /v1/media/setlist-covers/...`: lectura pública con CORS.
- `GET /v1/media/photos/...`: mientras la aportación está pendiente requiere token privado de propietario o sesión administradora; después de aprobarla permite lectura pública verificando `approvedMedia/{id}`.
- `GET /v1/media/stickers/...`: permanece privado durante moderación y se vuelve público únicamente al verificar la aprobación en `communityStickers/{id}`.
- `DELETE /v1/media/...`: propietario para su foto o sticker todavía pendiente; administración para cualquier activo.

El Worker vuelve a validar tamaño, MIME, firma y dimensiones. Nunca usa el nombre original como clave de objeto.

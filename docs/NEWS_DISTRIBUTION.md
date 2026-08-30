# Noticias y distribución

## Capas

`news` es la fuente editorial privada. `newsSlugs/{slug}` reserva de forma transaccional una URL única y estable. `publishedNews` es una proyección pública que contiene únicamente noticias publicadas y visibles. La publicación inicial crea `newsPublishingEvents/{newsId}` con tipo `NEWS_PUBLISHED`; editar una noticia ya publicada actualiza su proyección, pero no vuelve a crear el evento.

El frontend administra contenido, pero no envía mensajes. La distribución futura pertenece a Cloud Functions o a otro backend con Admin SDK:

`NEWS_PUBLISHED → NewsDistributionService → newsDeliveries → NewsDistributionQueue → WhatsAppNotificationProvider`

## Modelos preparados

- `whatsappSubscribers`: vínculo con `contributionId`, identificador de WhatsApp y consentimiento explícito (`marketingOptIn`, `newsNotificationsEnabled`, `optInAt`, `optOutAt`).
- `newsDeliveries`: estado por noticia, suscriptor y canal. El ID determinista `newsId__subscriberId__channel` evita duplicados.
- `NewsDistributionService`: filtra suscriptores elegibles, crea deliveries idempotentes y los entrega a una cola.
- `WhatsAppNotificationProvider`: contrato backend para un template con título, resumen y URL estable.

Las reglas niegan escrituras cliente sobre suscriptores y deliveries. Admin SDK las omite desde un entorno confiable.

## Integración futura con Meta

Crear una Cloud Function que observe `newsPublishingEvents`, marque el evento como procesado en una colección de estado interna y ejecute el servicio de distribución por lotes. Otra función/worker debe consumir la cola, invocar Meta y registrar `providerMessageId`, intentos y estados.

El webhook debe verificar la firma de Meta y procesar opt-in, `BAJA`/`STOP`/`CANCELAR`, así como estados `sent`, `delivered`, `read` y `failed`.

Secrets futuros, exclusivamente en Secret Manager/backend:

- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `META_WHATSAPP_BUSINESS_ACCOUNT_ID`
- `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `META_APP_SECRET`
- nombre e idioma del template aprobado

Nunca usar variables `VITE_*` para estos valores.

## Imágenes sin plan Blaze

El proveedor activo por defecto es `github`. Las imágenes editoriales se guardan como archivos versionados bajo `public/news/{slug}/` y la noticia conserva únicamente su ruta pública `/news/{slug}/{archivo}`. También se aceptan URLs HTTPS de `raw.githubusercontent.com` y rutas `/raw/` de GitHub. El frontend no contiene tokens de GitHub y no intenta escribir al repositorio desde el navegador.

Para preparar una imagen local:

```bash
npm run news:image -- mi-noticia C:/ruta/portada.jpg
```

El comando no sobrescribe archivos existentes. Después se revisa y publica el archivo mediante el flujo normal de Git; en Administración de Noticias se pega la ruta que imprime el comando.

Firebase Storage permanece implementado como adaptador futuro. Cuando el proyecto tenga Blaze y un bucket configurado, se debe desplegar `storage.rules`, definir `VITE_NEWS_IMAGE_PROVIDER=firebase` en el entorno de compilación y volver a construir. Los registros existentes con `provider: github` continúan funcionando, mientras que las nuevas cargas guardan `provider: firebase` y `storagePath`.

# Brattycharts Media Worker

Servicio y bucket exclusivos para fondos y video de Brattycharts. No contiene rutas para fotografías, stickers, noticias ni aportaciones de la libreta.

- Worker: `brattycharts-media`
- Bucket: `brattycharts-media`
- Binding: `BRATTYCHARTS_BUCKET`
- Objetos permitidos: `backgrounds/{uuid}.{jpg|png|webp}` y `video/current`
- Escrituras y eliminaciones: sólo administradores validados con Firebase Auth + Firestore.
- Lectura: pública para los fondos activos referenciados desde Firestore.

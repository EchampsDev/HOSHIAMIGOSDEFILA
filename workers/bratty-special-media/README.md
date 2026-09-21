# Bratty special media

Worker y bucket R2 exclusivos para el único video de `/para-bratty`.

- No comparte bucket, rutas ni bindings con las aportaciones de la libreta.
- Autoriza solamente cuentas Firebase con rol `SPECIAL` o `ADMIN`.
- Usa carga multipart de 8 MiB para admitir videos de hasta 300 MB.
- La lectura pública queda limitada a `GET /v1/video/current`.

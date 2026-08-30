# BRATTYPOLITAN EXPERIENCE

Experiencia web y archivo digital progresivo de una libreta colectiva creada por fans durante BRATTY · CDMX · 2026.

## M0: ejecutar localmente

1. Copia `.env.example` como `.env` si vas a configurar Firebase (en M0 puede permanecer vacío).
2. Instala dependencias con `pnpm install`.
3. Inicia con `pnpm dev`.

Validaciones: `pnpm lint`, `pnpm typecheck`, `pnpm build`.

Consulta [arquitectura](docs/ARCHITECTURE.md), [modelo de datos](docs/DATA_MODEL.md) y [roadmap](docs/ROADMAP.md) antes de extender el proyecto.
## Imágenes editoriales de noticias

Mientras Firebase Storage no esté habilitado, las imágenes se versionan en GitHub bajo `public/news/`. Usa:

```bash
npm run news:image -- <slug-noticia> <archivo> [nombre-destino]
```

Después incluye el archivo generado en el commit y pega la ruta `/news/<slug-noticia>/<archivo>` en Administración de Noticias. No se requieren ni se permiten tokens de GitHub en el frontend. La migración futura a Storage se activa con `VITE_NEWS_IMAGE_PROVIDER=firebase` una vez creado el bucket y publicadas sus reglas.

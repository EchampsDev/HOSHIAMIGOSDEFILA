# Arquitectura

`src/domain` contiene modelos puros. `src/infrastructure` contendrá adaptadores externos, empezando por Firebase. `src/components` reúne UI reutilizable; `src/pages` compone rutas; `src/app` crea la aplicación y su navegación. Las futuras capacidades irán en `src/features/<capacidad>` cuando tengan lógica real.

La interfaz no debe importar Firestore directamente. Los repositorios futuros vivirán en `src/infrastructure/firebase` e implementarán contratos definidos junto al dominio o la feature.

Firebase se inicializa únicamente cuando existen las variables públicas requeridas. M0 no lee ni escribe datos.

La configuración de despliegue vive en `firebase.json`. Las reglas de Firestore y Storage son archivos versionados y se despliegan explícitamente; no deben editarse solo desde la consola.

M1 añade `src/features/landing` y separa cuatro responsabilidades: estrellas ambientales, puntos normalizados, conexiones y ciclo de animación. La constelación se dibuja en Canvas 2D con `requestAnimationFrame`; la densidad de píxeles se limita a 2x y el bucle termina al alcanzar el estado `RESTING`.

La geometría vive exclusivamente en `constellationPoints.ts` y `constellationConnections.ts`. Ambos datasets pueden sustituirse sin cambiar el motor ni la presentación. La estrella roja es una capa DOM independiente y `prefers-reduced-motion` entrega directamente la composición final.

`/constellation-editor` es una herramienta interna disponible solo con `import.meta.env.DEV`. Carga una copia en memoria de los datasets actuales, permite trazar sobre una referencia local y descarga archivos TypeScript compatibles con el hero. El editor nunca sobrescribe automáticamente los archivos fuente ni modifica la silueta publicada.

El avance de puntos y conexiones puede guardarse y restaurarse desde el almacenamiento local del navegador. La imagen de referencia no se persiste para evitar exceder su capacidad. El lienzo admite zoom de 100% a 400% con desplazamiento y conserva las coordenadas normalizadas entre 0 y 1.

La detección asistida analiza exclusivamente componentes cuyo tono y saturación estén dentro del rango azul–cian de la referencia local; descarta puntos blancos, rojos, verdes y otros colores. Limita los candidatos a la geometría existente y prepara un plan reversible antes de modificar los datasets en memoria. Los aros azules previsualizan ajustes y los ámbar altas nuevas; estas últimas heredan el grupo más cercano y se insertan en la conexión vecina cuando es posible. Sensibilidad, radio y límite de altas son configurables para reducir falsos positivos del fondo estrellado.

El lienzo distingue clic y arrastre mediante un umbral de movimiento: pulsar y soltar sobre el fondo crea un punto, mientras que mantener y arrastrar desplaza el viewport ampliado sin alterar la geometría. Arrastrar directamente un punto conserva su operación de reposicionamiento.

El panel del punto seleccionado permite crear conexiones, retirar una relación concreta o desconectar todos sus vecinos. Desconectar sólo modifica el dataset de conexiones; nunca elimina el punto.

Las conexiones del editor se clasifican visualmente por el grupo compartido de sus extremos: cabello, rostro, facciones y cuerpo tienen colores distintos; una conexión entre grupos se representa como mixta y discontinua. Seleccionar un punto resalta las conexiones de su grupo y atenúa las demás sin cambiar los datos exportados.

La libreta digital vive en `src/features/album`: sus modelos de página y elementos usan coordenadas normalizadas; `LocalAlbumRepository` es la única capa que usa almacenamiento local y cumple el contrato `AlbumRepository`, que se podrá implementar con Firestore sin acoplar la UI. `/album` es el lector público y `/dev/album-editor` sólo está disponible durante desarrollo; en producción requerirá autenticación y permisos de administración antes de exponerse.

El lector compone pliegos de dos caras independientes: la navegación avanza de dos en dos y una cara par nunca se reutiliza como cara izquierda del pliego siguiente. Las reglas de capacidad, propiedad, revelación y “me gusta” viven en el dominio de la feature; la UI no escribe directamente en Firebase. Durante la etapa local, `brattypolitan-album-change` sincroniza las distintas vistas abiertas en el mismo navegador sin acoplar componentes al almacenamiento.

La lectura pública de `/album` está temporalmente bloqueada mediante `albumAccess.ts` hasta que termine el evento y se consoliden las fotografías. Esto no afecta al editor de desarrollo, que permanece activo. El estado se sustituirá después por una decisión administrada desde Firestore.

`/explorar` es el centro público y sólo lista experiencias públicas. `/admin/experiencias` es el centro administrativo temporal para desarrollo; su visibilidad se decidirá después con el rol autenticado de Firebase, no por la ruta por sí sola.

## Sticker Library

`src/features/stickers` encapsula la biblioteca comunitaria. El dominio, la validación, los contratos de repositorio, los servicios y los componentes visuales no dependen de las páginas que los consumen. `/contribute`, `/explorar` y el editor de la libreta componen esos componentes sin acceder directamente a `localStorage` ni a Firebase.

`StickerRepository` gobierna metadata y moderación; `StickerStorageRepository` gobierna el archivo binario. En producción, `FirestoreStickerRepository` persiste la metadata en `communityStickers` y `CloudflareR2StickerStorageRepository` guarda los binarios bajo `stickers/`. Los adaptadores locales permanecen como fallback de desarrollo, sin acoplar la UI a ningún proveedor.

Los archivos comunitarios se validan en cliente y nuevamente en el Worker como PNG o WEBP mediante MIME, firma binaria y decodificación real. El límite es 5 MB, con dimensiones de 32 px como mínimo y 1300 × 1800 px como máximo. R2 genera las rutas internamente; Firestore exige propiedad autenticada y estado inicial `PENDING`, mientras que sólo administración puede aprobar o rechazar.

## Media en Cloudflare R2

Las fotografías de recuerdos, las portadas nuevas del catálogo musical y las imágenes de noticias nuevas usan contratos de repositorio; la UI no conoce credenciales, bindings ni rutas internas de R2. Producción utiliza la URL estable del Worker `brattypolitan-r2-media`; `VITE_R2_MEDIA_API_URL` permite sustituirla por entorno. En desarrollo, sin esa variable, se conserva el adaptador local y también se mantienen compatibles los recuerdos históricos en formato `data:image/...`.

El Worker independiente vive en `workers/r2-media` y accede al bucket privado `brattypolitan-media` mediante un binding. Las fotografías quedan bajo `photos/` y los stickers bajo `stickers/`; ambos permanecen privados mientras están pendientes y admiten lectura del propietario o administración. Un sticker se vuelve público sólo cuando su documento Firestore conserva `APPROVED`, `PUBLIC` y `publicApproved: true`. Las portadas viven bajo `setlist-covers/<album>/` y las imágenes nuevas de noticias bajo `news/<newsId>/`; ambas son públicas después de cargarse. Toda carga editorial exige un ID token administrador. Las imágenes antiguas de noticias conservan su proveedor y no requieren migración.

Los registros guardan únicamente `provider`, `objectKey`, MIME, tamaño, dimensiones y una URL estable del Worker. Los tokens privados de lectura de fotografías permanecen en el navegador propietario y nunca se escriben en Firestore. Las rutas antiguas de GitHub continúan resolviéndose para no romper catálogos existentes.

## Aportaciones y moderación

`src/features/contributions` separa el dominio, el contrato de persistencia, los adaptadores local/Firestore y el centro visual de notificaciones. `/contribute` nunca escribe directamente en las páginas: una cuenta autenticada crea `contributions/{id}` con estado `PENDING`. El centro global se suscribe a esa cola sólo cuando la sesión conserva rol administrador; aprobar ejecuta una transacción que añade el elemento a `pages/{pageId}`, crea la proyección pública mínima de media cuando corresponde y marca el envío `APPROVED`. Rechazar sólo cambia el estado a `REJECTED`.

Las fotografías se cargan primero al bucket privado R2 y la aportación guarda exclusivamente su referencia. Mientras el registro está pendiente, el Worker permite lectura sólo al propietario o a administración. Después de aprobar, `approvedMedia/{id}` expone únicamente `objectKey`, visibilidad y fecha de aprobación; el Worker consulta esa proyección para servir públicamente sólo el binario público. Una foto privada continúa limitada a propietario, administración y rol especial.

Las reacciones están separadas del documento de página mediante `src/features/reactions` y `elementReactions/{elementId_userId}`. La interfaz sólo ofrece la acción a personas autenticadas con Google; el repositorio y las reglas impiden reaccionar en nombre de otra cuenta.

`AppChrome` monta navegación, acceso, centro admin y explorador fuera de las rutas. De este modo “Explorar”, “Acceder” y la bandeja administrativa permanecen disponibles en todas las secciones, incluso en experiencias que antes no componían `Layout`. El pie continúa bajo responsabilidad de `Layout`, por lo que las herramientas de pantalla completa conservan su composición previa.

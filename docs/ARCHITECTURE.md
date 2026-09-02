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

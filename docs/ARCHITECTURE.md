# Arquitectura

`src/domain` contiene modelos puros. `src/infrastructure` contendrá adaptadores externos, empezando por Firebase. `src/components` reúne UI reutilizable; `src/pages` compone rutas; `src/app` crea la aplicación y su navegación. Las futuras capacidades irán en `src/features/<capacidad>` cuando tengan lógica real.

La interfaz no debe importar Firestore directamente. Los repositorios futuros vivirán en `src/infrastructure/firebase` e implementarán contratos definidos junto al dominio o la feature.

Firebase se inicializa únicamente cuando existen las variables públicas requeridas. M0 no lee ni escribe datos.

M1 añade `src/features/landing`: los datos de la constelación, el ciclo de animación y su SVG se mantienen separados para poder retocar la silueta sin cambiar la interfaz o el motor de movimiento.

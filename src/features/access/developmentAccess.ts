// Punto único para sustituir por permisos de Firebase/Auth cuando exista sesión.
// Mientras tanto las herramientas sólo se exponen en desarrollo local.
export function hasDevelopmentAccess() {
  return import.meta.env.DEV
}

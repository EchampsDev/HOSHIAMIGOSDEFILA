// Temporalmente público bloqueado: más adelante este estado llegará de Firestore
// cuando se confirme que el evento terminó y el archivo fue consolidado.
export const publicAlbumAccess = {
  isUnlocked: false,
  title: 'La libreta se abrirá después del evento.',
  description: 'Estamos consolidando las fotografías y los recuerdos para publicar un archivo colectivo completo.',
} as const

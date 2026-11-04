// Tamaño de la foto de perfil que se envía a la API: un cuadrado de 256 x 256 píxeles
const SIZE = 256;

// Convierte la imagen que elige el usuario (un File del <input type="file">) en un texto base64
// ("data:image/jpeg;base64,...") que se puede enviar a la API y poner en el src de un <img>.
//
// Antes la reduce: se dibuja recortada en un cuadrado de 256 x 256 en un <canvas> y se guarda como JPG.
// Una foto del móvil pesa varios MB; así se queda en unos 20-30 KB, por debajo del límite de la API.
export function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      // Recorto el centro de la imagen para que sea cuadrada (como hace object-fit: cover)
      const side = Math.min(image.width, image.height);
      const x = (image.width - side) / 2;
      const y = (image.height - side) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      canvas.getContext('2d')?.drawImage(image, x, y, side, side, 0, 0, SIZE, SIZE);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se ha podido leer la imagen'));
    };

    image.src = url;
  });
}

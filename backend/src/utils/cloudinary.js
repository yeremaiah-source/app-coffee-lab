const cloudinary = require('cloudinary').v2;

const configurado = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (configurado) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Sube un buffer de imagen (ya validado por multer: tipo y tamaño) a
 * Cloudinary y devuelve la URL pública. Si Cloudinary no está
 * configurado todavía (variables de entorno vacías), lanza un error
 * claro en vez de fallar de forma confusa — así se puede seguir
 * desarrollando el resto de la app sin tener esto armado desde el día 1.
 */
function subirImagen(buffer, carpeta) {
  return new Promise((resolve, reject) => {
    if (!configurado) {
      return reject(new Error('La subida de imágenes todavía no está configurada en el servidor (falta Cloudinary).'));
    }
    const stream = cloudinary.uploader.upload_stream(
      { folder: `coffee-lab/${carpeta}`, resource_type: 'image', transformation: [{ width: 1200, height: 1200, crop: 'limit' }] },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { subirImagen, imagenesConfiguradas: configurado };

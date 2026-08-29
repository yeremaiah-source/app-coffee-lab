const nodemailer = require('nodemailer');

// Si no hay credenciales de email configuradas (EMAIL_USER / EMAIL_PASS),
// el link de recuperación se imprime en los logs del servidor en vez de
// enviarse — así se puede probar el flujo completo antes de configurar un
// email real. Antes de hacer pública la app, hay que completar esas
// variables (ver .env.example) para que el envío sea real.
const emailConfigurado = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

let transporter = null;
if (emailConfigurado) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function sendPasswordResetEmail(to, resetUrl) {
  const asunto = 'Coffee Lab — Restablecer tu contraseña';
  const cuerpoTexto = `Pediste restablecer tu contraseña en Coffee Lab.\n\nEntrá a este link (válido por 1 hora):\n${resetUrl}\n\nSi no fuiste vos, ignorá este mensaje — tu contraseña actual sigue funcionando.`;

  if (!emailConfigurado) {
    console.log('--- EMAIL NO CONFIGURADO: mostrando el link acá en vez de enviarlo ---');
    console.log(`Para: ${to}`);
    console.log(`Link de recuperación: ${resetUrl}`);
    console.log('--- Completá EMAIL_USER / EMAIL_PASS en las variables de entorno para enviarlo de verdad ---');
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: asunto,
    text: cuerpoTexto,
  });
}

module.exports = { sendPasswordResetEmail, emailConfigurado };

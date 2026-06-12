const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const CRYPTO_SECRET = process.env.CRYPTO_SECRET || '12345678901234567890123456789012'; 

// 🌟 CORREÇÃO (Criptografia Determinística):
// Criamos um IV fixo derivado do seu segredo. O mesmo e-mail sempre vai gerar o mesmo código.
// Assim, a trava de "E-mail Único" (Unique Constraint) do Banco de Dados vai funcionar perfeitamente!
const getFixedIV = () => crypto.createHash('md5').update(CRYPTO_SECRET).digest();

const encryptEmail = (text) => {
  if (!text) return text;
  const iv = getFixedIV(); 
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(CRYPTO_SECRET), iv);
  let encrypted = cipher.update(text.toLowerCase());
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decryptEmail = (text) => {
  if (!text || !text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(CRYPTO_SECRET), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    return text;
  }
};

const ofuscarEmail = (emailLimpo) => {
  const [nome, dominio] = emailLimpo.split('@');
  if (!nome || !dominio) return emailLimpo;
  const showChars = Math.min(2, nome.length);
  return `${nome.substring(0, showChars)}***@${dominio}`;
};

const gerarSenhaAutomatica = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
  const length = Math.floor(Math.random() * (12 - 8 + 1)) + 8;
  let senha = "";
  for (let i = 0; i < length; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
};

module.exports = {
  encryptEmail,
  decryptEmail,
  ofuscarEmail,
  gerarSenhaAutomatica
};
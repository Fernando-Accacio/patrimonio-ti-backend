const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async enviarSenha(para, nome, senha, isReset = false) {
    const assunto = isReset 
      ? 'Redefinição de Senha - Suporte TI Prefeitura' 
      : 'Bem-vindo ao Sistema de Chamados TI - Prefeitura';

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; color: #333; max-w: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Portal do Servidor - TI</h2>
        </div>
        <div style="padding: 30px; background-color: #f8fafc;">
          <h3 style="margin-top: 0; color: #1e293b;">Olá, ${nome}!</h3>
          <p style="line-height: 1.6; color: #475569;">
            ${isReset 
              ? 'Sua solicitação de redefinição de senha foi aprovada pela nossa equipe.' 
              : 'Sua conta no sistema de Gestão de Patrimônio e Helpdesk foi criada com sucesso.'}
          </p>
          <div style="background-color: #fff; border: 1px dashed #cbd5e1; padding: 15px; text-align: center; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #64748b;">Sua senha de acesso é:</p>
            <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #0f172a;">
              ${senha}
            </p>
          </div>
          <p style="line-height: 1.6; color: #475569; font-size: 14px;">
            Recomendamos que você altere esta senha provisória no seu primeiro acesso, através das <strong>Configurações da Conta</strong>.
          </p>
        </div>
        <div style="background-color: #e2e8f0; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
          Este é um e-mail automático. Por favor, não responda.
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Suporte TI - Prefeitura" <${process.env.SMTP_USER}>`,
        to: para,
        subject: assunto,
        html: htmlTemplate,
      });
      console.log(`[EMAIL] 📧 E-mail enviado com sucesso para: ${para}`);
    } catch (error) {
      console.error(`[EMAIL ERROR] ❌ Falha ao enviar e-mail para ${para}:`, error);
    }
  }
}

module.exports = new EmailService();
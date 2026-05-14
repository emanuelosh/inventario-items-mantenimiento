import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Iterable

from app.core.config import settings


class EmailService:
    def __init__(self) -> None:
        self.enabled = settings.SMTP_ENABLED
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_name = settings.SMTP_FROM_NAME
        self.from_email = settings.SMTP_FROM_EMAIL

    def send_email(
        self,
        to: Iterable[str],
        subject: str,
        html_body: str,
        text_body: str | None = None,
    ) -> bool:
        recipients = [email.strip() for email in to if email and email.strip()]

        if not recipients:
            return False

        if not self.enabled:
            print("[EMAIL DISABLED]")
            print("To:", recipients)
            print("Subject:", subject)
            print(html_body)
            return False

        if not self.host or not self.port or not self.user or not self.password:
            raise RuntimeError("SMTP no está configurado correctamente en variables de entorno.")

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{self.from_name} <{self.from_email}>"
        message["To"] = ", ".join(recipients)

        plain_text = text_body or self._html_to_text(html_body)

        message.attach(MIMEText(plain_text, "plain", "utf-8"))
        message.attach(MIMEText(html_body, "html", "utf-8"))

        context = ssl.create_default_context()

        with smtplib.SMTP(self.host, int(self.port), timeout=30) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(self.user, self.password)
            server.sendmail(self.from_email, recipients, message.as_string())

        return True

    def send_welcome_email(
        self,
        to_email: str,
        full_name: str,
        role: str,
        login_url: str | None = None,
    ) -> bool:
        login_url = login_url or settings.FRONTEND_URL

        subject = "Cuenta creada - Inventario Mantenimiento"

        html = f"""
        <div style="font-family:Arial,sans-serif;background:#f4f6fb;padding:24px;">
          <div style="max-width:620px;margin:auto;background:white;border-radius:16px;padding:28px;border:1px solid #e5e7eb;">
            <h2 style="margin-top:0;color:#0f172a;">Bienvenido al sistema de inventario</h2>

            <p>Hola <strong>{full_name}</strong>,</p>

            <p>Se ha creado tu cuenta en la plataforma de <strong>Inventario de Mantenimiento</strong>.</p>

            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <tr>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Correo</strong></td>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;">{to_email}</td>
              </tr>
              <tr>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Rol</strong></td>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;">{role}</td>
              </tr>
            </table>

            <p>Puedes ingresar desde el siguiente enlace:</p>

            <p>
              <a href="{login_url}" style="display:inline-block;background:#0f172a;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;">
                Ingresar a la plataforma
              </a>
            </p>

            <p style="color:#64748b;font-size:13px;margin-top:24px;">
              Este correo fue generado automáticamente por el sistema de inventario.
            </p>
          </div>
        </div>
        """

        return self.send_email(
            to=[to_email],
            subject=subject,
            html_body=html,
        )

    def send_stock_alert_email(
        self,
        item_code: str,
        item_name: str,
        current_stock: int,
        min_stock: int,
        recipients: Iterable[str],
    ) -> bool:
        subject = f"Alerta de stock mínimo - {item_name}"

        html = f"""
        <div style="font-family:Arial,sans-serif;background:#f4f6fb;padding:24px;">
          <div style="max-width:620px;margin:auto;background:white;border-radius:16px;padding:28px;border:1px solid #e5e7eb;">
            <h2 style="margin-top:0;color:#b91c1c;">Alerta de stock mínimo</h2>

            <p>El siguiente artículo llegó al stock mínimo o está por debajo del mínimo configurado.</p>

            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <tr>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Código</strong></td>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;">{item_code}</td>
              </tr>
              <tr>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Artículo</strong></td>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;">{item_name}</td>
              </tr>
              <tr>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Stock actual</strong></td>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;">{current_stock}</td>
              </tr>
              <tr>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Stock mínimo</strong></td>
                <td style="padding:8px;border-bottom:1px solid #e5e7eb;">{min_stock}</td>
              </tr>
            </table>

            <p style="color:#64748b;font-size:13px;margin-top:24px;">
              Este correo fue generado automáticamente por el sistema de inventario.
            </p>
          </div>
        </div>
        """

        return self.send_email(
            to=recipients,
            subject=subject,
            html_body=html,
        )

    def _html_to_text(self, html: str) -> str:
        return (
            html.replace("<br>", "\n")
            .replace("<br/>", "\n")
            .replace("<br />", "\n")
            .replace("<p>", "\n")
            .replace("</p>", "\n")
        )


email_service = EmailService()
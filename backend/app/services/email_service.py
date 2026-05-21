import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Iterable

from app.core.config import settings

BASE_STYLE = """
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    .wrapper { background: #f1f5f9; padding: 32px 16px; }
    .card { background: #ffffff; border-radius: 16px; padding: 32px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; box-shadow: 0 4px 24px rgba(15,23,42,0.07); }
    .header { margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; }
    .logo { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: #0f172a; color: white; font-size: 14px; font-weight: 800; border-radius: 12px; letter-spacing: -0.02em; margin-bottom: 14px; }
    .title { font-size: 20px; font-weight: 800; letter-spacing: -0.03em; color: #0f172a; margin-bottom: 6px; }
    .subtitle { font-size: 14px; color: #64748b; line-height: 1.5; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .info-table th { background: #f8fafc; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 10px 14px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .info-table td { padding: 11px 14px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; }
    .info-table tr:last-child td { border-bottom: none; }
    .info-table td strong { font-weight: 700; color: #0f172a; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .badge-danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .badge-success { background: #ccfbf1; color: #0f766e; border: 1px solid #99f6e4; }
    .badge-info { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
    .btn { display: inline-block; background: #0f172a; color: white; padding: 12px 22px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 700; margin-top: 20px; }
    .footer { margin-top: 24px; padding-top: 18px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; line-height: 1.6; text-align: center; }
    .alert-banner { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 10px; }
    .alert-icon { font-size: 18px; line-height: 1; margin-top: 1px; }
    .alert-text { font-size: 14px; color: #7f1d1d; line-height: 1.5; }
    .alert-text strong { color: #b91c1c; display: block; margin-bottom: 3px; font-size: 15px; }
  </style>
"""


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
        subject = f"Bienvenido al sistema de inventario · {full_name}"

        html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8">{BASE_STYLE}</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo">IM</div>
        <div class="title">Cuenta creada exitosamente</div>
        <div class="subtitle">Se ha creado tu acceso al sistema de gestión de inventario de mantenimiento.</div>
      </div>

      <p style="font-size:15px; color:#334155; margin-bottom:16px;">Hola <strong style="color:#0f172a;">{full_name}</strong>,</p>

      <table class="info-table">
        <thead><tr><th colspan="2">Datos de tu cuenta</th></tr></thead>
        <tbody>
          <tr><td>Correo</td><td><strong>{to_email}</strong></td></tr>
          <tr><td>Rol asignado</td><td><span class="badge badge-info">{role}</span></td></tr>
          <tr><td>Estado</td><td><span class="badge badge-success">Activo</span></td></tr>
        </tbody>
      </table>

      <a href="{login_url}" class="btn">Ingresar a la plataforma →</a>

      <div class="footer">
        Este correo fue generado automáticamente por el Sistema de Inventario de Mantenimiento.<br>
        Si no esperabas este mensaje, por favor ignóralo.
      </div>
    </div>
  </div>
</body>
</html>"""

        return self.send_email(to=[to_email], subject=subject, html_body=html)

    def send_stock_alert_email(
        self,
        item_code: str,
        item_name: str,
        current_stock: int,
        min_stock: int,
        recipients: Iterable[str],
    ) -> bool:
        subject = f"⚠ Alerta de stock mínimo · {item_name} ({item_code})"
        diff = min_stock - current_stock
        urgency = "crítico" if current_stock == 0 else "bajo"

        html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8">{BASE_STYLE}</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo">IM</div>
        <div class="title" style="color:#b91c1c;">Alerta de stock {urgency}</div>
        <div class="subtitle">Un artículo del inventario requiere atención inmediata de reposición.</div>
      </div>

      <div class="alert-banner">
        <div class="alert-icon">⚠</div>
        <div class="alert-text">
          <strong>{item_name}</strong>
          El stock actual ({current_stock}) está {"en cero" if current_stock == 0 else f"por debajo del mínimo configurado ({min_stock})"}.
          {"Se recomienda reponer al menos " + str(diff) + " unidades." if diff > 0 else ""}
        </div>
      </div>

      <table class="info-table">
        <thead><tr><th colspan="2">Detalle del artículo</th></tr></thead>
        <tbody>
          <tr><td>Código</td><td><strong>{item_code}</strong></td></tr>
          <tr><td>Artículo</td><td><strong>{item_name}</strong></td></tr>
          <tr><td>Stock actual</td><td><span class="badge badge-danger">{current_stock} unidades</span></td></tr>
          <tr><td>Stock mínimo</td><td>{min_stock} unidades</td></tr>
          {"<tr><td>Unidades a reponer</td><td><strong>" + str(diff) + "</strong></td></tr>" if diff > 0 else ""}
        </tbody>
      </table>

      <a href="{settings.FRONTEND_URL}/inventory" class="btn">Ver inventario →</a>

      <div class="footer">
        Alerta generada automáticamente por el Sistema de Inventario de Mantenimiento.<br>
        Ingresa a la plataforma para registrar la reposición.
      </div>
    </div>
  </div>
</body>
</html>"""

        return self.send_email(to=recipients, subject=subject, html_body=html)

    def _html_to_text(self, html: str) -> str:
        return (
            html.replace("<br>", "\n")
            .replace("<br/>", "\n")
            .replace("<br />", "\n")
            .replace("<p>", "\n")
            .replace("</p>", "\n")
        )


email_service = EmailService()

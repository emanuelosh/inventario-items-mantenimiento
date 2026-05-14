# Inventario Mantenimiento API

Backend en FastAPI para control de inventario de mantenimiento con roles, movimientos, alertas de stock mínimo y reportes en Excel/PDF.

## Levantar con Docker

Desde esta carpeta `backend`:

```bash
cp .env.example .env
```

En Windows PowerShell, si no tienes `cp`, usa:

```powershell
Copy-Item .env.example .env
```

Levanta los contenedores:

```bash
docker compose up -d --build
```

Verifica que estén arriba:

```bash
docker compose ps
```

Revisa logs del backend:

```bash
docker compose logs -f api
```

Abre la documentación:

```text
http://localhost:8000/docs
```

Health check:

```text
http://localhost:8000/health
```

## Servicios Docker

```text
api       -> FastAPI en http://localhost:8000
postgres  -> PostgreSQL expuesto localmente en localhost:5434
```

Dentro de Docker, FastAPI se conecta a PostgreSQL usando:

```text
postgres:5432
```

Desde tu PC, si quieres conectarte con pgAdmin, usa:

```text
Host: localhost
Puerto: 5434
Usuario: postgres
Contraseña: postgres
Base de datos: inventario_mantenimiento
```

## Primer usuario

El primer usuario creado desde:

```text
POST /api/v1/auth/register
```

queda como `admin` automáticamente. Los siguientes registros públicos quedan como `colaborador`.

## Comandos útiles

Apagar contenedores sin borrar datos:

```bash
docker compose down
```

Apagar y borrar la base de datos local:

```bash
docker compose down -v
```

Reconstruir solo el backend:

```bash
docker compose up -d --build api
```

Entrar al contenedor del backend:

```bash
docker compose exec api bash
```

Entrar a PostgreSQL:

```bash
docker compose exec postgres psql -U postgres -d inventario_mantenimiento
```

## Correos

Para probar sin enviar correos reales, deja:

```env
SMTP_ENABLED=false
```

Para activar correos reales, configura en `.env`:

```env
SMTP_ENABLED=true
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=notificaciones@tudominio.com
SMTP_PASSWORD=tu_password_o_app_password
SMTP_FROM_NAME=Inventario Mantenimiento
SMTP_FROM_EMAIL=notificaciones@tudominio.com
STOCK_ALERT_EXTRA_RECIPIENTS=tecnologia@tudominio.com
```

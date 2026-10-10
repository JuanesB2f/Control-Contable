# VitaEsme

Plataforma SaaS multi-negocio para gestionar ventas, clientes, productos, inventario y finanzas. Diseño inspirado en macOS / iOS.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · shadcn/ui · React Hook Form + Zod · Supabase (Postgres, Auth, RLS) · Resend · Sentry · PostHog.

## Estado

**Fase 1 — Fundación** (completa)

- Registro, inicio de sesión, verificación de correo y recuperación de contraseña.
- Negocios (organizaciones) con dirección propia: `/{negocio}/dashboard`.
- Miembros (Configuración → Miembros): invitaciones por enlace o correo, roles Propietario / Administrador / Empleado, cambio de rol y retiro.
- Seguridad en base de datos: RLS en todas las tablas, permisos por rol en `role_permissions`, RPCs `security definer` y registro de auditoría inmutable.
- Shell estilo macOS / iOS: tarjetas de vidrio translúcido, barra lateral, paleta de comandos (⌘K / Ctrl K), barra flotante en móvil con botón central para vender, diálogos tipo hoja en el celular, modo claro/oscuro e instalable en la pantalla de inicio.
- Gráficas con Chart.js y animaciones con GSAP (respetan "reducir movimiento" del sistema).

**Fase 2 — Operación comercial** (completa)

- Productos: costo y precio de venta con simulador de margen y precio sugerido.
- Inventario: compras con costo promedio ponderado, ajustes por conteo, cobertura en días y valor en estantes.
- Ventas: punto de venta con carrito, cliente, descuento, cambio en efectivo y ganancia en vivo; anulación con reposición de stock.
- Clientes: segmentos automáticos (Campeón, Frecuente, Nuevo, En riesgo…), podio de quienes más compran y contacto por WhatsApp.
- Finanzas: estado de resultados, flujo de caja, punto de equilibrio y gastos por categoría.
- Inicio: cuánto vendiste con su gráfica, ganancia y número de ventas, tres consejos en frases, lo más vendido, cómo te pagan y qué reabastecer.

Los costos solo los ven quienes tienen el permiso `costs.read` (Propietario y Administrador).

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Vincula y aplica las migraciones:

   ```bash
   npx supabase login
   npx supabase link --project-ref <tu-project-ref>
   npm run db:push
   ```

3. Sincroniza la configuración de Auth (URLs de redirección y política de contraseñas) desde `supabase/config.toml`:

   ```bash
   npx supabase config push
   ```

4. Correos de autenticación:
   - Con el SMTP por defecto de Supabase (plan gratuito) se usan las plantillas estándar: funcionan, pero el enlace de confirmación debe abrirse en el mismo navegador donde te registraste, y Supabase limita el envío a unos pocos correos por hora.
   - Para producción configura Resend en `[auth.email.smtp]` y activa las plantillas en español de `supabase/templates/` (bloques comentados en `config.toml`). Usan `token_hash`, así que funcionan desde cualquier navegador.

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API). Resend, Sentry y PostHog son opcionales: sin ellos la app funciona y las invitaciones se comparten por enlace.

### 3. Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), crea una cuenta y luego tu negocio.

## Scripts

| Script | Uso |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Genera tipos de rutas y ejecuta `tsc` |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run db:push` | Aplica migraciones al proyecto vinculado |
| `npm run db:test` | Pruebas pgTAP de RLS (requiere Supabase local con Docker) |
| `npm run db:types` | Regenera `src/types/database.ts` desde el esquema |

## Arquitectura

Estructura modular por dominio (`src/modules/<módulo>/{domain,application,infrastructure,components}`). El árbol completo de carpetas, la anatomía de un módulo y las reglas de seguridad están en [EXPLAINED.md](EXPLAINED.md).

## Despliegue

### Vercel

Vercel compila desde el código fuente (no usa el `Dockerfile`):

1. Importa el repositorio en Vercel (framework: Next.js, sin cambios en build/output).
2. En **Settings → Environment Variables** agrega las variables de `.env.example`. `NEXT_PUBLIC_SITE_URL` debe ser el dominio de producción.
3. En Supabase → Authentication → URL Configuration agrega ese dominio a **Site URL** y **Redirect URLs** (`https://tu-dominio/auth/confirm`).

### Docker

[Dockerfile](Dockerfile) multi-etapa con la salida `standalone` de Next.js: la imagen final solo contiene el servidor mínimo y corre como usuario sin privilegios.

Las variables `NEXT_PUBLIC_*` se incrustan en el JavaScript durante el build, por eso se pasan como `--build-arg`; las de servidor (`RESEND_API_KEY`, `EMAIL_FROM`) se pasan al ejecutar.

Con Docker Compose (lee los valores de `.env.local`):

```bash
docker compose --env-file .env.local up --build
```

Sin Compose:

```bash
docker build -t vitaesme \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx \
  --build-arg NEXT_PUBLIC_SITE_URL=https://tu-dominio .

docker run -p 3000:3000 --env-file .env.local vitaesme
```

La imagen sirve en cualquier proveedor que ejecute contenedores (Railway, Fly.io, Render, Google Cloud Run, un VPS).

# Control Contable

Plataforma SaaS multi-negocio para gestionar ventas, clientes, productos, inventario y finanzas. Diseño inspirado en macOS / iOS.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · shadcn/ui · React Hook Form + Zod · Supabase (Postgres, Auth, RLS) · Resend · Sentry · PostHog.

## Estado

**Fase 1 — Fundación** (completa)

- Registro, inicio de sesión, verificación de correo y recuperación de contraseña.
- Negocios (organizaciones) con dirección propia: `/{negocio}/dashboard`.
- Equipo: invitaciones por enlace o correo, roles Propietario / Administrador / Empleado, cambio de rol y retiro.
- Seguridad en base de datos: RLS en todas las tablas, permisos por rol en `role_permissions`, RPCs `security definer` y registro de auditoría inmutable.
- Shell estilo macOS: barra lateral, paleta de comandos (⌘K / Ctrl K), barra de pestañas en móvil, modo claro/oscuro.

Los módulos de Ventas, Clientes, Productos, Inventario, Finanzas, Intelligence, Reportes y Social Hub aparecen como "Pronto" en la barra lateral.

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Vincula y aplica las migraciones:

   ```bash
   npx supabase login
   npx supabase link --project-ref <tu-project-ref>
   npm run db:push
   ```

3. En **Authentication → URL Configuration** define:
   - Site URL: `http://localhost:3000` (o tu dominio en producción).
   - Redirect URLs: `http://localhost:3000/**` y `https://tu-dominio.com/**`.
4. En **Authentication → Email Templates** usa enlaces con `token_hash`, para que funcionen aunque se abran en otro navegador:
   - **Confirm signup:** `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding`
   - **Reset password:** `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
5. (Recomendado) En **Authentication → SMTP Settings** configura Resend como SMTP para que los correos de autenticación salgan desde tu dominio.

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

```
src/
  app/                 Rutas (App Router). Solo composición: sin lógica de negocio.
    (minimal)/         Login, registro, onboarding, invitaciones.
    [orgSlug]/         Área privada de cada negocio.
  modules/<módulo>/
    domain/            Tipos, esquemas Zod y reglas puras (testeables).
    application/       Server Actions y consultas; autorizan cada operación.
    infrastructure/    Acceso a Supabase y servicios externos.
    components/        UI del módulo.
  components/          Design system y shell compartidos.
  lib/                 Utilidades transversales (Supabase, env, errores, fechas).
supabase/
  migrations/          Esquema, RLS, permisos y RPCs.
  tests/database/      Pruebas pgTAP de aislamiento entre negocios.
```

Reglas clave:

- **Aislamiento multi-negocio en la base de datos:** toda tabla de negocio lleva `organization_id` y políticas RLS basadas en `private.is_member` / `private.has_permission`.
- **Autorización por permisos, no por rol:** el código pregunta `can(context, "members.manage")`; los roles se mapean a permisos en `role_permissions`.
- **Cada Server Action revalida sesión, membresía y permiso** (`authorizeOrgAction`) y valida la entrada con Zod; la UI solo oculta lo que no puedes hacer.
- **Auditoría:** las operaciones sensibles escriben en `audit_logs` desde la base de datos; nadie puede editar ni borrar ese registro desde la app.

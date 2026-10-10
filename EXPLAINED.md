# Estructura de carpetas - VitaEsme

La app está organizada por **módulos de dominio**: cada módulo agrupa su lógica, su acceso a datos y su interfaz. Las rutas de `src/app` solo componen piezas de los módulos.

```
├── Dockerfile                          # Imagen de producción (Next.js standalone, Node 24)
├── docker-compose.yml                  # Build + ejecución local del contenedor
├── .dockerignore                       # Archivos excluidos del contexto de Docker
├── EXPLAINED.md                        # Esta guía de arquitectura
├── README.md                           # Puesta en marcha y despliegue
├── next.config.ts                      # Configuración de Next.js (Cache Components, standalone)
├── package.json                        # Dependencias y scripts
├── vitest.config.mts                   # Pruebas unitarias
├── .env.example                        # Plantilla de variables de entorno
├── supabase/                           # Base de datos
│   ├── config.toml                     # Configuración de Auth (URLs, contraseñas, OTP)
│   ├── migrations/                     # Esquema, RLS, permisos por rol y RPCs
│   ├── templates/                      # Correos de Auth en español (requieren SMTP propio)
│   └── tests/database/                 # Pruebas pgTAP de aislamiento entre negocios
└── src/
    ├── proxy.ts                        # Refresca la sesión y protege rutas privadas
    ├── instrumentation.ts              # Sentry en servidor (si hay DSN)
    ├── instrumentation-client.ts       # Sentry y PostHog en el navegador (si hay claves)
    ├── app/                            # Rutas (App Router). Solo composición, sin lógica de negocio
    │   ├── layout.tsx                  # Layout raíz: fuentes, tema, toasts
    │   ├── globals.css                 # Paleta verde/blanco y tokens de diseño
    │   ├── icon.svg                    # Favicon con el logo
    │   ├── (minimal)/                  # Pantallas sin barra lateral
    │   │   ├── login/                  # Inicio de sesión
    │   │   ├── signup/                 # Registro
    │   │   ├── forgot-password/        # Recuperar contraseña
    │   │   ├── reset-password/         # Nueva contraseña
    │   │   ├── onboarding/             # Crear el primer negocio
    │   │   └── invite/[token]/         # Aceptar invitación
    │   ├── auth/confirm/               # Callback de verificación de correo
    │   └── [orgSlug]/                  # Área privada de cada negocio
    │       ├── layout.tsx              # Shell: barra lateral, barra superior, pestañas móviles
    │       ├── dashboard/              # Inicio: métricas del periodo, gráficas y recomendaciones
    │       ├── sales/                  # Ventas y punto de venta (?new=1 abre una venta nueva)
    │       ├── customers/              # Clientes, segmentos y podio
    │       ├── products/               # Catálogo con costo, precio y margen
    │       ├── inventory/              # Existencias y movimientos de stock
    │       ├── finance/                # Resultados, flujo de caja y gastos
    │       └── settings/               # Negocio, miembros, perfil y actividad
    ├── modules/                        # Módulos de dominio
    │   ├── access/                     # Sesión, contexto del negocio, miembros, roles e invitaciones
    │   ├── account/                    # Perfil del usuario
    │   ├── analytics/                  # Periodos, métricas de ventas, recomendaciones y gráficas
    │   ├── audit/                      # Registro de actividad
    │   ├── auth/                       # Registro, login y contraseñas
    │   ├── customers/                  # Clientes, segmentación y contacto
    │   ├── dashboard/                  # Tarjetas del inicio
    │   ├── finance/                    # Gastos, estado de resultados y flujo de caja
    │   ├── inventory/                  # Stock, compras, ajustes y valoración
    │   ├── organizations/              # Crear y configurar negocios
    │   ├── products/                   # Catálogo y reglas de precio / margen
    │   ├── sales/                      # Carrito, registro y anulación de ventas
    │   └── settings/                   # Navegación y esqueletos de configuración
    ├── components/                     # Design system y shell compartidos
    │   ├── ui/                         # Primitivas shadcn/ui con estilo macOS / iOS
    │   ├── shell/                      # Barra lateral, paleta de comandos, menú de usuario
    │   ├── brand/                      # Logo y marca VitaEsme
    │   ├── feedback/                   # Estados vacío, error y sin acceso
    │   ├── forms/                      # Campos de formulario reutilizables
    │   ├── data/                       # Avatares, KPIs, buscador, control segmentado y medidores
    │   ├── layout/                     # Encabezados y contenedores de página
    │   └── theme/                      # Modo claro / oscuro
    ├── config/                         # Nombre del sitio, rutas y navegación
    ├── hooks/                          # Hooks compartidos
    ├── lib/                            # Utilidades transversales (Supabase, env, fechas, correo)
    └── types/database.ts               # Tipos generados desde Supabase
```

# ANATOMÍA DE UN MÓDULO

Todos los módulos siguen las mismas capas. Un módulo nuevo (Ventas, Productos, Inventario…) se crea copiando esta forma:

```
src/modules/<módulo>/
├── domain/             # Tipos, esquemas Zod y reglas puras. Sin dependencias de Next ni Supabase. Se prueban con Vitest
├── application/        # Server Actions ("use server") y consultas. Autorizan cada operación con authorizeOrgAction
├── infrastructure/     # Acceso a Supabase y servicios externos (Resend, etc.)
└── components/         # UI del módulo (formularios, listas, tarjetas)
```

Dependencias permitidas: `components → application → infrastructure → domain`. El dominio no importa nada de las otras capas.

# SEGURIDAD

- **Aislamiento entre negocios en la base de datos:** toda tabla de negocio lleva `organization_id` y políticas RLS (`private.is_member`, `private.has_permission`).
- **Permisos, no roles:** el código pregunta `can(context, "members.manage")`; los roles Propietario / Administrador / Empleado se mapean a permisos en `role_permissions`.
- **Cada Server Action** revalida sesión, membresía y permiso, y valida la entrada con Zod. La UI solo oculta lo que el usuario no puede hacer.
- **Auditoría inmutable:** las operaciones sensibles escriben en `audit_logs` desde la base de datos.
- **Costos protegidos:** las columnas de costo no se exponen a la API; solo las funciones de lectura las devuelven, y en `NULL` si el usuario no tiene `costs.read`.
- **Stock consistente:** el stock solo cambia mediante RPCs que bloquean la fila del producto y escriben en `inventory_movements` (apertura, compra, venta, ajuste, anulación). Cada venta guarda el costo unitario del momento.

# FUNCIONALIDADES PRINCIPALES

## 🔐 Cuentas
- Registro, inicio de sesión, verificación de correo y recuperación de contraseña

## 🏪 Negocios
- Varios negocios por usuario, cada uno con su dirección `/{negocio}/dashboard`
- País, moneda y zona horaria por negocio

## 👥 Miembros
- Invitaciones por enlace o correo desde Configuración → Miembros
- Cambio de rol y retiro de miembros

## 📋 Actividad
- Historial de cambios del negocio, incluidos productos, compras, ajustes y ventas anuladas

## 🛒 Ventas
- Punto de venta a pantalla completa en móvil: buscar, tocar para agregar, cantidades, precio editable
- Cliente opcional (o creado al vuelo), descuento rápido y cambio a entregar en efectivo
- Ganancia en vivo y aviso si vendes por debajo del costo; anulación con motivo que devuelve el stock
- Abonos y ventas fiadas: el saldo queda a nombre del cliente y cada pago se guarda con fecha, método, banco (en transferencias), referencia, quién lo recibió y foto del comprobante opcional
- Línea de tiempo por venta (registrada → abonos → saldada o anulada) y filtro "Por cobrar" con todo lo que te deben, sin importar la fecha
- Fecha límite de pago para cada saldo (8, 15 o 30 días, o la que elijas): las ventas se marcan como vencidas, vence hoy o por vencer, y "Por cobrar" las agrupa empezando por las vencidas
- Los comprobantes van en el bucket privado `payment-receipts`, se ven con enlaces temporales y no se pueden reemplazar ni borrar

## 📦 Productos e inventario
- Costo y precio con simulador de margen; el costo se recalcula con promedio ponderado en cada compra
- Foto por producto (bucket público `product-images`): se reduce en el navegador, el servidor verifica que sea JPG/PNG/WebP real y solo quien tiene `products.write` puede subirla o quitarla
- Cobertura en días al ritmo de los últimos 30 días, alertas de reabastecimiento y valor del inventario

## 🤝 Clientes
- Segmentos automáticos, podio de los que más compran, producto favorito y enlace directo a WhatsApp

## 💰 Finanzas
- "¿A dónde va tu dinero?" (de cada $100 vendidos), utilidad bruta y neta, flujo de caja, punto de equilibrio y gastos por categoría
- El flujo de caja cuenta el dinero que de verdad entró (pagos y abonos del periodo) y muestra cuánto te deben los clientes

# BUENAS PRÁCTICAS Y TROUBLESHOOTING

- Mantén `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sin comillas ni espacios) y reinicia `npm run dev` tras cambiarlo.
- Después de cambiar migraciones ejecuta `npm run db:push` y `npm run db:types`.
- Antes de subir cambios: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build`.
- En Windows ejecuta las pruebas desde una terminal cuya ruta empiece por `C:\` en mayúscula; con `c:\` Vitest carga dos copias de sí mismo y todas fallan con `Cannot read properties of undefined (reading 'config')`.

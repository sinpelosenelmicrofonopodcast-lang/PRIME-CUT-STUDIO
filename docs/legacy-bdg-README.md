# BDG SaaS Platform

Plataforma SaaS completa para una agencia digital que vende servicios web/app para mercados locales y globales.

## Stack

- Frontend: Next.js App Router, TypeScript, TailwindCSS, shadcn/ui-style components
- Backend: Supabase (PostgreSQL, Auth, Storage, RLS)
- Pagos: Stripe Checkout + Subscriptions + Webhooks + Billing Portal
- Validacion/Formularios: Zod + React Hook Form
- Email: Resend
- Analytics: PostHog con fallback a Plausible/no-op
- Deploy: Vercel-ready

## Funcionalidades incluidas

- Landing optimizada a conversion con CTA repetidos, comparador y lead magnet
- Paginas publicas:
  - `/`
  - `/pricing`
  - `/addons`
  - `/name-your-plan`
  - `/case-studies`
  - `/blog`
  - `/contact`
- Wizard "Name Your Plan" en 5 pasos con persistencia en `quote_requests`
- Portal cliente `/dashboard/client`:
  - vista de plan/proyecto/timeline
  - tickets
  - mensajes
  - uploads de assets
  - solicitudes de add-ons
  - estado de cotizaciones/facturacion
- Dashboard admin `/dashboard/admin/*`:
  - overview
  - clients
  - projects
  - plans
  - addons
  - quotes
  - tickets (kanban)
  - messages
  - billing
  - audit
  - settings
- Generacion automatica de PDF de propuesta
- Aceptacion digital de propuesta + desbloqueo de pago
- Checkout Stripe para plan/addon/quote
- Billing portal Stripe
- Webhook Stripe para reconciliacion

## Setup local

1. Instalar dependencias:

```bash
pnpm install
```

2. Copiar variables de entorno:

```bash
cp .env.example .env.local
```

3. Completar `.env.local` con:
- Supabase URL + anon key + service role key
- Stripe secret key + webhook secret
- Resend API key (opcional, recomendado)
- Meta/Facebook vars para automatizacion: `NEXT_PUBLIC_FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_TOKEN_ENCRYPTION_KEY`, `SOCIAL_CRON_SECRET`, `META_SYSTEM_USER_ACCESS_TOKEN`, `META_PAGE_ID`
- URLs y branding de agencia

4. Crear base de datos en Supabase y aplicar esquema:

```bash
# Opcion A: Supabase CLI
supabase db push

# Opcion B: SQL Editor
# Ejecutar: supabase/migrations/20260305000100_init.sql
# Luego: supabase/seed.sql
```

5. Ejecutar proyecto:

```bash
pnpm dev
```

## Configuracion de Supabase

1. Crear proyecto en Supabase.
2. Activar Email/Password en Auth.
3. Ejecutar migracion y seed.
4. Verificar buckets creados:
- `client-assets` (privado)
- `quote-documents` (publico)
5. Verificar RLS activo en tablas de `public` y `storage.objects`.

## Crear usuario admin

1. Registra un usuario normal via `/auth/sign-in` (sign up).
2. En SQL editor de Supabase:

```sql
insert into public.user_roles (user_id, role)
values ('<USER_UUID>', 'admin')
on conflict (user_id, role) do nothing;
```

3. Cierra sesion e inicia sesion de nuevo.

## Configuracion de Stripe

1. Crear productos/precios en Stripe (opcional si usaras `stripe_price_id`).
2. Configurar webhook apuntando a:

```text
https://TU_DOMINIO/api/stripe/webhook
```

3. Eventos recomendados:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`

4. Guardar `STRIPE_WEBHOOK_SECRET` en env.

## Configuracion de Resend

1. Agregar `RESEND_API_KEY`.
2. Confirmar dominio de envio (en dev se usa `onboarding@resend.dev`).
3. Los leads de `/contact` se guardan en DB y pueden enviarse por email.

## Deploy en Vercel

1. Subir repo a GitHub.
2. Importar proyecto en Vercel.
3. Configurar variables de entorno (mismas de `.env.local`).
4. Deploy.
5. Configurar webhook Stripe hacia dominio de produccion.

## Pruebas de flujos criticos

1. Flujo de adquisicion:
- Abrir `/pricing`
- Abrir `/name-your-plan`
- Enviar wizard y validar registro en `quote_requests`

2. Flujo comercial admin:
- Entrar a `/dashboard/admin/quotes`
- Generar PDF
- Convertir quote a proyecto
- Generar payment link

3. Aceptacion + pago:
- Abrir `/quotes/:id`
- Aceptar propuesta con typed name
- Ejecutar pago de deposito via Stripe Checkout

4. Portal cliente:
- Abrir ticket
- Enviar mensaje
- Subir archivo
- Solicitar add-on

5. Billing:
- Abrir Stripe billing portal desde `/dashboard/client`

## Eventos analytics implementados

- `view_pricing`
- `start_name_your_plan`
- `submit_name_your_plan`
- `click_whatsapp`
- `start_checkout`
- `purchase_completed` (en webhook/analytics extendible)
- `open_ticket`
- `request_addon`

## Estructura relevante

- `app/` UI + rutas API
- `components/` UI, marketing y dashboards
- `lib/` clientes/config/helpers (Supabase, Stripe, Resend, schemas)
- `supabase/migrations/` SQL schema + RLS
- `supabase/seed.sql` seed inicial de planes/add-ons

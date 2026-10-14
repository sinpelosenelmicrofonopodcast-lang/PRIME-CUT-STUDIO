# Prime Cut Studios — informe de implementación

Fecha: 14 de octubre de 2026. Estado general: **IMPLEMENTADO PARCIALMENTE; PUBLICACIÓN BLOQUEADA**. La web vigente no fue reemplazada. No se creó ningún despliegue nuevo.

## Fuente y conflictos

- Dominio vigente: https://www.primecutstudiostx.com
- Producción conservada: `dpl_4PiQjQqyYn3ExRf1U1YzkP26jMA4`, estado READY.
- Base recuperada: `PrimeCut-portal-corregido.zip`. Coinciden los SHA1 de los 97 archivos de fuente que la respuesta de Vercel permitió comparar. El árbol devuelto estaba truncado: no se certifica equivalencia byte a byte de todos los archivos del deployment.
- Se inspeccionaron los tres ZIP indicados y las cinco ramas del repositorio PRIME-CUT-STUDIO. Su main conserva v0.2; la base vigente es v0.4.
- La configuración Git observada en Vercel apunta realmente a `sinpelosenelmicrofonopodcast-lang/BBHUB`, cuyo main también conserva la versión antigua. El último deployment fue enviado por CLI, sin commit verificable asociado en sus metadatos.
- Los arreglos anteriores de portal, elenco, referencias y dossier se conservaron. Se recuperaron desde PostgreSQL las definiciones de tres funciones ya instaladas de asignación/revocación de talento e invitaciones: faltaban en los ZIP y rompían la reproducción de las pruebas locales. No se reaplicaron a producción.
- El aviso interno de nueva solicitud intentaba `ON CONFLICT(source_key)` aunque el índice real combina `source_key` con la cuenta/destinatario. Se corrigió la inserción y se comprobó su idempotencia mediante el índice existente.

## Cambios

| Área | Clasificación | Resultado |
|---|---|---|
| Catálogo 2026 | IMPLEMENTED AND VERIFIED, en candidato local | 13 categorías públicas, 48 paquetes; 3 paquetes inmobiliarios permanecen ocultos. Precios importados del catálogo de referencia, incluyendo retoque a $15/imagen y color desde $175. |
| Gun N Run | IMPLEMENTED AND VERIFIED, en candidato local | $500; hasta 2 horas, una cámara, un operador, una localización, edición básica y un videoclip. Se excluyen dirección, personal extra, iluminación avanzada, casting y VFX avanzados. El editor no permite bajar/cambiar ese precio. |
| Name Your Budget | IMPLEMENTED AND VERIFIED, por HTTP y PostgreSQL aislados | Acciones por categoría y paquete, página principal y cotización; permite $350.25 y cantidades desde $0.01. Es solicitud de alcance personalizado, sin aceptación automática ni reserva. |
| Solicitudes | IMPLEMENTED AND VERIFIED, por HTTP y PostgreSQL aislados | Se guardan idioma, precio/alcance original, presupuesto y extras en un snapshot. UUID único evita duplicados al reenviar. Se preservan los campos existentes y la conversión a proyecto. |
| Administración de precios | IMPLEMENTED AND VERIFIED, por HTTP y PostgreSQL aislados | `/team/pricing`, restringido a owner/administrator: activar, precio, nombres EN/ES, líneas de horas/entregables, personal, lugares, revisiones, exclusiones, extras, orden y destacado. Los costos se guardan aparte y el margen estimado es interno. |
| Inglés/español | IMPLEMENTED, NOT VERIFIED visualmente | Catálogo y formulario bilingües; selector conserva idioma por URL, cookie y almacenamiento local. Traducciones de navegación, tarjetas comerciales y FAQ principal. No se certifica traducción integral de todo el portal ni de propuestas antiguas. |
| Portal y casting | IMPLEMENTED AND VERIFIED, en entorno aislado | Creación de proyectos, propuestas, aprobación por revisión, invitaciones, corrección de correo, archivos privados, fotos multipart y elenco visible solo para clientes autorizados. El proyecto real de Tony no se utilizó para pruebas destructivas. |
| Correo | IMPLEMENTED, NOT VERIFIED para esta nueva release | Se reutiliza la cola existente para confirmación al cliente y aviso al estudio. Los tests verifican creación y deduplicación de mensajes. La cola vigente contiene aceptaciones SMTP históricas, pero no se envió ni certificó correo real desde esta release. |
| Seguridad | IMPLEMENTED AND VERIFIED para cambios realizados | RLS preservado; tabla de costos sin SELECT para anon/authenticated; funciones de talento/invitación actuales no son ejecutables por esos roles. Pruebas de acceso entre proyectos y archivos privados pasan. No equivale a auditoría exhaustiva de toda la infraestructura. |
| SEO y rendimiento | IMPLEMENTED, NOT VERIFIED en campo | Metadatos/canonical/OG del catálogo y cotización; precios correctos y conservación de sitemap/robots. Compilación de producción pasa. Core Web Vitals y revisión visual móvil/desktop pendientes. |
| Producción | BLOCKED | Vercel rechazó creación de preview con 403. La CLI indicó `No existing credentials found`. Se conserva el deployment vigente. |

El catálogo de referencia no define todos los valores de personal, localizaciones, revisiones y límites para cada paquete. Se conservó el alcance disponible; lo no definido se indica como sujeto a propuesta escrita y puede completarse en administración. No se inventaron condiciones de producción ni se consideró este punto totalmente cerrado.

## Supabase

Proyecto: `mvrszgunjwvdqogtpyqm`. Migración aplicada: `pricing_inquiry_snapshots`.

1. Columnas opcionales `pc_inquiries.request_id` y `request_snapshot`.
2. Índice único de request_id cuando existe.
3. Tabla `pc_pricing_costs`, RLS y acceso exclusivo mediante servidor/service_role.
4. Política de lectura del catálogo ajustada para que los nuevos paquetes se sirvan por el cargador de campos públicos; se conservan las reglas de otros tipos de catálogo.

Verificado en producción: ambas columnas y el índice existen; anon/authenticated no pueden leer costos. Antes y después de las operaciones se conservan **7 proyectos, 4 solicitudes, 1 aplicación de casting y 5 cuentas**. No se borraron datos ni se modificaron proyectos de clientes. Los backups de datos del proveedor no se exportaron: no hubo cambios destructivos ni reescrituras de datos.

## Pruebas

- PASS: TypeScript y `npm run build` con Next.js 16.4.0 y Node compatible.
- PASS: 35/35 recorridos HTTP → PostgreSQL aislado, incluidos presupuesto con centavos, snapshot, doble envío, avisos internos, costos privados, portal, propuestas, archivos, casting y acceso del elenco.
- PASS: 48 pruebas aisladas PostgreSQL de workspace, producción y comunicaciones.
- PASS: 47 pruebas de rutas de workspace, producción y comunicaciones.
- PASS: 8 comprobaciones de respuestas REST vacías; 7 de SMTP; 7 de invitaciones/asignación; 5 de dossier privado.
- PASS: 19 comprobaciones HTTP locales de páginas, redirecciones y rechazo cross-origin.
- BLOCKED: pruebas visuales e interacción desktop/mobile del candidato. El navegador remoto no puede alcanzar el servidor local; Chromium no estaba instalado y su descarga devolvió un ZIP inválido. El script de pruebas visuales está incluido, sin resultados PASS inventados.
- BLOCKED: confirmación de cuenta, recuperación de contraseña y todos los tipos de correo contra proveedores reales en esta release; medición de entrega/inbox; verificación final sobre el dominio.
- NOT CHANGED: contratos/invoices/deposit y operaciones anteriores; no se certificó cobro financiero extremo a extremo.

## Código y archivos

Rama en ambos repositorios: `release/primecuts-pricing-recovery-20261014`.

- PRIME-CUT-STUDIO: `064c8d96db7730b34690e80f7d8173f7c2623bbd`.
- BBHUB, conectado a Vercel: `79c5f71b67551a080310667652df3ca9403fc858`.
- Main de ambos repositorios: **NOT CHANGED**. No se fusionó ni se disparó un deployment automático.
- Las fotografías y el dossier privado de Tony se conservaron en el paquete de release y fueron excluidos de los repositorios públicos. Un deploy desde Git solo, sin restaurar esos assets privados, no es equivalente a este paquete y no debe publicarse.

Archivos principales respecto al ZIP del portal:

`lib/pricing.ts`, `lib/pricing-db.ts`, `lib/data.ts`, `lib/db.ts`, `lib/email.ts`; `components/PricingCatalog.tsx`, `QuoteRequestForm.tsx`, `HomeSales.tsx`, `useSalesLanguage.ts`, `SiteHeader.tsx`; `app/services/page.tsx`, `app/book/page.tsx`, `app/page.tsx`, `app/globals.css`, `app/api/inquiry/route.ts`, `app/api/team/pricing/route.ts`, `app/team/pricing/page.tsx`, `app/team/page.tsx`; migraciones de snapshots/costos y recuperación de funciones; scripts y evidencia de pruebas; `.gitignore`.

## Rollback y continuación

La producción sigue usando el deployment original, que permanece disponible para rollback. Los ZIP originales se preservan. Los cambios de schema son compatibles con la versión vieja; no se deben eliminar las columnas nuevas para hacer rollback porque contendrán solicitudes futuras.

Para completar la release faltan acceso autenticado de despliegue a este proyecto, revisión visual del candidato, prueba de correo real y verificación posterior al único despliegue de producción. No se creó preview, no se realizó promoción y no hay ID de nueva producción que reportar. **La definición completa de terminado no se ha alcanzado.**

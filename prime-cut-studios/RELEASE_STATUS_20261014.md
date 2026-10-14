# Prime Cut Studios — informe de implementación

Fecha: 14 de octubre de 2026. Estado general: **CANDIDATO VERIFICADO LOCALMENTE; NO AUTORIZADO PARA DEPLOY HASTA CERRAR LOS PENDIENTES**. La web vigente no fue reemplazada. No se creó ningún despliegue nuevo.

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
| Inglés/español | IMPLEMENTED AND VERIFIED en navegador local | Catálogo y formulario bilingües; selector conserva idioma por URL, cookie y almacenamiento local. Traducciones de navegación, tarjetas comerciales y FAQ principal. Se comprobó el cambio inmediato del encabezado, formulario, pie de página y atributo HTML de idioma. No se certifica traducción integral de propuestas antiguas. |
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
- PASS: 40/40 recorridos HTTP → PostgreSQL aislado, incluidos presupuesto con centavos, snapshot, doble envío, avisos internos, costos privados, portal, propuestas, archivos, casting y acceso del elenco.
- PASS: 48 pruebas aisladas PostgreSQL de workspace, producción y comunicaciones.
- PASS: 47 pruebas de rutas de workspace, producción y comunicaciones.
- PASS: 8 comprobaciones de respuestas REST vacías; 7 de SMTP; 7 de invitaciones/asignación; 5 de dossier privado.
- PASS: 19 comprobaciones HTTP locales de páginas, redirecciones y rechazo cross-origin.
- PASS: 6/6 pruebas de navegador Chromium local sobre catálogo, idioma, selección de paquete, presupuesto de $350.25, diseño móvil y ausencia de excepciones JavaScript. También se verificaron los portales de owner y viewer autorizado en escritorio 1440 px y móvil 390 px dentro de las 40 pruebas del recorrido completo. Se resolvió el bloqueo de Chromium con un binario de pruebas obtenido mediante npm; las capturas fueron inspeccionadas internamente.
- VERIFIED para el transporte vigente: Gmail contiene mensajes recibidos hoy de consultas, casting, confirmación de cuenta y recuperación de contraseña. No se enviaron mensajes nuevos ni se modificaron contraseñas. NOT VERIFIED: entrega de todos los tipos de correo del candidato nuevo y pruebas de sus enlaces de activación/recuperación en producción. Un aviso owner_intake permanece queued, attempts=0; los logs API devuelven 403 y la vista de runtime no aportó evidencia para cerrar su causa.
- NOT CHANGED: contratos/invoices/deposit y operaciones anteriores; no se certificó cobro financiero extremo a extremo.

## Código y archivos

Rama en ambos repositorios: `release/primecuts-pricing-recovery-20261014`.

- PRIME-CUT-STUDIO: `064c8d96db7730b34690e80f7d8173f7c2623bbd`.
- BBHUB, conectado a Vercel: `79c5f71b67551a080310667652df3ca9403fc858`.
- Commits finales, documentación y evidencia sincronizadas: PRIME-CUT-STUDIO `0e47e93909e786c278337f6452f382ce4e334e31`; BBHUB `4b9d9cdaae898b2e551deda212d4a8a44cd9f22d`. El código de producción candidato es el mismo que en los commits de código anteriores.
- Main de ambos repositorios: **NOT CHANGED**. No se fusionó ni se disparó un deployment automático.
- Las fotografías y el dossier privado de Tony se conservaron en el paquete de release y fueron excluidos de los repositorios públicos. Un deploy desde Git solo, sin restaurar esos assets privados, no es equivalente a este paquete y no debe publicarse.

Archivos principales respecto al ZIP del portal:

`lib/pricing.ts`, `lib/pricing-db.ts`, `lib/data.ts`, `lib/db.ts`, `lib/email.ts`; `components/PricingCatalog.tsx`, `QuoteRequestForm.tsx`, `HomeSales.tsx`, `useSalesLanguage.ts`, `SiteHeader.tsx`; `app/services/page.tsx`, `app/book/page.tsx`, `app/page.tsx`, `app/globals.css`, `app/api/inquiry/route.ts`, `app/api/team/pricing/route.ts`, `app/team/pricing/page.tsx`, `app/team/page.tsx`; migraciones de snapshots/costos y recuperación de funciones; scripts y evidencia de pruebas; `.gitignore`.

## Rollback y continuación

La producción sigue usando el deployment original, que permanece disponible para rollback. Los ZIP originales se preservan. Los cambios de schema son compatibles con la versión vieja; no se deben eliminar las columnas nuevas para hacer rollback porque contendrán solicitudes futuras.

Para completar la release faltan el cierre del aviso al estudio pendiente, la certificación contra proveedores del candidato nuevo, el recorrido completo de contrato/factura/depósito y la verificación sobre el dominio. La revisión visual local ya pasó. La instrucción vigente del propietario es no realizar deploy hasta cerrar todo. No se creó preview, no se realizó promoción y no hay ID de nueva producción que reportar. **La definición completa de terminado no se ha alcanzado.**

## Segunda revisión solicitada — sin deploy

- Se reprodujo y corrigió el éxito engañoso al reutilizar el ID de una solicitud con datos diferentes. Ahora se rechaza con conflicto, conservando la original.
- Se corrigió el rechazo de notas válidas de 2,000 caracteres cuando el administrador amplía el alcance del paquete. El alcance completo se conserva en snapshot y se muestra al administrador.
- Precio público y costo privado ahora se guardan en una sola transacción. Un fallo simulado en costos revierte el precio; no deja una actualización parcial. Migración aditiva `atomic_production_pricing` aplicada y permisos comprobados: anon/authenticated no pueden ejecutar la función; service_role sí. No se modificaron precios ni costos reales (ambas tablas de paquetes/costos estaban vacías).
- Se corrigió el cambio de idioma del contenido de cotización y pie de página, además de las etiquetas del formulario.
- Suite visual reproducible incluida con Playwright 1.62.1.
- En esta revisión las cifras reales permanecieron en 7 proyectos, 4 solicitudes, 2 aplicaciones y 6 cuentas. No se eliminaron registros ni se probaron cambios sobre clientes reales.
- El script histórico `test-native-auth-bridge.cjs` no pudo ejecutarse porque falta su fixture SQL `NATIVE_AUTH_OUTBOX_BRIDGE.sql`. No se contó como PASS. Ese fichero no es importado por el runtime. La suite activa de rutas de cuenta/comunicaciones pasó 19/19 y el correo nativo recibido fue confirmado en Gmail.
- Sigue pendiente certificar el aviso al estudio en cola, la entrega del candidato contra proveedores reales y el recorrido de contrato/factura/depósito con evidencia completa. Algunos paquetes del catálogo de referencia siguen sujetos a alcance/revisiones en propuesta escrita; no se inventaron valores.
- No se creó, promovió ni ejecutó ningún deployment durante esta revisión. Producción conserva `dpl_4PiQjQqyYn3ExRf1U1YzkP26jMA4`.

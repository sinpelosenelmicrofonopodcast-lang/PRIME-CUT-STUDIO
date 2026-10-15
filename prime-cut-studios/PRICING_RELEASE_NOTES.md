# Prime Cut Studios — release verificada y estado de publicación

Actualizado: 15 de octubre de 2026, UTC. **Código candidato implementado y probado localmente. Publicación y certificación del candidato sobre el dominio: BLOCKED.** No se ejecutó ningún deploy, promoción ni cambio de main durante este cierre. Se respeta la instrucción de no desplegar hasta completar la verificación.

## Fuente y preservación

Sitio: https://www.primecutstudiostx.com. Proyecto Vercel: `prj_nGd7wXWbqNlrtM6b3YOz5BoNLfw4`. Supabase: `mvrszgunjwvdqogtpyqm`.

Se compararon los tres ZIP de referencia con GitHub y la fuente disponible del deployment. La base v0.4 del portal recuperado coincide en los SHA1 de los 97 archivos accesibles de Vercel; su árbol estaba truncado, por lo que no se certifica igualdad de todos los archivos. Ambos main conservaban una base v0.2 anterior. La configuración Git de Vercel observada apunta a BBHUB, aunque inicialmente se había indicado PRIME-CUT-STUDIO. Se preservaron las mejoras posteriores de portal, casting, referencias y dossier.

Último deployment confirmado en la inspección previa: `dpl_4PiQjQqyYn3ExRf1U1YzkP26jMA4`. En este cierre la lista API devuelve 403 y la consulta de ese ID devuelve 404, por lo que no se vuelve a certificar su asociación actual. La comprobación directa del navegador confirma que `/services` responde y sigue mostrando las seis categorías anteriores: el nuevo catálogo aún no está publicado.

## Implementación y clasificación

| Área | Estado | Evidencia y límites |
|---|---|---|
| Catálogo 2026 | IMPLEMENTED AND VERIFIED — candidato local | 13 categorías y 48 paquetes públicos, con 96 acciones de selección/presupuesto. Gun N Run permanece exactamente en $500, con 2 horas, una cámara, operador y lugar, edición básica y un videoclip. Los 3 paquetes inmobiliarios permanecen ocultos. |
| Alcance y precios | IMPLEMENTED AND VERIFIED — candidato local | Se conserva el alcance disponible del ZIP, precios por imagen, precios desde y cargos mensuales. Los valores no especificados en la referencia permanecen sujetos a propuesta escrita; no se inventaron personal, revisiones ni condiciones. |
| Name Your Budget | IMPLEMENTED AND VERIFIED — HTTP/PostgreSQL aislados | Presupuesto exacto de $350.25 y cantidades inferiores a $500, idioma, servicio, paquete, extras, notas y snapshot persistidos. No implica descuento, aceptación ni reserva automática. |
| Editor de precios | IMPLEMENTED AND VERIFIED | Owner/admin únicamente. Precio y costo privado se guardan atómicamente; un fallo de costo revierte ambos. Costos fuera del catálogo público y sin lectura anon/authenticated. |
| Inglés/español | IMPLEMENTED AND VERIFIED — navegador local | Navegación, catálogo, cotización, errores y pie comercial. Cambio inmediato del encabezado, formulario y atributo HTML de idioma; conserva selección y paquete. No se certifica traducción integral de documentos históricos de clientes. |
| Portal y casting | IMPLEMENTED AND VERIFIED — entorno aislado | Proyectos, invitaciones, propuestas por revisión, mensajes, PDFs privados, fotos multipart, perfiles con consentimiento, asignación/revocación y acceso entre clientes. |
| Contrato → factura → depósito → reserva | IMPLEMENTED AND VERIFIED — navegador/HTTP/PostgreSQL aislados | Nueva sección dentro del proyecto existente. Exige aprobación de la versión vigente, contrato y factura PDF compartidos, registro del contrato firmado y pagos efectivamente recibidos. Reserva requiere depósito cubierto, fecha y confirmación del equipo. Pagos y avisos son idempotentes; errores de notificación revierten el cambio financiero completo. |
| Permisos financieros | IMPLEMENTED AND VERIFIED | Finance registra pagos; productor puede verificar contratos; clientes y crew no pueden efectuar esas operaciones. El cliente ve total, depósito, pagos verificados, saldo y documentos, sin referencias bancarias internas. |
| Correo vigente | IMPLEMENTED AND VERIFIED — alcance limitado | Aviso owner_intake antes pendiente: accepted, attempts=1, sin error y con referencia del proveedor; cero mensajes pendientes/fallidos/unknown al verificar. Gmail contiene consultas, casting, confirmación de cuenta y recuperación recibidos durante la inspección previa. Aceptación SMTP del aviso no prueba su llegada al inbox. |
| Correo del candidato nuevo | IMPLEMENTED, NOT VERIFIED con proveedor real | Reutiliza outbox/notificaciones existentes. Creación, deduplicación y transacción verificadas aisladamente. No se enviaron mensajes nuevos a clientes ni se certificó entrega real de sus avisos nuevos. |
| Build y UI | IMPLEMENTED AND VERIFIED — local | TypeScript, build Next.js 16.4.0, catálogo y portales de owner/viewer a 1440 y 390 px sin desbordamiento ni excepciones JS. Guardado de pago realizado desde el navegador y comprobado en PostgreSQL. |
| SEO/rendimiento | IMPLEMENTED, NOT VERIFIED en campo | Metadatos/canonical/OG y sitemap/robots conservados. Core Web Vitals del candidato sobre el dominio requieren publicación. |
| Publicación | BLOCKED | Vercel devuelve 403 al listar deployments y 404 al consultar el ID previamente confirmado. La CLI no está disponible en este cierre; en la revisión anterior no tenía credenciales. No se intentó un nuevo deploy ni se sustituyó producción. |

El flujo financiero administra documentos y comprobantes; no genera términos legales, no firma por el cliente ni inicia cobros. Los importes y depósito se introducen según el acuerdo y la factura reales. Los registros de pago no admiten edición o eliminación desde esta nueva interfaz. No se hizo ninguna transacción financiera real.

## Correcciones comprobadas

- Solicitudes con UUID repetido y contenido distinto ahora se rechazan, evitando un éxito engañoso y pérdida de cambios.
- Alcances largos y notas válidas se conservan completos en snapshot sin provocar un rechazo por longitud del resumen.
- Avisos internos usan el índice real de deduplicación; el conflicto simple sobre source_key no correspondía al esquema existente.
- Precio público y costo privado se guardan en una sola transacción.
- Campos de formulario llamados `action` ocultaban la propiedad nativa `form.action` y provocaban envíos a una URL equivocada. WorkspaceForm lee ahora el atributo real; la prueba de navegador guarda un pago y comprueba el saldo persistido.
- Los proyectos que usan el flujo financiero no pueden pasar a producción desde datos generales ni mediante una actualización SQL antes de confirmar su reserva. Los proyectos históricos sin registro financiero conservan su comportamiento.
- Las fechas de pagos futuros se comprueban en UTC, evitando una discrepancia al cambiar de día entre navegador y zona horaria de PostgreSQL.

## Supabase y datos

Migraciones aditivas aplicadas:

1. `pricing_inquiry_snapshots`: request_id, snapshot, índice único y costos privados.
2. `atomic_production_pricing`: RPC de actualización atómica del paquete/costo, restringida a service_role.
3. `project_finance_workflow`: registros por proyecto, comprobantes de pagos y RPC transaccional, reutilizando documentos, cuentas y notificaciones existentes. Las tablas contracts/invoices/payments antiguas apuntan a la tabla projects legada; no se duplicó un CRM ni se cambiaron sus relaciones.
4. `finance_reservation_guard`: validación de reserva antes de iniciar producción para proyectos con el nuevo flujo.

RLS activado en las nuevas tablas, sin acceso anon/authenticated; RPC únicamente service_role y autorización de rol/proyecto en cada ruta. Las funciones recuperadas de talento/invitaciones ya existían y solo se conservaron para reproducir el entorno de pruebas.

Se conservan **7 proyectos, 4 solicitudes, 2 aplicaciones de casting y 6 cuentas**. Nuevas tablas financieras: **0 acuerdos y 0 pagos reales**. No se modificaron proyectos de clientes, fotos, contratos o comprobantes reales.

El advisor presenta información de RLS sin políticas para tablas de servidor: el acceso del cliente está revocado deliberadamente. Permanece una advertencia preexistente de protección de contraseñas filtradas de Auth; no se cambió esa configuración. Referencia: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection. No se afirma una auditoría exhaustiva de infraestructura.

## Verificación final

- PASS: TypeScript y compilación de producción.
- PASS: 52/52 recorridos HTTP → PostgreSQL aislado, incluyendo guardado real desde navegador, contrato, factura, pagos, reserva, permisos por rol, rollback atómico, pricing, consultas, portal, casting y documentos privados.
- PASS: 6/6 pruebas Chromium del catálogo, idioma, paquete, presupuesto exacto inferior a $500 y móvil.
- PASS: 19/19 pruebas activas de rutas de cuenta/comunicaciones/newsletter/seguridad y 7/7 de configuración SMTP.
- Evidencia: `docs/auditoria-20261014/evidence/FULL_HTTP_SQL_QA.json` y `docs/release-evidence/BROWSER_QA.json`.
- El script histórico `test-native-auth-bridge.cjs` sigue sin su fixture `NATIVE_AUTH_OUTBOX_BRIDGE.sql`; no se contó como PASS. No es importado por el runtime. Las rutas activas y el correo nativo recibido se verificaron con la evidencia descrita.
- NOT VERIFIED: el nuevo código con SMTP/Auth de producción, todos los tipos de correo/enlaces sobre el dominio y Core Web Vitals en campo. No se usaron clientes reales para pruebas destructivas.

## Código, archivos y rollback

Rama de release en ambos repositorios: `release/primecuts-pricing-recovery-20261014`. Main permanece intacto y el despliegue automático está desactivado para evitar publicaciones al sincronizar esta rama.

Base de este cierre: PRIME-CUT-STUDIO `4aa24c85f664d0501a801de5fa9ed00d1591d61a`; BBHUB `ae8e68b7d8d143a1a552c1048e3214f2135e195a`. Los SHA del cierre se registran en el informe entregado tras confirmar la sincronización.

Cambios principales: catálogo, formularios bilingües y editor de precios; API de consultas/snapshots; `lib/project-finance.ts`, `components/workspace/ProjectFinance.tsx`, `WorkspaceForm.tsx`, `BookUpload.tsx`, `ClientProjectDashboard.tsx`, datos del portal, páginas/rutas del proyecto, migraciones y suites de pruebas.

Los ZIP originales se conservan. El ZIP candidato incluye los assets privados del dossier y referencias de Tony; se excluyen de Git público. Un deploy solamente desde Git sin restaurar esos assets no es equivalente al paquete completo. Las capturas de QA son internas y no se incluyen como entregables.

El sitio no fue reemplazado y las migraciones son compatibles con el código anterior. El rollback de aplicación no debe borrar snapshots, acuerdos ni pagos que se creen después. La definición de terminado en producción **no se ha alcanzado**: faltan acceso operativo a Vercel, prueba del candidato contra los proveedores, un único despliegue controlado y verificación del dominio. Se entrega el trabajo implementado y su evidencia sin afirmar que ya está público.

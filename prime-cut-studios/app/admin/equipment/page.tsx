import Link from 'next/link';
import {redirect} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowLeft} from 'lucide-react';
import {adminAuthenticated} from '@/lib/auth';
import catalog from '@/lib/equipment-catalog.json';
import {EquipmentGallery} from './EquipmentGallery';
import styles from './catalog.module.css';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const metadata:Metadata={
  title:'Catálogo interno de equipos | PrimeCuts OS',
  robots:{index:false,follow:false}
};

export default async function EquipmentPage() {
  if(!await adminAuthenticated())redirect('/admin/login');
  return <main className={styles.page}>
    <nav className={styles.breadcrumbs} aria-label="Ruta de navegación">
      <Link href="/admin">PrimeCuts OS</Link><span aria-hidden="true">/</span><span>Equipos</span>
    </nav>
    <header className={styles.hero}>
      <div><p className={styles.eyebrow}>Prime Cut Studios · Operaciones privadas</p>
        <h1>Equipo de producción</h1>
        <p>Fotografías reales de referencia de fabricantes, enlaces a fichas oficiales y búsqueda por categoría. Catálogo interno: no representa disponibilidad de alquiler ni certifica el estado físico de los equipos.</p>
      </div>
      <Link className={styles.back} href="/admin"><ArrowLeft size={17} aria-hidden="true"/> Volver al panel</Link>
    </header>
    <EquipmentGallery items={catalog}/>
  </main>;
}

'use client';
import Link from 'next/link';
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}) {
  return <main className="shell narrow pagehero"><div className="eyebrow">Prime Cut Studios</div>
    <h1>No pudimos cargar esta página</h1><div className="panel">
      <p role="alert">El servicio no respondió. No confirmamos cambios que no se hayan guardado.</p>
      <div className="actions"><button className="btn" onClick={reset}>Intentar de nuevo</button>
        <Link className="btn secondary" href="/">Volver al inicio</Link></div>
    </div></main>;
}

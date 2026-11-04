// src/components/gestora/Modal.jsx
// Ventana emergente simple: se cierra con la X o con Escape (no al hacer clic afuera, para no perder lo escrito).
import { useEffect } from 'react';
import Icono from './Iconos';

const Modal = ({ titulo, onCerrar, children, pie, ancho = 580 }) => {
  useEffect(() => {
    const alPresionar = (e) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  return (
    <div className="gv-modal-fondo">
      <div className="gv-modal" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: ancho }}>
        <header className="gv-modal-cabecera">
          <h2 className="gv-modal-titulo">{titulo}</h2>
          <button type="button" className="gv-btn-kebab" aria-label="Cerrar" onClick={onCerrar}>
            <Icono nombre="close" tamano={18} />
          </button>
        </header>
        <div className="gv-modal-cuerpo">{children}</div>
        {pie && <footer className="gv-modal-pie">{pie}</footer>}
      </div>
    </div>
  );
};

export default Modal;

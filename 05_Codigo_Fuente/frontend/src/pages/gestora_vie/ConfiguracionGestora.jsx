import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Icono from '../../components/cie/IconoCie';
import { EncabezadoPagina } from '../../components/cie/CieUi';
import { preferenciasGestoraService } from '../../services/preferenciasGestoraService';

const PREDETERMINADAS = { notificaciones: true, resumenCorreo: false, densidad: 'normal' };

export default function ConfiguracionGestora() {
  const { usuario } = useAuth();
  const [preferencias, setPreferencias] = useState(PREDETERMINADAS);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let vigente = true;
    preferenciasGestoraService.obtener()
      .then((datos) => {
        if (vigente) setPreferencias({
          notificaciones: datos.notificaciones ?? true,
          resumenCorreo: false,
          densidad: datos.densidad || 'normal',
        });
      })
      .catch(() => { if (vigente) setError('No se pudieron cargar las preferencias desde el servidor.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.gestoraDensidad = preferencias.densidad;
  }, [preferencias.densidad]);

  const cambiar = (campo, valor) => {
    setPreferencias((p) => ({ ...p, [campo]: valor }));
    setMensaje('');
    setError('');
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true); setMensaje(''); setError('');
    try {
      const datos = await preferenciasGestoraService.guardar({
        ...preferencias,
        resumenCorreo: false,
      });
      setPreferencias({
        notificaciones: datos.notificaciones,
        resumenCorreo: false,
        densidad: datos.densidad,
      });
      setMensaje('Preferencias sincronizadas correctamente con tu cuenta.');
    } catch (e) {
      setError(e?.response?.data?.detail || 'No se pudieron guardar las preferencias.');
    } finally {
      setGuardando(false);
    }
  };

  const restaurar = async () => {
    const predeterminadas = { ...PREDETERMINADAS };
    setPreferencias(predeterminadas);
    setGuardando(true); setMensaje(''); setError('');
    try {
      await preferenciasGestoraService.guardar(predeterminadas);
      setMensaje('Se restauraron las preferencias predeterminadas.');
    } catch (e) {
      setError(e?.response?.data?.detail || 'No se pudieron restaurar las preferencias.');
    } finally {
      setGuardando(false);
    }
  };

  return <div className="gestora-configuracion">
    <EncabezadoPagina titulo="Configuración" subtitulo="Administra las preferencias personales de uso del panel de la Gestora VIE."/>
    {cargando ? <div className="gv-card">Cargando preferencias...</div> : <form onSubmit={guardar}>
      <section className="gv-card gestora-config-card">
        <div className="gestora-config-titulo"><span className="gestora-config-icono" aria-hidden="true"><Icono nombre="usuario" tamano={20}/></span><div><h2>Perfil de usuario</h2><p>Información de la sesión actual.</p></div></div>
        <div className="gestora-campos">
          <label>Nombre completo<input value={[usuario?.nombre, usuario?.apellido1, usuario?.apellido2].filter(Boolean).join(' ') || 'No disponible'} readOnly aria-label="Nombre completo del usuario"/></label>
          <label>Correo institucional<input value={usuario?.correo || 'No disponible'} readOnly aria-label="Correo institucional del usuario"/></label>
          <label>Rol asignado<input value="Persona Gestora VIE" readOnly aria-label="Rol asignado al usuario"/></label>
        </div>
        <p className="gestora-ayuda-campo">Los datos del perfil son de solo lectura y provienen de la cuenta autenticada.</p>
      </section>
      <section className="gv-card gestora-config-card">
        <div className="gestora-config-titulo"><span className="gestora-config-icono" aria-hidden="true"><Icono nombre="bell" tamano={20}/></span><div><h2>Notificaciones</h2><p>Preferencias personales de recepción de avisos.</p></div></div>
        <label className="gestora-preferencia"><span><strong>Notificaciones dentro del sistema</strong><small>No disponible todavía: falta definir cuáles avisos son opcionales y cuáles forman parte del trámite oficial.</small></span><input type="checkbox" checked={preferencias.notificaciones} disabled aria-label="Preferencia de notificaciones no disponible"/></label>
        <label className="gestora-preferencia" aria-describedby="resumen-correo-ayuda">
          <span><strong>Resumen por correo</strong><small id="resumen-correo-ayuda">No disponible todavía: requiere configurar el correo institucional y la tarea programada.</small></span>
          <input type="checkbox" checked={false} disabled aria-label="Resumen por correo no disponible"/>
        </label>
      </section>
      <section className="gv-card gestora-config-card">
        <div className="gestora-config-titulo"><span className="gestora-config-icono" aria-hidden="true"><Icono nombre="sliders" tamano={20}/></span><div><h2>Presentación</h2><p>Ajusta la densidad visual de las listas del módulo Gestora VIE.</p></div></div>
        <label className="gestora-campo-individual">Espaciado de las tablas<select value={preferencias.densidad} onChange={(e) => cambiar('densidad', e.target.value)} aria-label="Seleccionar espaciado y densidad de las tablas"><option value="compacta">Compacto</option><option value="normal">Normal</option><option value="amplia">Amplio</option></select></label>
      </section>
      {mensaje && <div className="gestora-mensaje-guardado" role="status"><Icono nombre="checkCircle" tamano={17} aria-hidden="true"/>{mensaje}</div>}
      {error && <p className="cie-error" role="alert">{error}</p>}
      <div className="gestora-form-acciones">
        <button type="button" className="cie-btn-outline" onClick={restaurar} disabled={guardando} aria-label="Restaurar preferencias predeterminadas">Restaurar predeterminadas</button>
        <button type="submit" className="gv-btn-primario" disabled={guardando} aria-label="Guardar preferencias"><Icono nombre="check" tamano={16} aria-hidden="true"/>{guardando ? 'Guardando...' : 'Guardar preferencias'}</button>
      </div>
    </form>}
  </div>;
}

import { useState } from 'react';
import '../styles/gestora.css';
import '../styles/cie.css';

const expedientes = [
  {
    codigo: 'VIE-2027-001',
    titulo: 'Fortalecimiento de capacidades tecnológicas',
    investigador: 'Dra. Ana Ejemplo',
    escuela: 'Ingeniería en Computación',
    fecha: '15/11/2026',
    estado: 'Por evaluar',
  },
  {
    codigo: 'VIE-2027-002',
    titulo: 'Investigación aplicada en sistemas inteligentes',
    investigador: 'Dr. Carlos Demostración',
    escuela: 'Ingeniería Electrónica',
    fecha: '22/11/2026',
    estado: 'En revisión',
  },
  {
    codigo: 'VIE-2027-003',
    titulo: 'Innovación para el desarrollo sostenible',
    investigador: 'M. Sc. Laura Ejemplo',
    escuela: 'Ciencias Naturales',
    fecha: '30/11/2026',
    estado: 'Con observaciones',
  },
];

export default function PreviewCie() {
  const [seccion, setSeccion] = useState('Expedientes');
  const [busqueda, setBusqueda] = useState('');

  const filtrados = expedientes.filter((p) =>
    `${p.codigo} ${p.titulo} ${p.investigador} ${p.escuela}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  return (
    <div className="gv-layout">
      <header className="gv-header">
        <div className="gv-header-marca">
          <img src="/Logo-TEC-Pagina-Interna.png" alt="Tecnológico de Costa Rica" />
        </div>
        <div className="gv-header-bienvenida">
          <span className="gv-bienvenida-nombre">Vista previa del módulo</span>
          <span className="gv-bienvenida-rol">Miembro del CIE · DEMOSTRACIÓN</span>
        </div>
        <div className="gv-header-acciones">
          <span className="cie-btn-outline">Modo de prueba</span>
        </div>
      </header>

      <aside className="gv-sidebar">
        <nav className="gv-sidebar-nav">
          <div className="gv-seccion">
            <div className="gv-seccion-titulo">VISTA PREVIA</div>
            {['Expedientes', 'Resoluciones'].map((item) => (
              <button
                key={item}
                type="button"
                className={`gv-menu-item ${seccion === item ? 'activo' : ''}`}
                onClick={() => setSeccion(item)}
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
              >
                <span>{item === 'Expedientes' ? '▤' : '✓'}</span>
                <span>{item}</span>
              </button>
            ))}
          </div>
        </nav>
      </aside>

      <main className="gv-main">
        <div style={{
          marginBottom: 20,
          padding: '10px 14px',
          border: '1px solid #d6a84b',
          borderRadius: 8,
          background: '#fff8e6',
          color: '#694d0b',
        }}>
          Vista de demostración: todos los nombres y expedientes son ficticios.
          No se guardan cambios en el sistema.
        </div>

        {seccion === 'Expedientes' ? (
          <>
            <h1 className="gv-titulo">Expedientes para resolución</h1>
            <p className="gv-subtitulo">
              Revisa los expedientes consolidados y consulta su estado.
            </p>

            <div className="gv-resumen">
              {[
                ['3', 'Expedientes de ejemplo'],
                ['1', 'Por evaluar'],
                ['1', 'En revisión'],
                ['1', 'Con observaciones'],
              ].map(([valor, etiqueta]) => (
                <div className="gv-card gv-tarjeta-resumen" key={etiqueta}>
                  <div className="gv-resumen-icono azul">▤</div>
                  <div>
                    <div className="gv-resumen-valor">{valor}</div>
                    <div className="gv-resumen-etiqueta">{etiqueta}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="gv-filtros">
              <label className="gv-campo gv-campo-busqueda">
                <input
                  type="search"
                  placeholder="Buscar código, título o investigador..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </label>
            </div>

            <div className="gv-card gv-tabla-contenedor">
              <div className="gv-tabla-scroll">
                <table className="gv-tabla">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Título de la propuesta</th>
                      <th>Investigador/a</th>
                      <th>Escuela</th>
                      <th>Fecha límite</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((p) => (
                      <tr key={p.codigo}>
                        <td>{p.codigo}</td>
                        <td>{p.titulo}</td>
                        <td>{p.investigador}</td>
                        <td>{p.escuela}</td>
                        <td>{p.fecha}</td>
                        <td>{p.estado}</td>
                      </tr>
                    ))}
                    {filtrados.length === 0 && (
                      <tr>
                        <td colSpan={6} className="gv-sin-resultados">
                          No hay resultados para esa búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="gv-titulo">Resoluciones CIE</h1>
            <p className="gv-subtitulo">
              Esta sección es una representación visual de la consulta histórica.
            </p>
            <div className="gv-card" style={{ padding: 24 }}>
              <h3>Histórico de resoluciones</h3>
              <p>La pantalla real se probará cuando dispongamos de acceso autorizado.</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

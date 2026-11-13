import { useState } from 'react';

const Ayuda = () => {
  const [busqueda, setBusqueda] = useState('');
  const [faqAbierto, setFaqAbierto] = useState(1);

  const toggleFaq = (id) => {
    setFaqAbierto(faqAbierto === id ? null : id);
  };

  const faqs = [
    {
      id: 1,
      pregunta: '¿Cuándo debo solicitar el permiso de CONIS/CEE para mi propuesta?',
      respuesta: 'El aval de CONIS/BIO se exige si la investigación involucra el acceso a recursos genéticos o bioquímicos de la biodiversidad costarricense (campo o laboratorio). Debe adjuntarse en la etapa de revisión de la VIE antes del dictamen final del CIE.',
      enlaceTexto: 'Ver Reglamento de Biodiversidad TEC →'
    },
    {
      id: 2,
      pregunta: '¿Cuál es el límite máximo de horas de dedicación a proyectos por docente?',
      respuesta: 'Según la normativa institucional de la VIE, la dedicación máxima combinada a proyectos de investigación no debe exceder las 20 horas semanales por docente, asegurando el cumplimiento de la carga académica y docente correspondiente.'
    },
    {
      id: 3,
      pregunta: '¿Cómo justifico la contratación de Asistentes u Horas Estudiante?',
      respuesta: 'Debe justificar las horas requeridas en el Form-04 y Form-06, indicando las tareas específicas del estudiante, vinculación con el cronograma y el objetivo directo en las metas técnicas de la investigación.'
    },
    {
      id: 4,
      pregunta: '¿Qué rubros se permiten en la partida de gastos de viaje y campo?',
      respuesta: 'Se permiten gastos de transporte institucional, viáticos de alimentación y hospedaje oficiales según las tablas de la Contraloría General de la República, y adquisición de suministros menores indispensables para trabajo de campo.'
    }
  ];

  const plantillas = [
    { nombre: 'Form-04: Formulación Técnica', formato: 'Formato oficial 2026 (DOCX/ODT)' },
    { nombre: 'Form-05: Tabla de Riesgos', formato: 'Matriz cuantitativa de riesgos VIE' },
    { nombre: 'Form-06: Desglose Financiero', formato: 'Presupuesto detallado por partidas (XLSX)' }
  ];

  return (
    <div className="ayuda-page-container">
      <div className="dashboard-main-card">
        {/* Cabecera */}
        <div className="dashboard-header-row">
          <div className="dashboard-title-group">
            <h1 className="dashboard-main-title">Centro de Ayuda y Soporte a la Investigación VIE</h1>
            <p className="dashboard-subtitle">
              Guías normativas, preguntas frecuentes, requisitos éticos y canales directos de consulta.
            </p>
          </div>
        </div>

        {/* Buscador grande de ayuda */}
        <div className="ayuda-search-container">
          <div className="ayuda-search-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#627d98" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Busca temas como CONICIT/FIE, requisitos éticos, Form-04, presupuesto viáticos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="ayuda-search-input"
            />
          </div>
          <button 
            type="button" 
            className="btn-nueva-propuesta"
            style={{ padding: '12px 24px', fontSize: '14px' }}
          >
            Buscar Solución
          </button>
        </div>

        {/* Dos Columnas */}
        <div className="dashboard-content-columns" style={{ marginTop: '28px' }}>
          {/* Columna Izquierda: Guías y Preguntas Frecuentes */}
          <div className="proposals-column">
            {/* Guías Rápidas */}
            <div className="column-header">
              <h2 className="column-title">Guías Rápidas por Tema</h2>
            </div>

            <div className="ayuda-guias-grid">
              <div className="ayuda-guia-card">
                <div className="guia-icon">📁</div>
                <div className="guia-info">
                  <div className="guia-title">Bases y Normativa VIE</div>
                  <div className="guia-sub">Criterios de evaluación y plazos</div>
                  <a href="#normativa" className="help-link" style={{ fontSize: '13px', marginTop: '6px', display: 'inline-block' }}>Ver guía →</a>
                </div>
              </div>

              <div className="ayuda-guia-card">
                <div className="guia-icon">🧪</div>
                <div className="guia-info">
                  <div className="guia-title">Bioética y Bioético</div>
                  <div className="guia-sub">CONHIS/BIO, CEC y BIOETIC</div>
                  <a href="#bioetica" className="help-link" style={{ fontSize: '13px', marginTop: '6px', display: 'inline-block' }}>Ver guía →</a>
                </div>
              </div>

              <div className="ayuda-guia-card">
                <div className="guia-icon">⚖️</div>
                <div className="guia-info">
                  <div className="guia-title">Gestión Presupuestaria</div>
                  <div className="guia-sub">Viáticos, equipo y materiales</div>
                  <a href="#presupuesto" className="help-link" style={{ fontSize: '13px', marginTop: '6px', display: 'inline-block' }}>Ver guía →</a>
                </div>
              </div>

              <div className="ayuda-guia-card">
                <div className="guia-icon">📊</div>
                <div className="guia-info">
                  <div className="guia-title">Evaluación y Rúbricas</div>
                  <div className="guia-sub">Límites y distribución horaria</div>
                  <a href="#rubricas" className="help-link" style={{ fontSize: '13px', marginTop: '6px', display: 'inline-block' }}>Ver guía →</a>
                </div>
              </div>
            </div>

            {/* Preguntas Frecuentes */}
            <div className="column-header" style={{ marginTop: '30px' }}>
              <h2 className="column-title">Preguntas Frecuentes Relevantes</h2>
            </div>

            <div className="ayuda-faqs-accordion">
              {faqs.map((faq) => {
                const isOpen = faqAbierto === faq.id;
                return (
                  <div key={faq.id} className={`faq-accordion-item ${isOpen ? 'open' : ''}`}>
                    <button 
                      type="button" 
                      className="faq-accordion-header"
                      onClick={() => toggleFaq(faq.id)}
                    >
                      <span className="faq-question-text">{faq.pregunta}</span>
                      <span className="faq-icon-arrow">{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && (
                      <div className="faq-accordion-body">
                        <p>{faq.respuesta}</p>
                        {faq.enlaceTexto && (
                          <a href="#reglamento-bio" className="help-link" style={{ fontSize: '13px', marginTop: '8px', display: 'inline-block' }}>
                            {faq.enlaceTexto}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Plantillas y Soporte Humano */}
          <div className="quick-access-column">
            {/* Plantillas y Formularios */}
            <div className="column-header">
              <h2 className="column-title">Plantillas y Formularios</h2>
              <p className="column-subtitle">Documentos oficiales de la VIE vigentes.</p>
            </div>

            <div className="ayuda-plantillas-list">
              {plantillas.map((p, index) => (
                <div key={index} className="plantilla-item-card">
                  <div className="plantilla-info">
                    <div className="plantilla-name">{p.nombre}</div>
                    <div className="plantilla-sub">{p.formato}</div>
                  </div>
                  <button 
                    type="button" 
                    className="btn-proposal-action btn-outline"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => alert(`Descargando plantilla oficial: ${p.nombre}`)}
                  >
                    Bajar
                  </button>
                </div>
              ))}
            </div>

            {/* Tarjeta de Soporte Humano Directo */}
            <div className="soporte-humano-card" style={{ marginTop: '24px' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', color: '#ffffff', marginBottom: '4px' }}>
                Soporte Humano Directo
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '16px' }}>
                Si tienes dudas técnicas, consulta a la gestora asignada.
              </p>

              <div className="soporte-gestora-row">
                <div className="gestora-avatar-circle">SM</div>
                <div className="gestora-info">
                  <div className="gestora-nombre">Licda. Sofía Monge</div>
                  <div className="gestora-rol">Gestora de investigación de VIE</div>
                </div>
              </div>

              <button 
                type="button" 
                className="btn-contactar-gestora"
                onClick={() => alert('Abriendo formulario de consulta directa con la VIE: vie@tec.ac.cr')}
              >
                ✉ Redactar Consulta a VIE
              </button>

              <div className="soporte-horario-text">
                Atención: Lunes a Viernes 7:30 AM - 4:30 PM
              </div>

              <div className="soporte-botones-inferiores">
                <button 
                  type="button" 
                  className="btn-soporte-secundario"
                  onClick={() => alert('Agendando cita de asesoría técnica virtual con la VIE.')}
                >
                  📅 Agendar Cita con VIE
                </button>
                <button 
                  type="button" 
                  className="btn-soporte-secundario"
                  onClick={() => alert('Visualizando calendario oficial de términos y convocatorias.')}
                >
                  📋 Ver Calendario de Términos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="tec-page-footer">
        Vicerrectoría de Investigación y Extensión — Tecnológico de Costa Rica (TEC)
      </footer>
    </div>
  );
};

export default Ayuda;

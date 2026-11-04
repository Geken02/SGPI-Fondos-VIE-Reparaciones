// src/components/IndicadorFortaleza.jsx
import { calcularFortalezaContrasena } from '../utils/validaciones';

const IndicadorFortaleza = ({ contrasena }) => {
  const fortaleza = calcularFortalezaContrasena(contrasena);
  
  const niveles = [
    { nivel: 0, texto: '', color: '#d1d5db' },
    { nivel: 1, texto: 'Débil', color: '#ef4444' },
    { nivel: 2, texto: 'Regular', color: '#f59e0b' },
    { nivel: 3, texto: 'Buena', color: '#3b82f6' },
    { nivel: 4, texto: 'Fuerte', color: '#10b981' }
  ];
  
  const nivelActual = niveles[fortaleza];
  
  if (!contrasena) return null;
  
  return (
    <div className="indicador-fortaleza">
      <div className="indicador-barras">
        {[1, 2, 3, 4].map((nivel) => (
          <div
            key={nivel}
            className={`indicador-barra ${nivel <= fortaleza ? 'activa' : ''}`}
            style={{
              backgroundColor: nivel <= fortaleza ? nivelActual.color : '#e5e7eb'
            }}
          />
        ))}
      </div>
      <span className="indicador-texto" style={{ color: nivelActual.color }}>
        {nivelActual.texto}
      </span>
    </div>
  );
};

export default IndicadorFortaleza;
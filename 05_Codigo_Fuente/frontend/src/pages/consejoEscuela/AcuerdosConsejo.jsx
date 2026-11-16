import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import consejoEscuelaService from "../../services/consejoEscuelaService";
import "./acuerdosConsejo.css";

const estadoInicial = {
  propuestaId: "",
  tipoAcuerdoId: "",
  numeroAcuerdo: "",
  fechaAcuerdo: "",
  horasAprobadas: "",
  tipoHoraId: "",
  periodoNombramiento: "",
  presupuestoAprobado: "",
};

export default function AcuerdosConsejo() {
  const { rolesUsuario = [] } = useAuth();
  const esDirectorEscuela = rolesUsuario.includes("DirectorEscuela");
  
  const [acuerdos, setAcuerdos] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [tiposAcuerdo, setTiposAcuerdo] = useState([]);
  const [tiposHora, setTiposHora] = useState([]);
  const [cargandoPropuestas, setCargandoPropuestas] = useState(false);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [generandoDoc, setGenerandoDoc] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarAcuerdos = async () => {
    try {
      setCargando(true);
      setError("");
      const respuesta = await consejoEscuelaService.listarAcuerdos();
      setAcuerdos(Array.isArray(respuesta) ? respuesta : respuesta?.items ?? []);
    } catch (err) {
      console.error("Error al cargar acuerdos:", err);
      setError("No fue posible cargar los acuerdos.");
    } finally {
      setCargando(false);
    }
  };

  const cargarCatalogos = async () => {
    try {
      const [tiposAc, tiposH] = await Promise.all([
        consejoEscuelaService.listarTiposAcuerdo(),
        consejoEscuelaService.listarTiposHora()
      ]);
      setTiposAcuerdo(tiposAc || []);
      setTiposHora(tiposH || []);
    } catch (err) {
      console.error("Error al cargar catálogos:", err);
    }
  };

  const cargarPropuestas = async () => {
    try {
      setCargandoPropuestas(true);
      const respuesta = await consejoEscuelaService.listarPropuestasDisponibles();
      setPropuestas(Array.isArray(respuesta) ? respuesta : []);
    } catch (err) {
      console.error("Error al cargar propuestas:", err);
    } finally {
      setCargandoPropuestas(false);
    }
  };

  useEffect(() => {
    cargarAcuerdos();
    cargarCatalogos();
  }, []);

  useEffect(() => {
    if (esDirectorEscuela && mostrarFormulario) {
      cargarPropuestas();
    }
  }, [esDirectorEscuela, mostrarFormulario]);

  const manejarCambio = (event) => {
    const { name, value } = event.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  };

  const manejarGuardar = async (event) => {
    event.preventDefault();
    setError("");
    setMensaje("");

    if (!formulario.propuestaId || !formulario.tipoAcuerdoId) {
      setError("La propuesta y el tipo de acuerdo son obligatorios.");
      return;
    }

    const datos = {
      propuestaId: Number(formulario.propuestaId),
      tipoAcuerdoId: Number(formulario.tipoAcuerdoId),
    };

    if (formulario.numeroAcuerdo.trim()) datos.numeroAcuerdo = formulario.numeroAcuerdo.trim();
    if (formulario.fechaAcuerdo) datos.fechaAcuerdo = formulario.fechaAcuerdo;
    if (formulario.horasAprobadas !== "") datos.horasAprobadas = Number(formulario.horasAprobadas);
    if (formulario.tipoHoraId !== "") datos.tipoHoraId = Number(formulario.tipoHoraId);
    if (formulario.periodoNombramiento.trim()) datos.periodoNombramiento = formulario.periodoNombramiento.trim();
    if (formulario.presupuestoAprobado !== "") datos.presupuestoAprobado = Number(formulario.presupuestoAprobado);

    try {
      setGuardando(true);
      await consejoEscuelaService.crearAcuerdo(datos);
      setMensaje("El acuerdo se registró correctamente.");
      setFormulario(estadoInicial);
      setMostrarFormulario(false);
      await cargarAcuerdos();
    } catch (err) {
      console.error("Error al registrar acuerdo:", err);
      setError(err.response?.data?.detail || "No fue posible registrar el acuerdo.");
    } finally {
      setGuardando(false);
    }
  };

  const descargarDocumento = async (acuerdoId) => {
    try {
      setGenerandoDoc(acuerdoId);
      const blob = await consejoEscuelaService.generarDocumentoAcuerdo(acuerdoId);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Acuerdo_${acuerdoId}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setMensaje("Documento generado exitosamente.");
    } catch (err) {
      console.error("Error al generar documento:", err);
      setError("No fue posible generar el documento del acuerdo.");
    } finally {
      setGenerandoDoc(null);
    }
  };

  const obtenerTipoAcuerdoNombre = (tipoId) => {
    const tipo = tiposAcuerdo.find(t => t.tipoAcuerdoId === tipoId);
    return tipo?.nombre || tipoId;
  };

  const obtenerTipoHoraNombre = (tipoId) => {
    const tipo = tiposHora.find(t => t.tipoHoraId === tipoId);
    return tipo ? `${tipo.codigo} - ${tipo.descripcion}` : tipoId;
  };

  return (
    <main className="acuerdos-consejo">
      <header className="acuerdos-encabezado">
        <div>
          <p className="acuerdos-subtitulo">Consejo de Escuela</p>
          <h1>Gestión de acuerdos</h1>
          <p className="acuerdos-descripcion">
            Consulta y registra los acuerdos relacionados con las propuestas de investigación.
          </p>
        </div>

        {esDirectorEscuela && (
          <button
            type="button"
            className="acuerdos-boton-principal"
            onClick={() => {
              setError("");
              setMensaje("");
              setMostrarFormulario((actual) => !actual);
            }}
          >
            {mostrarFormulario ? "Cancelar" : "＋ Nuevo acuerdo"}
          </button>
        )}
      </header>

      {mensaje && (
        <div className="acuerdos-alerta acuerdos-alerta-exito">{mensaje}</div>
      )}

      {error && (
        <div className="acuerdos-alerta acuerdos-alerta-error">{error}</div>
      )}

      {esDirectorEscuela && mostrarFormulario && (
        <section className="acuerdos-panel">
          <h2>Registrar acuerdo</h2>

          <form onSubmit={manejarGuardar}>
            <div className="acuerdos-formulario-grid">
              <label>
                Propuesta *
                <select
                  name="propuestaId"
                  value={formulario.propuestaId}
                  onChange={manejarCambio}
                  required
                  disabled={cargandoPropuestas || propuestas.length === 0}
                >
                  <option value="">
                    {cargandoPropuestas
                      ? "Cargando propuestas..."
                      : propuestas.length === 0
                      ? "No hay propuestas disponibles"
                      : "Seleccione una propuesta"}
                  </option>
                  {propuestas.map((propuesta) => (
                    <option key={propuesta.propuestaId} value={propuesta.propuestaId}>
                      {propuesta.codigoPropuesta} - {propuesta.titulo}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tipo de acuerdo *
                <select
                  name="tipoAcuerdoId"
                  value={formulario.tipoAcuerdoId}
                  onChange={manejarCambio}
                  required
                >
                  <option value="">Seleccione un tipo</option>
                  {tiposAcuerdo.map((tipo) => (
                    <option key={tipo.tipoAcuerdoId} value={tipo.tipoAcuerdoId}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Número de acuerdo
                <input
                  type="text"
                  name="numeroAcuerdo"
                  value={formulario.numeroAcuerdo}
                  onChange={manejarCambio}
                  placeholder="Ej. AC-2026-001"
                />
              </label>

              <label>
                Fecha del acuerdo
                <input
                  type="date"
                  name="fechaAcuerdo"
                  value={formulario.fechaAcuerdo}
                  onChange={manejarCambio}
                />
              </label>

              <label>
                Horas aprobadas
                <input
                  type="number"
                  name="horasAprobadas"
                  min="0"
                  step="0.1"
                  value={formulario.horasAprobadas}
                  onChange={manejarCambio}
                />
              </label>

              <label>
                Tipo de hora
                <select
                  name="tipoHoraId"
                  value={formulario.tipoHoraId}
                  onChange={manejarCambio}
                >
                  <option value="">Seleccione tipo de hora</option>
                  {tiposHora.map((tipo) => (
                    <option key={tipo.tipoHoraId} value={tipo.tipoHoraId}>
                      {tipo.codigo} - {tipo.descripcion}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Período de nombramiento
                <input
                  type="text"
                  name="periodoNombramiento"
                  value={formulario.periodoNombramiento}
                  onChange={manejarCambio}
                  placeholder="Ej. I Semestre 2027"
                />
              </label>

              <label>
                Presupuesto aprobado
                <input
                  type="number"
                  name="presupuestoAprobado"
                  min="0"
                  step="0.01"
                  value={formulario.presupuestoAprobado}
                  onChange={manejarCambio}
                />
              </label>
            </div>

            <div className="acuerdos-formulario-acciones">
              <button
                type="button"
                className="acuerdos-boton-secundario"
                onClick={() => {
                  setFormulario(estadoInicial);
                  setMostrarFormulario(false);
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="acuerdos-boton-principal"
                disabled={guardando}
              >
                {guardando ? "Guardando..." : "Guardar acuerdo"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="acuerdos-panel">
        <div className="acuerdos-listado-encabezado">
          <div>
            <h2>Acuerdos registrados</h2>
            <p>{acuerdos.length} acuerdo(s)</p>
          </div>

          <button
            type="button"
            className="acuerdos-boton-secundario"
            onClick={cargarAcuerdos}
            disabled={cargando}
          >
            Actualizar
          </button>
        </div>

        {cargando ? (
          <p className="acuerdos-estado">Cargando acuerdos...</p>
        ) : acuerdos.length === 0 ? (
          <p className="acuerdos-estado">No hay acuerdos registrados.</p>
        ) : (
          <div className="acuerdos-tabla-contenedor">
            <table className="acuerdos-tabla">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Propuesta</th>
                  <th>Tipo de acuerdo</th>
                  <th>Número</th>
                  <th>Fecha</th>
                  <th>Horas</th>
                  <th>Tipo Hora</th>
                  <th>Presupuesto</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {acuerdos.map((acuerdo) => (
                  <tr key={acuerdo.acuerdoId}>
                    <td>{acuerdo.acuerdoId}</td>
                    <td>{acuerdo.propuestaId || "—"}</td>
                    <td>{obtenerTipoAcuerdoNombre(acuerdo.tipoAcuerdoId)}</td>
                    <td>{acuerdo.numeroAcuerdo || "—"}</td>
                    <td>
                      {acuerdo.fechaAcuerdo 
                        ? new Date(acuerdo.fechaAcuerdo).toLocaleDateString('es-CR')
                        : "—"}
                    </td>
                    <td>{acuerdo.horasAprobadas ?? "—"}</td>
                    <td>{obtenerTipoHoraNombre(acuerdo.tipoHoraId)}</td>
                    <td>
                      {acuerdo.presupuestoAprobado != null
                        ? `₡${Number(acuerdo.presupuestoAprobado).toLocaleString('es-CR')}`
                        : "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="acuerdos-boton-accion"
                        onClick={() => descargarDocumento(acuerdo.acuerdoId)}
                        disabled={generandoDoc === acuerdo.acuerdoId}
                        title="Descargar documento oficial"
                      >
                        {generandoDoc === acuerdo.acuerdoId ? "⏳" : "📄"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
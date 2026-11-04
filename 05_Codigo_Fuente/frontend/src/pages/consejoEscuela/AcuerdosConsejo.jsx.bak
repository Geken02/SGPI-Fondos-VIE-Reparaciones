import { useEffect, useState } from "react";
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
  rutaArchivo: "",
};

export default function AcuerdosConsejo() {
  const [acuerdos, setAcuerdos] = useState([]);
  const [formulario, setFormulario] = useState(estadoInicial);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
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
      setError(
        err.response?.data?.detail ||
          "No fue posible cargar los acuerdos. Verificá tu sesión y los permisos."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAcuerdos();
  }, []);

  const manejarCambio = (event) => {
    const { name, value } = event.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
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

    if (formulario.numeroAcuerdo.trim()) {
      datos.numeroAcuerdo = formulario.numeroAcuerdo.trim();
    }

    if (formulario.fechaAcuerdo) {
      datos.fechaAcuerdo = formulario.fechaAcuerdo;
    }

    if (formulario.horasAprobadas !== "") {
      datos.horasAprobadas = Number(formulario.horasAprobadas);
    }

    if (formulario.tipoHoraId !== "") {
      datos.tipoHoraId = Number(formulario.tipoHoraId);
    }

    if (formulario.periodoNombramiento.trim()) {
      datos.periodoNombramiento = formulario.periodoNombramiento.trim();
    }

    if (formulario.presupuestoAprobado !== "") {
      datos.presupuestoAprobado = Number(formulario.presupuestoAprobado);
    }

    if (formulario.rutaArchivo.trim()) {
      datos.rutaArchivo = formulario.rutaArchivo.trim();
    }

    try {
      setGuardando(true);

      await consejoEscuelaService.crearAcuerdo(datos);

      setMensaje("El acuerdo se registró correctamente.");
      setFormulario(estadoInicial);
      setMostrarFormulario(false);

      await cargarAcuerdos();
    } catch (err) {
      console.error("Error al registrar acuerdo:", err);

      const detalle = err.response?.data?.detail;

      setError(
        typeof detalle === "string"
          ? detalle
          : "No fue posible registrar el acuerdo. Revisá los datos y los permisos."
      );
    } finally {
      setGuardando(false);
    }
  };

  const obtenerId = (acuerdo) =>
    acuerdo.acuerdoId ?? acuerdo.id ?? "—";

  const obtenerPropuesta = (acuerdo) =>
    acuerdo.propuestaId ??
    acuerdo.propuesta?.propuestaId ??
    acuerdo.propuesta?.codigoPropuesta ??
    "—";

  const obtenerTipo = (acuerdo) =>
    acuerdo.tipoAcuerdo?.nombre ??
    acuerdo.tipoAcuerdoNombre ??
    acuerdo.tipoAcuerdoId ??
    "—";

  const obtenerFecha = (fecha) => {
    if (!fecha) return "—";

    const fechaLocal = new Date(`${fecha}T00:00:00`);

    return Number.isNaN(fechaLocal.getTime())
      ? fecha
      : fechaLocal.toLocaleDateString("es-CR");
  };

  return (
    <main className="acuerdos-consejo">
      <header className="acuerdos-encabezado">
        <div>
          <p className="acuerdos-subtitulo">Consejo de Escuela</p>
          <h1>Gestión de acuerdos</h1>
          <p className="acuerdos-descripcion">
            Consulta y registra los acuerdos relacionados con las propuestas
            de investigación.
          </p>
        </div>

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
      </header>

      {mensaje && (
        <div className="acuerdos-alerta acuerdos-alerta-exito">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="acuerdos-alerta acuerdos-alerta-error">
          {error}
        </div>
      )}

      {mostrarFormulario && (
        <section className="acuerdos-panel">
          <h2>Registrar acuerdo</h2>

          <form onSubmit={manejarGuardar}>
            <div className="acuerdos-formulario-grid">
              <label>
                ID de propuesta *
                <input
                  type="number"
                  name="propuestaId"
                  min="1"
                  value={formulario.propuestaId}
                  onChange={manejarCambio}
                  required
                />
              </label>

              <label>
                Tipo de acuerdo *
                <input
                  type="number"
                  name="tipoAcuerdoId"
                  min="1"
                  value={formulario.tipoAcuerdoId}
                  onChange={manejarCambio}
                  required
                />
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
                Tipo de hora (ID)
                <input
                  type="number"
                  name="tipoHoraId"
                  min="1"
                  value={formulario.tipoHoraId}
                  onChange={manejarCambio}
                />
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

              <label className="acuerdos-campo-completo">
                Ruta del archivo
                <input
                  type="text"
                  name="rutaArchivo"
                  value={formulario.rutaArchivo}
                  onChange={manejarCambio}
                  placeholder="Ruta o referencia del documento"
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
          <p className="acuerdos-estado">
            No hay acuerdos registrados para mostrar.
          </p>
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
                  <th>Presupuesto</th>
                </tr>
              </thead>

              <tbody>
                {acuerdos.map((acuerdo) => (
                  <tr key={obtenerId(acuerdo)}>
                    <td>{obtenerId(acuerdo)}</td>
                    <td>{obtenerPropuesta(acuerdo)}</td>
                    <td>{obtenerTipo(acuerdo)}</td>
                    <td>{acuerdo.numeroAcuerdo || "—"}</td>
                    <td>{obtenerFecha(acuerdo.fechaAcuerdo)}</td>
                    <td>{acuerdo.horasAprobadas ?? "—"}</td>
                    <td>
                      {acuerdo.presupuestoAprobado == null
                        ? "—"
                        : Number(
                            acuerdo.presupuestoAprobado
                          ).toLocaleString("es-CR", {
                            style: "currency",
                            currency: "CRC",
                          })}
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

// Sigla institucional V.I.E.
// Se renderiza visualmente como "VIE" (sin cambios de diseño), pero los lectores
// de pantalla la leen deletreada ("V I E") para evitar que la confundan con la
// abreviatura de "viernes" (LUN/MAR/MIÉ/JUE/VIE).
const SiglaVie = () => (
  <>
    <span aria-hidden="true">VIE</span>
    <span className="sr-only">V I E</span>
  </>
);

export default SiglaVie;

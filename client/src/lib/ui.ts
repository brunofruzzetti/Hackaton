/**
 * Piezas compartidas del sistema neobrutalista. Se combinan con clases
 * Tailwind para que los componentes sigan siendo legibles y consistentes.
 */
export const BRUTAL = {
  card: "border-2 border-black bg-[#fffdf7] shadow-[4px_4px_0_0_#000]",
  cardLg: "border-[3px] border-black bg-[#fffdf7] shadow-[6px_6px_0_0_#000]",
  cardSm: "border-2 border-black bg-[#fffdf7] shadow-[2px_2px_0_0_#000]",
  button:
    "border-2 border-black shadow-[4px_4px_0_0_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0",
  buttonSm:
    "border-2 border-black shadow-[2px_2px_0_0_#000] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
  label: "font-mono text-[10px] font-bold uppercase tracking-[0.18em]",
  title: "font-black uppercase tracking-tight",
} as const;

export const PHASE_LABEL: Record<string, string> = {
  LOBBY: "LOBBY",
  NOMINACION: "NOMINACIÓN",
  VOTACION_COMISION: "VOTACIÓN",
  FIRMA_CONTRATO: "FIRMA SECRETA",
  RESOLUCION_RONDA: "RESOLUCIÓN",
  VICTORIA: "VICTORIA",
};

export const PHASE_SHORT: Record<string, string> = {
  LOBBY: "ESPERANDO VECINOS",
  NOMINACION: "NOMINAR VOCAL",
  VOTACION_COMISION: "VOTAR COMISIÓN",
  FIRMA_CONTRATO: "FIRMAR CONTRATO",
  RESOLUCION_RONDA: "ABRIENDO EL SOBRE",
  VICTORIA: "ACTA FINAL",
};

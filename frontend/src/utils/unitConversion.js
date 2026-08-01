/**
 * Utility functions for converting physical quantities between SI and Imperial units.
 */

export const UNIT_SYSTEMS = {
  SI: 'si',
  IMPERIAL: 'imperial',
};

/**
 * Format temperature value based on active unit system.
 * SI: Kelvin [K]
 * Imperial: Fahrenheit [°F]
 */
export function formatTemp(valueK, system = 'si', precision = 1) {
  if (valueK == null || !Number.isFinite(valueK)) return '—';
  if (system === 'imperial') {
    const degF = (valueK - 273.15) * 1.8 + 32;
    return `${degF.toFixed(precision)} °F`;
  }
  return `${valueK.toFixed(precision)} K`;
}

/**
 * Format pressure value based on active unit system.
 * SI: kPa / MPa
 * Imperial: psi / bar
 */
export function formatPressure(valuePa, system = 'si', precision = 2) {
  if (valuePa == null || !Number.isFinite(valuePa)) return '—';
  if (system === 'imperial') {
    const psi = valuePa / 6894.75729;
    return `${psi.toFixed(precision)} psi`;
  }
  const kPa = valuePa / 1000;
  if (kPa >= 1000) {
    return `${(kPa / 1000).toFixed(precision)} MPa`;
  }
  return `${kPa.toFixed(precision)} kPa`;
}

/**
 * Format thrust value based on active unit system.
 * SI: N / kN
 * Imperial: lbf
 */
export function formatThrust(valueN, system = 'si', precision = 1) {
  if (valueN == null || !Number.isFinite(valueN)) return '—';
  if (system === 'imperial') {
    const lbf = valueN * 0.224808943;
    return `${lbf.toFixed(precision)} lbf`;
  }
  if (Math.abs(valueN) >= 1000) {
    return `${(valueN / 1000).toFixed(precision)} kN`;
  }
  return `${valueN.toFixed(precision)} N`;
}

/**
 * Format Specific Thrust (N/kg/s or lbf/lbm/s).
 */
export function formatSpecThrust(valueNPerKgSec, system = 'si', precision = 1) {
  if (valueNPerKgSec == null || !Number.isFinite(valueNPerKgSec)) return '—';
  if (system === 'imperial') {
    // 1 N/kg/s = 0.10197 lbf/(lbm/s)
    const impVal = valueNPerKgSec * 0.10197;
    return `${impVal.toFixed(precision)} lbf/(lbm/s)`;
  }
  return `${valueNPerKgSec.toFixed(precision)} N·s/kg`;
}

/**
 * Format TSFC (kg/N/s or lbm/lbf/hr).
 * 1 kg/N/s ≈ 35303.94 lbm/(lbf·hr)
 */
export function formatTSFC(valueKgPerNSec, system = 'si', precision = 4) {
  if (valueKgPerNSec == null || !Number.isFinite(valueKgPerNSec)) return '—';
  if (system === 'imperial') {
    const impVal = valueKgPerNSec * 35303.94;
    return `${impVal.toFixed(3)} lb/(lbf·hr)`;
  }
  // Convert kg/N/s to g/kN/s for cleaner reading
  const gPerKnSec = valueKgPerNSec * 1e6;
  return `${gPerKnSec.toFixed(precision)} g/kN·s`;
}

/**
 * Format altitude (m or ft).
 */
export function formatAltitude(valueMeters, system = 'si', precision = 0) {
  if (valueMeters == null || !Number.isFinite(valueMeters)) return '—';
  if (system === 'imperial') {
    const feet = valueMeters * 3.28084;
    return `${feet.toFixed(precision)} ft`;
  }
  if (valueMeters >= 1000) {
    return `${(valueMeters / 1000).toFixed(1)} km`;
  }
  return `${valueMeters.toFixed(precision)} m`;
}

/**
 * Format velocity (m/s or kts / mph).
 */
export function formatVelocity(valueMps, system = 'si', precision = 1) {
  if (valueMps == null || !Number.isFinite(valueMps)) return '—';
  if (system === 'imperial') {
    const knots = valueMps * 1.94384;
    return `${knots.toFixed(precision)} kts`;
  }
  return `${valueMps.toFixed(precision)} m/s`;
}

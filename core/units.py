import math

# Physics Constants (SI Units)
G = 9.80665  # Standard gravity (m/s^2)
R_AIR = 287.05  # Gas constant for air (J/(kg*K))
GAMMA_AIR = 1.4  # Heat capacity ratio for air
CP_AIR = 1004.5  # Specific heat capacity for air (J/(kg*K))

# Unit Conversions (Always work in SI internally)
def kts_to_ms(kts):
    return kts * 0.514444

def ms_to_kts(ms):
    return ms / 0.514444

def ft_to_m(ft):
    return ft * 0.3048

def m_to_ft(m):
    return m / 0.3048

def lbf_to_n(lbf):
    return lbf * 4.44822

def n_to_lbf(n):
    return n / 4.44822

# Atmospheric Model (ICAO Standard Atmosphere, 4-layer)
def isa_atmosphere(altitude_m: float) -> tuple:
    """
    Returns (pressure_pa, temperature_k, density_kgm3) for a given altitude.

    Implements the ICAO Standard Atmosphere (Doc 7488) across four layers:
      - Troposphere        :  0 - 11 000 m  (lapse -6.5 K/km)
      - Lower Stratosphere : 11 000 - 20 000 m (isothermal, 216.65 K)
      - Upper Stratosphere : 20 000 - 32 000 m (lapse +1.0 K/km)
      - Stratopause        : 32 000 - 47 000 m (lapse +2.8 K/km)

    Args:
        altitude_m: Geometric altitude above sea-level [m].

    Returns:
        tuple: (pressure [Pa], temperature [K], density [kg/m3]).
    """
    # ICAO layer base values
    T0 = 288.15    # Sea-level temperature [K]
    P0 = 101325.0  # Sea-level pressure [Pa]
    L0 = -0.0065   # Troposphere lapse rate [K/m]

    h = float(altitude_m)

    if h < 0:
        raise ValueError(f"altitude_m must be >= 0, got {h}")
    if h > 47000.0:
        raise ValueError(
            f"altitude_m={h} m exceeds the 47 km limit of the 4-layer ICAO ISA model. "
            "Use a higher-fidelity model for mesosphere / thermosphere analysis."
        )

    # Layer 1: Troposphere (0 - 11 000 m)
    T11 = T0 + L0 * 11000.0                            # 216.65 K
    P11 = P0 * (T11 / T0) ** (-G / (L0 * R_AIR))       # ~22 632 Pa (computed)

    if h <= 11000.0:
        T = T0 + L0 * h
        P = P0 * (T / T0) ** (-G / (L0 * R_AIR))

    # Layer 2: Lower Stratosphere (11 000 - 20 000 m), isothermal
    elif h <= 20000.0:
        T = T11
        P = P11 * math.exp(-G * (h - 11000.0) / (R_AIR * T11))

    # Layer 3: Upper Stratosphere (20 000 - 32 000 m), lapse +1 K/km
    else:
        T20 = T11                                           # 216.65 K
        P20 = P11 * math.exp(-G * 9000.0 / (R_AIR * T11)) # pressure at 20 km
        L2  = 0.001                                         # +1.0 K/km
        T32 = T20 + L2 * 12000.0                           # 228.65 K
        P32 = P20 * (T32 / T20) ** (-G / (L2 * R_AIR))

        if h <= 32000.0:
            T = T20 + L2 * (h - 20000.0)
            P = P20 * (T / T20) ** (-G / (L2 * R_AIR))

        # Layer 4: Stratopause (32 000 - 47 000 m), lapse +2.8 K/km
        else:
            L3 = 0.0028                                     # +2.8 K/km
            h_clamped = min(h, 47000.0)                     # clamp beyond spec
            T = T32 + L3 * (h_clamped - 32000.0)
            P = P32 * (T / T32) ** (-G / (L3 * R_AIR))

    rho = P / (R_AIR * T)
    return P, T, rho

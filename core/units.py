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

# Atmospheric Model (Simple ISA)
def isa_atmosphere(altitude_m):
    """
    Returns (pressure_pa, temperature_k, density_kgm3) for a given altitude.
    Simplified version for the troposphere.
    """
    T0 = 288.15
    P0 = 101325
    L = 0.0065  # Temperature lapse rate (K/m)
    
    if altitude_m <= 11000:
        T = T0 - L * altitude_m
        P = P0 * (1 - L * altitude_m / T0)**(G / (L * R_AIR))
    else:
        # Stratosphere (ISOTHERMAL)
        T = 216.65
        P11 = 22632
        P = P11 * math.exp(-G * (altitude_m - 11000) / (R_AIR * T))
    
    rho = P / (R_AIR * T)
    return P, T, rho

import math

# Sign convention: all angles measured from the axial (meridional) direction.
# Positive angles are in the direction of rotor rotation (positive whirl).
# Absolute-frame angles: alpha1 (rotor inlet), alpha2 (rotor exit / stator inlet).
# Relative-frame angles: beta1 (rotor inlet), beta2 (rotor exit).

_GAMMA_AIR = 1.4
_R_AIR = 287.0   # J/(kg·K)
_CP_AIR = 1005.0  # J/(kg·K)


def _speed_of_sound(T_static: float, gamma: float = _GAMMA_AIR) -> float:
    return math.sqrt(gamma * _R_AIR * T_static)


class StageAero:
    """
    2-D mean-line flow analysis for axial compressor or turbine stages.

    Angle sign convention
    ---------------------
    All angles are measured from the axial (meridional) direction.
    Positive angles are in the direction of rotor rotation (positive whirl).
    Absolute-frame: alpha1 (rotor inlet), alpha2 (rotor exit / stator inlet).
    Relative-frame:  beta1 (rotor inlet), beta2 (rotor exit).
    """

    def __init__(self, u_mean: float, ca: float, T1_static: float = 288.15):
        """
        Parameters
        ----------
        u_mean    : blade speed at mean radius [m/s]
        ca        : axial velocity [m/s] (constant through stage)
        T1_static : absolute static temperature at rotor inlet [K]
        """
        if u_mean <= 0:
            raise ValueError(f"u_mean must be > 0, got {u_mean}")
        if ca <= 0:
            raise ValueError(f"ca must be > 0, got {ca}")
        if T1_static <= 0:
            raise ValueError(f"T1_static must be > 0, got {T1_static}")
        self.u = u_mean
        self.ca = ca
        self.T1 = T1_static

    def calculate_stage(
        self,
        psi: float,
        phi: float,
        degree_of_reaction: float = 0.5,
        sigma: float = 1.0,
    ) -> dict:
        """
        Mean-line velocity-triangle, Mach-number, and loss analysis.

        Parameters
        ----------
        psi                : stage loading coefficient (delta_h0 / u²)
        phi                : flow coefficient (ca / u)
        degree_of_reaction : R = 1 - (Cw1 + Cw2)/(2u). Typical 0.5.
        sigma              : blade row solidity (chord / pitch). Default 1.0.

        Returns
        -------
        dict: velocities, angles, mach_numbers, loss, reaction_actual
        """
        if not (0.0 < phi <= 2.0):
            raise ValueError(f"phi must be in (0, 2], got {phi}")
        if not (0.0 <= degree_of_reaction <= 1.0):
            raise ValueError(f"degree_of_reaction must be in [0, 1], got {degree_of_reaction}")

        R = degree_of_reaction
        u = self.u
        ca = self.ca

        # Absolute whirl velocities from Euler work and degree-of-reaction:
        #   Euler : Cw2 - Cw1 = psi * u
        #   DOR   : R = 1 - (Cw1 + Cw2) / (2u)
        #   => Cw1 = u * (1 - R - psi/2)
        #   => Cw2 = u * (1 - R + psi/2)
        vw1 = u * (1.0 - R - psi / 2.0)
        vw2 = u * (1.0 - R + psi / 2.0)

        # Absolute velocities
        v1 = math.sqrt(ca ** 2 + vw1 ** 2)
        v2 = math.sqrt(ca ** 2 + vw2 ** 2)

        # Relative whirl velocities
        w1_tan = u - vw1
        w2_tan = u - vw2

        # Relative velocities
        w1 = math.sqrt(ca ** 2 + w1_tan ** 2)
        w2 = math.sqrt(ca ** 2 + w2_tan ** 2)

        # Blade angles (degrees, from axial, positive in direction of rotation)
        alpha1 = math.degrees(math.atan2(vw1, ca))
        alpha2 = math.degrees(math.atan2(vw2, ca))
        beta1  = math.degrees(math.atan2(w1_tan, ca))
        beta2  = math.degrees(math.atan2(w2_tan, ca))

        # Deflection in relative frame (rotor blade turning angle)
        deflection_rotor = beta1 - beta2

        # Mach numbers (T1_static as reference; valid for mean-line screening)
        a1 = _speed_of_sound(self.T1)
        M1_abs = v1 / a1
        M1_rel = w1 / a1
        M2_rel = w2 / a1

        # Diffusion factor (Lieblein, 1953) — rotor blade row
        #   D = 1 - W2/W1 + |ΔCw_rel| / (2 * sigma * W1)
        delta_cw_rel = abs(w2_tan - w1_tan)
        D_rotor = 1.0 - (w2 / w1) + delta_cw_rel / (2.0 * sigma * w1)

        # Profile loss: significant above D = 0.45 (empirical Lieblein limit)
        D_excess = max(0.0, D_rotor - 0.45)
        Y_p = 0.12 * D_excess ** 2

        # Deviation (Carter's rule, simplified): δ ≈ 0.26 * sqrt(θ_camber)
        # Blade camber proxied from relative-frame turning angle.
        camber_proxy = abs(deflection_rotor)
        deviation = 0.26 * math.sqrt(camber_proxy) if camber_proxy > 0.0 else 0.0

        # Design-point incidence is zero by definition (blades designed for this triangle).
        incidence = 0.0

        # Cross-check: DOR from computed velocities (must equal R)
        reaction_actual = 1.0 - (vw1 + vw2) / (2.0 * u)

        return {
            'velocities': {
                'v1': round(v1, 3), 'vw1': round(vw1, 3),
                'v2': round(v2, 3), 'vw2': round(vw2, 3),
                'w1': round(w1, 3), 'w1_tan': round(w1_tan, 3),
                'w2': round(w2, 3), 'w2_tan': round(w2_tan, 3),
            },
            'angles': {
                'alpha1': round(alpha1, 2),
                'alpha2': round(alpha2, 2),
                'beta1' : round(beta1, 2),
                'beta2' : round(beta2, 2),
                'deflection_rotor': round(deflection_rotor, 2),
            },
            'mach_numbers': {
                'M1_abs': round(M1_abs, 4),
                'M1_rel': round(M1_rel, 4),
                'M2_rel': round(M2_rel, 4),
            },
            'loss': {
                'D_rotor'  : round(D_rotor, 4),
                'Y_p'      : round(Y_p, 4),
                'deviation': round(deviation, 2),
                'incidence': incidence,
            },
            'reaction_actual': round(reaction_actual, 4),
        }

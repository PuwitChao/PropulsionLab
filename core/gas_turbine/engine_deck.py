"""Bounded installed-engine deck interpolation and constant-condition cruise segments."""
import math
import numpy as np
from ..units import isa_atmosphere,G,R_AIR
from ..errors import InputValidationError,ModelDomainError,PhysicalInfeasibilityError
from ..solver_result import assurance,require_finite


def deck_point(deck,altitude_m,mach):
    """Interpolate an installed-thrust deck without extrapolation. Axes: altitude then Mach."""
    if not deck.get('source_id') or deck.get('units')!={'altitude':'m','thrust':'N','tsfc':'kg/(N*s)'}:
        raise InputValidationError('An engine deck requires source_id and the declared SI unit contract.')
    alt=np.asarray(deck['altitudes_m'],dtype=float);speed=np.asarray(deck['mach'],dtype=float)
    if alt.ndim!=1 or speed.ndim!=1 or min(len(alt),len(speed))<2 or not np.isfinite(alt).all() or not np.isfinite(speed).all() or np.any(np.diff(alt)<=0) or np.any(np.diff(speed)<=0):
        raise InputValidationError('Deck axes must be finite, strictly increasing, and contain at least two points.')
    if alt[0]<0 or alt[-1]>47000 or speed[0]<=0:
        raise InputValidationError('Deck axes must use supported altitude and positive Mach.')
    if not math.isfinite(altitude_m) or not math.isfinite(mach) or not alt[0]<=altitude_m<=alt[-1] or not speed[0]<=mach<=speed[-1]:
        raise ModelDomainError('The mission point is outside the supplied deck. Extrapolation is disabled.')
    result={}
    for key in ('installed_thrust_n','tsfc_kg_per_n_s'):
        grid=np.asarray(deck[key],dtype=float)
        if grid.shape!=(len(alt),len(speed)) or not np.isfinite(grid).all() or np.any(grid<=0):
            raise InputValidationError('Deck grids must be finite, positive, and aligned with the axes.')
        rows=[np.interp(mach,speed,row) for row in grid]
        result[key]=float(np.interp(altitude_m,alt,rows))
    return result


def cruise_with_deck(deck,segments,initial_mass_kg,wing_area_m2,cd0,induced_drag_factor):
    """Integrate cruise mass for fixed altitude/Mach segments and a constant segment TSFC."""
    if not all(math.isfinite(v) for v in (initial_mass_kg,wing_area_m2,cd0,induced_drag_factor)) or min(initial_mass_kg,wing_area_m2)<=0 or min(cd0,induced_drag_factor)<0 or cd0+induced_drag_factor<=0 or not segments:
        raise InputValidationError('Mission mass, wing area, and drag polar must be physically valid.')
    mass=initial_mass_kg;distance=0.;rows=[]
    for segment in segments:
        altitude,mach,duration=segment['altitude_m'],segment['mach'],segment['duration_s']
        if not math.isfinite(duration) or duration<=0:
            raise InputValidationError('Segment duration must be finite and positive.')
        point=deck_point(deck,altitude,mach)
        _,temperature,density=isa_atmosphere(altitude)
        velocity=mach*math.sqrt(1.4*R_AIR*temperature)
        q=.5*density*velocity**2
        if q < 1:
            raise ModelDomainError('Cruise dynamic pressure must be at least 1 Pa.')
        a=q*wing_area_m2*cd0;b=induced_drag_factor*G**2/(q*wing_area_m2)
        required=a+b*mass**2
        if required>point['installed_thrust_n']:
            raise PhysicalInfeasibilityError('Installed thrust cannot meet the cruise drag demand.',required_thrust_n=required,available_thrust_n=point['installed_thrust_n'])
        c=point['tsfc_kg_per_n_s'];start=mass
        if b==0:
            mass-=c*a*duration
        elif a==0:
            mass=mass/(1+c*b*mass*duration)
        else:
            angle=math.atan(mass*math.sqrt(b/a))-c*math.sqrt(a*b)*duration
            mass=math.sqrt(a/b)*math.tan(angle) if angle>0 else -1
        if mass<=0:
            raise PhysicalInfeasibilityError('The cruise segment exhausts the supplied mass.')
        distance+=velocity*duration
        rows.append({**segment,**point,'initial_mass_kg':start,'final_mass_kg':mass,'fuel_kg':start-mass,'required_thrust_start_n':required,'distance_m':velocity*duration})
    result={'initial_mass_kg':initial_mass_kg,'final_mass_kg':mass,'fuel_kg':initial_mass_kg-mass,'distance_m':distance,'segments':rows,
        'status':'OUTSIDE_VALIDATED_DOMAIN','assurance':assurance('installed_deck_cruise',{'deck_source_id':deck['source_id']},
        assumptions=['Constant segment altitude, Mach, TSFC and parabolic polar; quasi-steady level flight.',
                     'Deck thrust is total installed available thrust; TSFC is assumed applicable at demanded thrust.',
                     'No climb, reserve, wind, dry-mass constraint, or map extrapolation.'],
        warnings=['Deck provenance does not establish independent flight validation.'])}
    require_finite(result)
    return result

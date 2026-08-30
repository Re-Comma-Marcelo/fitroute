import { useEffect, useState } from "react";
import { getWeightUnit, onWeightUnitChange, setWeightUnit, type WeightUnit } from "./units";

/** Active weight unit, re-rendering the caller when the preference changes. */
export function useWeightUnit(): { unit: WeightUnit; setUnit: (unit: WeightUnit) => void } {
  const [unit, setUnitState] = useState<WeightUnit>("kg");

  // Read after hydration: localStorage is not available during SSR.
  useEffect(() => {
    setUnitState(getWeightUnit());
    return onWeightUnitChange(setUnitState);
  }, []);

  return { unit, setUnit: setWeightUnit };
}

import { componentPriceConflicts } from "../catalog/sources/component-conflicts.js";

export { componentPriceConflicts };

/** The same reviewed component exclusions govern quotes and the source inventory. */
export function componentPriceConflict(scope: { modelId?: string; componentId: string }) {
  return componentPriceConflicts.find(
    (conflict) =>
      (!conflict.appliesTo.modelIds || conflict.appliesTo.modelIds.includes(scope.modelId ?? "")) &&
      (!conflict.appliesTo.componentIds || conflict.appliesTo.componentIds.includes(scope.componentId)),
  );
}

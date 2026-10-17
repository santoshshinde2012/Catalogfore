import evidence from "../../../../data/component-price-conflicts.json";

export const componentPriceConflicts = evidence.conflicts;

/** The same reviewed component exclusions govern quotes and the source inventory. */
export function componentPriceConflict(scope: { modelId?: string; componentId: string }) {
  return componentPriceConflicts.find(
    (conflict) =>
      (!conflict.appliesTo.modelIds || conflict.appliesTo.modelIds.includes(scope.modelId ?? "")) &&
      (!conflict.appliesTo.componentIds || conflict.appliesTo.componentIds.includes(scope.componentId)),
  );
}

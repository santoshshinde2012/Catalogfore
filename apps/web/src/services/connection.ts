/** One step of the online flag. Announce only on the offline → online edge. */
export function connectionStep(wasOffline: boolean, online: boolean): { offline: boolean; announce: boolean } {
  return { offline: !online, announce: wasOffline && online };
}

export function recoveryCopy(offline: boolean): string {
  const saved = "Something went wrong while drawing this view. Your forecast is still saved in the page address.";
  return offline
    ? `${saved} You appear to be offline. The plan can still open from the prices already in this page.`
    : `${saved} Try again to reload this view, or return to your plan.`;
}

export const recoveryActions = [
  { id: "retry", label: "Try again", emphasis: "default" },
  { id: "plan", label: "Return to plan", emphasis: "outline" },
] as const;

export type RecoveryActionId = (typeof recoveryActions)[number]["id"];

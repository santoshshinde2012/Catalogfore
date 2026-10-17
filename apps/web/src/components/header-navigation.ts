import { BookOpen, ChartNoAxesCombined, Sparkles } from "lucide-react";

export const primaryNavigation = [
  {
    id: "inputs",
    label: "Plan",
    description: "Choose your cloud, baseline spend, and growth assumptions.",
  },
  {
    id: "products",
    label: "Product map",
    description: "Explore Databricks products, services, and the domains they connect.",
  },
  {
    id: "rates",
    label: "Unit costs",
    description: "Inspect source rates, billing dimensions, and quantity calculations; download CSV or JSON.",
  },
] as const;

export const secondaryNavigation = [
  {
    id: "forecast",
    label: "Forecast",
    description: "Explore monthly spend, cost drivers, and your 12-month outlook.",
    icon: ChartNoAxesCombined,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Build the same forecast in detail, one Databricks workload at a time.",
    icon: Sparkles,
  },
  {
    id: "how",
    label: "How it works",
    description: "Review the pricing sources, assumptions, and limits behind your estimate.",
    icon: BookOpen,
  },
] as const;

export type NavigationActions = Record<
  (typeof primaryNavigation)[number]["id"] | (typeof secondaryNavigation)[number]["id"],
  () => void
>;

import { skuCatalog } from "@dcf/engine";

export function Method() {
  return (
    <div className="stage max-w-3xl">
      <h1 className="h2">How the number is made</h1>
      <p>
        A classic workload is two bills. Databricks charges DBUs. Your cloud charges the VMs, disks, storage, and egress. Serverless SKUs fold the compute into the DBU rate and leave storage and egress outside.
      </p>
      <p className="mt-3">
        Monthly hours are hours/day × days/week × 52/12. Autoscaling uses min + (max − min) × utilization. One driver is always on for classic clusters. Photon, when you turn it on, multiplies classic DBU emission by {skuCatalog.photonMultiplier} and does not change the VM price or the hours. SQL warehouses and serverless compute do not get that multiplier again.
      </p>
      <p className="mt-3">
        Spot discounts worker VM hours only. A DBU commit discounts the DBU line only. A VM commit discounts on-demand VM hours, not spot hours. The compliance add-on is 10% of DBU spend after the commit, and mission critical is 30%, matching the way Azure publishes those add-ons.
      </p>
      <p className="mt-3">
        The forecast starts at this month’s run-rate. An annual growth rate compounds monthly. Seasonality is twelve multipliers divided by their average, so a flat year still adds up to twelve steady months. The retail preset is higher in the autumn.
      </p>
      <p className="mt-3">
        Region factors for AWS and Azure are ratios from the published Lakehouse Real-Time price tables. The Azure table took effect on 2026-10-10. Those ratios are for that one SKU and are applied here as a proxy for every other DBU rate. GCP factors outside the reference region are still proxies, not a published tariff. A 30% Lakehouse Real-Time emission promo runs through 2027-01-31 and is not applied, because it is not a discount on jobs, SQL, or serving. VM prices outside the reference region reuse the reference hourly rate until the refresh workflow fills them in, and the line says so.
      </p>
      <p className="mt-3">{skuCatalog.disclaimer}</p>
      <p className="mt-3">
        Catalog {skuCatalog.version}, verified {skuCatalog.verifiedOn}. The long version, with sources, is <code>docs/RESEARCH.md</code> in the repository.
      </p>
    </div>
  );
}

import { skuCatalog } from "@dcf/engine";

export function MethodNotes() {
  return (
    <details className="method">
      <summary>How this number is built</summary>
      <p>
        A classic workload is two bills. Databricks charges DBUs. The cloud charges VMs, storage, and egress. Serverless
        rates include compute and leave storage and egress outside.
      </p>
      <p>
        Monthly hours are hours/day × days/week × 52/12. Autoscaling uses min + (max − min) × utilization. One driver is
        always on for classic clusters. Photon multiplies classic DBU emission by {skuCatalog.photonMultiplier} and does
        not change the VM price or the hours. SQL and serverless do not get that multiplier again.
      </p>
      <p>
        Spot discounts worker VM hours only. A DBU commit discounts the DBU line only. A VM commit discounts on-demand
        VM hours, not spot. Compliance is 10% of DBU spend after the commit. Mission critical is 30%.
      </p>
      <p>
        The range is not a simulation. With no usage file it is 15% under to 20% over, wider on the high side when a VM
        rate is a stand-in. Importing DBUs tightens it to 5% under and 6% over. A 30% Lakehouse Real-Time emission promo
        through 2027-01-31 is not applied.
      </p>
      <p>{skuCatalog.disclaimer}</p>
      <p>
        Catalog {skuCatalog.version}, verified {skuCatalog.verifiedOn}. Sources are in docs/RESEARCH.md in the
        repository.
      </p>
    </details>
  );
}

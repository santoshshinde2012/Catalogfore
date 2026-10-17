import assert from "node:assert/strict";
import test from "node:test";
import {
  gcpMachineHour,
  parseAwsOfferCsv,
  pickAzureDbuMeters,
  pickAzureLinuxHour,
  pickAzureSpotHour,
  spotHourFromSavings,
} from "./parse-prices.mjs";

const awsCsv = [
  '"FormatVersion","v1.0"',
  '"Disclaimer","sample"',
  '"SKU","OfferTermCode","RateCode","TermType","PriceDescription","EffectiveDate","StartingRange","EndingRange","Unit","PricePerUnit","Currency","RelatedTo","LeaseContractLength","PurchaseOption","OfferingClass","Product Family","serviceCode","Location","Location Type","Instance Type","Current Generation","Instance Family","vCPU","Physical Processor","Clock Speed","Memory","Storage","Network Performance","Processor Architecture","Storage Media","Volume Type","Max Volume Size","Max IOPS/volume","Max IOPS Burst Performance","Max throughput/volume","Provisioned","Tenancy","EBS Optimized","Operating System","License Model","Group","Group Description","Transfer Type","From Location","From Location Type","To Location","To Location Type","usageType","operation","CapacityStatus","Pre Installed S/W"',
  '"A","J","A.J.1","OnDemand","$0.192 per Linux m5.xlarge","2024-01-01","0","Inf","Hrs","0.192","USD","","","","","Compute Instance","AmazonEC2","US East (N. Virginia)","AWS Region","m5.xlarge","Yes","General purpose","4","","","16 GiB","","","","","","","","","","","Shared","","Linux","No License required","","","","","","","","BoxUsage:m5.xlarge","RunInstances","Used","NA"',
  '"B","J","B.J.1","OnDemand","$0.250 per Windows m5.xlarge","2024-01-01","0","Inf","Hrs","0.250","USD","","","","","Compute Instance","AmazonEC2","US East (N. Virginia)","AWS Region","m5.xlarge","Yes","General purpose","4","","","16 GiB","","","","","","","","","","","Shared","","Windows","No License required","","","","","","","","BoxUsage:m5.xlarge","RunInstances","Used","NA"',
  '"C","J","C.J.1","Reserved","$0.100 reserved","2024-01-01","0","Inf","Hrs","0.100","USD","","","","","Compute Instance","AmazonEC2","US East (N. Virginia)","AWS Region","m5.xlarge","Yes","General purpose","4","","","16 GiB","","","","","","","","","","","Shared","","Linux","No License required","","","","","","","","BoxUsage:m5.xlarge","RunInstances","Used","NA"',
].join("\n");

test("aws offer csv keeps linux shared on-demand and ignores windows and reserved", () => {
  const prices = parseAwsOfferCsv(awsCsv, ["m5.xlarge", "m5.2xlarge"]);
  assert.deepEqual(prices, [{ instanceId: "m5.xlarge", onDemandHourly: 0.192 }]);
});

test("azure picker skips windows and spot meters", () => {
  const picked = pickAzureLinuxHour(
    [
      {
        armSkuName: "Standard_DS3_v2",
        priceType: "Consumption",
        unitPrice: 0.4,
        unitOfMeasure: "1 Hour",
        productName: "Virtual Machines DSv2 Series Windows",
        skuName: "DS3 v2",
        meterName: "DS3 v2",
      },
      {
        armSkuName: "Standard_DS3_v2",
        priceType: "Consumption",
        unitPrice: 0.05,
        unitOfMeasure: "1 Hour",
        productName: "Virtual Machines DSv2 Series",
        skuName: "DS3 v2 Spot",
        meterName: "DS3 v2 Spot",
      },
      {
        armSkuName: "Standard_DS3_v2",
        priceType: "Consumption",
        unitPrice: 0.229,
        unitOfMeasure: "1 Hour",
        productName: "Virtual Machines DSv2 Series",
        skuName: "DS3 v2",
        meterName: "DS3 v2",
      },
    ],
    "Standard_DS3_v2",
  );
  assert.equal(picked.onDemandHourly, 0.229);
});

test("azure spot picker ignores windows and on-demand", () => {
  const picked = pickAzureSpotHour(
    [
      {
        armSkuName: "Standard_D4s_v5",
        priceType: "Consumption",
        unitPrice: 0.192,
        unitOfMeasure: "1 Hour",
        productName: "Virtual Machines Dsv5 Series",
        meterName: "D4s v5",
      },
      {
        armSkuName: "Standard_D4s_v5",
        priceType: "Consumption",
        unitPrice: 0.04,
        unitOfMeasure: "1 Hour",
        productName: "Virtual Machines Dsv5 Series",
        meterName: "D4s v5 Spot",
      },
    ],
    "Standard_D4s_v5",
  );
  assert.equal(picked.spotHourly, 0.04);
});

test("azure dbu meters map premium names and skip photon", () => {
  const rows = pickAzureDbuMeters([
    { priceType: "Consumption", unitPrice: 0.3, meterName: "Premium Jobs Compute DBU" },
    { priceType: "Consumption", unitPrice: 0.3, meterName: "Premium Jobs Compute Photon DBU" },
    { priceType: "Consumption", unitPrice: 0, meterName: "Premium Jobs Compute DBU" },
    { priceType: "Consumption", unitPrice: 0.95, meterName: "Premium Interactive Serverless Compute DBU" },
  ]);
  assert.deepEqual(
    rows.map((row) => row.sku),
    ["jobs_classic", "all_purpose_serverless", "apps"],
  );
  assert.equal(spotHourFromSavings(0.192, 68), 0.06144);
  assert.equal(spotHourFromSavings(0.192, 99), null);
});

test("azure picker treats a missing priceType as consumption", () => {
  const picked = pickAzureLinuxHour(
    [
      {
        armSkuName: "Standard_DS3_v2",
        unitPrice: 0.293,
        unitOfMeasure: "1 Hour",
        productName: "Virtual Machines DSv2 Series",
        meterName: "DS3 v2",
      },
    ],
    "Standard_DS3_v2",
  );
  assert.equal(picked.onDemandHourly, 0.293);
});

test("Azure DBU observations preserve meter identity and exclude incompatible price bases", () => {
  const meter = {
    priceType: "Consumption",
    unitPrice: 0.3,
    meterName: "Premium Jobs Compute DBU",
    currencyCode: "USD",
    tierMinimumUnits: 0,
    meterId: "meter-1",
    unitOfMeasure: "1 Hour",
    effectiveStartDate: "2026-01-01T00:00:00Z",
    isPrimaryMeterRegion: true,
  };
  assert.deepEqual(
    pickAzureDbuMeters([
      meter,
      { ...meter, currencyCode: "EUR" },
      { ...meter, tierMinimumUnits: 100 },
      { ...meter, unitPrice: Infinity },
    ]),
    [
      {
        sku: "jobs_classic",
        usdPerDbu: 0.3,
        meterName: meter.meterName,
        meterId: "meter-1",
        unitOfMeasure: "1 Hour",
        effectiveStartDate: meter.effectiveStartDate,
        isPrimaryMeterRegion: true,
      },
    ],
  );
});

test("gcp machine hour is cores times the core sku plus memory times the ram sku", () => {
  const skus = [
    {
      description: "N2 Instance Core running in Americas",
      serviceRegions: ["us-central1"],
      category: { usageType: "OnDemand" },
      pricingInfo: [{ pricingExpression: { tieredRates: [{ unitPrice: { units: "0", nanos: 31492251 } }] } }],
    },
    {
      description: "N2 Instance Ram running in Americas",
      serviceRegions: ["us-central1"],
      category: { usageType: "OnDemand" },
      pricingInfo: [{ pricingExpression: { tieredRates: [{ unitPrice: { units: "0", nanos: 4237429 } }] } }],
    },
    {
      description: "N2 Instance Core running in Americas",
      serviceRegions: ["us-central1"],
      category: { usageType: "Preemptible" },
      pricingInfo: [{ pricingExpression: { tieredRates: [{ unitPrice: { units: "0", nanos: 1 } }] } }],
    },
  ];
  const hourly = gcpMachineHour(skus, "us-central1", { family: "N2", cores: 4, memory: 16 });
  assert.equal(hourly, Math.round((4 * 0.031492251 + 16 * 0.004237429) * 1e6) / 1e6);
  assert.equal(gcpMachineHour(skus, "europe-west1", { family: "N2", cores: 4, memory: 16 }), null);
});

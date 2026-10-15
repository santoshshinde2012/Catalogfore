import assert from "node:assert/strict";
import test from "node:test";
import { parseAwsOfferCsv, pickAzureLinuxHour } from "./parse-prices.mjs";

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
      { armSkuName: "Standard_DS3_v2", priceType: "Consumption", unitPrice: 0.4, unitOfMeasure: "1 Hour", productName: "Virtual Machines DSv2 Series Windows", skuName: "DS3 v2", meterName: "DS3 v2" },
      { armSkuName: "Standard_DS3_v2", priceType: "Consumption", unitPrice: 0.05, unitOfMeasure: "1 Hour", productName: "Virtual Machines DSv2 Series", skuName: "DS3 v2 Spot", meterName: "DS3 v2 Spot" },
      { armSkuName: "Standard_DS3_v2", priceType: "Consumption", unitPrice: 0.229, unitOfMeasure: "1 Hour", productName: "Virtual Machines DSv2 Series", skuName: "DS3 v2", meterName: "DS3 v2" },
    ],
    "Standard_DS3_v2",
  );
  assert.equal(picked.onDemandHourly, 0.229);
});

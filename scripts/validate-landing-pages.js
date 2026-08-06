"use strict";

const {
  validateAll
} = require("./landing-factory-core");

function main(){
  const requireOutput = process.argv.includes("--require-output");
  const result = validateAll({ requireOutput });

  console.log(`Landing pages found: ${result.pages.length}`);
  console.log(`Duplicate slugs: ${result.errors.filter((item)=>item.includes("Duplicate slug")).length}`);
  console.log(`Validation errors: ${result.errors.length}`);

  if(result.errors.length){
    result.errors.forEach((error)=>console.error(`[FAIL] ${error}`));
    process.exitCode = 1;
    return;
  }

  result.pages.forEach((page)=>{
    console.log(
      `[PASS] ${page.slug} | layout=${page.layout} | campaign=${page.campaignId}`
    );
  });

  console.log("[PASS] Landing page configuration validation completed.");
}

main();

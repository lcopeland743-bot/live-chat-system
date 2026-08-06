"use strict";

const {
  buildAll
} = require("./landing-factory-core");

function main(){
  try{
    const generated = buildAll();

    generated.forEach((page)=>{
      console.log(
        `[BUILT] ${page.outputPath} (${page.bytes} bytes)`
      );
    });

    console.log(`[PASS] Generated ${generated.length} landing pages.`);
  }
  catch(error){
    console.error(`[FAIL] ${error.message}`);
    process.exitCode = 1;
  }
}

main();

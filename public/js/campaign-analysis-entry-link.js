/**
 * Campaign #004 Analysis Entry Link
 */
(function(factory){
  "use strict";

  const api = factory();

  if(
    typeof module === "object"
    && module.exports
  ){
    module.exports = api;
    return;
  }

  api.init(window, document);
})(function(){
  "use strict";

  const allowedAttribution = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content"
  ];

  const maximumAttributionLength = 200;

  function validAttribution(value){
    return Boolean(
      value
      && value.length <= maximumAttributionLength
      && !/[\u0000-\u001f\u007f\ufffd]/.test(value)
    );
  }

  function buildEntryUrl(search){
    const source = new URLSearchParams(search || "");
    const target = new URLSearchParams();

    target.set("campaign", "004");

    allowedAttribution.forEach((key)=>{
      const values = source.getAll(key);

      if(
        values.length === 1
        && validAttribution(values[0])
      ){
        target.set(key, values[0]);
      }
    });

    return "/analysis/entry?" + target.toString();
  }

  function findFinalCta(documentObject){
    const heading = documentObject.getElementById(
      "close-heading"
    );

    if(!heading){
      return null;
    }

    const section = heading.closest(
      'section[aria-labelledby="close-heading"]'
    );

    if(!section){
      return null;
    }

    return Array.from(section.querySelectorAll("a"))
      .find((anchor)=>{
        return /^Continue the analysis\b/.test(
          String(anchor.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
        );
      }) || null;
  }

  function init(windowObject, documentObject){
    function upgrade(){
      const cta = findFinalCta(documentObject);

      if(cta){
        cta.setAttribute(
          "href",
          buildEntryUrl(windowObject.location.search)
        );
      }
    }

    documentObject.addEventListener(
      "click",
      (event)=>{
        const anchor = event.target
          && typeof event.target.closest === "function"
          ? event.target.closest("a")
          : null;

        if(anchor && anchor === findFinalCta(documentObject)){
          anchor.setAttribute(
            "href",
            buildEntryUrl(windowObject.location.search)
          );
        }
      },
      true
    );

    if(documentObject.readyState === "loading"){
      documentObject.addEventListener(
        "DOMContentLoaded",
        upgrade,
        { once: true }
      );
    }
    else{
      upgrade();
    }

    windowObject.addEventListener("pageshow", upgrade);
  }

  return {
    allowedAttribution:
      Object.freeze(allowedAttribution.slice()),
    maximumAttributionLength,
    validAttribution,
    buildEntryUrl,
    findFinalCta,
    init
  };
});

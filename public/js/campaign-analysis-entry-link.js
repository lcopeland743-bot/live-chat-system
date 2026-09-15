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

  const campaignContext = Object.freeze({
    pageId: "004-when-machines-become-work",
    pageFamily: "when-machines-become-work",
    variantId: "",
    campaignId: "004"
  });

  const triggerSelector = "[data-meridian-chat]";

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

  function findCampaignTriggers(documentObject){
    return Array.from(
      documentObject.querySelectorAll(triggerSelector)
    );
  }

  function setLandingContext(windowObject){
    windowObject.MeridianLandingContext =
      campaignContext;
  }

  function upgradeTrigger(trigger, search){
    if(
      trigger
      && typeof trigger.setAttribute === "function"
    ){
      trigger.setAttribute(
        "href",
        buildEntryUrl(search)
      );
    }
  }

  function init(windowObject, documentObject){
    function upgrade(){
      setLandingContext(windowObject);
      findCampaignTriggers(documentObject)
        .forEach((trigger)=>{
          upgradeTrigger(
            trigger,
            windowObject.location.search
          );
        });
    }

    setLandingContext(windowObject);

    documentObject.addEventListener(
      "click",
      (event)=>{
        const anchor = event.target
          && typeof event.target.closest === "function"
          ? event.target.closest("a")
          : null;

        if(
          anchor
          && typeof anchor.matches === "function"
          && anchor.matches(triggerSelector)
        ){
          upgradeTrigger(
            anchor,
            windowObject.location.search
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
    campaignContext,
    validAttribution,
    buildEntryUrl,
    findCampaignTriggers,
    setLandingContext,
    upgradeTrigger,
    init
  };
});

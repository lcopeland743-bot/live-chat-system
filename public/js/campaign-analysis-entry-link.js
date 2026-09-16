/**
 * Registered Campaign Analysis Entry Link
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

  const triggerSelector = "[data-meridian-chat]";
  const campaignPattern = /^\d{3}$/;

  function validAttribution(value){
    return Boolean(
      value
      && value.length <= maximumAttributionLength
      && !/[\u0000-\u001f\u007f\ufffd]/.test(value)
    );
  }

  function buildEntryUrl(campaignId, search){
    if(!campaignPattern.test(campaignId || "")){
      return "";
    }

    const source = new URLSearchParams(search || "");
    const target = new URLSearchParams();

    target.set("campaign", campaignId);

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

  function getCampaignIdFromTrigger(trigger, baseUrl){
    if(!trigger || typeof trigger.getAttribute !== "function"){
      return "";
    }

    try{
      const target = new URL(
        trigger.getAttribute("href") || "",
        baseUrl
      );
      const values = target.searchParams.getAll("campaign");

      return target.pathname === "/analysis/entry"
        && values.length === 1
        && campaignPattern.test(values[0])
        ? values[0]
        : "";
    }
    catch{
      return "";
    }
  }

  function resolveCampaignId(documentObject, baseUrl){
    const campaignIds = new Set(
      findCampaignTriggers(documentObject)
        .map((trigger)=>getCampaignIdFromTrigger(trigger, baseUrl))
        .filter(Boolean)
    );

    return campaignIds.size === 1
      ? Array.from(campaignIds)[0]
      : "";
  }

  function setLandingContext(windowObject, campaignId){
    if(!campaignPattern.test(campaignId || "")){
      return null;
    }

    const campaignContext = Object.freeze({
      campaignId: campaignId
    });

    windowObject.MeridianLandingContext = campaignContext;
    return campaignContext;
  }

  function upgradeTrigger(trigger, campaignId, search){
    if(
      trigger
      && typeof trigger.setAttribute === "function"
    ){
      trigger.setAttribute(
        "href",
        buildEntryUrl(campaignId, search)
      );
    }
  }

  function init(windowObject, documentObject){
    function upgrade(){
      const triggers = findCampaignTriggers(documentObject);
      const campaignId = resolveCampaignId(
        documentObject,
        windowObject.location.href
      );

      if(!campaignId){
        return;
      }

      setLandingContext(windowObject, campaignId);
      triggers
        .forEach((trigger)=>{
          upgradeTrigger(
            trigger,
            campaignId,
            windowObject.location.search
          );
        });
    }

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
          const campaignId = getCampaignIdFromTrigger(
            anchor,
            windowObject.location.href
          );

          setLandingContext(windowObject, campaignId);
          upgradeTrigger(
            anchor,
            campaignId,
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
    campaignPattern,
    validAttribution,
    buildEntryUrl,
    findCampaignTriggers,
    getCampaignIdFromTrigger,
    resolveCampaignId,
    setLandingContext,
    upgradeTrigger,
    init
  };
});

/**
 * Meridian Analysis Entry Bootstrap
 */
(function(){
  "use strict";

  const root = document.getElementById(
    "meridianAnalysisEntry"
  );

  if(!root){
    return;
  }

  const status = document.getElementById(
    "analysisEntryStatus"
  );

  const retry = document.getElementById(
    "analysisEntryRetry"
  );

  const campaign = Object.freeze({
    campaignId: root.dataset.campaignId || "",
    pageId: root.dataset.pageId || "",
    pageFamily: root.dataset.pageFamily || "",
    variantId: root.dataset.variantId || "",
    title: root.dataset.campaignTitle || "",
    initialQuestion: root.dataset.initialQuestion || ""
  });

  window.MeridianLandingContext = Object.freeze({
    pageId: campaign.pageId,
    pageFamily: campaign.pageFamily,
    variantId: campaign.variantId,
    campaignId: campaign.campaignId
  });

  let opening = false;
  let opened = false;
  let loaderPromise = null;

  function showLoading(){
    status.textContent =
      "Preparing the shared analysis chat…";
    retry.hidden = true;
  }

  function showReady(){
    status.textContent =
      "Chat is ready. Review or edit the question before sending.";
    retry.hidden = true;
  }

  function showFailure(){
    status.textContent =
      "The chat could not be prepared. You can try again when you are ready.";
    retry.hidden = false;
  }

  function loadLandingLoader(){
    if(window.MeridianLandingLoader){
      return Promise.resolve(
        window.MeridianLandingLoader
      );
    }

    if(loaderPromise){
      return loaderPromise;
    }

    loaderPromise = new Promise((resolve, reject)=>{
      const script = document.createElement("script");

      script.src =
        "/js/meridian-landing-loader.js?v=20260806-2";
      script.async = true;
      script.dataset.meridianAnalysisLoader = "true";
      script.dataset.meridianAssetVersion = "20260806-2";
      script.dataset.meridianLoad = "interaction";

      script.onload = ()=>{
        if(window.MeridianLandingLoader){
          resolve(window.MeridianLandingLoader);
          return;
        }

        reject(new Error("Meridian Landing Loader unavailable"));
      };

      script.onerror = ()=>{
        script.remove();
        reject(new Error("Meridian Landing Loader failed to load"));
      };

      document.body.appendChild(script);
    }).catch((error)=>{
      loaderPromise = null;
      throw error;
    });

    return loaderPromise;
  }

  function openChat(){
    if(opening || opened){
      return;
    }

    opening = true;
    showLoading();

    loadLandingLoader()
      .then((loader)=>loader.open({
        question: campaign.initialQuestion,
        autoSend: false
      }))
      .then(()=>{
        opened = true;
        showReady();
      })
      .catch(()=>{
        showFailure();
      })
      .finally(()=>{
        opening = false;
      });
  }

  retry.addEventListener("click", openChat);

  openChat();
})();

/**
 * Meridian Landing Loader
 *
 * Version: v1.0.0
 *
 * Stable integration layer between replaceable landing pages and the
 * existing Meridian Chat SDK.
 *
 * Basic usage:
 * <script src="/js/meridian-landing-loader.js" defer></script>
 *
 * Chat trigger:
 * <button data-meridian-chat data-question="How can you help me?">
 *   Start Chat
 * </button>
 *
 * Compatibility:
 * Existing [data-question] buttons continue to work.
 */
(function(){

  "use strict";

  const currentScript = document.currentScript;

  if(!currentScript){
    console.error("Meridian Landing Loader: current script not found");
    return;
  }

  const configuredBaseUrl =
    currentScript.dataset.meridianBaseUrl || "";

  const inferredBaseUrl =
    currentScript.src.split("/js/meridian-landing-loader.js")[0];

  const baseUrl =
    String(configuredBaseUrl || inferredBaseUrl)
      .replace(/\/$/, "");

  const loadMode =
    currentScript.dataset.meridianLoad || "idle";


  const assetVersion =
    currentScript.dataset.meridianAssetVersion || "20260806-2";

  const triggerSelector =
    "[data-meridian-chat], [data-question]";

  const sharedState =
    window.__MeridianLandingLoaderState || {
      status: "idle",
      promise: null,
      error: null
    };

  window.__MeridianLandingLoaderState = sharedState;

  function dispatch(name, detail){
    window.dispatchEvent(
      new CustomEvent(name, {
        detail: detail || {}
      })
    );
  }

  function isReady(){
    return Boolean(
      window.MeridianChatUI &&
      window.MeridianChatUI.elements &&
      window.MeridianChatUI.elements.panel
    );
  }

  function waitForReady(timeoutMs){
    const timeout = Number(timeoutMs) || 20000;
    const startedAt = Date.now();

    return new Promise((resolve, reject)=>{
      function check(){
        if(isReady()){
          resolve(window.MeridianChatUI);
          return;
        }

        if(Date.now() - startedAt >= timeout){
          reject(
            new Error("Meridian Chat SDK initialization timed out")
          );
          return;
        }

        window.setTimeout(check, 50);
      }

      check();
    });
  }

  function findExistingEmbedScript(){
    return document.querySelector(
      'script[data-meridian-landing-embed], script[src*="/js/embed.js"]'
    );
  }

  function insertEmbedScript(){
    return new Promise((resolve, reject)=>{
      const existing = findExistingEmbedScript();

      if(existing){
        resolve(existing);
        return;
      }

      const script = document.createElement("script");

      script.src =
        baseUrl +
        "/js/embed.js?v=" +
        encodeURIComponent(assetVersion);
      script.async = true;
      script.dataset.meridianLandingEmbed = "true";
      script.onload = ()=>resolve(script);
      script.onerror = ()=>reject(
        new Error("Meridian embed.js failed to load")
      );

      document.body.appendChild(script);
    });
  }

  function load(){
    if(isReady()){
      sharedState.status = "ready";
      return Promise.resolve(window.MeridianChatUI);
    }

    if(sharedState.promise){
      return sharedState.promise;
    }

    sharedState.status = "loading";
    dispatch("meridian_landing_loading", {
      baseUrl: baseUrl,
      assetVersion: assetVersion
    });

    sharedState.promise =
      insertEmbedScript()
        .then(()=>waitForReady(20000))
        .then((chatUI)=>{
          sharedState.status = "ready";
          sharedState.error = null;

          dispatch("meridian_landing_ready", {
            baseUrl: baseUrl,
            assetVersion: assetVersion
          });

          return chatUI;
        })
        .catch((error)=>{
          sharedState.status = "error";
          sharedState.error = error;
          sharedState.promise = null;

          console.error(
            "Meridian Landing Loader:",
            error
          );

          dispatch("meridian_landing_error", {
            message: error.message
          });

          throw error;
        });

    return sharedState.promise;
  }

  function setQuestion(question){
    if(!question || !window.MeridianChatUI){
      return;
    }

    const input =
      window.MeridianChatUI.elements &&
      window.MeridianChatUI.elements.input;

    if(!input){
      return;
    }

    input.value = question;
    input.dispatchEvent(
      new Event("input", {
        bubbles: true
      })
    );
  }

  function open(options){
    const settings = options || {};
    const question = String(settings.question || "").trim();
    const autoSend = settings.autoSend === true;

    return load().then((chatUI)=>{
      chatUI.open();

      if(question){
        setQuestion(question);

        if(
          autoSend &&
          typeof chatUI.handleSend === "function"
        ){
          chatUI.handleSend();
        }
      }

      dispatch("meridian_landing_chat_open", {
        question: question,
        autoSend: autoSend
      });

      return chatUI;
    });
  }

  function setButtonBusy(button, busy){
    if(!button){
      return;
    }

    if(busy){
      button.setAttribute("aria-busy", "true");
      return;
    }

    button.removeAttribute("aria-busy");
  }

  function getTrigger(target){
    if(!target || typeof target.closest !== "function"){
      return null;
    }

    return target.closest(triggerSelector);
  }

  function handleClick(event){
    const trigger = getTrigger(event.target);

    if(!trigger || trigger.disabled){
      return;
    }

    event.preventDefault();

    sharedState.lastTrigger = trigger;

    const question =
      trigger.getAttribute("data-question") || "";

    const autoSendValue =
      trigger.getAttribute("data-meridian-auto-send");

    const autoSend =
      autoSendValue === "true" ||
      autoSendValue === "1";

    setButtonBusy(trigger, true);

    open({
      question: question,
      autoSend: autoSend
    })
      .catch(()=>{})
      .finally(()=>{
        setButtonBusy(trigger, false);
      });
  }

  function warmUpFromEvent(event){
    if(getTrigger(event.target)){
      load().catch(()=>{});
    }
  }

  function scheduleIdleLoad(){
    if(loadMode === "interaction"){
      return;
    }

    if(typeof window.requestIdleCallback === "function"){
      window.requestIdleCallback(
        ()=>load().catch(()=>{}),
        { timeout: 1800 }
      );
      return;
    }

    window.setTimeout(
      ()=>load().catch(()=>{}),
      1200
    );
  }

  document.addEventListener("click", handleClick);
  document.addEventListener("pointerover", warmUpFromEvent, {
    passive: true
  });
  document.addEventListener("focusin", warmUpFromEvent);

  window.MeridianLandingLoader = {
    version: "1.0.0",
    baseUrl: baseUrl,
    assetVersion: assetVersion,
    load: load,
    open: open,
    isReady: isReady
  };

  scheduleIdleLoad();

})();

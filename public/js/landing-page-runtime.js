/**
 * Meridian Landing Page Runtime
 *
 * Version: v1.0.0
 *
 * Shared presentation and front-end experiment context for generated
 * landing pages. It does not connect directly to Socket.IO or the server.
 */
(function(){
  "use strict";

  const context = Object.assign(
    {},
    window.MeridianLandingContext || {}
  );

  const eventQueue =
    window.__MeridianLandingEventQueue || [];

  window.__MeridianLandingEventQueue = eventQueue;

  function getAttribution(){
    const params = new URLSearchParams(window.location.search);

    return {
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      utmContent: params.get("utm_content") || "",
      referrer: document.referrer || ""
    };
  }

  function emit(eventName, data){
    const detail = {
      event: eventName,
      time: new Date().toISOString(),
      page: window.location.href,
      context: context,
      attribution: getAttribution(),
      data: data || {}
    };

    detail.pixelSent = false;

    eventQueue.push(detail);

    window.dispatchEvent(
      new CustomEvent("meridian_landing_event", {
        detail: detail
      })
    );

    if(
      window.MeridianPixel &&
      typeof window.MeridianPixel.track === "function"
    ){
      window.MeridianPixel.track(
        eventName,
        Object.assign(
          {},
          context,
          detail.attribution,
          detail.data
        )
      );

      detail.pixelSent = true;
    }
  }

  function flushPixelQueue(){
    if(
      !window.MeridianPixel ||
      typeof window.MeridianPixel.track !== "function"
    ){
      return;
    }

    eventQueue.forEach((detail)=>{
      if(detail.pixelSent){
        return;
      }

      window.MeridianPixel.track(
        detail.event,
        Object.assign(
          {},
          context,
          detail.attribution,
          detail.data
        )
      );

      detail.pixelSent = true;
    });
  }

  function initHeader(){
    const header = document.querySelector("[data-site-header]");
    const button = document.querySelector("[data-menu-button]");
    const nav = document.querySelector("[data-primary-nav]");

    function updateHeader(){
      if(header){
        header.classList.toggle("scrolled", window.scrollY > 8);
      }
    }

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    if(!button || !nav){
      return;
    }

    function closeMenu(){
      nav.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    }

    button.addEventListener("click", ()=>{
      const open = !nav.classList.contains("open");

      nav.classList.toggle("open", open);
      button.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("menu-open", open);
    });

    nav.addEventListener("click", (event)=>{
      if(
        event.target &&
        typeof event.target.closest === "function" &&
        event.target.closest("a, button")
      ){
        closeMenu();
      }
    });

    window.addEventListener("resize", ()=>{
      if(window.innerWidth > 780){
        closeMenu();
      }
    });
  }

  function initReveal(){
    const elements = Array.from(
      document.querySelectorAll("[data-reveal]")
    );

    if(
      !elements.length ||
      !window.IntersectionObserver ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ){
      elements.forEach((element)=>{
        element.classList.add("is-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries)=>{
        entries.forEach((entry)=>{
          if(entry.isIntersecting){
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.08
      }
    );

    elements.forEach((element)=>observer.observe(element));
  }

  function initCtaTracking(){
    document.addEventListener("click", (event)=>{
      if(
        !event.target ||
        typeof event.target.closest !== "function"
      ){
        return;
      }

      const cta = event.target.closest("[data-cta-id]");

      if(!cta){
        return;
      }

      emit("landing_cta_click", {
        ctaId: cta.getAttribute("data-cta-id") || "unknown",
        label: (cta.textContent || "").trim().slice(0, 120),
        question: cta.getAttribute("data-question") || ""
      });
    });

    window.addEventListener(
      "meridian_landing_chat_open",
      (event)=>{
        emit("landing_chat_open", {
          question:
            event.detail && event.detail.question
            ? event.detail.question
            : ""
        });
      }
    );

    window.addEventListener(
      "meridian_landing_ready",
      ()=>{
        flushPixelQueue();
        emit("landing_chat_ready");
      }
    );
  }

  function init(){
    initHeader();
    initReveal();
    initCtaTracking();
    emit("landing_view");
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init, { once: true });
  }
  else{
    init();
  }

  window.MeridianLandingPageRuntime = {
    version: "1.0.0",
    context: context,
    emit: emit,
    getQueue: ()=>eventQueue.slice()
  };
})();

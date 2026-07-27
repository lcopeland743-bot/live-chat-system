/**
 * Meridian Visitor Identity
 *
 * Keeps one stable visitor ID for the same browser profile.
 * Keeps one conversation-cycle ID for the current browser tab.
 *
 * localStorage/cookie identify the visitor.
 * sessionStorage identifies the current conversation cycle and
 * survives a normal page refresh without becoming permanent.
 *
 * Version: v1.1.0
 */
(function(){

  const STORAGE_KEY = "meridian_visitor_id";
  const COOKIE_NAME = "meridian_visitor_id";
  const CONVERSATION_STORAGE_KEY =
    "meridian_conversation_id";

  const COOKIE_MAX_AGE_SECONDS =
    60 * 60 * 24 * 365;

  const VALID_ID =
    /^user_[a-z0-9_-]{8,80}$/i;

  const VALID_CONVERSATION_ID =
    /^conversation_[a-z0-9_-]{8,100}$/i;

  let memoryConversationId = "";

  function normalizeId(value){
    const id = String(value || "").trim();
    return VALID_ID.test(id) ? id : "";
  }

  function normalizeConversationId(value){
    const id = String(value || "").trim();

    return VALID_CONVERSATION_ID.test(id)
      ? id
      : "";
  }

  function readLocalStorage(){
    try{
      return normalizeId(
        window.localStorage.getItem(STORAGE_KEY)
      );
    }
    catch(error){
      return "";
    }
  }

  function writeLocalStorage(visitorId){
    try{
      window.localStorage.setItem(
        STORAGE_KEY,
        visitorId
      );
      return true;
    }
    catch(error){
      return false;
    }
  }

  function readSessionStorage(){
    try{
      return normalizeConversationId(
        window.sessionStorage.getItem(
          CONVERSATION_STORAGE_KEY
        )
      );
    }
    catch(error){
      return memoryConversationId;
    }
  }

  function writeSessionStorage(conversationId){
    memoryConversationId = conversationId;

    try{
      window.sessionStorage.setItem(
        CONVERSATION_STORAGE_KEY,
        conversationId
      );
      return true;
    }
    catch(error){
      return false;
    }
  }

  function readCookie(){
    try{
      const prefix = `${COOKIE_NAME}=`;
      const parts = String(document.cookie || "")
        .split(";");

      for(const part of parts){
        const item = part.trim();

        if(item.startsWith(prefix)){
          return normalizeId(
            decodeURIComponent(
              item.slice(prefix.length)
            )
          );
        }
      }
    }
    catch(error){
      return "";
    }

    return "";
  }

  function writeCookie(visitorId){
    try{
      const secure =
        window.location
        && window.location.protocol === "https:"
        ? "; Secure"
        : "";

      document.cookie =
        `${COOKIE_NAME}=${encodeURIComponent(visitorId)}`
        + `; Max-Age=${COOKIE_MAX_AGE_SECONDS}`
        + "; Path=/; SameSite=Lax"
        + secure;

      return true;
    }
    catch(error){
      return false;
    }
  }

  function randomSegment(){
    if(
      window.crypto
      && typeof window.crypto.getRandomValues === "function"
    ){
      const values = new Uint32Array(3);
      window.crypto.getRandomValues(values);

      return Array.from(values)
        .map(value => value.toString(36))
        .join("")
        .slice(0, 24);
    }

    return (
      Math.random().toString(36).slice(2)
      + Date.now().toString(36)
      + Math.random().toString(36).slice(2)
    )
    .slice(0, 24);
  }

  function generateToken(){
    if(
      window.crypto
      && typeof window.crypto.randomUUID === "function"
    ){
      return window.crypto
        .randomUUID()
        .replace(/-/g, "");
    }

    return randomSegment();
  }

  function generateId(){
    return `user_${generateToken()}`;
  }

  function generateConversationId(){
    return `conversation_${generateToken()}`;
  }

  function persist(visitorId){
    const id = normalizeId(visitorId);

    if(!id){
      return "";
    }

    writeLocalStorage(id);
    writeCookie(id);

    return id;
  }

  function getOrCreate(){
    const stored = readLocalStorage();

    if(stored){
      writeCookie(stored);
      return stored;
    }

    const cookie = readCookie();

    if(cookie){
      writeLocalStorage(cookie);
      return cookie;
    }

    return persist(generateId());
  }

  function getConversationId(){
    const stored = readSessionStorage();

    if(stored){
      return stored;
    }

    const conversationId =
      generateConversationId();

    writeSessionStorage(conversationId);

    return conversationId;
  }

  window.MeridianVisitorIdentity = {
    storageKey: STORAGE_KEY,
    cookieName: COOKIE_NAME,
    conversationStorageKey:
      CONVERSATION_STORAGE_KEY,
    getOrCreate,
    getConversationId,
    persist,
    normalizeId,
    normalizeConversationId
  };

})();

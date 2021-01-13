//Error message constants
const htmlDefaultResponse = `<!DOCTYPE html><body>My default response</p></body>`
const htmlWrongURLFormat = `<!DOCTYPE html><body>The URL is not in the required format.</p></body>`
const htmlSPWrong = `<!DOCTYPE html><body>Parameters are incorrect</p></body>`

//URL constants
const baseRSURL = 'https://tts-app.mesmontgomery.co.uk/v1/a-rs'
const baseSV443URL = 'https://tts-app.mesmontgomery.co.uk/v1/a-sv443'
const baseICHURL = 'https://tts-app.mesmontgomery.co.uk/v1/a-ich'
const baseQGURL = 'https://tts-app.mesmontgomery.co.uk/v1/a-qg'
const randomURL = "https://tts-app.mesmontgomery.co.uk/v1/random"

//Access control constants
const thisDefaultAllowedOrigin = "http://jamestest.org:1234";
const allowedOrigins = {  "tts-cfw-test.mesmontgomery.co.uk": "http://jamestest.org:5500","tts-cfw.mesmontgomery.co.uk":"https://tts-ja.mesmontgomery.co.uk"};
const PROXY_ENDPOINT = "/v1/"
const corsHeaders = {  "Access-Control-Allow-Origin": "*",  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",  "Access-Control-Max-Age": "86400",};

function isSHA256(h) {
    //console.log(h);
    let re = new RegExp('[0-9A-Fa-f]{64}');
    return (re.test(h))
}//end of isSha256

addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url)
  if(url.pathname.startsWith(PROXY_ENDPOINT)){
    if (request.method === "OPTIONS") {      
        // Handle CORS preflight requests      
        event.respondWith(handleOptions(request))    
      }
    else if(request.method === "GET"){
        // Handle requests to the API server
        event.respondWith(handleRequest(event))
    }
    else{
      event.respondWith(new Response("Not allowed", {status: 405,statusText: "Method Not Allowed",}),)
    }
  }//end of if proxy
  else{
    //console.log("Unexpected URL.");
    event.respondWith( new Response(htmlWrongURLFormat, {    headers: {      "content-type": "text/html;charset=UTF-8",    },  }))
  }
})//end addEventListener

async function handleRequest(event) {
  let request = event.request;
  let thisAllowedOrigin = thisDefaultAllowedOrigin;
  const cache = caches.default;
  const url = new URL(request.url);

  //set the allowed origin based on requested hostname
  if (url.hostname in allowedOrigins){
    thisAllowedOrigin = allowedOrigins[url.hostname];
  }

  const { searchParams } = new URL(request.url);

  //test for the two expected URL parameters
  if(searchParams.has("contentCode")&&searchParams.has("entryid"))
  {
    const thisContentCode = searchParams.get("contentCode");
    const thisEntryID = searchParams.get("entryid");
    
    //Check for valid entryid as SHA256
    if(isSHA256(thisEntryID) == false){
      return new Response(htmlSPWrong, {    headers: {      "content-type": "text/html;charset=UTF-8",    },  })
    }

    //switch on content code value
    //build URL
    //evaluate cache
    //Fetch content with translated URL
    //return JSON

    var thisURL=""
    var expectedContentCode = true;

    switch(thisContentCode){
      case "RS":
        thisURL=baseRSURL+'?entryid='+thisEntryID;
        break;
      case "SV443":
        thisURL=baseSV443URL+'?entryid='+thisEntryID;
        break;
      case "ICH":
        thisURL=baseICHURL+'?entryid='+thisEntryID;
        break;
      case "QG":
        thisURL=baseQGURL+'?entryid='+thisEntryID;
        break;
      default:
        expectedContentCode=false;
        //console.log("Unknown case");
    }

    if(expectedContentCode){
      //use the created URL as the cache key
      //check for presence in the cache, return that if found. Otherwise fetch from origin.
      let thisCacheKey = thisURL;
      let response = await cache.match(thisCacheKey);
      if (!response) {
        const originalRepsonse = await fetch(thisURL);
        response = new Response(originalRepsonse.body,originalRepsonse.headers);
        response.headers.set("Content-Type", "application/json");
        response.headers.set("Cache-Control", "public,max-age=60");
        response.headers.set("Access-Control-Allow-Origin", thisAllowedOrigin);

        event.waitUntil(cache.put(thisCacheKey,response.clone()));
      }
      return response;

    }else{
      //unexpected value for contentCode
      return new Response(htmlDefaultResponse, {    headers: {      "content-type": "text/html;charset=UTF-8",    },  })
    }
    
  }else{
    //assume random lookup if expected paramaters are not found
    let thisCacheKey = randomURL;
    let response = await cache.match(thisCacheKey);
    if (!response) {
      const originalRepsonse = await fetch(randomURL);
      response = new Response(originalRepsonse.body,originalRepsonse.headers);
      response.headers.set("Cache-Control", "public,max-age=30");
      response.headers.set("Content-Type", "application/json");
      response.headers.set("Access-Control-Allow-Origin", thisAllowedOrigin);

      event.waitUntil(cache.put(thisCacheKey,response.clone()));
    }
    return response;
  }//end of if expected contentCode processing
  
}//end of handleRequest


function handleOptions(request) {
  // Make sure the necessary headers are present  
  // for this to be a valid pre-flight request  
  let headers = request.headers;
  if (headers.get("Origin") !== null &&headers.get("Access-Control-Request-Method") !== null && headers.get("Access-Control-Request-Headers") !== null  ){
    // Handle CORS pre-flight request.    // If you want to check or reject the requested method + headers    // you can do that here.
    let respHeaders = {...corsHeaders,    
    // Allow all future content Request headers to go back to browser    // such as Authorization (Bearer) or X-Client-Name-Version      
    "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers"),    
    }
    return new Response(null, {headers: respHeaders,})
  }else {    
    // Handle standard OPTIONS request.    // If you want to allow other HTTP Methods, you can do that here.    
    return new Response(null, {headers: { Allow: "GET, HEAD, POST, OPTIONS",},})}
}

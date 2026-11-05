'use strict';
const https = require('node:https');
const http = require('node:http');
const dns = require('node:dns');
const { isIP, BlockList } = require('node:net');
const blocked4 = new BlockList(), blocked6 = new BlockList();
for (const [address, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.168.0.0',16],['198.18.0.0',15],['224.0.0.0',4],['240.0.0.0',4]]) blocked4.addSubnet(address,prefix,'ipv4');
for (const [address,prefix] of [['::',128],['::1',128],['::ffff:0:0',96],['fc00::',7],['fe80::',10],['ff00::',8]]) blocked6.addSubnet(address,prefix,'ipv6');
// Addresses on the show's own network. They may use plain HTTP, any port and a faster
// refresh, but read() only contacts those listed in ycs.localJsonHosts. Checking the list
// there, not here, means removing a host stops that source and not the whole data file.
const lan4 = new BlockList();
for (const [address, prefix] of [['10.0.0.0',8],['172.16.0.0',12],['192.168.0.0',16]]) lan4.addSubnet(address,prefix,'ipv4');
function lanAddress(host) { return isIP(host)===4 && lan4.check(host,'ipv4'); }
function endpoint(url) { return url.hostname+':'+(url.port||(url.protocol==='https:'?'443':'80')); }
function fail(message,status=400) { const error=new Error(message); error.status=status; throw error; }
function publicAddress(address) { const family=isIP(address); return Boolean(family) && !(family===6?blocked6:blocked4).check(address,family===6?'ipv6':'ipv4'); }
function normalizeJSONSettings(input) {
  let url; try { url=new URL(input?.url); } catch { fail('Enter a JSON API URL'); }
  if (url.username || url.password) fail('Remove the username and password from the URL');
  if (url.hash) fail('Remove the # part from the URL');
  if (url.href.length>2048) fail('That URL is too long');
  const lan=lanAddress(url.hostname);
  if (lan ? !/^https?:$/.test(url.protocol) : url.protocol!=='https:' || (url.port && url.port!=='443')) fail('Use an HTTPS address on the standard port, or a network address listed in ycs.localJsonHosts');
  if (!lan && (url.hostname==='localhost' || url.hostname.endsWith('.localhost') || (isIP(url.hostname.replace(/^\[|\]$/g,'')) && !publicAddress(url.hostname.replace(/^\[|\]$/g,''))))) fail('Use a public JSON API host');
  const refreshSeconds=Number(input.refreshSeconds);
  const fastest=lan?1:5;
  if (!Number.isInteger(refreshSeconds)||refreshSeconds<fastest||refreshSeconds>3600) fail('Refresh interval must be '+fastest+'–3600 seconds');
  const tokenEnv=String(input.tokenEnv||'').trim();
  if (tokenEnv && !/^YCS_DATA_[A-Z0-9_]{1,80}$/.test(tokenEnv)) fail('Use a server environment variable beginning YCS_DATA_ for a Bearer token');
  return {url:url.href,refreshSeconds,...(tokenEnv?{tokenEnv}:{})};
}
class JSONAPI {
  constructor({lookup=dns.lookup, request=https.request, httpRequest=http.request, env=process.env, localHosts=[]}={}) { Object.assign(this,{lookup,request,httpRequest,env,localHosts:new Set(Array.isArray(localHosts)?localHosts.map(host=>String(host).trim()):[])}); }
  async read(input,{signal}={}) {
    const settings=normalizeJSONSettings(input), timeout=new AbortController(), timer=setTimeout(()=>timeout.abort(),8000); timer.unref?.();
    try {
      const url=new URL(settings.url);
      if (lanAddress(url.hostname)&&!this.localHosts.has(endpoint(url))) fail('SPX is not set up to read '+endpoint(url)+'. Add it to ycs.localJsonHosts and restart SPX',422);
      const headers={Accept:'application/json','User-Agent':'YCS-SPX-Data/1.0'};
      if (settings.tokenEnv) { const token=this.env[settings.tokenEnv]; if (!token || /[\r\n]/.test(token)) fail('The configured API token is unavailable on this server',422); headers.Authorization='Bearer '+token; }
      const data=await new Promise((resolve,reject)=>{
        const request=(url.protocol==='http:'?this.httpRequest:this.request)(url,{headers,signal:signal?AbortSignal.any([signal,timeout.signal]):timeout.signal,agent:false,lookup:(host,options,callback)=>{
          this.lookup(host,{all:true},(error,addresses)=>{
            if(error) return callback(new Error('API host could not be resolved'));
            if(!addresses?.length||addresses.some(item=>!publicAddress(item.address))) return callback(new Error('API host must resolve to public addresses'));
            callback(null,options.all?addresses:addresses[0].address,options.all?undefined:addresses[0].family);
          });
        }},response=>{
          if(response.statusCode!==200) {response.resume();return reject(new Error('API did not return HTTP 200; redirects are not followed'));}
          if(!/^application\/(?:[\w.-]+\+)?json(?:\s*;|$)/i.test(response.headers['content-type']||'')) {response.resume();return reject(new Error('API must return application/json'));}
          let size=0; const chunks=[];
          response.on('data',chunk=>{size+=chunk.length;if(size>1048576) response.destroy(new Error('API response exceeds 1 MB'));else chunks.push(chunk);});
          response.on('error',reject); response.on('end',()=>{try {resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));} catch {reject(new Error('API returned invalid JSON'));}});
        }); request.on('error',reject);
        // Explicit IP hosts do not invoke DNS lookup.
        request.end();
      });
      return {settings,data};
    } catch(error) { if(error.status) throw error; fail(timeout.signal.aborted?'JSON API request timed out':'JSON API unavailable; check its host, response and credentials',502); }
    finally {clearTimeout(timer);}
  }
}
module.exports={JSONAPI,normalizeJSONSettings,publicAddress};

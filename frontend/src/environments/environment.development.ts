export const environment = {
  production: false,
  apiUrl: (typeof process !== 'undefined' && process.env?.['API_URL']) 
    ? process.env['API_URL']
    : 'https://localhost:5001/api',
  apiUrlHttp: (typeof process !== 'undefined' && process.env?.['API_URL_HTTP']) 
    ? process.env['API_URL_HTTP']
    : 'http://localhost:5000/api',
  jitsiDomain: (typeof process !== 'undefined' && process.env?.['JITSI_DOMAIN']) 
    ? process.env['JITSI_DOMAIN']
    : 'meet.jit.si',
  jitsiEnabled: (typeof process !== 'undefined' && process.env?.['JITSI_ENABLED']) 
    ? process.env['JITSI_ENABLED'] === 'true'
    : false,
};

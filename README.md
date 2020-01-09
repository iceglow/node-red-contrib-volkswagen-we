# node-red-contrib-volkswagen-we
Simple Node-RED nodes for interacting with Volkswagen We.

## Node we-connect-login
Node that logs in to the WE Connect Portal and outputs properties needed for subsequent calls for information or actions.

### Outputs
After successful login to VW We Connect, the 'we-connect-login' node sets a few outputs.

**msg.vw_base_url**: The base URL as string, to be used when calling for data/actions.
```
"https://www.portal.volkswagen-we.com/portal/delegate/dashboard/[MY_VIN_NUMBER]"
```

**msg.headers**: Headers set during login, should be used in HTTP calls for data/actions. Can be directly feed in to standard 'http request' node.
```json
{
  "Accept":"application/json, text/plain, */*",
  "Content-Type":"application/json;charset=UTF-8",
  "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:68.0) Gecko/20100101 Firefox/68.0",
  "Referer":"https://www.portal.volkswagen-we.com/portal/delegate/dashboard/[MY_VIN_NUMBER]",
  "X-CSRF-Token":"[SOME_CSRF]",
  ...
}
```

**msg.cookies**: Cookies set during login, should be used in HTTP calls for data/actions. Can be directly feed in to standard 'http request' node.
```json
{
  "JSESSIONID":{
    "key":"JSESSIONID",
    "value":"BB86626BEE0D744FEC7851065158E065.blue-1",
    "domain":"www.portal.volkswagen-we.com",
    ...
  },
  "COOKIE_SUPPORT":{
    "key":"COOKIE_SUPPORT",
    "value":"true",
    "expires":"2021-01-06T09:56:05.000Z",
    "domain":"www.portal.volkswagen-we.com",
    ...
  },
  ...
}
```

**msg.we_connect**: A JSON object containing all of the above.
```json
{
  "headers":{
    ...
  },
  "cookies":{
    ...
  },
  "url":"THE_BASE_URL"
}
```

## Credits
Credits should go to [wez3](https://github.com/wez3) for his [volkswagen-carnet-client](https://github.com/wez3/volkswagen-carnet-client) scripts. The Volkswagen communication for these nodes are heavily based on that implementation.

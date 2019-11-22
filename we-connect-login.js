const request = require('request');
const rp = require('request-promise');

module.exports = function(RED) {
    function WeConnectLogin(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', function(msg) {
            login(function (loginObj) {
                msg.we_connect = loginObj;
                node.send(msg);
            }, this.credentials.email, this.credentials.password)
        });
    }
    RED.nodes.registerType("we-connect-login", WeConnectLogin,{
        credentials: {
            email: { type: "text" },
            password: { type: "password" }
        }
    });
};

portal_base_url = 'https://www.portal.volkswagen-we.com';

request_headers = {
    //'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,nl;q=0.7,en;q=0.3',
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:68.0) Gecko/20100101 Firefox/68.0',
    'Connection': 'keep-alive',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache'
};

auth_request_headers = {
    //'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,nl;q=0.7,en;q=0.3',
    'Accept': 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:68.0) Gecko/20100101 Firefox/68.0',
    'Connection': 'keep-alive',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache'
};

// Get value from HTML head _csrf meta tag.
function extract_csrf(string) {
    var re = new RegExp('<meta name="_csrf" content="(.*?)"/>');
    var result  = string.match(re);

    return result[1];
}

function extract_login_hmac(string) {
    var re = new RegExp('<input.*?id="hmac".*?value="(.*?)"/>');
    var result  = string.replace(/\n/).replace(/\r/).match(re);

    return result[1];
}

function extract_login_csrf(string) {
    var re = new RegExp('<input.*?id="csrf".*?value="(.*?)"/>');
    var result  = string.replace(/\n/).replace(/\r/).match(re);

    return result[1];
}

function extract_url_parameter(string, param) {
    var re = new RegExp('(\\?|&)' + param + '=([^&]+)');
    var result  = string.match(re);

    return result[2];
}

function login(cb, email, pass) {
    var cookiejar = rp.jar();

    base_url = portal_base_url;
    auth_base_url = 'https://identity.vwgroup.io';
    landing_page_url = base_url + '/portal/en_GB/web/guest/home';
    login_csrf = '';
    login_relay_state_token = '';
    client_id = '';

    rp({
        uri: landing_page_url,
        jar: cookiejar,
        json: true,
        headers: request_headers
    }).then( function (body) {
        var csrf = extract_csrf(body);
        auth_request_headers['Referer'] = landing_page_url;
        auth_request_headers['X-CSRF-Token'] = csrf;
        get_login_url = base_url + '/portal/en_GB/web/guest/home/-/csrftokenhandling/get-login-url';

        return rp({
            uri: get_login_url,
            jar: cookiejar,
            json: true,
            headers: auth_request_headers,
            method: 'POST'
        });
    }).then( function (body) {
        var login_url = body.loginURL.path;
        client_id = extract_url_parameter(login_url, 'client_id');

        return rp({
            uri: login_url,
            jar: cookiejar,
            json: true,
            headers: auth_request_headers,
            method: 'POST',
            simple: false,
            resolveWithFullResponse: true
        });
    }).then( function (response) {
        var login_form_url = response.headers.location;
        login_relay_state_token = extract_url_parameter(login_form_url, 'relayState');

        return rp({
            uri: login_form_url,
            jar: cookiejar,
            json: true,
            headers: auth_request_headers,
            resolveWithFullResponse: true
        });
    }).then( function (response) {
        var hmac_token1 = extract_login_hmac(response.body);
        login_csrf = extract_login_csrf(response.body);

        delete auth_request_headers['X-CSRF-Token'];
        auth_request_headers['Referer'] = response.request.uri.href;
        //auth_request_headers['Content-Type'] = 'application/x-www-form-urlencoded';

        var post_data = {
            'email': email,
            'relayState': login_relay_state_token,
            'hmac': hmac_token1,
            '_csrf': login_csrf,
        };
        var login_action_url = auth_base_url + '/signin-service/v1/' + client_id + '/login/identifier';

        return rp({
            uri: login_action_url,
            jar: cookiejar,
            headers: auth_request_headers,
            method: 'POST',
            form: post_data,
            simple: false,
            followAllRedirects: true,
            resolveWithFullResponse: true
        });
    }).then( function (response) {
        var hmac_token2 = extract_login_hmac(response.body);

        auth_request_headers['Referer'] = response.request.uri.href;

        var post_data = {
            'email': email,
            'password': pass,
            'relayState': login_relay_state_token,
            'hmac': hmac_token2,
            '_csrf': login_csrf,
            'login': true
        };

        var login_action2_url = auth_base_url + '/signin-service/v1/' + client_id + '/login/authenticate';

        return rp({
            uri: login_action2_url,
            jar: cookiejar,
            headers: auth_request_headers,
            method: 'POST',
            form: post_data,
            simple: false,
            followAllRedirects: true,
            resolveWithFullResponse: true
        });
    }).then( function (response) {
        var ref2_url = response.request.uri.href;

        var portlet_code = extract_url_parameter(ref2_url, 'code');
        var state = extract_url_parameter(ref2_url, 'state');

        auth_request_headers['Referer'] = ref2_url;
        var portlet_data = {'_33_WAR_cored5portlet_code': portlet_code};
        var final_login_url = base_url + '/portal/web/guest/complete-login?p_auth=' + csrf + '&p_p_id=33_WAR_cored5portlet&p_p_lifecycle=1&p_p_state=normal&p_p_mode=view&p_p_col_id=column-1&p_p_col_count=1&_33_WAR_cored5portlet_javax.portlet.action=getLoginStatus'

        return rp({
            uri: final_login_url,
            jar: cookiejar,
            headers: auth_request_headers,
            method: 'POST',
            form: portlet_data,
            simple: false,
            followRedirect: false,
            resolveWithFullResponse: true
        });
    }).then( function (response) {
        var base_json_url = response.headers.location;

        return rp({
            uri: base_json_url,
            jar: cookiejar,
            headers: auth_request_headers,
            method: 'GET',
            resolveWithFullResponse: true
        });
    }).then( function (response) {
        csrf = extract_csrf(response.body);

        var base_json_url = response.request.uri.href;

        request_headers['Referer'] = base_json_url;
        request_headers['X-CSRF-Token'] = csrf;

        const arrayToObject = (array) =>
            array.reduce((obj, item) => {
                obj[item.key] = item;
                return obj
            }, {});

        var cookies = arrayToObject(cookiejar.getCookies(base_json_url).map(cookie => {
            return cookie.toJSON()
        }));

        cb({
            headers: request_headers,
            cookies: cookies,
            url: base_json_url
        });
    }).catch( function (err) {
        console.log(err)
    })

}

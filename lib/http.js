const preq = require("preq");
const request = require("request");
const _ = require("lodash");

/**
 * Perform a HTTP(S) request.
 *
 * If the script is hosted on a HTTPS server, we cannot perform
 * HTTP requests because of the Same Origin Policy. Therefore,
 * this function falls back to HTTPS if HTTP fails.
 *
 * @param {string} uri - The URI to look up.
 * @param {Object} [options] - Request options.
 * @return {Promise} A promise.
 */
function http(uri, options) {
	return http.get(uri, options).catch((err) => {
		const message = `${err}`;
		if (message.match(/XHR error/i)) {
			if (uri.match(/^http:/i)) {
				return http.get(uri.replace(/^http:/i, "https:"), options);
			}
			if (uri.match(/^https:/i)) {
				return http.get(uri.replace(/^https:/i, "http:"), options);
			}
		}
	});
}

/**
 * Perform a HTTP request.
 * @param {string} uri - The URI to look up.
 * @param {Object} [options] - Request options.
 * @return {Promise} A promise.
 */
http.get = (uri, options) => {
	const agent = "Mozilla/4.0 (compatible; MSIE 5.5; Windows NT 5.0; T312461)";
	options = options || {};
	options.headers = options.headers || {};
	options.headers["User-Agent"] = options.headers["User-Agent"] || agent;
	const delay = options.delay || 100;
	options.uri = uri || options.uri;
	options.method = options.method || "GET";
	options.retries = 5;
	if (!_.isEmpty(preq)) {
		options.method = options.method.toLowerCase();
	}
	options.delay = undefined;
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			if (!_.isEmpty(preq)) {
				preq(options)
					.then((res) => {
						resolve(res.body);
					})
					.catch((err) => {
						reject(err);
					});
			} else {
				request(options, (err, response, body) => {
					if (err) {
						reject(err);
					} else if (response.statusCode !== 200) {
						reject(response.statusCode);
					} else {
						if (typeof body !== "string") {
							resolve(body);
						}
						try {
							response = JSON.parse(body);
						} catch (e) {
							resolve(body);
						}
						if (response.error) {
							reject(response);
						} else {
							resolve(response);
						}
					}
				});
			}
		}, delay);
	});
};

module.exports = http;

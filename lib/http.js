const fetch = require("node-fetch");
const querystring = require("querystring");

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
		throw err;
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
	const opts = options || {};
	const headers = opts.headers || {};
	headers["User-Agent"] = headers["User-Agent"] || agent;
	const delay = opts.delay || 100;
	const url = uri || opts.uri;
	const method = opts.method || "GET";

	// Prepare fetch options
	const fetchOpts = {
		method: method,
		headers: headers,
	};

	// Handle form data (for POST requests)
	if (opts.form) {
		fetchOpts.body = querystring.stringify(opts.form);
		fetchOpts.headers["Content-Type"] =
			"application/x-www-form-urlencoded";
	}

	return new Promise((resolve, reject) => {
		setTimeout(() => {
			fetch(url, fetchOpts)
				.then((response) => {
					if (!response.ok) {
						return reject(response.status);
					}
					return response.text();
				})
				.then((body) => {
					// Try to parse as JSON
					try {
						const parsedResponse = JSON.parse(body);
						if (parsedResponse.error) {
							reject(parsedResponse);
						} else {
							resolve(parsedResponse);
						}
					} catch (e) {
						// If not JSON, return as string
						resolve(body);
					}
				})
				.catch((err) => {
					reject(err);
				});
		}, delay);
	});
};

module.exports = http;

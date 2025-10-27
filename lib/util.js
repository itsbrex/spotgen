// const XRegExp = require("xregexp"); // Removed to avoid core-js-pure optimization warning
let XRegExp = null;
const _ = require("lodash");

const util = {};

/**
 * Lightly clean up a string's contents.
 *
 * Use ASCII punctuation when possible and
 * remove excessive whitespace.
 *
 * @param {string} str - A string.
 * @return {string} A new string.
 */
util.normalize = (str) => {
	let normalized = util.replacePunctuation(str);
	normalized = util.stripWhitespace(normalized);
	return normalized;
};

/**
 * Get all entries in a Spotify paging object.
 *
 * [Reference](https://developer.spotify.com/web-api/object-model/#paging-object).
 *
 * @param {SpotifyWebApi} [spotify] - Spotify web API.
 * @param {Function} [method] - Method to call.
 * @param {array} args Array of method arguments.
 * @param {Object} [opts] The options supplied to this request.
 * @returns {Promise | JSON} A promise that, if successful,
 * resolves to a JSON object that contains all the entries.
 */
util.paging = (spotify, method, args, opts, result) => {
	const options = opts || {};
	return method.apply(spotify, args.concat([options])).then((response) => {
		if (!response) {
			return Promise.reject(response);
		}
		let currentResult = result;
		if (currentResult) {
			currentResult.body.items = currentResult.body.items.concat(
				response.body.items,
			);
		} else {
			currentResult = response;
		}
		if (response.body.next) {
			options.offset = currentResult.body.items.length;
			return util.paging(spotify, method, args, options, currentResult);
		}
		return Promise.resolve(currentResult);
	});
};

/**
 * Replace Unicode punctuation with their ASCII equivalents.
 *
 * Simplifies "smart quotes", typographical dashes and other
 * characters that might confuse search engines.
 *
 * @param {string} str - A string.
 * @return {string} - A new string.
 */
util.replacePunctuation = (str) => {
	str = str
		.replace(/[\u2018\u2019\u00b4]/gi, "'")
		.replace(/[\u201c\u201d\u2033]/gi, '"')
		.replace(/[\u2212\u2022\u00b7\u25aa]/gi, "-")
		.replace(/[\u2013\u2015]/gi, "-")
		.replace(/\u2014/gi, "-")
		.replace(/\u2026/gi, "...");
	return str;
};

/**
 * Remove string noise.
 *
 * Removes line numbers, time durations and annotations
 * from a song entry.
 *
 * @param {string} str - A string.
 * @return {string} A new string.
 */
util.stripNoise = (str) => {
	str = util.normalize(str);
	str = str
		.replace(/].*/gi, "]")
		.replace(/\).*/gi, ")")
		.replace(/^[0-9]+\. /gi, "")
		.replace(/\[[^\]]*]/gi, "")
		.replace(/\([^)]*\)/gi, "")
		.replace(/-+/gi, "-")
		.replace(/\.+/gi, ".");
	str = util.stripPunctuation(str, "-'.");
	str = util.stripWhitespace(str);
	return str;
};

/**
 * Remove superfluous punctuation characters.
 *
 * Strips the string of all punctuation characters
 * except the ones specified in `keep` (by default,
 * `-`, `'` and `.`).
 *
 * @param {string} str - A string.
 * @param {string} [keep] - Punctuation characters to keep.
 * @return {string} - A new string.
 */
util.stripPunctuation = (str, keep) => {
	keep = keep || "";
	keep = _.escapeRegExp(keep);
	// Use native Unicode property escapes (supported in Node.js 10+)
	try {
		str = str.replace(new RegExp(`[^${keep}\\s\\w\\p{L}]`, "giu"), "");
	} catch (e) {
		// Fallback for older environments without Unicode support
		str = str.replace(new RegExp(`[^${keep}\\s\\w]`, "gi"), "");
	}
	return str;
};

/**
 * Clean up a string's whitespace.
 *
 * Trim the string and remove multiple successive spaces and newlines.
 *
 * @param {string} str - A string.
 * @return {string} A new string.
 */
util.stripWhitespace = (str, space) => {
	space = space || "\\s";
	str = str || "";
	str = str.trim();
	str = str.replace(new RegExp(`[${space}]+`, "g"), " ");
	return str;
};

/**
 * Intelligently convert a string to pure ASCII.
 *
 * Replace Unicode characters with their ASCII equivalents as much
 * as possible. Then strip away all remaining Unicode characters.
 *
 * @param {string} str - A string.
 * @return {string} - A new string.
 */
util.toAscii = (str) => {
	str = util.replacePunctuation(str);
	str = _.deburr(str);
	str = str.replace(/[^\w\s-]/gi, "");
	return str.trim();
};

module.exports = util;

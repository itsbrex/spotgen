const Album = require("./album");
const Queue = require("./queue");
const sort = require("./sort");
const util = require("./util");

/**
 * Artist entry.
 * @constructor
 * @param {SpotifyWebApi} spotify - Spotify web API.
 * @param {string} entry - The artist to search for.
 * @param {string} [id] - The Spotify ID, if known.
 * @param {string} [limit] - The number of albums to fetch.
 */
function Artist(spotify, entry, id, limit) {
	/**
	 * Array of albums.
	 */
	this.albums = null;

	/**
	 * Entry string.
	 */
	this.entry = "";

	/**
	 * Spotify ID.
	 */
	this.id = "";

	/**
	 * Number of tracks to fetch.
	 */
	this.limit = null;

	/**
	 * The artist name.
	 */
	this.name = "";

	/**
	 * Spotify request handler.
	 */
	this.spotify = null;

	this.entry = entry.trim();
	this.id = id;
	this.limit = limit;
	this.spotify = spotify;
}

/**
 * Clone a JSON response.
 * @param {Object} response - The response.
 */
Artist.prototype.clone = function (response) {
	for (const prop in response) {
		if (response.hasOwnProperty(prop)) {
			this[prop] = response[prop];
		}
	}
};

/**
 * Create a queue of tracks.
 * @param {JSON} response - A JSON response object.
 * @return {Promise | Queue} A queue of tracks.
 */
Artist.prototype.createQueue = function () {
	const albums = this.albums.map((item) => {
		const album = new Album(this.spotify, this.entry);
		album.clone(item);
		return album;
	});
	let albumQueue = new Queue(albums);
	if (this.limit) {
		albumQueue = albumQueue.slice(0, this.limit);
	}
	return albumQueue
		.forEachPromise((album) => album.getPopularity())
		.then(() => {
			albumQueue = albumQueue.sort(sort.album);
			return albumQueue.dispatch();
		})
		.then((queue) =>
			queue
				.flatten()
				.filter((track) => (this.name ? track.hasArtist(this.name) : true)),
		);
};

/**
 * Dispatch entry.
 * @return {Promise | Queue} A queue of tracks.
 */
Artist.prototype.dispatch = function () {
	return this.searchArtists()
		.then(() => this.getArtistAlbums())
		.then(() => this.createQueue())
		.catch(() => {
			console.log(`COULD NOT FIND: ${this.entry}`);
			return Promise.reject(null);
		});
};

/**
 * Fetch albums.
 * @return {Promise | JSON} A JSON response.
 */
Artist.prototype.getArtistAlbums = function (id) {
	id = id || this.id;
	if (this.albums) {
		return Promise.resolve(this);
	}
	return util
		.paging(this.spotify, this.spotify.getArtistAlbums, [id])
		.then((response) => {
			sort(response.body.items, sort.album);
			this.albums = response.body.items;
			this.id = id;
			return this;
		});
};

/**
 * Search for artist.
 * @param {string} [artist] - The artist.
 * @return {Promise | JSON} A JSON response.
 */
Artist.prototype.searchArtists = function (artist) {
	const self = this;

	// helper functions
	function search(artist) {
		return self.spotify.searchArtists(artist).then((response) => {
			if (response?.body?.artists?.items?.[0]) {
				// sort results by string similarity
				sort(response.body.artists.items, sort.similarArtist(artist));
				response = response.body.artists.items[0];
				self.clone(response);
				return Promise.resolve(self);
			}
			return Promise.reject(response);
		});
	}

	function searchQuery(query) {
		return search(query)
			.catch(() => {
				// try again with simplified search query
				const str = util.toAscii(util.stripNoise(query));
				if (str && str !== query) {
					return search(str);
				}
				return Promise.reject(null);
			})
			.catch(() => {
				// try again as ID
				if (query.match(/^[0-9a-z]+$/i)) {
					return self.getArtistAlbums(query);
				}
				console.log(`COULD NOT FIND: ${self.entry}`);
				return Promise.reject(null);
			});
	}

	// search parameters
	artist = artist || this.artist || this.entry;

	// perform search
	if (this.id) {
		return Promise.resolve(this);
	}
	return search(artist).catch(() => searchQuery(artist));
};

module.exports = Artist;

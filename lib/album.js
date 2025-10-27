const Queue = require("./queue");
const Track = require("./track");
const sort = require("./sort");
const util = require("./util");

/**
 * Create album entry.
 * @constructor
 * @param {SpotifyWebApi} spotify - Spotify web API.
 * @param {string} entry - The album to search for.
 * @param {string} [id] - The Spotify ID, if known.
 * @param {string} [limit] - The number of tracks to fetch.
 */
function Album(spotify, entry, artist, name, id, limit) {
	/**
	 * Entry string.
	 */
	this.entry = "";

	/**
	 * Whether to fetch tracks.
	 */
	this.fetchTracks = true;

	/**
	 * Spotify ID.
	 */
	this.id = "";

	/**
	 * Number of albums to fetch.
	 */
	this.limit = null;

	/**
	 * The album name.
	 */
	this.name = "";

	/**
	 * The album popularity.
	 * @return {string} - The album popularity.
	 */
	this.popularity = null;

	/**
	 * Spotify request handler.
	 */
	this.spotify = null;

	/**
	 * Album tracks.
	 */
	this.tracks = null;

	/**
	 * Spotify URI
	 * (a string on the form `spotify:album:xxxxxxxxxxxxxxxxxxxxxx`).
	 */
	this.uri = "";

	this.entry = entry.trim();
	this.name = name;
	this.artist = artist;
	this.id = id;
	this.limit = limit;
	this.spotify = spotify;
	this.uri = this.id ? `spotify:album:${this.id}` : this.uri;
}

/**
 * Clone a JSON response.
 * @param {Object} response - The response.
 */
Album.prototype.clone = function (response) {
	for (const prop in response) {
		if (Object.hasOwn(response, prop)) {
			this[prop] = response[prop];
		}
	}
	if (response?.tracks?.items) {
		this.tracks = response.tracks.items;
	}
};

/**
 * Create a queue of tracks.
 * @param {JSON} response - A JSON response object.
 * @return {Promise | Queue} A queue of tracks.
 */
Album.prototype.createQueue = function () {
	const tracks = this.tracks.map((item) => {
		const track = new Track(this.spotify, this.entry);
		track.clone(item);
		track.album = this.name;
		return track;
	});
	let queue = new Queue(tracks);
	if (this.limit) {
		queue = queue.slice(0, this.limit);
	}
	return queue;
};

/**
 * Dispatch entry.
 * @return {Promise | Queue} A queue of tracks.
 */
Album.prototype.dispatch = function () {
	if (this.fetchTracks) {
		return this.getTracks().then(() => this.createQueue());
	}
	return this.searchAlbums();
};

/**
 * Fetch album metadata.
 * @return {Promise | JSON} A JSON response.
 */
Album.prototype.getAlbum = function (id) {
	id = id || this.id;
	if (Number.isInteger(this.popularity)) {
		return Promise.resolve(this);
	}
	return this.spotify
		.getAlbum(id)
		.then((response) => {
			this.clone(response.body);
			return this;
		})
		.catch(() => {
			console.log(`COULD NOT FIND: ${this.entry}`);
			return Promise.reject(null);
		});
};

/**
 * Get album popularity.
 * @return {Promise | integer} The track popularity.
 */
Album.prototype.getPopularity = function () {
	if (Number.isInteger(this.popularity)) {
		return Promise.resolve(this.popularity);
	}
	return this.getAlbum().then(() => this.popularity);
};

/**
 * Get album tracks.
 * @return {Promise | Album} Itself.
 */
Album.prototype.getTracks = function () {
	if (this.tracks) {
		return Promise.resolve(this);
	}
	if (this.id) {
		return this.getAlbum();
	}
	return this.searchAlbums().then(() => this.getAlbum());
};

/**
 * Search for album if not known.
 * @param {string} [album] - The album.
 * @param {string} [artist] - The album artist.
 * @return {Promise | JSON} A JSON response, or `null` if not found.
 */
Album.prototype.searchAlbums = function (album, artist) {
	const self = this;

	// helper functions
	function search(album, artist) {
		let query = album.trim();
		if (artist) {
			query = `album:"${album.trim()}"`;
			query += ` artist:"${artist.trim()}"`;
		}
		return self.spotify.searchAlbums(query).then((response) => {
			if (response?.body?.albums?.items?.[0]) {
				// sort results by string similarity
				if (!artist) {
					sort(response.body.albums.items, sort.similarAlbum(query));
				}
				response = response.body.albums.items[0];
				self.clone(response);
				return Promise.resolve(self);
			}
			console.log(`COULD NOT FIND: ${self.entry}`);
			return Promise.reject(response);
		});
	}

	function searchAlbumArtist(album, artist) {
		return search(album, artist).catch(() => {
			// swap album and artist and try again
			return search(artist, album);
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
					return self.getAlbum(query);
				}
				console.log(`COULD NOT FIND: ${self.entry}`);
				return Promise.reject(null);
			});
	}

	// search parameters
	album = album || this.entry;
	artist = artist || this.artist;

	// perform search
	if (this.id) {
		return Promise.resolve(this);
	}
	if (artist) {
		album = this.name;
		return searchAlbumArtist(album, artist).catch(() =>
			searchQuery(`${artist} - ${album}`),
		);
	}
	return searchQuery(album);
};

module.exports = Album;

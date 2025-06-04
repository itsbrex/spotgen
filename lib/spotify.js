const URI = require("urijs");
const http = require("./http");
const SpotifyAuth = require("./auth");

/**
 * Create a Spotify web API client.
 * @constructor
 * @param {string} [clientId] - Client ID.
 * @param {string} [clientKey] - Client secret key.
 * @param {string} [token] - Access token (if already authenticated).
 */
function SpotifyWebApi(clientId, clientKey, token) {
	/**
	 * Spotify authenticator.
	 */
	this.auth = new SpotifyAuth(clientId, clientKey, token);

	/**
	 * HTTP function.
	 */
	this.http = http;
}

/**
 * Fetch album metadata.
 *
 * [Reference](https://developer.spotify.com/web-api/get-album/#example).
 *
 * @param {string} id - Album ID.
 * @return {Promise | JSON} A JSON response.
 */
SpotifyWebApi.prototype.getAlbum = function (id) {
	let uri = "https://api.spotify.com/v1/albums/";
	uri += encodeURIComponent(id);
	return this.request(uri).then((response) => {
		if (response?.id) {
			return Promise.resolve({ body: response });
		}
		return Promise.reject(response);
	});
};

/**
 * Get all albums by an artist.
 *
 * [Reference](https://developer.spotify.com/web-api/get-artists-albums/#example).
 *
 * @param {string} id - Artist ID.
 * @return {Promise | JSON} A JSON response.
 */
SpotifyWebApi.prototype.getArtistAlbums = function (id, opts) {
	let uri = "https://api.spotify.com/v1/artists/";
	uri += `${encodeURIComponent(id)}/albums`;
	opts = opts || {};
	opts.limit = opts.limit || 50;
	uri += `?${URI.buildQuery(opts)}`;
	return this.request(uri).then((response) => {
		if (response?.items) {
			return Promise.resolve({ body: response });
		}
		return Promise.reject(response);
	});
};

/**
 * Search for related artists.
 *
 * [Reference](https://developer.spotify.com/web-api/get-related-artists/#example).
 *
 * @param {string} id - The album ID.
 * @return {Promise | JSON} A JSON response.
 */
SpotifyWebApi.prototype.getArtistRelatedArtists = function (id) {
	let uri = "https://api.spotify.com/v1/artists/";
	uri += `${encodeURIComponent(id)}/related-artists`;
	return this.request(uri).then((response) => {
		if (response?.artists) {
			return Promise.resolve({ body: response });
		}
		return Promise.reject(response);
	});
};

/**
 * Fetch a playlist's tracks.
 *
 * @param {string} [id] - The playlist ID.
 * @param {string} [owner] - The owner ID.
 *
 * [Reference](https://developer.spotify.com/web-api/get-playlists-tracks/#example).
 *
 * @param {string} id - Album ID.
 * @return {Promise | JSON} A JSON response.
 */
SpotifyWebApi.prototype.getPlaylistTracks = function (owner, id, opts) {
	let uri = `https://api.spotify.com/v1/users/${encodeURIComponent(owner)}/playlists/${encodeURIComponent(id)}/tracks`;
	opts = opts || {};
	opts = URI.buildQuery(opts);
	if (opts) {
		uri += `?${opts}`;
	}
	return this.request(uri).then((response) => {
		if (response?.items) {
			return Promise.resolve({ body: response });
		}
		return Promise.reject(response);
	});
};

/**
 * Get the top tracks of an artist.
 *
 * [Reference](https://developer.spotify.com/web-api/get-artists-top-tracks/#example).
 *
 * @param {string} id - Artist ID.
 * @return {Promise | JSON} A JSON response.
 */
SpotifyWebApi.prototype.getArtistTopTracks = function (id) {
	let uri = "https://api.spotify.com/v1/artists/";
	uri += `${encodeURIComponent(id)}/top-tracks?country=US`;
	return this.request(uri).then((response) => {
		if (response?.tracks) {
			return Promise.resolve({ body: response });
		}
		return Promise.reject(response);
	});
};

/**
 * Get a track.
 *
 * [Reference](https://developer.spotify.com/web-api/get-track/#example).
 *
 * @param {string} id - Track ID.
 * @return {Promise | JSON} A JSON response.
 */
SpotifyWebApi.prototype.getTrack = function (id) {
	let uri = "https://api.spotify.com/v1/tracks/";
	uri += encodeURIComponent(id);
	return this.request(uri).then((response) => {
		if (response?.uri) {
			return Promise.resolve({ body: response });
		}
		return Promise.reject(response);
	});
};

/**
 * Get audio features for a track.
 *
 * [Reference](https://developer.spotify.com/web-api/get-audio-features/#examples).
 *
 * @param {string} id - Track ID.
 * @return {Promise | JSON} A JSON response.
 */
SpotifyWebApi.prototype.getAudioFeaturesForTrack = function (id) {
	let uri = "https://api.spotify.com/v1/audio-features/";
	uri += encodeURIComponent(id);
	return this.request(uri).then((response) => {
		if (response?.id) {
			return Promise.resolve({ body: response });
		}
		return Promise.reject(response);
	});
};

/**
 * Perform a Spotify request.
 * @param {string} uri - The URI to resolve.
 * @param {Object} [options] - Request options.
 * @return {Promise | JSON} A JSON response.
 */
SpotifyWebApi.prototype.request = function (uri, options) {
	options = options || {};
	console.log(uri);
	return this.auth
		.getToken()
		.then((token) => {
			options.headers = options.headers || {};
			options.headers.Authorization = `Bearer ${token}`;
			return this.http(uri, options);
		})
		.catch((status) =>
			this.refreshToken().then((token) => {
				options.headers.Authorization = `Bearer ${token}`;
				return this.http(uri, options);
			}),
		);
};

/**
 * Search for artist.
 *
 * [Reference](https://developer.spotify.com/web-api/search-item/#example).
 *
 * @param {string} artist - The artist to search for.
 * @return {Promise | JSON} A JSON response.
 */
SpotifyWebApi.prototype.searchArtists = function (artist) {
	let uri = "https://api.spotify.com/v1/search?type=artist&q=";
	uri += encodeURIComponent(artist);
	return this.request(uri).then((response) => {
		if (response?.artists?.items?.[0]) {
			return Promise.resolve({ body: response });
		}
		return Promise.reject(response);
	});
};

/**
 * Search for album.
 *
 * [Reference](https://developer.spotify.com/web-api/search-item/#example).
 *
 * @param {string} album - The album to search for.
 * @param {string} [artist] - The album artist.
 * @return {Promise | JSON} A JSON response.
 */
SpotifyWebApi.prototype.searchAlbums = function (album, artist) {
	let query = album;
	if (artist) {
		query = `album:"${album}"`;
		query += artist ? ` artist:"${artist}"` : "";
	}
	let uri = "https://api.spotify.com/v1/search?type=album&q=";
	uri += encodeURIComponent(query);
	return this.request(uri).then((response) => {
		if (response?.albums?.items?.[0]) {
			return Promise.resolve({ body: response });
		}
		return Promise.reject(response);
	});
};

/**
 * Search for playlist.
 *
 * @param {string} playlist - The playlist to search for.

 * [Reference](https://developer.spotify.com/web-api/search-item/#example).
 *
 * @param {string} playlist - The track to search for.
 * @return {Promise | JSON} JSON response.
 */
SpotifyWebApi.prototype.searchPlaylists = function (playlist) {
	let uri = "https://api.spotify.com/v1/search?type=playlist&limit=50&q=";
	uri += encodeURIComponent(playlist);
	return this.request(uri).then((response) => {
		if (response.playlists?.items?.[0]) {
			return Promise.resolve({ body: response });
		}
		return Promise.reject(response);
	});
};

/**
 * Search for track.
 *
 * [Reference](https://developer.spotify.com/web-api/search-item/#example).
 *
 * @param {string} track - The track to search for.
 * @param {string} [artist] - The track artist.
 * @param {string} [album] - The track album.
 * @return {Promise | JSON} JSON response.
 */
SpotifyWebApi.prototype.searchTracks = function (track, artist, album) {
	let query = track;
	if (artist || album) {
		query = `track:"${track}"`;
		query += artist ? ` artist:"${artist}"` : "";
		query += album ? ` album:"${album}"` : "";
	}
	let uri = "https://api.spotify.com/v1/search?type=track&limit=50&q=";
	uri += encodeURIComponent(query);
	return this.request(uri).then((response) => {
		if (response.tracks?.items?.[0]) {
			return Promise.resolve({ body: response });
		}
		return Promise.reject(response);
	});
};

module.exports = SpotifyWebApi;

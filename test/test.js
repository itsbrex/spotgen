/* global describe, it */
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised.default || chaiAsPromised);
chai.should();

var Artist = require("../lib/artist");
var Album = require("../lib/album");
var Generator = require("../lib/generator");
var Playlist = require("../lib/playlist");
var Queue = require("../lib/queue");
var Similar = require("../lib/similar");
var Track = require("../lib/track");
var Top = require("../lib/top");
var sort = require("../lib/sort");
var util = require("../lib/util");

describe("Spotify Playlist Generator", function () {
	this.timeout(999999);

	describe("Sorting", () => {
		it("should handle empty lists", () => {
			sort([], (a, b) => (a < b ? -1 : a > b ? 1 : 0)).should.eql([]);
		});

		it("should handle singleton lists", () => {
			sort([1], (a, b) => (a < b ? -1 : a > b ? 1 : 0)).should.eql([1]);
		});

		it("should stably sort the list", () => {
			sort([1, 4, 2, 8], (a, b) => (a < b ? -1 : a > b ? 1 : 0)).should.eql([
				1, 2, 4, 8,
			]);
		});

		it("should work with an ascending comparison function", () => {
			sort(
				[1, 4, 2, 8],
				sort.ascending((x) => x),
			).should.eql([1, 2, 4, 8]);
		});

		it("should work with a descending comparison function", () => {
			sort(
				[1, 4, 2, 8],
				sort.descending((x) => x),
			).should.eql([8, 4, 2, 1]);
		});

		it("should preserve the order of duplicate elements", () => {
			sort(
				[
					[1, 0],
					[4, 1],
					[2, 2],
					[4, 3],
					[8, 4],
				],
				(a, b) => {
					var x = a[0];
					var y = b[0];
					return x < y ? -1 : x > y ? 1 : 0;
				},
			).should.eql([
				[1, 0],
				[2, 2],
				[4, 1],
				[4, 3],
				[8, 4],
			]);
		});
	});

	describe("Utilities", () => {
		it("should clean up search strings", () => {
			util
				.normalize("  \u201Cshouldn\u2019t\u201D ")
				.should.eql('"shouldn\'t"');
		});

		it("should remove noise", () => {
			util.stripNoise("1. artist - title (5:30)").should.eql("artist - title");
			util
				.stripNoise("test1 - test2 (string) test3")
				.should.eql("test1 - test2");
		});

		it("should remove extra punctuation characters", () => {
			util
				.stripPunctuation("\u201Cshouldn't\u201D", "'")
				.should.eql("shouldn't");
		});

		it("should convert punctuation to ASCII", () => {
			util
				.replacePunctuation("\u201Cshouldn\u2019t\u201D")
				.should.eql('"shouldn\'t"');
		});

		it("should convert characters to ASCII", () => {
			util
				.toAscii("t\u00EAte-\u00E0-t\u00EAte \u2013 d\u00E9tente")
				.should.eql("tete-a-tete - detente");
			util.toAscii("test1 \u25B2 test2").should.eql("test1  test2");
		});

		it("should remove extra whitespace", () => {
			util.stripWhitespace(" test1  - test2 ").should.eql("test1 - test2");
		});
	});

	describe("Queue", () => {
		it("should create an empty list", () => {
			var queue = new Queue();
			queue.queue.should.eql([]);
		});

		it("should add an entry", () => {
			var entry = new Track(null, "test");
			var queue = new Queue();
			queue.add(entry);
			queue.queue[0].should.have.property("entry", "test");
		});

		it("should store entries in the order they are added", () => {
			var foo = new Track(null, "foo");
			var bar = new Track(null, "bar");
			var queue = new Queue();
			queue.add(foo);
			queue.add(bar);
			queue.queue[0].should.have.property("entry", "foo");
			queue.queue[1].should.have.property("entry", "bar");
		});

		it("should remove duplicates", () => {
			var foo1 = new Track(null, "foo");
			foo1.title = foo1.entry;
			var foo2 = new Track(null, "foo");
			foo2.title = foo2.entry;
			var bar = new Track(null, "bar");
			bar.title = bar.entry;
			var queue = new Queue();
			queue.add(foo1);
			queue.add(foo2);
			queue.add(bar);
			return queue.dedup().then((queue) => {
				queue.queue[0].should.have.property("entry", "foo");
				queue.queue[1].should.have.property("entry", "bar");
			});
		});

		it("should be sortable", () => {
			var foo = new Track(null, "foo");
			var bar = new Track(null, "bar");
			var queue = new Queue();
			queue.add(foo);
			queue.add(bar);
			queue.sort();
			queue.queue[0].should.have.property("entry", "bar");
			queue.queue[1].should.have.property("entry", "foo");
		});

		it("should be sortable with compare function", () => {
			var foo = new Track(null, "foo");
			var bar = new Track(null, "bar");
			var queue = new Queue();
			queue.add(foo);
			queue.add(bar);
			queue.sort((a, b) =>
				a.entry < b.entry ? -1 : a.entry > b.entry ? 1 : 0,
			);
			queue.queue[0].should.have.property("entry", "bar");
			queue.queue[1].should.have.property("entry", "foo");
		});

		it("should concatenate queues and preserve order", () => {
			var foo = new Track(null, "foo");
			var bar = new Track(null, "bar");
			var baz = new Track(null, "baz");
			var queue1 = new Queue();
			var queue2 = new Queue();
			queue1.add(foo);
			queue1.add(bar);
			queue2.add(baz);
			var queue3 = queue1.concat(queue2);
			queue3.queue[0].should.have.property("entry", "foo");
			queue3.queue[1].should.have.property("entry", "bar");
			queue3.queue[2].should.have.property("entry", "baz");
		});

		it("should group on a property", () => {
			var foo = new Track(null, "foo");
			var bar = new Track(null, "bar");
			var baz = new Track(null, "baz");
			foo.group = "1";
			bar.group = "2";
			baz.group = "1";
			var queue = new Queue();
			queue.add(foo);
			queue.add(bar);
			queue.add(baz);
			queue.group((entry) => entry.group);
			queue.queue[0].should.have.property("entry", "foo");
			queue.queue[1].should.have.property("entry", "baz");
			queue.queue[2].should.have.property("entry", "bar");
		});
	});

	describe("Track", () => {
		it("should create an empty entry", () => {
			var track = new Track(null, "");
			track.entry.should.eql("");
		});

		it("should create a single entry", () => {
			var track = new Track(null, "test");
			track.entry.should.eql("test");
		});
	});

	describe("Album", () => {
		it("should create an empty entry", () => {
			var album = new Album(null, "");
			album.entry.should.eql("");
		});

		it("should create a single entry", () => {
			var album = new Album(null, "Beach House - Depression Cherry");
			album.entry.should.eql("Beach House - Depression Cherry");
		});
	});

	describe("Artist", () => {
		it("should create an empty entry", () => {
			var artist = new Artist(null, "");
			artist.entry.should.eql("");
		});

		it("should create a single entry", () => {
			var artist = new Artist(null, "Bowery Electric");
			artist.entry.should.eql("Bowery Electric");
		});
	});

	describe("Top", () => {
		it("should create an empty entry", () => {
			var top = new Top(null, "");
			top.entry.should.eql("");
		});

		it("should create a single entry", () => {
			var top = new Top(null, "Bowery Electric");
			top.entry.should.eql("Bowery Electric");
		});
	});

	describe("Similar", () => {
		it("should create an empty entry", () => {
			var similar = new Similar(null, "");
			similar.entry.should.eql("");
		});

		it("should create a single entry", () => {
			var similar = new Similar(null, "Bowery Electric");
			similar.entry.should.eql("Bowery Electric");
		});
	});

	describe("Playlist", () => {
		it("should create an empty entry", () => {
			var playlist = new Playlist(null, "");
			playlist.entry.should.eql("");
		});

		it("should create a single entry", () => {
			var playlist = new Playlist(
				null,
				"redditlistentothis:6TMNC59e1TuFFE48tJ9V2D",
				"redditlistentothis",
				"6TMNC59e1TuFFE48tJ9V2D",
			);
			playlist.entry.should.eql("redditlistentothis:6TMNC59e1TuFFE48tJ9V2D");
		});
	});

	describe("Generator", () => {
		it("should create empty playlist when passed empty string", () => {
			var generator = new Generator("");
			generator.should.have.deep
				.property("collection.entries.queue")
				.that.eql([]);
		});

		it("should create a one-entry playlist", () => {
			var generator = new Generator("test");
			generator.collection.entries.queue[0].should.have.property(
				"entry",
				"test",
			);
		});

		it("should create a two-entry playlist", () => {
			var generator = new Generator("test1\ntest2");
			generator.collection.entries.queue[0].should.have.property(
				"entry",
				"test1",
			);
			generator.collection.entries.queue[1].should.have.property(
				"entry",
				"test2",
			);
		});

		it("should ignore empty lines", () => {
			var generator = new Generator("test1\n\n\n\ntest2");
			generator.collection.entries.queue[0].should.have.property(
				"entry",
				"test1",
			);
			generator.collection.entries.queue[1].should.have.property(
				"entry",
				"test2",
			);
		});

		it("should dispatch a single entry", () => {
			var generator = new Generator("The xx - Test Me");
			return generator.generate("list").then((str) => {
				str.should.eql("The xx - Test Me");
			});
		});

		it("should not confuse album title with track title", () => {
			var generator = new Generator("Michael Jackson - Off the Wall");
			return generator.generate("list").then((str) => {
				str.should.eql("Michael Jackson - Off the Wall");
			});
		});

		it("should order tracks by Spotify popularity", () => {
			var generator = new Generator("#order by popularity\ntest1\ntest2");
			generator.collection.entries.queue[0].should.have.property(
				"entry",
				"test1",
			);
			generator.collection.entries.queue[1].should.have.property(
				"entry",
				"test2",
			);
			generator.collection.should.have.property("ordering", "popularity");
		});

		it("should order tracks by Last.fm rating", () => {
			var generator = new Generator("#order by lastfm\ntest1\ntest2");
			generator.collection.entries.queue[0].should.have.property(
				"entry",
				"test1",
			);
			generator.collection.entries.queue[1].should.have.property(
				"entry",
				"test2",
			);
			generator.collection.should.have.property("ordering", "lastfm");
		});

		it("should create a playlist ordered by Spotify popularity", () => {
			var generator = new Generator(
				"#order by popularity\n" +
					"Bowery Electric - Postscript\n" +
					"Bowery Electric - Lushlife",
			);
			return generator.generate("list").then((str) => {
				// FIXME: this is really brittle
				str.should.eql(
					"Bowery Electric - Lushlife\n" + "Bowery Electric - Postscript",
				);
			});
		});

		it("should create an playlist ordered by name", () => {
			var generator = new Generator(
				"#order by name\n" +
					"Bowery Electric - Postscript\n" +
					"Bowery Electric - Lushlife",
			);
			return generator.generate("list").then((str) => {
				// FIXME: this is really brittle
				str.should.eql(
					"Bowery Electric - Lushlife\n" + "Bowery Electric - Postscript",
				);
			});
		});

		it("should parse comma-separated values", () => {
			var generator = new Generator(
				"spotify:track:3jZ0GKAZiDMya0dZPrw8zq,Desire Lines,Deerhunter,Halcyon Digest,1,6,404413,,\n" +
					"spotify:track:20DDHYR4vZqDwHyNFLwkXI,Saved By Old Times,Deerhunter,Microcastle,1,10,230226,,",
			);
			return generator.generate().then((str) => {
				str.should.eql(
					"spotify:track:3jZ0GKAZiDMya0dZPrw8zq\n" +
						"spotify:track:20DDHYR4vZqDwHyNFLwkXI",
				);
			});
		});

		it("should output comma-separated values", () => {
			var generator = new Generator(
				"#csv\n" +
					"spotify:track:3jZ0GKAZiDMya0dZPrw8zq\n" +
					"spotify:track:20DDHYR4vZqDwHyNFLwkXI",
			);
			return generator.generate().then((str) => {
				str.should.eql(
					"sep=,\n" +
						"spotify:track:3jZ0GKAZiDMya0dZPrw8zq,,,,,,,,\n" +
						"spotify:track:20DDHYR4vZqDwHyNFLwkXI,,,,,,,,",
				);
			});
		});

		it("should parse extended M3U playlists", () => {
			var generator = new Generator(
				"#EXTM3U\n" +
					"#EXTINF:404,Desire Lines - Deerhunter\n" +
					"Deerhunter/Halcyon Digest/06 Desire Lines.mp3\n" +
					"#EXTINF:230,Saved By Old Times - Deerhunter\n" +
					"Deerhunter/Microcastle/10 Saved By Old Times.mp3",
			);
			return generator.generate("list").then((str) => {
				str.should.eql(
					"Deerhunter - Desire Lines\n" + "Deerhunter - Saved By Old Times",
				);
			});
		});

		it("should return an array of strings", () => {
			var generator = new Generator(
				"spotify:track:4oNXgGnumnu5oIXXyP8StH\n" +
					"spotify:track:7rAjeWkQM6cLqbPjZtXxl2",
			);
			return generator.generate("array").then((str) => {
				str.should.eql([
					"spotify:track:4oNXgGnumnu5oIXXyP8StH",
					"spotify:track:7rAjeWkQM6cLqbPjZtXxl2",
				]);
			});
		});

		it("should parse track URIs", () => {
			var generator = new Generator(
				"spotify:track:4oNXgGnumnu5oIXXyP8StH\n" +
					"spotify:track:7rAjeWkQM6cLqbPjZtXxl2",
			);
			return generator.generate().then((str) => {
				generator.should.have.deep
					.property("collection.entries.queue[0]")
					.that.is.instanceof(Track);
				generator.should.have.deep
					.property("collection.entries.queue[1]")
					.that.is.instanceof(Track);
				str.should.eql(
					"spotify:track:4oNXgGnumnu5oIXXyP8StH\n" +
						"spotify:track:7rAjeWkQM6cLqbPjZtXxl2",
				);
			});
		});

		it("should parse track links", () => {
			var generator = new Generator(
				"https://open.spotify.com/track/4oNXgGnumnu5oIXXyP8StH\n" +
					"https://open.spotify.com/track/7rAjeWkQM6cLqbPjZtXxl2",
			);
			return generator.generate().then((str) => {
				generator.should.have.deep
					.property("collection.entries.queue[0]")
					.that.is.instanceof(Track);
				generator.should.have.deep
					.property("collection.entries.queue[1]")
					.that.is.instanceof(Track);
				str.should.eql(
					"spotify:track:4oNXgGnumnu5oIXXyP8StH\n" +
						"spotify:track:7rAjeWkQM6cLqbPjZtXxl2",
				);
			});
		});

		it("should parse #album entries", () => {
			var generator = new Generator("#album test");
			generator.should.have.deep
				.property("collection.entries.queue[0]")
				.that.is.instanceof(Album);
		});

		it("should parse album URIs", () => {
			var generator = new Generator("spotify:album:5QIf4hNIAksV1uMCXHVkAZ");
			generator.should.have.deep
				.property("collection.entries.queue[0]")
				.that.is.instanceof(Album);
			generator.should.have.deep
				.property("collection.entries.queue[0].id")
				.that.eql("5QIf4hNIAksV1uMCXHVkAZ");
		});

		it("should parse album links", () => {
			var generator = new Generator(
				"https://open.spotify.com/album/5QIf4hNIAksV1uMCXHVkAZ",
			);
			generator.should.have.deep
				.property("collection.entries.queue[0]")
				.that.is.instanceof(Album);
			generator.should.have.deep
				.property("collection.entries.queue[0].id")
				.that.eql("5QIf4hNIAksV1uMCXHVkAZ");
		});

		it("should dispatch #album entries", () => {
			var generator = new Generator("#album Beach House - Depression Cherry");
			return generator.generate("list").then((str) => {
				// FIXME: this is really brittle
				str.should.match(/^Beach House - Levitation/gi);
			});
		});

		it("should parse #artist entries", () => {
			var generator = new Generator("#artist Bowery Electric");
			generator.should.have.deep
				.property("collection.entries.queue[0]")
				.that.is.instanceof(Artist);
		});

		it("should parse artist URIs", () => {
			var generator = new Generator("spotify:artist:56ZTgzPBDge0OvCGgMO3OY");
			generator.should.have.deep
				.property("collection.entries.queue[0]")
				.that.is.instanceof(Artist);
			generator.should.have.deep
				.property("collection.entries.queue[0].id")
				.that.eql("56ZTgzPBDge0OvCGgMO3OY");
		});

		it("should parse artist links", () => {
			var generator = new Generator(
				"https://open.spotify.com/artist/56ZTgzPBDge0OvCGgMO3OY",
			);
			generator.should.have.deep
				.property("collection.entries.queue[0]")
				.that.is.instanceof(Artist);
			generator.should.have.deep
				.property("collection.entries.queue[0].id")
				.that.eql("56ZTgzPBDge0OvCGgMO3OY");
		});

		it("should dispatch #artist entries", () => {
			var generator = new Generator("#artist Bowery Electric");
			return generator.generate("list").then((str) => {
				// FIXME: this is really brittle
				str.should.match(/^Bowery Electric - Floating World/gi);
			});
		});

		it("should parse #top entries", () => {
			var generator = new Generator("#top Bowery Electric");
			generator.should.have.deep
				.property("collection.entries.queue[0]")
				.that.is.instanceof(Top);
		});

		it("should dispatch #top entries", () => {
			var generator = new Generator("#top Bowery Electric");
			return generator.generate("list").then((str) => {
				// FIXME: this is really brittle
				str.should.match(/^Bowery Electric - Floating World/gi);
			});
		});

		it("should parse #similar entries", () => {
			var generator = new Generator("#similar Bowery Electric");
			generator.should.have.deep
				.property("collection.entries.queue[0]")
				.that.is.instanceof(Similar);
		});

		it("should dispatch #similar entries", () => {
			var generator = new Generator("#similar Bowery Electric");
			return generator.generate("list").then((str) => {
				// FIXME: this is really brittle
				str.should.match(/^Flying Saucer Attack - My Dreaming Hill/gi);
			});
		});

		it("should parse #playlist entries", () => {
			var generator = new Generator(
				"#playlist redditlistentothis:6TMNC59e1TuFFE48tJ9V2D",
			);
			generator.should.have.deep
				.property("collection.entries.queue[0]")
				.that.is.instanceof(Playlist);
			generator.should.have.deep
				.property("collection.entries.queue[0].owner.id")
				.that.eql("redditlistentothis");
			generator.should.have.deep
				.property("collection.entries.queue[0].id")
				.that.eql("6TMNC59e1TuFFE48tJ9V2D");
		});

		it("should parse playlist URIs", () => {
			var generator = new Generator(
				"spotify:user:redditlistentothis:playlist:6TMNC59e1TuFFE48tJ9V2D",
			);
			generator.should.have.deep
				.property("collection.entries.queue[0]")
				.that.is.instanceof(Playlist);
			generator.should.have.deep
				.property("collection.entries.queue[0].owner.id")
				.that.eql("redditlistentothis");
			generator.should.have.deep
				.property("collection.entries.queue[0].id")
				.that.eql("6TMNC59e1TuFFE48tJ9V2D");
		});

		it("should parse playlist links", () => {
			var generator = new Generator(
				"https://open.spotify.com/user/redditlistentothis/playlist/6TMNC59e1TuFFE48tJ9V2D",
			);
			generator.should.have.deep
				.property("collection.entries.queue[0]")
				.that.is.instanceof(Playlist);
			generator.should.have.deep
				.property("collection.entries.queue[0].owner.id")
				.that.eql("redditlistentothis");
			generator.should.have.deep
				.property("collection.entries.queue[0].id")
				.that.eql("6TMNC59e1TuFFE48tJ9V2D");
		});

		it("should dispatch #playlist entries", () => {
			var generator = new Generator(
				"#playlist redditlistentothis:6TMNC59e1TuFFE48tJ9V2D",
			);
			return generator.generate("list").then((str) => {
				// FIXME: this is really brittle
				str.should.match(/^Drakkar Nowhere - Higher Now/gi);
			});
		});

		it("should dispatch multiple entries", () => {
			var generator = new Generator(
				"The xx - Test Me\n" + "Rage Against The Machine - Testify",
			);
			return generator.generate("list").then((str) => {
				// FIXME: this is really brittle
				str.should.eql(
					"The xx - Test Me\n" + "Rage Against The Machine - Testify",
				);
			});
		});
	});
});

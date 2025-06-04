# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Running the CLI
```bash
node index.js                     # Run the CLI interactively
node index.js input.txt          # Process a file
node index.js "#artist Bowery Electric"  # Pass a command directly
```

### Testing
```bash
npm test                         # Run linting and tests
npm run tests                    # Run tests only
npm run nyan                     # Run tests with nyan reporter
```

### Linting
```bash
npm run lint                     # Run all linters (jshint, standard, markdownlint)
npm run jshint                   # Run JSHint only
npm run standard                 # Run Standard JS only
```

### Building
```bash
npm run build                    # Build browser bundle and docs
npm run browser                  # Build browser bundle only
npm run jsdoc                    # Generate JSDoc documentation
npm run typedoc                  # Generate TypeDoc documentation
```

### Development Server
```bash
npm run http                     # Start local server at http://localhost:9000
npm run server                   # Start http-server only
```

## Architecture Overview

### Core Components

**Generator** (`lib/generator.js`): Main orchestrator that parses input strings and executes commands to generate playlists. Supports various input formats and command syntax.

**Parser** (`lib/parser.js`): Parses generator strings into structured commands. Handles web URLs, Spotify URIs/links, and special commands like `#top`, `#similar`, `#artist`.

**Collection** (`lib/collection.js`): Manages collections of tracks/entries. Provides methods for sorting, filtering duplicates, and various ordering operations (by popularity, Last.fm data, audio features).

**Track** (`lib/track.js`): Represents individual Spotify tracks. Handles track creation from various formats, URI resolution, and audio feature fetching.

**SpotifyWebApi** (`lib/spotify.js`): Wrapper for Spotify Web API interactions. Manages authentication, rate limiting, and API requests for tracks, albums, artists, and playlists.

**WebScraper** (`lib/scraper.js`): Scrapes track information from websites like Last.fm, Pitchfork, Reddit, and YouTube. Uses jsdom for HTML parsing.

### Authentication Flow

The library supports both client credentials flow (for CLI) and implicit grant flow (for web). Authentication tokens are managed in `lib/auth.js` with automatic refresh handling.

### Command Processing Pipeline

1. Input string → Parser → Command objects
2. Commands executed sequentially via Queue
3. Each command type (Track, Album, Artist, Similar, Top) has dedicated handler
4. Results collected in Playlist object
5. Final output as Spotify URIs, CSV, or M3U format

### Key Dependencies

- `jsdom`: HTML parsing for web scraping
- `request`/`preq`: HTTP requests with rate limiting
- `lodash`: Utility functions
- `string-similarity`: Fuzzy string matching for track resolution
- `@clack/prompts`: Interactive CLI prompts
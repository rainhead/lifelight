# Lifelight

This is one in a series of attempts I've made at offline access to iNaturalist and/or GBIF observations.

**Status**. At present, it is a prototype, with myself its only user. If I keep using it, and it seems generally useful, I'll release it for everyone.

If this project seems interesting, contact me on [iNaturalist](https://www.inaturalist.org/people/rainhead).

**Implementation**. This is an offline-ready Progressive Web App. Currently, it displays an Open Street Map map, downloads any new observations I've made (or the first time it runs, all of them), and stores them in IndexedDB.

**Roadmap**. It's too early for a roadmap, but here are some features I find compelling, to give you a sense for where I might be going:
- Create a set of observation searches whose results are always available offline, e.g.:
  - All observations of endemic flowers in my state.
  - All observations in a particular project.
- Authenticate with a token to access unobscured coordinates.
- Configurable styles / iconography.
- Offline access to the full iNaturalist taxonomy.
- Offline access to a selection of taxon and/or observation photos.
- Support observations from other platforms, including GBIF and Ecdysis.
- Show distance and bearing to closest observation in a set.

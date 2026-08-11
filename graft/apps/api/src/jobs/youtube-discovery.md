# apps\api\src\jobs\youtube-discovery.ts

- TempleChannel · interface · L37-L41 — interface TempleChannel
- YoutubeDiscoveryChannelResult · interface · L79-L85 — interface YoutubeDiscoveryChannelResult
- YoutubeDiscoveryResult · interface · L87-L95 — interface YoutubeDiscoveryResult
- LiveLookup · interface · L99-L101 — interface LiveLookup
- lookupLive · function · L103-L121 — async function lookupLive(channelId: string, apiKey: string): Promise<LiveLookup>
- applyChannel · function · L123-L208 — async function applyChannel( ch: TempleChannel, apiKey: string, ): Promise<YoutubeDiscoveryChannelResult>
- discoverLiveStreams · function · L210-L251 — async function discoverLiveStreams(): Promise<YoutubeDiscoveryResult>
- YoutubeDiscoveryGatedResult · interface · L261-L265 — interface YoutubeDiscoveryGatedResult
- maybeRunYoutubeDiscovery · function · L267-L276 — async function maybeRunYoutubeDiscovery(): Promise<YoutubeDiscoveryGatedResult>
- __resetYoutubeDiscoveryRateLimit · function · L279-L281 — function __resetYoutubeDiscoveryRateLimit(): void

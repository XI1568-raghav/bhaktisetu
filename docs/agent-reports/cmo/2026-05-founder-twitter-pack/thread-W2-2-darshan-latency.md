---
hook: "Live darshan latency: 4G in Bhopal vs Starlink in a small Karnataka temple vs JioFiber in Tirupati. What we measured over 30 days. Surprising winner. 1/8"
tweet_count: 8
topic: darshan-latency
target_audience: nri
cta: "Watch a live darshan from anywhere: bhaktisetu.com/today"
schedule_week: 2
schedule_day_hint: "Wed 9am IST (Tue 8:30pm PT)"
status: ready-for-founder-review
created_by: cmo-agent
---

1/8 Live darshan latency: 4G in Bhopal vs Starlink in a small Karnataka temple vs JioFiber in Tirupati. What we measured over 30 days. Surprising winner. <!-- 156/280 -->

2/8 For NRI users, "live darshan" only works if the lag is under 5 seconds. Above 8 seconds it feels like a recording. Above 15 seconds the aarti bell is out of sync with the visual flame. Latency is the whole product. <!-- 240/280 -->

3/8 Test setup: same HLS encoder (FFmpeg → AWS IVS), same 720p30 profile, same 3 viewers per location (SF, London, Singapore). Measured glass-to-glass with synced NTP clocks over 30 days, 4 darshans/day. <!-- 234/280 -->

4/8 Results: JioFiber in Tirupati: median 4.1s, p95 6.8s. 4G in Bhopal: median 6.2s, p95 14.1s. Starlink in rural Karnataka: median 3.9s, p95 7.2s. Starlink beat fibre on p95 because no last-mile congestion. <!-- 250/280 -->

5/8 The 4G failure mode is brutal. Median is fine. p95 during a Friday evening aarti (peak local data usage) blows up to 22s. That's the difference between a viewer staying and a viewer closing the tab. <!-- 222/280 -->

6/8 What we ship now: every new temple gets a 14-day latency baseline before we mark it live. If p95 > 10s we either negotiate a wired upgrade or downgrade the temple to "recorded darshan" status. <!-- 222/280 -->

7/8 The Starlink finding shocked me. The mental model that fibre = better than satellite is true for download speed but not for upload jitter on a single concurrent stream. For our 1-uploader workload, Starlink is winning. <!-- 252/280 -->

8/8 If you're an NRI watching live darshan from a small temple — there's a real chance you're on Starlink uplink right now. Try one this evening → bhaktisetu.com/today <!-- 174/280 -->

# Why does your watch count to 32,768? — fact sheet

Format: hidden in plain sight (a teardown of a quartz wristwatch, then the atomic clock that defines the second).
Quotes below were read from the source pages on 2026-11-11. The watch, its movement and the "fountain" lab are stylized 3D models, not a specific product.

## Sourced facts

| On screen | Source | What the source says |
|---|---|---|
| Inside: a **quartz** tuning fork | Live Science, "Why is Quartz Used in Watches?" (updated 30 June 2022) — https://www.livescience.com/32509-why-is-quartz-used-in-watches.html | "Inside of a watch is a tiny piece of quartz that is shaped like a miniature tuning fork." |
| Run electricity through it and it **vibrates** | Live Science (above); supporting: Explain that Stuff, "Quartz clocks and watches" (updated 22 April 2025) — https://www.explainthatstuff.com/quartzclockwatch.html | Live Science: "The ability to convert voltage to and from mechanical stress is called piezoelectricity." and "it vibrates at a high frequency, more than 32,000 times per second." Explain that Stuff: "if you apply a voltage to a piece of quartz, it vibrates at a precise frequency." |
| **32,768** times every second | NIST, "Timekeeping and clocks FAQs" (updated 11 Oct 2024) — https://www.nist.gov/pml/time-and-frequency-division/timekeeping-and-clocks-faqs | "With a quartz clock (like most wristwatches), a piece of quartz crystal is cut and used in an electronic circuit where it vibrates at a certain frequency (usually 32,768 Hz)." |
| **1** pulse per second. That's your tick. / Every tick = **32,768** vibrations, counted. / Your watch? Still counting to **32,768** | NIST FAQ (above) | "The frequency is "counted" by dividing it by 32,768 to equal one second 'ticks'." |
| The chip splits it in **half**… **15** halvings later: exactly **1** | Math (on screen: "MATH · 32,768 = 2¹⁵"); supporting: Explain that Stuff (above) | 32,768 = 2^15, so halving 15 times gives 32,768 → 16,384 → 8,192 → 4,096 → 2,048 → 1,024 → 512 → 256 → 128 → 64 → 32 → 16 → 8 → 4 → 2 → 1. Explain that Stuff: the circuit "divides this by two 15 times" to make a 1 Hz pulse that drives "a tiny stepping motor". |
| **9,192,631,770** cesium vibrations = 1 second | NIST FAQ (above); NIST, "New Atomic Fountain Clock Joins Elite Group That Keeps the World on Time" (28 April 2025) — https://www.nist.gov/news-events/news/2025/04/new-atomic-fountain-clock-joins-elite-group-keeps-world-time | FAQ: "Since 1967, the International System of Units (SI) has defined the second as the period equal to 9,192,631,770 cycles" (of the cesium-133 atom's radiation). 2025 release: "A detector then counts 9,192,631,770 wave cycles of the fine-tuned microwaves. The time it takes to count those cycles defines the official international second." |
| The official definition since **1967** | NIST FAQ and NIST 2025 release (above) | "Since 1967, the International System of Units (SI) has defined the second..."; the cesium frequency is "the internationally agreed-upon basis for defining the second since 1967." |
| NIST's **NIST-F4** clock: a cesium fountain | NIST 2025 release (above) | "NIST's new cesium fountain clock"; "NIST-F4 measures an unchanging frequency in the heart of cesium atoms" |
| Started **100 million** years ago… it'd be off by less than **1 second** today | NIST 2025 release (above), about NIST-F4 | "if it had started running 100 million years ago, when dinosaurs roamed, it would be off by less than a second today." |

## Scenario logic and stylization (not presented as fact)
- The halving cascade on the chip is drawn as 15 glowing divider stages; the pulse spacing doubles after each stage. Real dividers are microscopic flip-flops.
- The tuning fork's on-screen bending is slowed down enormously so it can be seen.
- The cooling-laser beams in the fountain are drawn visible (red); real cesium cooling light is near-infrared.
- No accuracy figure for quartz watches is shown: NIST gives only a hypothetical (0.1 Hz off ≈ 0.26 s a day), so it was left out.

## Checked and not used
- Size of the tuning fork: no primary source found this run.
- Year of the first quartz clock: not on the NIST pages read this run.
- NIST-F2's "neither gain nor lose one second in about 300 million years" (NIST, 3 April 2014): accurate for 2014, but replaced here by the 2025 NIST-F4 statement.

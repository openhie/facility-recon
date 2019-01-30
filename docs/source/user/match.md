# Match

Reconciling data sources involves choosing a pair of sources to work with and then running the automatic or manual matching tool. Any kind of match can be undone.

## Pair sources

On the pair tab select one source on the left and one on the right. The source on the left (source 1) is the data the follower, the data that is meant to be cleaned. The source on the right is the leader, the source that is the source of truth. 

In the pairing process it is possible to share the pair with another user who may join in helping to match, for example where they are familiar with a specific area.

## Automatic matching

When the reconciliation process starts it uses automatic matching. Matching proceeds like this:

- The first level matches the highest administrative area names (termed region in the tool) using the [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance). 
- The second level matches based on the first level and also the Levenshtein distance for the second level names, termed district in the tool.
- The final level matches based on the second level (which was already matched according to the level above it) as well as the Levenshtein distance.

## Manual matching

Manual matching brings up a dialog box to choose options. If latitude and longitude coordinates were provided in the data sources, it additionally scores matches based on the [haversine formula](https://en.wikipedia.org/wiki/Haversine_formula) for shortest path across a sphere (geodesic distance) between the points. This is not used in the automatic matching but is provided for manual matching.

Any administrative area or facility match may be broken. If this is desired, click Recalculate Scores to rebuild the scoring index and manually match or flag as desired.




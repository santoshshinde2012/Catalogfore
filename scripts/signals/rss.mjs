import { fetchRss, newBillingPosts } from "../catalog-watch.mjs";
import { registerSignal } from "../signal-registry.mjs";

export const rssSignal = {
  id: "databricks-rss",
  async collect(env) {
    const posts = newBillingPosts(await fetchRss(env.fetch), env.state.rssGuids ?? []);
    return posts.map((post) => `New release note: ${post.title}`);
  },
};

registerSignal(rssSignal);

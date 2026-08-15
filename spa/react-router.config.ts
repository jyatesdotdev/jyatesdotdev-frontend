import type { Config } from "@react-router/dev/config";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import routes from "./src/routes";

export default {
  appDirectory: "src",
  ssr: false,
  async prerender() {
    // Static routes derive from the route table: the index route is "/", and any
    // route whose path has no dynamic (":") or splat ("*") segment is prerendered.
    const staticRoutes = routes.flatMap((route) => {
      if (route.index) return ["/"];
      if (!route.path || route.path.includes(":") || route.path.includes("*")) return [];
      return [`/${route.path}`];
    });

    // Blog posts are auto-discovered from the MDX files; drafts are skipped.
    const postsDir = path.join(process.cwd(), "src/blog/posts");
    let blogRoutes: string[] = [];
    if (fs.existsSync(postsDir)) {
      const files = fs.readdirSync(postsDir);
      blogRoutes = files
        .filter(f => f.endsWith(".mdx"))
        .filter(f => {
          const { data } = matter(fs.readFileSync(path.join(postsDir, f), "utf-8"));
          return data.draft !== true;
        })
        .map(f => `/blog/${f.replace(".mdx", "")}`);
    }

    // Engineering records follow the same auto-discovery pattern.
    const recordsDir = path.join(process.cwd(), "src/records/records");
    let recordRoutes: string[] = [];
    if (fs.existsSync(recordsDir)) {
      const files = fs.readdirSync(recordsDir);
      recordRoutes = files
        .filter(f => f.endsWith(".mdx"))
        .filter(f => {
          const { data } = matter(fs.readFileSync(path.join(recordsDir, f), "utf-8"));
          return data.draft !== true;
        })
        .map(f => `/records/${f.replace(".mdx", "")}`);
    }
    return [...staticRoutes, ...blogRoutes, ...recordRoutes];
  }
} satisfies Config;
